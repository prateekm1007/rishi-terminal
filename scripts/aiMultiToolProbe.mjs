#!/usr/bin/env node
/**
 * R11 (directive 14) — multi-tool composition measurement on production.
 *
 * Directive 14: test real user questions requiring MORE THAN ONE existing
 * capability (profile+price+score, fundamentals+score, stock+peers,
 * price+provenance), measure tool count and wall time rather than assuming
 * multi-tool behavior is efficient. The AI must request only the necessary
 * tools, reuse the same CanonicalStockState (memoHits on the wire), stay
 * within the four-call bound, and produce one coherent grounded answer.
 *
 * Anonymous chat (no symbol param — the model chooses its own tools).
 * ~8 quota units. 7s pacing (under the 12/60s burst limit).
 * Usage: node scripts/aiMultiToolProbe.mjs [BASE_URL] [OUT_JSON]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT = process.argv[3] || "docs/evidence/round11/ai-multitool-composition-probe.json";

const QUESTIONS = [
  {
    id: "profile-price-score",
    q: "Give me TCS's live price, its Rishi score, and a quick profile of the business.",
    expectTools: ["getStock", "getPrices", "getScore"],
  },
  {
    id: "fundamentals-score",
    q: "How do INFY's fundamentals line up with its Rishi score?",
    expectTools: ["getFinancials", "getScore"],
  },
  {
    id: "stock-peers",
    q: "How does TCS compare to its peers?",
    expectTools: ["getStock", "getPeers"],
  },
  {
    id: "price-provenance",
    q: "What is RELIANCE's live price and how fresh is that data?",
    expectTools: ["getPrices"],
  },
];

async function version() {
  const r = await fetch(`${BASE}/api/version`);
  return (await r.json()).sha;
}

async function ask(question) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personaId: "buffett",
      history: [],
      message: question,
    }),
  });
  const wallMs = Date.now() - t0;
  let body = null;
  try { body = await r.json(); } catch { /* non-json */ }
  return { status: r.status, wallMs, body };
}

const sha = await version();
console.log(`bound to /api/version: ${sha}`);
const rows = [];
for (const { id, q, expectTools } of QUESTIONS) {
  const res = await ask(q);
  const prov = res.body?.provenance ?? {};
  const t = prov.timings ?? {};
  const tools = (t.completions ?? []).length
    ? (prov.toolCalls ?? []).map(c => ({ tool: c.tool, symbol: c.symbol, status: c.status, ms: c.ms }))
    : [];
  const row = {
    id,
    question: q,
    expectTools,
    httpStatus: res.status,
    wallMs: res.wallMs,
    grounded: prov.grounded ?? null,
    groundingMode: prov.groundingMode ?? null,
    toolCalls: prov.toolCalls ?? [],
    toolCount: (prov.toolCalls ?? []).length,
    distinctTools: [...new Set((prov.toolCalls ?? []).map(c => c.tool))],
    provider: prov.provider ?? null,
    model: prov.model ?? null,
    completions: t.completions ?? [],
    repairs: t.repairs ?? [],
    memoHits: t.memoHits ?? null,
    withinFourCallBound: (prov.toolCalls ?? []).length <= 4,
    answerHead: (res.body?.text ?? res.body?.error ?? "").slice(0, 220),
  };
  rows.push(row);
  console.log(
    `[${id}] HTTP ${res.status} wall=${res.wallMs}ms tools=${row.toolCount}(${row.distinctTools.join("|")}) ` +
    `grounded=${row.grounded} mode=${row.groundingMode} bound4=${row.withinFourCallBound}`,
  );
  await new Promise(r => setTimeout(r, 7000));
}

const doc = {
  directive: "R11 directive 14 — multi-tool composition measurement",
  base: BASE,
  version: sha,
  generatedAt: new Date().toISOString(),
  rows,
  summary: {
    n: rows.length,
    http200: rows.filter(r => r.httpStatus === 200).length,
    multiToolRows: rows.filter(r => r.toolCount >= 2).length,
    allWithinFourCallBound: rows.every(r => r.withinFourCallBound),
    groundedRows: rows.filter(r => r.grounded === true).length,
    avgToolCount: rows.length ? +(rows.reduce((a, r) => a + r.toolCount, 0) / rows.length).toFixed(2) : null,
    wallP50: rows.length ? rows.map(r => r.wallMs).sort((a, b) => a - b)[Math.floor(rows.length / 2)] : null,
  },
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(doc, null, 2));
console.log(`artifact: ${OUT}`);
console.log("SUMMARY:", JSON.stringify(doc.summary));
