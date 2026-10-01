// lib/health/measurement.ts
// Phase 6.1 (T59.1/T59.2/T59.5) — measurement ledger.
//
// Purpose: make the two real price data paths MEASURABLE end to end without
// changing any provider selection, caching, or fallback semantics:
//
//   Path 1 (single):  /api/prices -> fetchLivePrice -> T60 reuse ->
//                     coalesce -> withProviderHealth -> provider
//   Path 2 (batch):   /api/prices/batch -> fetchBulkPricesForSymbols ->
//                     60 s bulk cache -> direct Yahoo v8 HTTP calls
//
// T59.2 requires four distinct quantities that must never be inferred from
// each other: application (API) requests, actual upstream provider calls,
// requests satisfied by coalescing, and requests satisfied by a cache.
// This module counts each at the layer where it happens.
//
// T59.4 requires observed upstream calls to be reconcilable against the
// providerHealth volume counters. The Yahoo-bulk path deliberately does NOT
// pass through withProviderHealth (wiring it in would change circuit-breaker
// semantics — forbidden by the Phase 6.1 no-optimization gate), so bulk
// upstream calls are counted HERE under the registry id "yahoo" with
// path="bulk", and the reconciliation step reports the health-counter delta
// and the ledger delta side by side.
//
// This is a per-process (serverless instance) ledger by design — same
// posture as providerHealth (T45). Snapshots are exposed through the
// CRON_SECRET-protected /api/admin/providers response (existing admin
// reporting path) and consumed by scripts/phase6Battery.ts.

/** Where an upstream attempt originated. */
export type UpstreamPath = "single" | "bulk";

/** HTTP failure classification for an upstream attempt (null = no failure). */
export type HttpFailureClass =
  | "timeout"
  | "http-4xx"
  | "http-5xx"
  | "network"
  | "parse"
  | "cooldown"
  | "aborted"
  | null;

export interface UpstreamAttemptEvent {
  kind: "upstream-attempt";
  ts: string;
  providerId: string;   // registry naming (PROVIDER_IDS)
  path: UpstreamPath;
  ok: boolean;
  latencyMs: number;
  httpFailureClass: HttpFailureClass;
  /** Symbols in the caller's request batch (bulk) or 1 (single). */
  symbolsRequested: number;
  /** Symbols the attempt actually returned a price for. */
  symbolsReturned: number;
}

export interface BulkRunEvent {
  kind: "bulk-run";
  ts: string;
  providerId: string;      // "yahoo" — the only bulk transport today
  symbolsRequested: number;
  symbolsReturned: number;
  bulkCacheHits: number;   // served from the 60 s bulk cache, no HTTP
  upstreamAttempts: number; // actual Yahoo HTTP attempts (incl. per-symbol retries)
  upstreamFailures: number;
  chunks: number;          // parallel chunk count
  chunkSize: number;       // chunk size (batch size per chunk)
  wallMs: number;
}

export interface AppRequestEvent {
  kind: "app-request";
  /** Corrective gate: completion targets EXACTLY this event by id. The
   *  previous "most recent incomplete event on this endpoint" scan was
   *  unsafe under concurrency — a 10-request burst could attach wall
   *  times to the wrong request. */
  id: string;
  ts: string;
  endpoint: "/api/prices" | "/api/prices/batch";
  wallMs: number | null;   // filled on completion via recordAppRequestDone(id, …)
  symbols: number | null;
  cacheBuster: boolean | null; // battery cache-busted URL (measurement only)
}

export interface ServeEvent {
  kind: "serve";
  ts: string;
  endpoint: "/api/prices" | "/api/prices/batch";
  /** How the response entries were satisfied (T59.2 served-from split).
   *  cache-replay covers both the T60 in-process snapshot replay and the
   *  T62 persistent last-known fallback — the route cannot distinguish
   *  them from the entry alone; T60-specific hits come from
   *  providerReuseStats().cacheHits deltas. */
  servedFrom:
    | "live"              // fresh upstream observation (status LIVE)
    | "cache-replay"      // T60 replay or T62 persistent fallback (status CACHED)
    | "coalesced"         // T46 shared inflight call
    | "bulk-cache"        // 60 s Yahoo-bulk cache hit
    | "bulk-upstream"     // fresh Yahoo-bulk observation
    | "static-reference"  // STATIC table value — no upstream call at all
    | "derived"           // DERIVED computation
    | "unavailable";      // honest UNAVAILABLE
  count: number;
}

export type MeasurementEvent =
  | AppRequestEvent
  | BulkRunEvent
  | UpstreamAttemptEvent
  | ServeEvent;

export interface MeasurementCounters {
  appRequests: Record<string, number>;
  /** Actual upstream calls, by provider id and path. */
  upstream: Record<string, { single: number; bulk: number; failures: number }>;
  served: Record<string, number>;
  upstreamTotals: {
    single: number;
    bulk: number;
    failures: number;
    /** Per-path failure counts so a bulk-run's own failures can be
     *  attributed exactly (a concurrent single-path failure must not be
     *  charged to the bulk run). */
    singleFailures: number;
    bulkFailures: number;
  };
}

export interface MeasurementSnapshot {
  processStartedAt: string;
  generatedAt: string;
  counters: MeasurementCounters;
  recentEvents: MeasurementEvent[];
  droppedEvents: number; // events evicted from the ring buffer
}

const MAX_EVENTS = 600;

interface MeasurementState {
  processStartedAt: number;
  events: MeasurementEvent[];
  dropped: number;
  appRequestSeq: number;
  appRequests: Record<string, number>;
  upstream: Record<string, { single: number; bulk: number; failures: number }>;
  served: Record<string, number>;
}

const g = globalThis as unknown as { __rishiMeasurement?: MeasurementState };

function state(): MeasurementState {
  if (!g.__rishiMeasurement) {
    g.__rishiMeasurement = {
      processStartedAt: Date.now(),
      events: [],
      dropped: 0,
      appRequestSeq: 0,
      appRequests: {},
      upstream: {},
      served: {},
    };
  }
  return g.__rishiMeasurement;
}

function push(ev: MeasurementEvent): void {
  const s = state();
  s.events.push(ev);
  if (s.events.length > MAX_EVENTS) {
    s.events.splice(0, s.events.length - MAX_EVENTS);
    s.dropped += 1;
  }
}

function upstreamEntry(providerId: string): { single: number; bulk: number; failures: number } {
  const s = state();
  let u = s.upstream[providerId];
  if (!u) {
    u = { single: 0, bulk: 0, failures: 0 };
    s.upstream[providerId] = u;
  }
  return u;
}

// ── T59.2: application requests (API surface), distinct from upstream ──

/** Register an application request; returns the event ID that
 *  recordAppRequestDone MUST be called with (exact attribution). */
export function recordAppRequest(
  endpoint: "/api/prices" | "/api/prices/batch",
  meta?: { symbols?: number; cacheBuster?: boolean },
): string {
  const s = state();
  s.appRequestSeq += 1;
  const id = `req-${s.processStartedAt.toString(36)}-${s.appRequestSeq}`;
  s.appRequests[endpoint] = (s.appRequests[endpoint] ?? 0) + 1;
  push({
    kind: "app-request",
    id,
    ts: new Date().toISOString(),
    endpoint,
    wallMs: null,
    symbols: meta?.symbols ?? null,
    cacheBuster: meta?.cacheBuster ?? null,
  });
  return id;
}

/** Complete the app-request event with EXACTLY this id (T59.5 latency).
 *  Never matches by endpoint or recency — a concurrent burst must not
 *  attach its wall times to the wrong request. Double completion and
 *  unknown ids are ignored (first completion wins; nothing is invented). */
export function recordAppRequestDone(
  id: string,
  wallMs: number,
): void {
  const s = state();
  for (let i = s.events.length - 1; i >= 0; i -= 1) {
    const ev = s.events[i];
    if (ev.kind === "app-request" && ev.id === id && ev.wallMs === null) {
      ev.wallMs = wallMs;
      return;
    }
  }
}

// ── Actual upstream attempts (the only true provider-call measure) ──

export function recordUpstreamAttempt(ev: {
  providerId: string;
  path: UpstreamPath;
  ok: boolean;
  latencyMs: number;
  httpFailureClass: HttpFailureClass;
  symbolsRequested: number;
  symbolsReturned: number;
}): void {
  const u = upstreamEntry(ev.providerId);
  u[ev.path] += 1;
  if (!ev.ok) u.failures += 1;
  push({
    kind: "upstream-attempt",
    ts: new Date().toISOString(),
    ...ev,
  });
}

/** One completed fetchBulkPricesForSymbols invocation (aggregate view). */
export function recordBulkRun(ev: {
  providerId: string;
  symbolsRequested: number;
  symbolsReturned: number;
  bulkCacheHits: number;
  upstreamAttempts: number;
  upstreamFailures: number;
  chunks: number;
  chunkSize: number;
  wallMs: number;
}): void {
  push({ kind: "bulk-run", ts: new Date().toISOString(), ...ev });
}

/** Count how response entries were satisfied (T59.2 served-from split).
 *  NOTE on coalescing: a route cannot know which of its concurrent callers
 *  were coalesced — the win is visible only inside coalesce(). The coalesced
 *  quantity is therefore sourced from providerReuseStats().coalesceHits
 *  deltas (see the admin snapshot), not from this counter. */
export function recordServe(
  endpoint: "/api/prices" | "/api/prices/batch",
  servedFrom: ServeEvent["servedFrom"],
  count: number,
): void {
  if (count <= 0) return;
  const key = `${endpoint}:${servedFrom}`;
  const s = state();
  s.served[key] = (s.served[key] ?? 0) + count;
  push({ kind: "serve", ts: new Date().toISOString(), endpoint, servedFrom, count });
}

export function measurementSnapshot(): MeasurementSnapshot {
  const s = state();
  const upstreamTotals = {
    single: 0, bulk: 0, failures: 0, singleFailures: 0, bulkFailures: 0,
  };
  for (const u of Object.values(s.upstream)) {
    upstreamTotals.single += u.single;
    upstreamTotals.bulk += u.bulk;
    upstreamTotals.failures += u.failures;
  }
  for (const ev of s.events) {
    if (ev.kind === 'upstream-attempt' && !ev.ok) {
      if (ev.path === 'bulk') upstreamTotals.bulkFailures += 1;
      else upstreamTotals.singleFailures += 1;
    }
  }
  return {
    processStartedAt: new Date(s.processStartedAt).toISOString(),
    generatedAt: new Date().toISOString(),
    counters: {
      appRequests: { ...s.appRequests },
      upstream: JSON.parse(JSON.stringify(s.upstream)) as MeasurementCounters["upstream"],
      served: { ...s.served },
      upstreamTotals,
    },
    recentEvents: [...s.events],
    droppedEvents: s.dropped,
  };
}

/** Test-only: reset the whole ledger. */
export function resetMeasurement(): void {
  g.__rishiMeasurement = {
    processStartedAt: Date.now(),
    events: [],
    dropped: 0,
    appRequestSeq: 0,
    appRequests: {},
    upstream: {},
    served: {},
  };
}

/**
 * T59.5: percentile with an honesty gate. Statistics are never manufactured
 * from too few observations — below `minSamples` the percentile is null and
 * the sample size is reported instead.
 */
export function percentile(
  samples: number[],
  p: number,
  minSamples = 10,
): { value: number | null; sampleSize: number } {
  const n = samples.length;
  if (n < minSamples) return { value: null, sampleSize: n };
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return { value: Math.round(sorted[Math.max(0, idx)]), sampleSize: n };
}
