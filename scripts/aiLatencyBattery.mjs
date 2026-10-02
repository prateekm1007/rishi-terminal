#!/usr/bin/env node
/**
 * Round 9 (Coder Directions 2026-10-02, directive 9) — the LARGER
 * production AI latency battery, run against the deployed SHA.
 *
 * Minimum useful battery:
 *   - >=20 ordinary financial-data questions;
 *   - >=10 philosophy/context-only questions;
 *   - >=10 invalid/unknown-symbol questions;
 *   per class and overall: first-pass grounded rate, repair rate by cause
 *   (the R9-4 taxonomy rides the wire in provenance.timings.repairs),
 *   average + P95 completion latency per stage, wall P50/P95, provider
 *   attempts, tool count, evidence assembly time (when the wire carries
 *   priceFetches/fundamentalsFetches), validation time.
 *
 * Every result is bound to /api/version and records the exact
 * provider/model identity from the wire. Sequential execution: the global
 * 150/day chat quota is a spend control — this battery consumes ~44 of it
 * by founder sanction (the directive orders the battery).
 *
 * Usage: node scripts/aiLatencyBattery.mjs [BASE_URL] [OUT_JSON]
 * Exit:  0 always (measurement artifact; it reports, it does not gate).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const OUT =
  process.argv[3] ||
  join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "evidence", "round9", "ai-latency-battery.json");

const FINANCIAL = [
  "What is the latest price of RELIANCE?",
  "What is the latest price of TCS?",
  "What is the current price of INFY?",
  "What is HDFCBANK trading at right now?",
  "What is the latest price of ICICIBANK?",
  "What is the latest price of SBIN?",
  "What is the current price of WIPRO?",
  "What is the latest price of ITC?",
  "What is the latest price of LT?",
  "What is the current price of AXISBANK?",
  "What is the latest price of BHARTIARTL?",
  "What is the latest price of KOTAKBANK?",
  "What is the latest price of MARUTI?",
  "What is the current price of TATAMOTORS?",
  "What is the latest price of SUNPHARMA?",
  "What is the latest price of BAJFINANCE?",
  "What is the current price of HINDUNILVR?",
  "What is the latest price of ADANIENT?",
  "What is the latest price of NIFTY50?",
  "What is the current price of BTC?",
  "What is the latest price of GOLD?",
  "What is the current USD/INR rate?",
];
const PHILOSOPHY = [
  "What did the sages teach about patience in investing?",
  "How should one think about greed in markets?",
  "What is the role of detachment in decision making?",
  "Tell me about the nature of long-term thinking.",
  "How do the rishis view uncertainty?",
  "What is wisdom about wealth according to ancient teachings?",
  "How should one respond to loss?",
  "What does dharma say about honest work?",
  "Teach me something about compound discipline of character.",
  "What is the relationship between fear and clarity?",
  "How should a seeker approach learning?",
];
const INVALID = [
  "What is the latest price of BOGUSXYZ?",
  "What is the current price of FAKECORP?",
  "What is the latest price of NOTAREAL?",
  "What is the current price of ZZZZZZZ?",
  "What is the latest price of XYZZY42?",
  "What is the current price of QWERTY9?",
  "What is the latest price of PLUGH77?",
  "What is the current price of MADEUPCO?",
  "What is the latest price of NOSYMBOL1?",
  "What is the current price of TESTFAIL3?",
  "What is the latest price of RANDOMTIC?",
];

async function getJson(path) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ms: Date.now() - t0, body };
}

async function chat(personaId, message) {
  const t0 = Date.now();
  let status = 0;
  let body = {};
  try {
    const res = await fetch(BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId, history: [], message }),
    });
    status = res.status;
    body = await res.json().catch(() => ({}));
  } catch (e) {
    body = { fetchError: String(e) };
  }
  return { status, wallMs: Date.now() - t0, body };
}

function percentile(arr, p) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function summarizeRun(r) {
  const prov = r.body?.provenance ?? {};
  const t = prov.timings ?? {};
  const stages = {};
  for (const c of t.completions ?? []) {
    stages[c.stage] = stages[c.stage] ?? { count: 0, msTotal: 0 };
    stages[c.stage].count += 1;
    stages[c.stage].msTotal += c.ms ?? 0;
  }
  return {
    status: r.status,
    wallMs: r.wallMs,
    grounded: prov.grounded === true,
    claimsVerified: prov.claimsVerified === true,
    groundingMode: prov.groundingMode ?? null,
    structuredResponse: prov.structuredResponse ?? null,
    provider: prov.provider ?? null,
    model: prov.model ?? null,
    providerAttempts: t.providerAttempts ?? null,
    toolExecutions: t.toolExecutions ?? [],
    repairs: t.repairs ?? [],
    validationMs: t.validationMs ?? null,
    priceFetches: t.priceFetches ?? [],
    fundamentalsFetches: t.fundamentalsFetches ?? [],
    memoHits: t.memoHits ?? null,
    completionStages: stages,
    firstPassGrounded: prov.grounded === true && (t.repairs ?? []).length === 0,
    answerHead: String(r.body?.text ?? "").slice(0, 160),
  };
}

function aggregate(results) {
  const walls = results.map(r => r.wallMs);
  const allCompletions = results.flatMap(r => Object.entries(r.completionStages).map(([stage, s]) => ({ stage, ...s })));
  const stageAgg = {};
  for (const c of allCompletions) {
    stageAgg[c.stage] = stageAgg[c.stage] ?? { count: 0, msTotal: 0 };
    stageAgg[c.stage].count += c.count;
    stageAgg[c.stage].msTotal += c.msTotal;
  }
  const repairCauses = {};
  for (const r of results) for (const rep of r.repairs) repairCauses[rep.cause] = (repairCauses[rep.cause] ?? 0) + 1;
  const completionMs = results.flatMap(r => (r.completionStages.repair ? [] : [])); // per-completion ms lives in stages above
  return {
    n: results.length,
    firstPassGrounded: results.filter(r => r.firstPassGrounded).length,
    grounded: results.filter(r => r.grounded).length,
    repaired: results.filter(r => r.repairs.length > 0).length,
    blocked: results.filter(r => r.structuredResponse === "blocked").length,
    invalid: results.filter(r => r.structuredResponse === "invalid").length,
    wallP50: percentile(walls, 50),
    wallP95: percentile(walls, 95),
    wallAvg: walls.length ? Math.round(walls.reduce((a, b) => a + b, 0) / walls.length) : null,
    completionStageAverages: Object.fromEntries(
      Object.entries(stageAgg).map(([s, v]) => [s, { count: v.count, avgMs: Math.round(v.msTotal / Math.max(1, v.count)) }]),
    ),
    repairCauses,
    totalToolExecutions: results.reduce((a, r) => a + (r.toolExecutions?.length ?? 0), 0),
    validationMsTotal: results.reduce((a, r) => a + (r.validationMs ?? 0), 0),
    providerAttemptsTotal: results.reduce((a, r) => a + (r.providerAttempts ?? 0), 0),
  };
}

async function runClass(label, personaId, questions) {
  console.log(`\n== ${label}: ${questions.length} questions ==`);
  const results = [];
  for (const q of questions) {
    const r = await chat(personaId, q);
    const s = summarizeRun(r);
    results.push(s);
    console.log(
      `  [${String(r.wallMs).padStart(6)}ms] grounded=${s.grounded} firstPass=${s.firstPassGrounded} ` +
      `repairs=${s.repairs.map(x => x.cause).join(",") || "-"} mode=${s.groundingMode} ` +
      `stages=${Object.entries(s.completionStages).map(([k, v]) => `${k}:${v.count}`).join("/") || "-"}`,
    );
    await new Promise(res => setTimeout(res, 1500)); // gentle on the free tier
  }
  return results;
}

const version = await getJson("/api/version");
console.log(`bound to /api/version: ${JSON.stringify(version.body)} (HTTP ${version.status})`);

const financial = await runClass("FINANCIAL-DATA", "damani", FINANCIAL);
const philosophy = await runClass("PHILOSOPHY", "damani", PHILOSOPHY);
const invalid = await runClass("INVALID-SYMBOL", "damani", INVALID);

const artifact = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  version: version.body,
  providerModelIdentity: {
    provider: financial.find(r => r.provider)?.provider ?? null,
    model: financial.find(r => r.model)?.model ?? null,
  },
  classes: {
    financial: aggregate(financial),
    philosophy: aggregate(philosophy),
    invalid: aggregate(invalid),
  },
  overall: aggregate([...financial, ...philosophy, ...invalid]),
  raw: { financial, philosophy, invalid },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(artifact, null, 2));
console.log(`\nartifact: ${OUT}`);
console.log(JSON.stringify({ classes: artifact.classes, overall: artifact.overall }, null, 2));
