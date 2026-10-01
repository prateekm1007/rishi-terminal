// scripts/phase6Battery.ts
// Phase 6.1 (T59.3) — fixed production measurement battery.
//
// ONE command, no dashboard clicking, no manual counting:
//   RISHI_BASE_URL=https://rishi-terminal.vercel.app \
//   CRON_SECRET=...            (optional: enables admin counter deltas +
//                              authenticated cron probe) \
//   SUPABASE_PAT=...           (optional: enables T61.1/T62.1 DB evidence
//                              via Management-API read-only SQL) \
//   npx tsx scripts/phase6Battery.ts
//
// Output: artifacts/phase6/T59_PRODUCTION_MEASUREMENT.json (durable T59.5
// artifact) + a human-readable stdout summary.
//
// Scenarios (prescription T59.3):
//   A. cold single-symbol request (cache-busted, first probe of the run)
//   B. sequential repeats inside the T60 reuse window (distinct cache
//      busters force the origin so the T60 layer is actually exercised)
//   C. concurrent burst N=10 — identical-URL variant (CDN+coalesce combined)
//      and distinct-URL variant (origin coalescing)
//   D. batch production path — the same symbol population the homepage
//      terminal requests, chunked ≤50 exactly like hooks/useLivePrices
//   E. repeated batch inside the 60 s bulk-cache window — proves what
//      actually served the second batch (bulk cache vs T60 vs CDN vs
//      provider) via counters and timestamps, never by guessing
// Plus:
//   T59.4 reconciliation of observed upstream calls vs providerHealth
//        volume counters (any unresolved difference = measurement defect)
//   T61.1 cron probes (route exists, 401 unauthenticated, optional
//        authenticated execution) and DB row evidence when SUPABASE_PAT set
//   T62.1 persistent-cache production evidence for a storage-entitled
//        provider + allow-list audit (zero non-entitled rows required)
//   T59.6 traffic split — app-level endpoint counters; external telemetry
//        attribution is marked BLOCKED rather than assumed.
//
// Measurement posture: every claim in the artifact carries the raw values
// it was derived from. Statistics below the sample-size gate are null —
// never manufactured (T59.5).

import fs from "node:fs";
import path from "node:path";

import { percentile } from "../lib/health/measurement";

// ── configuration ────────────────────────────────────────────────────────

const BASE_URL = (process.env.RISHI_BASE_URL ?? "https://rishi-terminal.vercel.app").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const SUPABASE_PAT = process.env.SUPABASE_PAT ?? "";
const SUPABASE_REF = process.env.SUPABASE_PROJECT_REF ?? "mwkreqcbgpjqcpctwllf";
const BURST_N = 10; // deterministic (prescription: "such as 10")
const REPEAT_N = 5;
const REPEAT_GAP_MS = 2_000; // stays inside the 30 s T60 window

const ARTIFACT_DIR = path.resolve("artifacts/phase6");
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, "T59_PRODUCTION_MEASUREMENT.json");

const COMMIT = process.env.VERCEL_COMMIT ?? "unknown-at-runtime";

// ── homepage population (mirrors app/page.tsx allSyms) ───────────────────
// TICKER_SYMS / TOP_CRYPTO / WORLD_MARKETS are module-local in app/page.tsx;
// they are mirrored here verbatim (with a CI-guarded tolerance: scenario D
// records the exact population sent, so drift is visible in the artifact).
// Rotating picks come from the same deterministic scoring imports the page
// uses, so the reconstruction equals a fresh page load.

import { STOCKS } from "@/data/stocks";
import { rankTopBuy, computeShortRadar, pickStockOfTheDay } from "@/lib/scoring/rankings";

const TICKER_SYMS = ["NIFTY50","SENSEX","BANK_NIFTY","SPX","DJI","IXIC","DAX","FTSE","HSI","BTC","ETH","GOLD","SILVER","WTI","SOL"];
const TOP_CRYPTO = ["BTC","ETH","SOL","BNB","ADA","AVAX","DOT","MATIC","LINK"];
const WORLD_MARKETS_SYMS = ["NIFTY50","SENSEX","BANK_NIFTY","SPX","DJI","IXIC","DAX","FTSE","HSI","N225","VIX"];

function homepagePopulation(): string[] {
  const rotating = rankTopBuy(6).map(s => s.symbol);
  const shorts = computeShortRadar(3).map(s => s.symbol);
  const sod = pickStockOfTheDay().symbol;
  const syms = [
    ...TICKER_SYMS,
    ...rotating,
    ...shorts,
    ...WORLD_MARKETS_SYMS,
    ...TOP_CRYPTO,
    sod,
  ];
  // de-dup, preserve order
  return Array.from(new Set(syms)).map(s => s.trim()).filter(Boolean).slice(0, 100);
}

// ── http helpers ─────────────────────────────────────────────────────────

interface HttpResult<T = unknown> {
  status: number;
  wallMs: number;
  body: T | null;
  rawBody: string | null;
  cacheHeader: string | null;
  url: string;
}

async function timedFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<HttpResult<T>> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, init);
    const rawBody = await res.text();
    return {
      status: res.status,
      wallMs: Date.now() - t0,
      rawBody,
      body: safeJson<T>(rawBody),
      cacheHeader: res.headers.get("x-vercel-cache") ?? res.headers.get("cf-cache-status") ?? res.headers.get("age") ?? null,
      url,
    };
  } catch (err) {
    return {
      status: -1,
      wallMs: Date.now() - t0,
      body: null,
      rawBody: `FETCH-ERROR: ${(err as Error).message}`,
      cacheHeader: null,
      url,
    };
  }
}

function safeJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

let bustCounter = 0;
function bust(base: string, params: Record<string, string>): string {
  bustCounter += 1;
  const qs = new URLSearchParams({ ...params, _bust: `p61-${Date.now()}-${bustCounter}` });
  return `${BASE_URL}${base}?${qs.toString()}`;
}

async function getPrice(symbol: string, cacheBust = true): Promise<HttpResult> {
  const url = cacheBust ? bust("/api/prices", { symbol }) : `${BASE_URL}/api/prices?symbol=${encodeURIComponent(symbol)}`;
  return timedFetch(url);
}

async function getBatch(symbols: string[]): Promise<HttpResult<{ prices: Record<string, Record<string, unknown>> } & Record<string, Record<string, unknown>>>> {
  return timedFetch(`${BASE_URL}/api/prices/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
}

interface AdminSnapshot {
  generatedAt: string;
  reuse: { coalesceHits: number; cacheHits: number; cachedEntries: number };
  measurement: {
    processStartedAt: string;
    counters: {
      appRequests: Record<string, number>;
      upstream: Record<string, { single: number; bulk: number; failures: number }>;
      served: Record<string, number>;
      upstreamTotals: { single: number; bulk: number; failures: number; singleFailures: number; bulkFailures: number };
    };
    recentEvents: unknown[];
    droppedEvents: number;
  };
  providers: Array<{
    id: string;
    status: string;
    observed: { calls: number; volume?: { total: number; today: number; currentMinute: number } | null } | null;
  }>;
}

async function getAdminSnapshot(): Promise<AdminSnapshot | null> {
  if (!CRON_SECRET) return null;
  const res = await timedFetch<AdminSnapshot>(`${BASE_URL}/api/admin/providers`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  if (res.status !== 200 || !res.body) {
    console.warn(`[battery] admin snapshot unavailable (status ${res.status})`);
    return null;
  }
  return res.body;
}

function healthVolume(snap: AdminSnapshot | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of snap?.providers ?? []) out[p.id] = p.observed?.volume?.total ?? 0;
  return out;
}

function deltaCounters(a: AdminSnapshot | null, b: AdminSnapshot | null) {
  const d = (x: number, y: number) => (x === undefined || y === undefined ? null : y - x);
  if (!a || !b) return null;
  const providers: Record<string, { healthDelta: number | null }> = {};
  const ha = healthVolume(a);
  const hb = healthVolume(b);
  for (const id of new Set([...Object.keys(ha), ...Object.keys(hb)])) {
    providers[id] = { healthDelta: d(ha[id] ?? 0, hb[id] ?? 0) };
  }
  return {
    window: { from: a.generatedAt, to: b.generatedAt },
    appRequests: {
      batch: d(a.measurement.counters.appRequests["/api/prices/batch"] ?? 0, b.measurement.counters.appRequests["/api/prices/batch"] ?? 0),
      single: d(a.measurement.counters.appRequests["/api/prices"] ?? 0, b.measurement.counters.appRequests["/api/prices"] ?? 0),
    },
    upstream: {
      totalsDelta: {
        single: d(a.measurement.counters.upstreamTotals.single, b.measurement.counters.upstreamTotals.single),
        bulk: d(a.measurement.counters.upstreamTotals.bulk, b.measurement.counters.upstreamTotals.bulk),
        bulkFailures: d(a.measurement.counters.upstreamTotals.bulkFailures, b.measurement.counters.upstreamTotals.bulkFailures),
      },
      perProviderLedger: Object.fromEntries(
        Object.keys({ ...a.measurement.counters.upstream, ...b.measurement.counters.upstream }).map(id => {
          const pa = a.measurement.counters.upstream[id];
          const pb = b.measurement.counters.upstream[id];
          return [id, {
            single: d(pa?.single ?? 0, pb?.single ?? 0),
            bulk: d(pa?.bulk ?? 0, pb?.bulk ?? 0),
          }];
        }),
      ),
    },
    healthVolumeDeltaByProvider: providers,
    reuse: {
      coalesceHits: d(a.reuse.coalesceHits, b.reuse.coalesceHits),
      cacheHits: d(a.reuse.cacheHits, b.reuse.cacheHits),
    },
    bulkRunEventsInWindow: (b.measurement.recentEvents as Array<{ kind: string; ts: string }>)
      .filter(e => e.kind === "bulk-run" && e.ts > a.generatedAt) as unknown[],
  };
}

// ── Supabase Management-API probes (read-only SQL; T61.1/T62.1) ─────────

async function mgmtQuery(query: string): Promise<{ ok: boolean; rows: unknown[] | null; error: string | null }> {
  if (!SUPABASE_PAT) return { ok: false, rows: null, error: "SUPABASE_PAT not provided — DB evidence skipped" };
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_PAT}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const raw = await res.text();
    if (!res.ok) return { ok: false, rows: null, error: `mgmt-api ${res.status}: ${raw.slice(0, 300)}` };
    return { ok: true, rows: JSON.parse(raw) as unknown[], error: null };
  } catch (err) {
    return { ok: false, rows: null, error: (err as Error).message };
  }
}

// ── scenario helpers ─────────────────────────────────────────────────────

interface PriceEntry {
  price?: number;
  source?: string;
  status?: string;
  observedAt?: string | null;
  lastUpdated?: string | null;
  checkedAt?: string;
}

function summarizeEntry(e: PriceEntry | undefined) {
  if (!e) return null;
  return {
    price: typeof e.price === "number" ? e.price : null,
    source: e.source ?? null,
    status: e.status ?? null,
    observedAt: e.observedAt ?? e.lastUpdated ?? null,
    checkedAt: e.checkedAt ?? null,
  };
}

function sourceDistribution(body: Record<string, Record<string, unknown>> | null): Record<string, number> {
  const dist: Record<string, number> = {};
  if (!body) return dist;
  for (const v of Object.values(body)) {
    const src = (v?.source as string) ?? "unknown";
    dist[src] = (dist[src] ?? 0) + 1;
  }
  return dist;
}

function statusDistribution(body: Record<string, Record<string, unknown>> | null): Record<string, number> {
  const dist: Record<string, number> = {};
  if (!body) return dist;
  for (const v of Object.values(body)) {
    const st = (v?.status as string) ?? "unknown";
    dist[st] = (dist[st] ?? 0) + 1;
  }
  return dist;
}

// ── main battery ─────────────────────────────────────────────────────────

interface ScenarioResult { [k: string]: unknown }

async function main(): Promise<void> {
  console.log(`[battery] base=${BASE_URL} admin=${CRON_SECRET ? "yes" : "NO (counter deltas unavailable)"} supabase=${SUPABASE_PAT ? "yes" : "no"}`);
  const artifact: Record<string, unknown> = {
    schema: "RISHI_PHASE6_T59_MEASUREMENT_V1",
    testTimestamp: new Date().toISOString(),
    deploymentCommit: COMMIT,
    baseUrl: BASE_URL,
    config: {
      burstN: BURST_N,
      repeatN: REPEAT_N,
      repeatGapMs: REPEAT_GAP_MS,
      adminSnapshots: !!CRON_SECRET,
      supabaseEvidence: !!SUPABASE_PAT,
    },
    limitations: [] as string[],
  };
  const limitations = artifact.limitations as string[];

  const adminBefore = await getAdminSnapshot();
  if (!adminBefore) {
    limitations.push("CRON_SECRET not provided: counter deltas (T59.4) and served-from reconciliation are UNAVAILABLE for this run.");
  }

  // ── Scenario A: cold single-symbol request ───────────────────────────
  const aSym = "TCS";
  const a = await getPrice(aSym);
  const aEntry = summarizeEntry((a.body as PriceEntry) ?? undefined);
  const scenarioA: ScenarioResult = {
    name: "A-cold-single",
    symbol: aSym,
    cacheBusted: true,
    httpStatus: a.status,
    wallMs: a.wallMs,
    entry: aEntry,
    note: "'cold' = no in-process result within the 30 s reuse window and a fresh CDN key (cache-busted URL). Process-level coldness of the serverless instance is not controllable from outside and is NOT claimed.",
  };
  console.log(`[A] ${aSym}: ${a.status} in ${a.wallMs}ms ${JSON.stringify(aEntry)}`);

  // ── Scenario B: sequential repeats inside the T60 window ────────────
  const bSym = aSym; // same symbol, distinct cache busters force the origin
  const b: ScenarioResult[] = [];
  const bWalls: number[] = [];
  for (let i = 0; i < REPEAT_N; i += 1) {
    if (i > 0) await new Promise(r => setTimeout(r, REPEAT_GAP_MS));
    const r = await getPrice(bSym);
    const entry = summarizeEntry((r.body as PriceEntry) ?? undefined);
    bWalls.push(r.wallMs);
    b.push({ i, httpStatus: r.status, wallMs: r.wallMs, entry });
    console.log(`[B${i}] ${bSym}: ${r.status} in ${r.wallMs}ms status=${entry?.status} observedAt=${entry?.observedAt}`);
  }
  const scenarioB = {
    name: "B-sequential-repeat",
    symbol: bSym,
    repeats: REPEAT_N,
    gapMs: REPEAT_GAP_MS,
    cacheBusting: "distinct buster per request — each request reaches the origin; T60 (30 s) decides server-side reuse",
    results: b,
    wallP50: percentile(bWalls, 50),
    observedAtConstant: b.every(x => (x.entry as { observedAt: string | null } | null)?.observedAt === (b[0].entry as { observedAt: string | null })?.observedAt),
    statusSequence: b.map(x => (x.entry as { status: string | null } | null)?.status),
  };

  // ── Scenario C: concurrent burst (two variants) ──────────────────────
  const cSym = "RELIANCE";
  const cSame = await Promise.all(
    Array.from({ length: BURST_N }, () => getPrice(cSym, false)),
  );
  const cDistinct = await Promise.all(
    Array.from({ length: BURST_N }, () => getPrice(cSym, true)),
  );
  const scenarioC = {
    name: "C-concurrent-burst",
    symbol: cSym,
    n: BURST_N,
    identicalUrl: {
      note: "same URL → CDN (s-maxage=30) may satisfy requests before the origin sees them; CDN hits and coalesce wins are combined here BY CONSTRUCTION",
      appRequestCount: BURST_N,
      httpStatuses: cSame.map(r => r.status),
      wallMs: cSame.map(r => r.wallMs),
      wallP50: percentile(cSame.map(r => r.wallMs), 50),
    },
    distinctUrls: {
      note: "distinct busters → every request reaches the origin; upstream count vs coalesceHits delta decides what actually fetched",
      appRequestCount: BURST_N,
      httpStatuses: cDistinct.map(r => r.status),
      wallMs: cDistinct.map(r => r.wallMs),
      wallP50: percentile(cDistinct.map(r => r.wallMs), 50),
    },
  };
  console.log(`[C] identical walls: ${scenarioC.identicalUrl.wallMs.join(",")}`);
  console.log(`[C] distinct  walls: ${scenarioC.distinctUrls.wallMs.join(",")}`);

  // admin mid-snapshot captures A–C; deltas vs "before" reconcile them.
  const adminMid = await getAdminSnapshot();
  const reconcileSinglePhase = deltaCounters(adminBefore, adminMid);

  // ── Scenario D: batch production path (homepage population) ─────────
  const population = homepagePopulation();
  const dChunks: string[][] = [];
  for (let i = 0; i < population.length; i += 50) dChunks.push(population.slice(i, i + 50));
  const adminBeforeD = await getAdminSnapshot();
  const dResults: ScenarioResult[] = [];
  for (const chunk of dChunks) {
    const r = await getBatch(chunk);
    const body = (r.body ?? {}) as Record<string, Record<string, unknown>>;
    const prices = (body.prices ?? body) as Record<string, Record<string, unknown>>;
    dResults.push({
      symbolsRequested: chunk.length,
      symbolsReturned: Object.keys(prices).length,
      httpStatus: r.status,
      wallMs: r.wallMs,
      unavailableCount: Object.values(prices).filter(v => (v as PriceEntry)?.status === "UNAVAILABLE").length,
      sourceDistribution: sourceDistribution(prices),
      statusDistribution: statusDistribution(prices),
      sampleEntries: Object.entries(prices).slice(0, 3).map(([k, v]) => ({ symbol: k, ...summarizeEntry(v as PriceEntry) })),
    });
    console.log(`[D] batch ${chunk.length}: ${r.status} in ${r.wallMs}ms returned=${Object.keys(prices).length}`);
  }
  const scenarioD = {
    name: "D-batch-production-path",
    populationSource: "app/page.tsx allSyms (TICKER_SYMS + deterministic rotating picks + WORLD_MARKETS + TOP_CRYPTO + stockOfDay) — reconstructed from the same imports",
    stocksModuleSize: Object.keys(STOCKS ?? {}).length,
    population,
    chunking: dChunks.map(c => c.length),
    results: dResults,
  };

  // ── Scenario E: repeated batch inside the bulk-cache window ─────────
  const adminBeforeE = await getAdminSnapshot();
  const eFirst = await getBatch(dChunks[0]);
  const eSecond = await getBatch(dChunks[0]);
  const adminAfterE = await getAdminSnapshot();
  const eDelta = deltaCounters(adminBeforeE, adminAfterE);
  const p1 = (eFirst.body ?? {}) as Record<string, Record<string, unknown>>;
  const p2 = (eSecond.body ?? {}) as Record<string, Record<string, unknown>>;
  const prices1 = (p1.prices ?? p1) as Record<string, Record<string, unknown>>;
  const prices2 = (p2.prices ?? p2) as Record<string, Record<string, unknown>>;
  const observedAtEqual = Object.keys(prices1).filter(k => (prices1[k] as PriceEntry)?.observedAt).every(k =>
    (prices1[k] as PriceEntry)?.observedAt === (prices2[k] as PriceEntry)?.observedAt,
  );
  const scenarioE = {
    name: "E-repeated-batch",
    verdict: (function () {
      const bulk = (eDelta?.upstream.totalsDelta.bulk ?? 0) === 0;
      const cacheHits = (eDelta?.bulkRunEventsInWindow as Array<{ bulkCacheHits?: number }>).some(e => (e.bulkCacheHits ?? 0) > 0);
      if (bulk && cacheHits) return "served-from-bulk-cache (proven: zero upstream bulk attempts in window + bulk-run event records cache hits)";
      if (bulk) return "served-from-cache (zero upstream attempts) — layer not proven";
      return "upstream calls occurred on the repeat — NOT served from bulk cache";
    })(),
    first: { httpStatus: eFirst.status, wallMs: eFirst.wallMs },
    second: { httpStatus: eSecond.status, wallMs: eSecond.wallMs },
    secondMinusFirstWallMs: eSecond.wallMs - eFirst.wallMs,
    observedAtEqualAcrossBatches: observedAtEqual,
    counterDelta: eDelta,
  };
  console.log(`[E] verdict: ${scenarioE.verdict}; observedAtEqual=${observedAtEqual}`);

  // ── T61.1: observations cron probes ──────────────────────────────────
  const cronUnauth = await timedFetch(`${BASE_URL}/api/ingest/observations`, { method: "POST" });
  const t611: Record<string, unknown> = {
    routeExists: "verified in repo: app/api/ingest/observations/route.ts (code evidence)",
    schedule: "vercel.json crons: /api/ingest/observations @ 45 13 * * 1-5 (code evidence)",
    unauthenticatedProbe: { status: cronUnauth.status, expect: 401, pass: cronUnauth.status === 401 },
    authenticatedExecution: "not executed (CRON_SECRET absent — provide to run a live capture)" as string,
  };
  if (CRON_SECRET) {
    const cronAuth = await timedFetch(`${BASE_URL}/api/ingest/observations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    t611.authenticatedExecution = {
      status: cronAuth.status,
      body: cronAuth.body,
      wallMs: cronAuth.wallMs,
    };
  }
  console.log(`[T61.1] unauth=${cronUnauth.status} (expect 401)`);

  // ── T62.1: persistent-cache production evidence ──────────────────────
  // Storage-entitled providers: exchangerate-api (USD/INR), fred-csv (US10Y).
  const fx = await getPrice("USD/INR");
  const fxEntry = summarizeEntry((fx.body as PriceEntry) ?? undefined);
  const bond = await getPrice("US10Y");
  const bondEntry = summarizeEntry((bond.body as PriceEntry) ?? undefined);
  const t621: Record<string, unknown> = {
    note: "production fault-injection (provider failure) is not available without a debug surface; steps 1,2,5,7 verified in production below; steps 3,4,6 (failure → cached serve → CACHED status) are covered by integration tests (test/phase6-cache.test.ts) and are flagged as such — not claimed as production-proven",
    liveObservations: {
      "USD/INR": { httpStatus: fx.status, entry: fxEntry },
      "US10Y": { httpStatus: bond.status, entry: bondEntry },
    },
  };
  if (SUPABASE_PAT) {
    const cacheRows = await mgmtQuery(
      "select key, provider_id, payload, observed_at, expires_at from provider_cache where key in ('quote:USD/INR','quote:US10Y') order by updated_at desc",
    );
    const sourceAudit = await mgmtQuery(
      "select coalesce(array_agg(distinct provider_id), '{}') as providers from provider_cache",
    );
    const nonEntitled = await mgmtQuery(
      "select count(*)::int as n from provider_cache where provider_id not in ('fred-csv','exchangerate-api','ecb-fx')",
    );
    t621.dbEvidence = {
      entitledRows: cacheRows,
      distinctProvidersInCache: sourceAudit,
      nonEntitledRowCount: nonEntitled,
      interpretation: "steps 1,2 (write occurs) + 5 (observedAt preserved) + 7 (non-entitled never persisted) proven when rows exist with matching observed_at and nonEntitledRowCount.n = 0",
    };
    // T61.1 DB evidence: production execution + source allow-list.
    t621.observationsCronDbEvidence = {
      observedPrices: await mgmtQuery(
        "select count(*)::int as total, min(observed_date) as first_date, max(observed_date) as last_date, max(observed_at) as last_observed_at, coalesce(array_agg(distinct source), '{}') as sources from observed_prices",
      ),
      ingestionLog: await mgmtQuery(
        "select job_name, status, records_out, source, started_at from ingestion_log where job_name = 'reference_observations' order by started_at desc limit 5",
      ),
      nonEntitledObserved: await mgmtQuery(
        "select count(*)::int as n from observed_prices where source not in ('fred-csv','exchangerate-api','ecb-fx')",
      ),
      interpretation: "T61.1: production execution evidenced when ingestion_log shows reference_observations runs and observed_prices rows carry only allow-listed sources; row counts/timestamps are the raw evidence",
    };
  } else {
    t621.dbEvidence = { skipped: "SUPABASE_PAT not provided" };
    t621.blocked = "BLOCKED: persistent cache cannot be verified (DB evidence unavailable in this run)";
  }
  console.log(`[T62.1] FX: ${fx.status} ${JSON.stringify(fxEntry)}`);

  // ── Final reconciliation (T59.4) over the whole battery ─────────────
  const adminAfter = await getAdminSnapshot();
  const reconcileFull = deltaCounters(adminBefore, adminAfter);
  const reconciliation = {
    perScenario: { singlePhase: reconcileSinglePhase, full: reconcileFull },
    rule: "health volume counts SINGLE-path attempts only (bulk path deliberately bypasses withProviderHealth — Phase 6.1 forbids semantic changes). Reconciliation holds when: healthDelta(provider) == ledger.single(provider) for all providers, AND ledger.bulk('yahoo') matches the bulk-run events. Any other difference is reported as an unresolved measurement defect.",
    unresolvedDefects: [] as string[],
  };
  if (reconcileFull) {
    for (const [id, v] of Object.entries(reconcileFull.healthVolumeDeltaByProvider)) {
      const ledger = reconcileFull.upstream.perProviderLedger[id];
      const health = v.healthDelta ?? 0;
      const single = ledger?.single ?? 0;
      if (id === "yahoo") {
        // bulk attempts are expected to be invisible to health counters
        if (health !== single) {
          reconciliation.unresolvedDefects.push(`yahoo: healthDelta=${health} != ledger.single=${single} (bulk delta ${ledger?.bulk ?? 0} is expected to be outside health counters)`);
        }
      } else if (health !== single) {
        reconciliation.unresolvedDefects.push(`${id}: healthDelta=${health} != ledger.single=${single}`);
      }
    }
  }
  console.log(`[T59.4] unresolved defects: ${reconciliation.unresolvedDefects.length}`);

  // ── T59.6: traffic split ─────────────────────────────────────────────
  const finalSnap = adminAfter ?? adminMid ?? adminBefore;
  const t596 = {
    method: "per-process endpoint counters (this instance) from the admin measurement ledger",
    appRequestCounters: finalSnap?.measurement.counters.appRequests ?? null,
    batteryTraffic: {
      singleRequests: 1 + REPEAT_N + 2 * BURST_N + 2,
      batchRequests: dChunks.length + 2,
    },
    externalAttribution: "BLOCKED: production traffic attribution unavailable — no Vercel telemetry API access is configured for request-path analytics; app counters capture per-instance traffic only and are reported as-is.",
  };

  Object.assign(artifact, {
    scenarioA,
    scenarioB,
    scenarioC,
    scenarioD,
    scenarioE,
    reconciliation,
    observationsCron: t611,
    persistentCache: t621,
    trafficSplit: t596,
    adminSnapshots: {
      before: adminBefore,
      mid: adminMid,
      beforeD: adminBeforeD,
      beforeE: adminBeforeE,
      afterE: adminAfterE,
      after: adminAfter,
    },
  });

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2));
  console.log(`[battery] artifact written: ${ARTIFACT_PATH}`);

  // stdout summary
  const lines = [
    "",
    "════════ PHASE 6.1 MEASUREMENT BATTERY — SUMMARY ════════",
    `A  cold single ${aSym}: ${a.wallMs}ms, status=${aEntry?.status}, observedAt=${aEntry?.observedAt}`,
    `B  sequential repeats: walls=[${bWalls.join(", ")}] statuses=${scenarioB.statusSequence}`,
    `C  burst: identical p50=${scenarioC.identicalUrl.wallP50.value}ms distinct p50=${scenarioC.distinctUrls.wallP50.value}ms (sampleSize ${scenarioC.distinctUrls.wallP50.sampleSize})`,
    `D  batch: ${JSON.stringify(scenarioD.results.map(r => ({ req: r.symbolsRequested, ret: r.symbolsReturned, wall: r.wallMs })))}`,
    `E  repeated batch verdict: ${scenarioE.verdict}`,
    `T59.4 unresolved counter defects: ${reconciliation.unresolvedDefects.length}`,
    `T61.1 cron unauth probe: ${cronUnauth.status} (expect 401)`,
    "Full raw evidence: artifacts/phase6/T59_PRODUCTION_MEASUREMENT.json",
  ];
  console.log(lines.join("\n"));
}

main().catch(err => {
  console.error("[battery] FATAL:", err);
  process.exit(1);
});
