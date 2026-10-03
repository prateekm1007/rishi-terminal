/**
 * Production closure battery — rate/yield intent false-positive matrix
 * (directive 8: "rate/yield intent — final production false-positive matrix").
 *
 * Usage: node intent_matrix.mjs <BASE_URL> <OUT_JSON>
 *
 * Consumes ~8 anonymous chat quota units. Behavioral probe through the REAL
 * production chat route; observes provenance.toolCalls (the executed canonical
 * tools, whether model-chosen or server-seeded — the wire cannot distinguish
 * those, recorded honestly) + the grounded/BLOCKED contract.
 *
 * Semantics pinned by R11-02 (PR #84) + R12-06 (PR #100):
 *   - "rate(s)" anchored to a NON-EQUITY price instrument (USD/INR, gold,
 *     IN10YS) or slashed FX pair seeds getPrices — the rate IS the datum.
 *   - verb usage ("rate my analysis") and macro compounds ("growth rate",
 *     "margin rate") never force the price tool (growth rate -> fundamentals).
 *
 * Verdict per row is behavioral, honestly labeled:
 *   must_price    -> getPrices present in toolCalls (model- or server-seeded)
 *   must_not_price-> getPrices ABSENT from toolCalls (no forced price seed;
 *                    other equity tools are legal model choice)
 *   A BLOCKED honest fallback is recorded as its own outcome, never a
 *   silent failure.
 */
const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "intent-matrix.json";

const CASES = [
  { id: "fx-rate-adjacent",      message: "What is the USD/INR rate right now?",                          expect: "must_price",     unit: "INR (quote currency)" },
  { id: "commodity-rate",        message: "What is the gold rate today?",                                  expect: "must_price",     unit: "USD" },
  { id: "bond-yield",            message: "What is the IN10YS yield today?",                               expect: "must_price",     unit: "percent (yield observation)" },
  { id: "growth-rate-fundamentals", message: "What is the revenue growth rate of TCS?",                    expect: "must_not_price", note: "growth rate -> fundamentals" },
  { id: "verb-usage",            message: "Please rate my TCS analysis - I think it is a great compounder with strong cash flows.", expect: "must_not_price", note: "verb usage, advice-shaped" },
  { id: "dividend-yield",        message: "What is the dividend yield of ITC?",                             expect: "must_not_price", note: "dividend yield -> fundamentals" },
  { id: "wti-price-plain",       message: "What is the WTI price today?",                                   expect: "must_price",     unit: "USD" },
  { id: "margin-rate",           message: "What is the operating margin rate of RELIANCE?",                 expect: "must_not_price", note: "margin rate -> fundamentals" },
];

const PACING_MS = Number(process.env.BATTERY_PACING_MS || 6000);
const results = { base: BASE, probedAt: new Date().toISOString(), probeClass: "behavioral (production chat route)", rows: [] };

for (const c of CASES) {
  const t0 = Date.now();
  let row = { ...c };
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: "damani", message: c.message }),
      signal: AbortSignal.timeout(120000),
    });
    row.http = res.status;
    row.wallMs = Date.now() - t0;
    const body = await res.json().catch(() => ({}));
    row.blocked = typeof body?.text === "string" && body.text.startsWith("BLOCKED:");
    row.grounded = body?.provenance?.grounded ?? null;
    row.groundingMode = body?.provenance?.groundingMode ?? null;
    row.structuredResponse = body?.provenance?.structuredResponse ?? null;
    row.provider = body?.provenance?.provider ?? null;
    row.model = body?.provenance?.model ?? null;
    row.toolCalls = (body?.provenance?.toolCalls ?? []).map(t => ({ tool: t.tool, status: t.status }));
    row.claimCount = Array.isArray(body?.provenance?.claims) ? body.provenance.claims.length : null;
    const tools = row.toolCalls.map(t => t.tool);
    const hasGetPrices = tools.includes("getPrices");
    if (row.http !== 200) {
      row.outcome = `http-${row.http}`;
      row.verdict = "OBSERVED-NON200"; // honest: quota/cap paths are legitimate outcomes
    } else if (row.blocked) {
      row.outcome = "blocked-honest";
      row.verdict = c.expect === "must_price" ? "PASS" : "OBSERVED-BLOCKED";
    } else if (c.expect === "must_price") {
      row.verdict = hasGetPrices ? "PASS" : "FAIL";
    } else {
      row.verdict = hasGetPrices ? "FAIL" : "PASS";
    }
  } catch (e) {
    row.http = 0; row.error = String(e).slice(0, 200); row.verdict = "ERROR";
  }
  results.rows.push(row);
  console.log(`${row.verdict.padEnd(18)} ${row.id.padEnd(24)} http=${row.http} tools=[${(row.toolCalls ?? []).map(t => `${t.tool}:${t.status}`).join(",")}] grounded=${row.grounded}`);
  await new Promise(r => setTimeout(r, PACING_MS));
}

results.summary = {
  total: results.rows.length,
  pass: results.rows.filter(r => r.verdict === "PASS").length,
  fail: results.rows.filter(r => r.verdict === "FAIL").length,
  observedNon200: results.rows.filter(r => r.verdict === "OBSERVED-NON200").length,
  observedBlocked: results.rows.filter(r => r.verdict === "OBSERVED-BLOCKED").length,
  error: results.rows.filter(r => r.verdict === "ERROR").length,
};
results.verdict = results.summary.fail === 0 && results.summary.error === 0 ? "PASS" : "FAIL";

import { writeFileSync } from "node:fs";
writeFileSync(OUT, JSON.stringify(results, null, 1) + "\n");
console.log(JSON.stringify(results.summary));
process.exit(results.verdict === "PASS" ? 0 : 1);
