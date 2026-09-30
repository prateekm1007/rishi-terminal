/**
 * Provider health + quota protection — Phase 5 T45/T46.
 *
 * Server-side singleton (globalThis-backed so dev HMR and serverless
 * warm instances reuse state within a process lifetime; intentionally
 * per-instance — see T45 note on serverless caches).
 *
 * T45: track success/error rate, latency, last success/failure, and open a
 * cooldown (circuit) so the system stops repeatedly calling unhealthy
 * providers. Callers catch PROVIDER_COOLDOWN and fall to the next provider.
 *
 * T46: `coalesce` deduplicates concurrent identical requests so 20 widgets
 * produce 1 upstream call, not 20.
 *
 * Phase 6:
 * - T59 windowed request-volume accounting per provider (measure before
 *   any replacement decision; exposed via /api/admin/providers).
 * - T60 short-TTL result-snapshot reuse (`putCachedResult`/`getCachedResult`)
 *   so one upstream observation serves sequential widget polls within the
 *   reuse window; hits are counted for honest volume reporting.
 *   Persistent (DB) caching lives in lib/cache/persistentCache.ts.
 */

/** T59: windowed request-volume accounting per provider (per-process). */
export interface ProviderVolumeWindow {
  total: number;         // upstream attempts since process start
  today: number;         // current UTC-day bucket
  dayUtc: string;        // bucket key "YYYY-MM-DD"
  currentMinute: number; // requests in the current 60 s bucket
  minuteStart: number;   // epoch ms of the current minute bucket
}

export interface ProviderHealthEntry {
  calls: number;
  errors: number;
  successRate: number; // 0..1 over the lifetime of this process
  avgLatencyMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  cooldownUntil: number; // epoch ms; 0 = closed circuit
}

const COOLDOWN_MS = 60_000;
const COOLDOWN_THRESHOLD = 3; // consecutive failures before the circuit opens

interface HealthState {
  providers: Map<string, ProviderHealthEntry>;
  volumes: Map<string, ProviderVolumeWindow>;
  inflight: Map<string, Promise<unknown>>;
  /** T60: result-snapshot reuse store (payload keyed by caller-defined key). */
  reuse: Map<string, { payload: unknown; observedAt: number }>;
  reuseStats: { coalesceHits: number; cacheHits: number };
}

const g = globalThis as unknown as { __rishiProviderHealth?: HealthState };

function state(): HealthState {
  if (!g.__rishiProviderHealth) {
    g.__rishiProviderHealth = {
      providers: new Map(),
      volumes: new Map(),
      inflight: new Map(),
      reuse: new Map(),
      reuseStats: { coalesceHits: 0, cacheHits: 0 },
    };
  }
  return g.__rishiProviderHealth;
}

function entry(id: string): ProviderHealthEntry {
  const s = state();
  let e = s.providers.get(id);
  if (!e) {
    e = {
      calls: 0,
      errors: 0,
      successRate: 1,
      avgLatencyMs: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      consecutiveFailures: 0,
      cooldownUntil: 0,
    };
    s.providers.set(id, e);
  }
  return e;
}

function volumeEntry(id: string): ProviderVolumeWindow {
  const s = state();
  let v = s.volumes.get(id);
  if (!v) {
    v = {
      total: 0,
      today: 0,
      dayUtc: new Date().toISOString().slice(0, 10),
      currentMinute: 0,
      minuteStart: Date.now(),
    };
    s.volumes.set(id, v);
  }
  return v;
}

export function recordProviderResult(id: string, ok: boolean, latencyMs: number, error?: string): void {
  const e = entry(id);
  e.calls += 1;

  // T59: roll the volume windows (per-process; approximate by design —
  // serverless instances each see their own slice of traffic).
  const v = volumeEntry(id);
  const nowMs = Date.now();
  if (nowMs - v.minuteStart >= 60_000) {
    v.minuteStart = nowMs;
    v.currentMinute = 0;
  }
  const day = new Date(nowMs).toISOString().slice(0, 10);
  if (day !== v.dayUtc) {
    v.dayUtc = day;
    v.today = 0;
  }
  v.total += 1;
  v.today += 1;
  v.currentMinute += 1;
  e.avgLatencyMs =
    e.avgLatencyMs === 0 ? latencyMs : Math.round(e.avgLatencyMs * 0.8 + latencyMs * 0.2);
  if (ok) {
    e.lastSuccessAt = new Date().toISOString();
    e.consecutiveFailures = 0;
    e.cooldownUntil = 0;
  } else {
    e.errors += 1;
    e.lastFailureAt = new Date().toISOString();
    e.lastError = (error ?? "unknown").slice(0, 200);
    e.consecutiveFailures += 1;
    if (e.consecutiveFailures >= COOLDOWN_THRESHOLD) {
      e.cooldownUntil = Date.now() + COOLDOWN_MS;
    }
  }
  e.successRate = e.calls > 0 ? (e.calls - e.errors) / e.calls : 1;
}

export class ProviderCooldownError extends Error {
  constructor(public providerId: string) {
    super(`provider ${providerId} in cooldown (circuit open)`);
    this.name = "ProviderCooldownError";
  }
}

/**
 * Run an upstream provider call with health accounting (T45). Throws
 * ProviderCooldownError without calling fn while the circuit is open, so
 * callers must be prepared to fall through to the next provider.
 */
export async function withProviderHealth<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const e = entry(id);
  if (Date.now() < e.cooldownUntil) {
    throw new ProviderCooldownError(id);
  }
  const t0 = Date.now();
  try {
    const result = await fn();
    recordProviderResult(id, true, Date.now() - t0);
    return result;
  } catch (err) {
    recordProviderResult(id, false, Date.now() - t0, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * T46 request coalescing: identical concurrent requests share one upstream
 * call. The stored promise is removed on settle, so a later request after
 * failure retries normally.
 */
export async function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const s = state();
  const existing = s.inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    // T59: count the dedup win so volume reports show real upstream savings.
    s.reuseStats.coalesceHits += 1;
    return existing;
  }
  const p = fn().finally(() => {
    s.inflight.delete(key);
  });
  s.inflight.set(key, p);
  return p;
}

/** T58 report shape for the admin health endpoint (Phase 6 adds volume). */
export function providerHealthSnapshot(): Array<
  ProviderHealthEntry & {
    id: string;
    currentStatus: "HEALTHY" | "COOLDOWN" | "UNOBSERVED";
    volume?: { total: number; today: number; currentMinute: number };
  }
> {
  const s = state();
  const now = Date.now();
  return Array.from(s.providers.entries()).map(([id, e]) => {
    const v = s.volumes.get(id);
    return {
      id,
      ...e,
      volume: v
        ? { total: v.total, today: v.today, currentMinute: v.currentMinute }
        : undefined,
      currentStatus:
        now < e.cooldownUntil
          ? ("COOLDOWN" as const)
          : e.calls === 0
            ? ("UNOBSERVED" as const)
            : ("HEALTHY" as const),
    };
  });
}

/**
 * T60: short-TTL result-snapshot reuse. `payload` is whatever the caller
 * stored (a PricePoint for quote paths); `getCachedResult` returns null
 * once the entry is older than maxAgeMs and drops it.
 */
export function putCachedResult(key: string, payload: unknown): void {
  state().reuse.set(key, { payload, observedAt: Date.now() });
}

export function getCachedResult<T>(key: string, maxAgeMs: number): T | null {
  const s = state();
  const hit = s.reuse.get(key);
  if (!hit) return null;
  if (Date.now() - hit.observedAt > maxAgeMs) {
    s.reuse.delete(key);
    return null;
  }
  s.reuseStats.cacheHits += 1;
  return hit.payload as T;
}

/** T59/T60 report shape: dedup + reuse counters for the admin endpoint. */
export function providerReuseStats(): {
  coalesceHits: number;
  cacheHits: number;
  cachedEntries: number;
} {
  const s = state();
  return {
    coalesceHits: s.reuseStats.coalesceHits,
    cacheHits: s.reuseStats.cacheHits,
    cachedEntries: s.reuse.size,
  };
}

/** Test-only: reset all health/coalescing/reuse state. */
export function resetProviderHealth(): void {
  const s = state();
  s.providers.clear();
  s.volumes.clear();
  s.inflight.clear();
  s.reuse.clear();
  s.reuseStats = { coalesceHits: 0, cacheHits: 0 };
}
