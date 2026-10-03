/**
 * Production closure battery — health / env-dependent path sweep (no chat quota).
 *
 * Usage: node health_env_sweep.mjs <BASE_URL> <OUT_JSON>
 *
 * Coverage (directive 7): /api/health (status, db, ingest stamps, degraded
 * reasons), /api/version, env-dependent critical paths:
 *   - /api/prices?symbol=RELIANCE  (live provider path, equity)
 *   - /api/prices?symbol=WTI       (registry non-equity: commodity)
 *   - /api/prices?symbol=USD/INR   (registry non-equity: FX, slashed)
 *   - /api/prices?symbol=BTC       (registry non-equity: crypto)
 *   - /api/fundamentals?symbol=RELIANCE (DB/seed fundamentals path)
 *   - /api/search?q=RELIA          (canonical registry search)
 * Honest record: every field as-observed; no pass/fail on ingest stamps
 * (recorded for the health verdict), only on hard contract violations.
 */
const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "health-env-sweep.json";

const results = { base: BASE, probedAt: new Date().toISOString(), checks: {} };

async function getJson(path, expect = 200) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30000) });
    const ms = Date.now() - t0;
    let body = null;
    const text = await res.text();
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 300) }; }
    return { http: res.status, ms, body, expected: expect, ok: res.status === expect };
  } catch (e) {
    return { http: 0, ms: Date.now() - t0, error: String(e).slice(0, 200), expected: expect, ok: false };
  }
}

// 1. /api/health — full record (status, db, ingest stamps, reasons)
const health = await getJson("/api/health");
results.checks.health = {
  http: health.http, ms: health.ms, ok: health.ok,
  status: health.body?.status ?? null,
  db: health.body?.db ?? null,
  lastPriceIngestAt: health.body?.lastPriceIngestAt ?? null,
  lastFundamentalsIngestAt: health.body?.lastFundamentalsIngestAt ?? null,
  engineVersion: health.body?.engineVersion ?? null,
  reasons: health.body?.reasons ?? null,
};

// 2. /api/version — recorded raw (identity chain handled by prodReceipt)
const version = await getJson("/api/version");
results.checks.version = { http: version.http, ok: version.ok, sha: version.body?.sha ?? null };

// 3. env-dependent price paths (live provider + registry)
for (const [name, path, expect] of [
  ["price_equity_RELIANCE", "/api/prices?symbol=RELIANCE", 200],
  ["price_commodity_WTI", "/api/prices?symbol=WTI", 200],
  ["price_fx_USDINR_slashed", "/api/prices?symbol=USD%2FINR", 200],
  ["price_crypto_BTC", "/api/prices?symbol=BTC", 200],
]) {
  const r = await getJson(path, expect);
  const b = r.body;
  results.checks[name] = {
    http: r.http, ms: r.ms, ok: r.ok,
    // honest observation: entry shape varies (single vs batch); record the
    // price status/source/unit fields that exist
    status: b?.status ?? b?.prices?.[0]?.status ?? null,
    source: b?.source ?? b?.prices?.[0]?.source ?? null,
    observedAt: b?.observedAt ?? b?.prices?.[0]?.observedAt ?? null,
    unit: b?.unit ?? b?.prices?.[0]?.unit ?? null,
    price: b?.price ?? b?.prices?.[0]?.price ?? null,
  };
}

// 4. fundamentals path
const fund = await getJson("/api/fundamentals?symbol=RELIANCE");
results.checks.fundamentals_RELIANCE = {
  http: fund.http, ms: fund.ms, ok: fund.ok,
  source: fund.body?.source ?? null,
  marketCap: fund.body?.marketCap ?? null,
  lastUpdated: fund.body?.lastUpdated ?? null,
};

// 5. search path
const search = await getJson("/api/search?q=RELIA");
results.checks.search_RELIA = {
  http: search.http, ms: search.ms, ok: search.ok,
  resultCount: Array.isArray(search.body?.results) ? search.body.results.length : null,
};

const verdict = Object.values(results.checks).every(c => c.ok) ? "PASS" : "FAIL";
results.verdict = verdict;

import { writeFileSync } from "node:fs";
writeFileSync(OUT, JSON.stringify(results, null, 1) + "\n");
console.log(JSON.stringify({ verdict, checks: Object.fromEntries(Object.entries(results.checks).map(([k, v]) => [k, { http: v.http, ok: v.ok }])) }, null, 1));
process.exit(verdict === "PASS" ? 0 : 1);
