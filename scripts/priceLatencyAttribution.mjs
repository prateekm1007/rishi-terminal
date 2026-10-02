#!/usr/bin/env node
/**
 * Commit O (Coder Directions #13/#15) — REUSABLE PRICE-LATENCY ATTRIBUTION.
 *
 * The old discovery-engine lesson applies: deterministic plumbing is not the
 * bottleneck; upstream latency must be MEASURED separately. Every
 * performance round reports, per round:
 *   - total request wall time (measured at the caller);
 *   - served provenance (source/status/observedAt from the wire);
 *   - per-provider upstream attempt counts + latency (from the server's own
 *     measurement ledger via CRON_SECRET-protected /api/admin/providers —
 *     read before/after so the DELTA attributes exactly this round);
 *   - unavailable count.
 * Chat latency is attributed with the same pattern: wall time per request,
 * plus the wire's toolCalls (tool-loop completion count) and identity.
 *
 * Usage: node scripts/priceLatencyAttribution.mjs [BASE_URL] [OUT_JSON] [--chat]
 * Env:   CRON_SECRET (optional — when present, ledger deltas are attributed;
 *        without it the artifact degrades honestly to wall-time-only).
 * Exit:  0 always (measurement artifact; it reports, it does not gate).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "evidence", "commit-o", "price-latency-baseline.json");
const WITH_CHAT = process.argv.includes("--chat");
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();
const ROUNDS = Number(process.env.ROUNDS || 5);

// Indian-stock single-symbol chain subjects (NSE -> Yahoo v8 -> Yahoo v7 -> BSE)
const STOCKS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"];

async function timedFetch(url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(90_000) });
    const body = await r.json().catch(() => null);
    return { ms: Date.now() - t0, status: r.status, body };
  } catch (e) {
    return { ms: Date.now() - t0, status: 0, error: e.message };
  }
}

async function ledgerSnapshot() {
  if (!CRON_SECRET) return null;
  const r = await fetch(BASE + "/api/admin/providers", {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.measurement ?? null;
}

function deltaProviders(after, before) {
  if (!after || !before) return null;
  const out = {};
  const A = after.upstream?.byProvider ?? after.byProvider ?? {};
  const B = before.upstream?.byProvider ?? before.byProvider ?? {};
  for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const a = A[id] ?? {}, b = B[id] ?? {};
    const dc = (a.attempts ?? a.count ?? 0) - (b.attempts ?? b.count ?? 0);
    if (dc !== 0) out[id] = { attemptsDelta: dc };
  }
  return out;
}

const report = {
  probe: "price-latency-attribution",
  baseUrl: BASE,
  at: new Date().toISOString(),
  rounds: ROUNDS,
  ledgerDeltasAvailable: !!CRON_SECRET,
  singleSymbol: [],
  batch: [],
  chat: [],
};

const before = await ledgerSnapshot();

for (let i = 0; i < ROUNDS; i++) {
  const sym = STOCKS[i % STOCKS.length];
  const r = await timedFetch(`${BASE}/api/prices?symbol=${sym}`, { headers: { "Cache-Control": "no-cache" } });
  // R9 fix: the SINGLE route returns the entry UNWRAPPED for ?symbol=X
  // (no {prices:{}} wrapper, no symbol key) — the old lookup read
  // body.prices[sym] ?? body[sym] and silently recorded nulls for every
  // provenance field (a probe defect: the artifact claimed nothing while
  // the wire carried everything).
  const b = r.body;
  const entry =
    b?.prices?.[sym] ??
    (b && typeof b === "object" && ("price" in b || "status" in b) ? b : b?.[sym]) ??
    null;
  report.singleSymbol.push({
    symbol: sym,
    wallMs: r.ms,
    httpStatus: r.status,
    source: entry?.source ?? null,
    provStatus: entry?.status ?? null,
    observedAt: entry?.observedAt ?? null,
    change: entry?.change ?? null,
  });
  await new Promise((res) => setTimeout(res, 1500));
}

const mid = await ledgerSnapshot();

// Batch attribution: one cold-ish multi-symbol batch (25-symbol cap keeps the
// bulk path authoritative; unrelated to the single chain).
const bSymbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN", "ITC", "LT", "AXISBANK", "MARUTI", "SUNPHARMA"];
const b = await timedFetch(`${BASE}/api/prices/batch`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ symbols: bSymbols }),
});
const bPrices = b.body?.prices ?? {};
report.batch.push({
  symbols: bSymbols.length,
  wallMs: b.ms,
  httpStatus: b.status,
  unavailable: Object.values(bPrices).filter((p) => p?.status === "UNAVAILABLE").length,
  perSource: Object.values(bPrices).reduce((acc, p) => { acc[p?.source ?? "?"] = (acc[p?.source ?? "?"] ?? 0) + 1; return acc; }, {}),
});

if (WITH_CHAT) {
  // Chat latency attribution: philosophy (no tool) vs price (tool loop).
  for (const [label, message] of [
    ["philosophy-no-tool", "What is your view on patience in investing?"],
    ["price-tool-loop", "What is the latest price of RELIANCE?"],
  ]) {
    const c = await timedFetch(`${BASE}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: "damani", history: [], message }),
    });
    report.chat.push({
      kind: label,
      wallMs: c.ms,
      httpStatus: c.status,
      grounded: c.body?.provenance?.grounded ?? null,
      mode: c.body?.provenance?.groundingMode ?? null,
      structured: c.body?.provenance?.structuredResponse ?? null,
      toolLoopCompletions: (c.body?.provenance?.toolCalls ?? []).length,
      model: c.body?.provenance?.model ?? null,
    });
    await new Promise((res) => setTimeout(res, 3000));
  }
}

const after = await ledgerSnapshot();
report.providerDeltas = {
  singlePhase: deltaProviders(mid, before),
  batchPhase: deltaProviders(after, mid),
};

// p50/p95 helper over the single-symbol wall times.
function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
report.summary = {
  singleP50Ms: pct(report.singleSymbol.map((r) => r.wallMs), 0.5),
  singleP95Ms: pct(report.singleSymbol.map((r) => r.wallMs), 0.95),
  batchWallMs: report.batch[0]?.wallMs ?? null,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`priceLatencyAttribution: wrote ${OUT}`);
console.log(`  single p50=${report.summary.singleP50Ms}ms p95=${report.summary.singleP95Ms}ms (n=${ROUNDS})`);
console.log(`  batch wall=${report.summary.batchWallMs}ms (n=${bSymbols.length})`);
console.log(`  ledger deltas: ${report.ledgerDeltasAvailable ? "attributed" : "CRON_SECRET absent — wall-time only"}`);
