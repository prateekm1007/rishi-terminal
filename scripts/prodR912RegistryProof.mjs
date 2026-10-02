#!/usr/bin/env node
/**
 * R10 (Coder Directions 2026-10-03, directive 10) — the R9-12 production
 * proof on the deployed exact SHA.
 *
 * R9-12 (merge 11b4767, "the AI tool layer reads the ONE registry") was
 * unit-proven RED→GREEN locally; directive 10 requires the production
 * version of the same matrix after final deployment, because the defect
 * the fix closed was only observable in production behavior.
 *
 * Four chat cases (anonymous free-tier path, 6s paced — under the 12/60s
 * per-IP burst limiter) plus two direct canonical-registry GETs that
 * carry no AI and consume no chat quota:
 *
 *   wti-price       "What is the latest price of WTI?"
 *                   → toolExecutions contains getPrices(WTI) status=ok
 *                     and the reply is grounded (upstream data existed at
 *                     probe time; if the upstream is down the wire must
 *                     still show getPrices with an honest non-ok state and
 *                     the probe records exactly that — it does not fake a
 *                     pass).
 *   fx-alias        "What is the current USDINR rate?"
 *                   → getPrices resolves the unslashed alias to the
 *                     canonical USD/INR instrument and grounds the reply.
 *   wti-stock-only  "What are the financial fundamentals of WTI?"
 *                   → the stock-only tools answer honest no-data for the
 *                     registry ticker; unknown-symbol is a FAIL.
 *   unknown-symbol  "What is the latest price of UNKLAR9X?"
 *                   → getPrices reports unknown-symbol and no fabricated
 *                     price is served.
 *
 * Every case records the raw wire summary (tool executions, grounding
 * state, structured response, provider/model identity, attempt statuses).
 * The artifact is bound to /api/version.
 *
 * Usage: node scripts/prodR912RegistryProof.mjs [BASE_URL] [OUT_JSON]
 * Exit:  0 all cases match their expected observables · 1 any mismatch ·
 *        2 unreachable/config.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT =
  process.argv[3] ||
  join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "evidence", "round10", "r912-registry-production-proof.json");

const PACING_MS = Number(process.env.PROOF_PACING_MS ?? 6000);
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [10_000, 20_000];
const RETRYABLE = (status) => status === 429 || (status >= 500 && status <= 599);

const CASES = [
  {
    id: "wti-price",
    question: "What is the latest price of WTI?",
    expect: (s) => {
      const gp = (s.toolExecutions ?? []).filter((t) => t.tool === "getPrices" && t.symbol === "WTI");
      if (gp.some((t) => t.status === "ok") && s.grounded) return { pass: true, note: "getPrices(WTI)=ok, grounded" };
      if (gp.length > 0) return { pass: false, note: `getPrices(WTI) ran but statuses=${gp.map(t => t.status).join(",")} grounded=${s.grounded}` };
      return { pass: false, note: `getPrices(WTI) not engaged; tools=${JSON.stringify(s.toolExecutions)}` };
    },
  },
  {
    id: "fx-alias",
    question: "What is the current USDINR rate?",
    expect: (s) => {
      const gp = (s.toolExecutions ?? []).filter((t) => t.tool === "getPrices");
      const canon = (s.answerHeadU ?? "").includes("USD/INR") || JSON.stringify(s.toolExecutions ?? []).includes("USD/INR");
      if (gp.some((t) => t.status === "ok") && s.grounded && canon) return { pass: true, note: "USDINR resolved to canonical USD/INR, grounded" };
      if (gp.length > 0) return { pass: false, note: `getPrices ran, statuses=${gp.map(t => t.status).join(",")}, grounded=${s.grounded}, canonical-visible=${canon}` };
      return { pass: false, note: `getPrices not engaged; tools=${JSON.stringify(s.toolExecutions)}` };
    },
  },
  {
    id: "wti-stock-only",
    question: "What are the financial fundamentals of WTI?",
    expect: (s) => {
      const stockOnly = (s.toolExecutions ?? []).filter((t) => t.tool !== "getPrices");
      const unknownSymbol = (s.toolExecutions ?? []).some((t) => t.status === "unknown-symbol");
      const noData = stockOnly.some((t) => t.status === "no-data") || (s.toolExecutions ?? []).some((t) => t.tool === "getPrices" && t.status === "no-data");
      if (noData && !unknownSymbol) return { pass: true, note: "honest no-data for WTI stock-only ask (not unknown-symbol)" };
      if (unknownSymbol) return { pass: false, note: "FAIL: registry ticker WTI surfaced as unknown-symbol (the R9-12 defect)" };
      return { pass: false, note: `no honest no-data observed; tools=${JSON.stringify(s.toolExecutions)}` };
    },
  },
  {
    id: "unknown-symbol",
    question: "What is the latest price of UNKLAR9X?",
    expect: (s) => {
      const unk = (s.toolExecutions ?? []).some((t) => t.status === "unknown-symbol");
      const fabricated = /\$?\s?\d[\d,]*(\.\d+)?\s?(inr|usd|₹)/i.test(s.answerHeadU ?? "") && s.grounded;
      if (unk && !fabricated) return { pass: true, note: "unknown-symbol surfaced honestly, no fabricated grounded price" };
      if (fabricated) return { pass: false, note: "FAIL: grounded reply contains price-shaped text for an unknown symbol" };
      return { pass: false, note: `unknown-symbol not observed; tools=${JSON.stringify(s.toolExecutions)} grounded=${s.grounded}` };
    },
  },
];

async function getJson(path) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ms: Date.now() - t0, body };
}

async function chat(message) {
  const t0 = Date.now();
  let status = 0;
  let body = {};
  try {
    const res = await fetch(BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId: "damani", history: [], message }),
    });
    status = res.status;
    body = await res.json().catch(() => ({}));
  } catch (e) {
    body = { fetchError: String(e) };
  }
  return { status, wallMs: Date.now() - t0, body };
}

function summarize(r) {
  const prov = r.body?.provenance ?? {};
  const t = prov.timings ?? {};
  return {
    status: r.status,
    wallMs: r.wallMs,
    grounded: prov.grounded === true,
    claimsVerified: prov.claimsVerified === true,
    groundingMode: prov.groundingMode ?? null,
    structuredResponse: prov.structuredResponse ?? null,
    provider: prov.provider ?? null,
    model: prov.model ?? null,
    toolExecutions: t.toolExecutions ?? [],
    repairs: t.repairs ?? [],
    answerHeadU: String(r.body?.text ?? "").slice(0, 240),
  };
}

const version = await getJson("/api/version");
console.log(`bound to /api/version: ${JSON.stringify(version.body)} (HTTP ${version.status})`);
if (version.status !== 200) {
  console.error("unreachable: /api/version did not return 200");
  process.exit(2);
}

const results = { version: version.body, generatedAt: new Date().toISOString(), baseUrl: BASE, registryGets: {}, cases: [] };

for (const [sym, path] of [["WTI", "/api/prices?symbol=WTI"], ["USD/INR", "/api/prices?symbol=USD%2FINR"]]) {
  const g = await getJson(path);
  results.registryGets[sym] = {
    status: g.status,
    bodyHead: JSON.stringify(g.body).slice(0, 400),
    ms: g.ms,
  };
  console.log(`registry GET ${sym}: HTTP ${g.status} ${g.ms}ms`);
  await new Promise((res) => setTimeout(res, 1500));
}

let allPass = true;
for (const c of CASES) {
  const attemptStatuses = [];
  let r = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    r = await chat(c.question);
    attemptStatuses.push(r.status);
    if (!RETRYABLE(r.status) && !r.body?.fetchError) break;
    if (attempt < MAX_ATTEMPTS) {
      const backoff = RETRY_BACKOFF_MS[attempt - 1];
      console.log(`  [retry] case=${c.id} attempt=${attempt} status=${r.status} — backoff ${backoff}ms`);
      await new Promise((res) => setTimeout(res, backoff));
    }
  }
  const s = summarize(r);
  s.attemptStatuses = attemptStatuses;
  const verdict = c.expect(s);
  s.verdict = verdict;
  allPass = allPass && verdict.pass;
  results.cases.push({ id: c.id, question: c.question, summary: s });
  console.log(
    `[${c.id}] status=${s.status} grounded=${s.grounded} mode=${s.groundingMode} ` +
    `tools=${JSON.stringify(s.toolExecutions)} → ${verdict.pass ? "PASS" : "FAIL"}: ${verdict.note}`,
  );
  console.log(`   answerHead: ${JSON.stringify(s.answerHeadU.slice(0, 180))}`);
  await new Promise((res) => setTimeout(res, PACING_MS));
}

results.allPass = allPass;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`\nartifact: ${OUT}`);
console.log(`RESULT: ${allPass ? "ALL CASES PASS" : "AT LEAST ONE CASE FAILED"}`);
process.exit(allPass ? 0 : 1);
