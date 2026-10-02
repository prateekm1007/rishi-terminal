/**
 * Commit N (Coder Directions 2026-10-02 §8/§11) — the DETERMINISTIC
 * production AI-loop gate + latency-attribution artifact.
 *
 * Hits the secret-gated production route /api/probe/ai-loop, which drives
 * the REAL production pipeline (provider, executor, evidence, prompt
 * rebuild, structured claims, grounding validation, server-generated
 * verified surface) with a FIXED first tool call — the model's CHOICE to
 * request the tool is the only nondeterminism removed. No fake success
 * path exists: if the real model fails to produce validatable claims, or
 * the real provider fails, this gate FAILS.
 *
 * Runs ALL FOUR modes (the 2026-10-02 Commit-O reconciliation unified the
 * sibling session's witness here):
 *   positive         — seeded getPrices(RELIANCE) → real model final
 *                      claims → the FULL §6 contract (exact server-surface
 *                      equality, bijection, claimsVerified, exact identity);
 *   negative         — seeded getPrices(ZZZZNOPE) → the FULL §7 structural
 *                      negative contract;
 *   witness          — deterministicWitness: real provider turn-1 + real
 *                      executor + SERVER-BUILT final claims → the §6
 *                      contract (zero-flake pipeline gate);
 *   witness-negative — pinned unknown symbol → explicit failure, no
 *                      fabrication.
 *
 * §11 latency attribution: the probe response carries the router's stage
 * timings; this script records them into the artifact (provider attempts,
 * per-completion ms, tool-execution ms, validation ms, price/fundamentals
 * fetch ms, memo hits, probe wall ms).
 *
 * Secrets: PROBE_SECRET via env only (never logged, never committed).
 * The probe route 404s when the secret is unset/wrong, so a 404 here
 * means "not provisioned or wrong secret" — recorded honestly, exit 2.
 *
 * Usage: node scripts/prodDeterministicAiGate.mjs [BASE_URL] [EXPECTED_SHA]
 * Output: docs/evidence/commit-n/production-deterministic-ai-gate.json
 * Exit: 0 both modes PASS · 1 contract FAIL · 2 config/unreachable.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluatePositiveCanary,
  evaluateNegativeCanary,
} from "./lib/groundedCanaryContract.mjs";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const EXPECTED_SHA = process.argv[3] || "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "evidence", "commit-n", "production-deterministic-ai-gate.json");

const EXPECTED_PROVIDER = process.env.CANARY_EXPECTED_PROVIDER || "chat-api";
const EXPECTED_MODEL = process.env.CANARY_EXPECTED_MODEL || "agnes-2.5-flash";
const EXPECTED_TOOL = "getPrices";
const EXPECTED_SYMBOL = "RELIANCE";

const SECRET = process.env.PROBE_SECRET;
if (!SECRET) {
  console.error("missing env PROBE_SECRET (probe route 404s without it — provision it first)");
  process.exit(2);
}

const receipt = {
  probe: "production-deterministic-ai-gate",
  baseUrl: BASE,
  expectedSha: EXPECTED_SHA || null,
  versionSha: null,
  generatedAt: new Date().toISOString(),
  contract: {
    source: "scripts/lib/groundedCanaryContract.mjs (Coder Directions 2026-10-02 §6/§7)",
    deterministicBy: "seeded first tool call via secret-gated /api/probe/ai-loop — every downstream stage is the real production path",
  },
  identity: { expectedProvider: EXPECTED_PROVIDER, expectedModel: EXPECTED_MODEL, expectedTool: EXPECTED_TOOL, expectedSymbol: EXPECTED_SYMBOL },
  positive: null,
  negative: null,
  rows: [],
};

function row(id, ok, detail) {
  receipt.rows.push({ id, ok, detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function callProbe(mode) {
  const resp = await fetch(`${BASE}/api/probe/ai-loop?mode=${mode}`, {
    headers: { "x-probe-secret": SECRET },
    signal: AbortSignal.timeout(120_000),
    redirect: "manual",
  });
  const text = await resp.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: resp.status, body, raw: text };
}

// ── 0. version binding (the probe runs on the deployed runtime) ──────────
const vResp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
const version = await vResp.json().catch(() => ({}));
receipt.versionSha = version.sha ?? null;
const shaOk = EXPECTED_SHA === "" || version.sha === EXPECTED_SHA;
row("version-binding", vResp.status === 200 && shaOk,
  `GET /api/version -> ${vResp.status} sha=${version.sha}${EXPECTED_SHA ? ` (expected ${EXPECTED_SHA})` : ""}`);

// ── 1. positive: seeded tool → grounded §6 contract, deterministically ────
let positiveOk = false;
try {
  const pos = await callProbe("positive");
  if (pos.status === 404) {
    row("positive-probe-reachable", false, "probe route 404 — PROBE_SECRET not provisioned on the deployment or wrong secret");
  } else {
    const evaluation = evaluatePositiveCanary(pos, {
      expectedProvider: EXPECTED_PROVIDER,
      expectedModel: EXPECTED_MODEL,
      expectedTool: EXPECTED_TOOL,
      expectedSymbol: EXPECTED_SYMBOL,
    });
    const timings = pos.body?.provenance?.timings ?? null;
    const timingsOk = timings !== null
      && typeof timings.totalMs === "number"
      && typeof timings.providerAttempts === "number"
      && Array.isArray(timings.completions) && timings.completions.length >= 1
      && Array.isArray(timings.toolExecutions) && timings.toolExecutions.length >= 1;
    const allChecks = [
      ...evaluation.checks,
      { id: "timings-present", ok: timingsOk, detail: timingsOk ? `totalMs=${timings.totalMs}, attempts=${timings.providerAttempts}` : "no/invalid timings on the probe wire" },
    ];
    receipt.positive = {
      status: pos.status,
      probe: pos.body?.probe ?? null,
      timings,
      checks: allChecks,
    };
    for (const c of allChecks) console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
    positiveOk = pos.status === 200 && allChecks.every((c) => c.ok);
  }
} catch (e) {
  row("positive-probe-reachable", false, `request failed: ${e.message}`);
}
row("positive-deterministic-grounded-loop", positiveOk,
  positiveOk
    ? "seeded getPrices → real provider → structured claims → grounded=true with the EXACT server-generated surface, in ONE deterministic run (no retries)"
    : "the deterministic positive contract failed");

// ── 1b. witness: deterministic server-built final claims (zero-flake gate) ─
let witnessOk = false;
try {
  const wit = await callProbe("witness");
  if (wit.status === 404) {
    row("witness-probe-reachable", false, "probe route 404 — PROBE_SECRET not provisioned or wrong secret");
  } else {
    const evaluation = evaluatePositiveCanary(wit, {
      expectedProvider: EXPECTED_PROVIDER,
      expectedModel: EXPECTED_MODEL,
      expectedTool: EXPECTED_TOOL,
      expectedSymbol: EXPECTED_SYMBOL,
    });
    const witnessChecks = [
      ...evaluation.checks,
      { id: "witness-marked", ok: wit.body?.provenance?.canaryWitness === true, detail: `canaryWitness=${wit.body?.provenance?.canaryWitness}` },
    ];
    receipt.witness = {
      status: wit.status,
      probe: wit.body?.probe ?? null,
      timings: wit.body?.provenance?.timings ?? null,
      checks: witnessChecks,
    };
    for (const c of witnessChecks) console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
    witnessOk = wit.status === 200 && witnessChecks.every((c) => c.ok);
  }
} catch (e) {
  row("witness-probe-reachable", false, `request failed: ${e.message}`);
}
row("witness-deterministic-pipeline", witnessOk,
  witnessOk
    ? "real provider turn-1 + real executor + server-built claims → grounded=true, zero model-turn flakiness"
    : "the witness contract failed");

// ── 2. negative: seeded UNKNOWN symbol → structural §7 contract ──────────
let negativeOk = false;
try {
  const neg = await callProbe("negative");
  if (neg.status === 404) {
    row("negative-probe-reachable", false, "probe route 404 — PROBE_SECRET not provisioned or wrong secret");
  } else {
    const evaluation = evaluateNegativeCanary(neg);
    receipt.negative = {
      status: neg.status,
      probe: neg.body?.probe ?? null,
      timings: neg.body?.provenance?.timings ?? null,
      checks: evaluation.checks,
    };
    for (const c of evaluation.checks) console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
    negativeOk = neg.status === 200 && evaluation.allPassed;
  }
} catch (e) {
  row("negative-probe-reachable", false, `request failed: ${e.message}`);
}
row("negative-deterministic-honest-failure", negativeOk,
  negativeOk
    ? "seeded unknown symbol → explicit failure state, zero numbers, zero verified facts, no false grounding — deterministically"
    : "the deterministic negative contract failed");

// ── 2b. witness-negative: pinned unknown symbol, deterministic failure ────
let witnessNegativeOk = false;
try {
  const neg = await callProbe("witness-negative");
  if (neg.status === 404) {
    row("witness-negative-probe-reachable", false, "probe route 404 — PROBE_SECRET not provisioned or wrong secret");
  } else {
    const evaluation = evaluateNegativeCanary(neg);
    const negChecks = [
      ...evaluation.checks,
      { id: "witness-marked", ok: neg.body?.provenance?.canaryWitness === true, detail: `canaryWitness=${neg.body?.provenance?.canaryWitness}` },
    ];
    receipt.witnessNegative = {
      status: neg.status,
      probe: neg.body?.probe ?? null,
      checks: negChecks,
    };
    for (const c of negChecks) console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
    witnessNegativeOk = neg.status === 200 && negChecks.every((c) => c.ok);
  }
} catch (e) {
  row("witness-negative-probe-reachable", false, `request failed: ${e.message}`);
}
row("witness-negative-deterministic-honest-failure", witnessNegativeOk,
  witnessNegativeOk
    ? "witness with pinned unknown symbol → explicit unknown-symbol failure, deterministically"
    : "the witness negative contract failed");

// ── §11: latency summary (attribution artifact) ───────────────────────────
if (receipt.positive?.timings) {
  const t = receipt.positive.timings;
  console.log("\n— §11 latency attribution (positive run)");
  console.log(`  probe wall:        ${receipt.positive.probe?.wallMs ?? "?"} ms`);
  console.log(`  loop total:        ${t.totalMs} ms`);
  console.log(`  provider attempts: ${t.providerAttempts} (completions: ${t.completions.map((c) => `${c.provider}/${c.outcome}=${c.ms}ms`).join(", ")})`);
  console.log(`  tool executions:   ${t.toolExecutions.map((x) => `${x.tool}:${x.status}=${x.ms}ms`).join(", ")}`);
  console.log(`  validation:        ${t.validationMs} ms`);
  console.log(`  price fetches:     ${t.priceFetches.map((x) => `${x.symbol}=${x.ms}ms`).join(", ") || "(none)"}`);
  console.log(`  fundamentals:      ${t.fundamentalsFetches.map((x) => `${x.symbol}=${x.ms}ms`).join(", ") || "(none)"}`);
  console.log(`  memo hits:         price=${t.memoHits?.price ?? 0}, fundamentals=${t.memoHits?.fundamentals ?? 0}`);
}

// ── receipt + exit ────────────────────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + "\n");
const allPassed = shaOk && positiveOk && negativeOk && witnessOk && witnessNegativeOk;
console.log(`\n${allPassed ? "DETERMINISTIC GATE: PASS" : "DETERMINISTIC GATE: FAIL"} — receipt: ${OUT}`);
process.exit(allPassed ? 0 : 1);
