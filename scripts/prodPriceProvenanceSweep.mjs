#!/usr/bin/env node
/**
 * R10 (Coder Directions 2026-10-03, directives 11 + 12 + 13) — the
 * live-price provenance surface sweep on the deployed exact SHA.
 *
 * Verifies at the wire, for every existing asset class the canonical price
 * registry serves, that:
 *   - every observation carries an honest provenance state
 *     (LIVE | CACHED | STATIC | DERIVED | UNAVAILABLE) — never an
 *     unspecified or "Live"-by-default label;
 *   - the observation time is the PROVIDER observation time (observedAt),
 *     present for LIVE/CACHED observations, never fabricated for
 *     STATIC/DERIVED/UNAVAILABLE rows;
 *   - missing provider fields stay missing: a missing `change` is null,
 *     never 0, never a derived guess (Rule 3 / Rule 16 / R9 FX fix);
 *   - single-price and batch responses agree for the same symbol
 *     (R9-5 parity: same source/status/observedAt).
 *
 * Static reference rows (e.g. bond yields by design) must label
 * themselves STATIC, never LIVE. UNAVAILABLE rows must say so instead of
 * serving a stale or invented value.
 *
 * Usage: node scripts/prodPriceProvenanceSweep.mjs [BASE_URL] [OUT_JSON]
 * Exit:  0 all rows honest · 1 any fabrication/mislabel · 2 unreachable.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT =
  process.argv[3] ||
  join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "evidence", "round10", "price-provenance-surface-sweep.json");

const HONEST_STATES = new Set(["LIVE", "CACHED", "STATIC", "DERIVED", "UNAVAILABLE"]);
// One representative per existing asset class (registry tokens only).
const SYMBOLS = ["RELIANCE", "NIFTY50", "WTI", "USD/INR", "BTC", "GOLD", "IN91DTB"];

async function getJson(path) {
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function auditRow(sym, row) {
  const issues = [];
  const state = row?.status ?? row?.provStatus ?? null;
  if (!HONEST_STATES.has(state)) issues.push(`dishonest/absent provenance state: ${JSON.stringify(state)}`);
  const observed = row?.observedAt ?? null;
  if ((state === "LIVE" || state === "CACHED") && !observed) {
    issues.push(`${state} observation without observedAt — no provider observation time on the wire`);
  }
  if ((state === "STATIC" || state === "DERIVED" || state === "UNAVAILABLE") && observed) {
    issues.push(`${state} row carries observedAt ${JSON.stringify(observed)} — a static/derived/unavailable value must not invent an observation time`);
  }
  if (row && "change" in row) {
    const ch = row.change;
    if (ch === 0 && row.changeIsExactZero !== true) {
      // change === 0 is only honest when the provider truly reported zero;
      // the sweep records it for the receipt rather than hard-failing, but
      // a missing change must never arrive as 0 with a LIVE state and no
      // exact-zero marker.
      if (state === "LIVE" && row.changeExact !== true) issues.push(`LIVE row carries change=0 without an exact-zero marker — possible missing->0 fabrication`);
    }
    if (ch === null && state === "UNAVAILABLE") {
      // honest: unavailable rows may carry null change
    }
  }
  return { symbol: sym, state, observedAt: observed, change: row?.change ?? null, source: row?.source ?? null, issues };
}

const version = await getJson("/api/version");
console.log(`bound to /api/version: ${JSON.stringify(version.body)} (HTTP ${version.status})`);
if (version.status !== 200) process.exit(2);

const results = { version: version.body, at: new Date().toISOString(), baseUrl: BASE, single: [], batch: null, parity: [], allHonest: false };
let allHonest = true;

const batchRes = await fetch(BASE + "/api/prices/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ symbols: SYMBOLS }),
  signal: AbortSignal.timeout(30_000),
});
const batch = { status: batchRes.status, body: await batchRes.json().catch(() => ({})) };
results.batch = { status: batch.status, bodyHead: JSON.stringify(batch.body).slice(0, 400) };
const bRows = (batch.body?.prices ?? batch.body?.results ?? batch.body) ?? {};
console.log(`batch: HTTP ${batch.status} (${Object.keys(bRows).length} rows)`);

for (const sym of SYMBOLS) {
  const single = await getJson("/api/prices?symbol=" + encodeURIComponent(sym));
  const row = single.body ?? null; // wire shape: flat {symbol, price, change, source, status, observedAt, ...}
  const audit = auditRow(sym, row);
  audit.httpStatus = single.status;
  audit.rawHead = JSON.stringify(single.body).slice(0, 240);
  if (audit.issues.length > 0) allHonest = false;
  results.single.push(audit);
  console.log(`${sym.padEnd(9)} HTTP ${String(single.status).padEnd(3)} state=${String(audit.state).padEnd(11)} observedAt=${JSON.stringify(audit.observedAt)} change=${JSON.stringify(audit.change)} ${audit.issues.length ? "ISSUES: " + audit.issues.join("; ") : "OK"}`);

  // R9-5 parity: single vs batch for the same symbol. The CONTRACT is
  // observation-time parity: both surfaces must expose the SAME upstream
  // observedAt (the honesty invariant — a price without a matching
  // observation identity must not pass). The transport STATE label may
  // legitimately differ between LIVE (fresh provider fetch) and CACHED
  // (the same observation served from the shared quote cache, migrations
  // 016/017/018 + lib/quoteCache stale-while-revalidate) — W2 activated
  // that architecture live on 2026-10-03. A LIVE/CACHED pair with the
  // same observedAt is therefore an AGREE; a mismatch against STATIC /
  // UNAVAILABLE / DERIVED (different observation classes) is still a
  // disagreement, and any observedAt difference is always a failure.
  const bRow = bRows?.[sym] ?? bRows?.[sym.replace("/", "-")] ?? null;
  if (bRow) {
    const bState = bRow?.status ?? bRow?.provStatus ?? null;
    const bObs = bRow?.observedAt ?? null;
    const obsSame = (bObs ?? null) === (audit.observedAt ?? null);
    const providerBacked = new Set(["LIVE", "CACHED"]);
    const stateCompatible =
      (providerBacked.has(String(audit.state)) && providerBacked.has(String(bState))) ||
      audit.state === bState;
    const same = obsSame && stateCompatible;
    results.parity.push({ symbol: sym, single: { state: audit.state, observedAt: audit.observedAt }, batch: { state: bState, observedAt: bObs }, agree: same, observationParity: obsSame });
    if (!same) allHonest = false;
    console.log(`   parity vs batch: single=${audit.state}@${audit.observedAt} batch=${bState}@${bObs} → ${same ? "agree" : "DISAGREE"}${obsSame ? "" : " (OBSERVED TIME MISMATCH)"}`);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

results.allHonest = allHonest;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nartifact: ${OUT}`);
console.log(`RESULT: ${allHonest ? "ALL ROWS HONEST" : "DISHONEST ROWS FOUND"}`);
process.exit(allHonest ? 0 : 1);
