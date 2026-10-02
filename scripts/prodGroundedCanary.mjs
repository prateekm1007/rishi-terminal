/**
 * Commit N7/N18 — PRODUCTION grounded-AI canary + negative canary
 * (Coder Directions 2026-10-02 §7/§18; contract strengthened per §6/§7).
 *
 * THE remaining production gap: the free-access matrix proved the tool
 * loop can EXECUTE (getScore:ok) but the loop's final answer was
 * grounded=false / mode=evidence-context — tool-execution proof, not
 * end-to-end proof. This probe closes that distinction or fails loudly.
 *
 * Positive canary (anonymous caller — no sign-in; no symbol preselected,
 * so the general chat path is exercised and the MODEL must request the
 * canonical tool itself):
 *   user ─▶ model ─▶ {"tool":"getPrices","args":{"symbol":"RELIANCE"}}
 *        ─▶ executeAiTool (server) ─▶ canonical evidence
 *        ─▶ model structured final claims ─▶ validateGrounding
 *        ─▶ grounded=true + SERVER-GENERATED verified surface + separate
 *            commentary ─▶ ChatWire ─▶ (this probe asserts the wire).
 *
 * The CONTRACT lives in scripts/lib/groundedCanaryContract.mjs (§6/§7 —
 * exact server-surface equality, facts/claims bijection, exact attested
 * identity, structural negative) and is unit-tested there; this script
 * applies it against production and records every attempt.
 *
 * Nondeterminism note (§8): the model may fail to produce a validatable
 * structured reply on any given attempt — that is exactly what the
 * receipt records, every attempt with its machine-readable rejection
 * reasons. The DETERMINISTIC gate (scripts/prodDeterministicAiGate.mjs,
 * secret-gated /api/probe/ai-loop) is the permanent regression surface;
 * this canary remains the diagnostic existence proof that the UNSEEDED
 * production path (model's own tool choice) also closes the loop.
 *
 * Usage: node scripts/prodGroundedCanary.mjs [BASE_URL] [EXPECTED_SHA]
 * Output: docs/evidence/commit-n/production-grounded-canary.json
 * Exit: 0 all rows PASS · 1 any required row FAIL · 2 config error.
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
const OUT = join(ROOT, "docs", "evidence", "commit-n", "production-grounded-canary.json");

const POSITIVE_QUESTION = "What is the latest price of RELIANCE?";
const NEGATIVE_QUESTION = "What is the latest price of ZZZZNOPE?";
// Model replies are nondeterministic: a single attempt may honestly fail
// (provider hiccup, or the model states a number it did not assert — the
// fail-closed contract refuses partial verification). 5 attempts give the
// existence proof a fair margin; every attempt is logged in the receipt,
// pass or fail, WITH its machine-readable rejection reasons.
const MAX_POSITIVE_ATTEMPTS = 5;
const MAX_NEGATIVE_ATTEMPTS = 3;

// §6: EXACT attested identity — the registry-approved provider id and the
// attested model for it (lib/registry/providerRegistry.ts is the
// authority; these defaults mirror it and can be overridden via env for
// scratch verification of a NEWLY attested model before the registry
// lands).
const EXPECTED_PROVIDER = process.env.CANARY_EXPECTED_PROVIDER || "chat-api";
const EXPECTED_MODEL = process.env.CANARY_EXPECTED_MODEL || "agnes-2.5-flash";
const EXPECTED_TOOL = "getPrices";
const EXPECTED_SYMBOL = "RELIANCE";

const receipt = {
  probe: "production-grounded-canary",
  baseUrl: BASE,
  expectedSha: EXPECTED_SHA || null,
  versionSha: null,
  generatedAt: new Date().toISOString(),
  contract: {
    source: "scripts/lib/groundedCanaryContract.mjs (Coder Directions 2026-10-02 §6/§7)",
    positive: "exact server-surface equality, no extra prose, facts/claims bijection, claimsVerified, exact identity",
    negative: "structural: no verified facts, no price statement, NO numbers at all, explicit failure state, no fake commentary",
  },
  identity: { expectedProvider: EXPECTED_PROVIDER, expectedModel: EXPECTED_MODEL, expectedTool: EXPECTED_TOOL, expectedSymbol: EXPECTED_SYMBOL },
  positive: { attempts: [], passed: false, passingAttempt: null },
  negative: { attempts: [], passed: false },
  rows: [],
};

function row(id, ok, detail) {
  receipt.rows.push({ id, ok, detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id}  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
}

async function chat(message) {
  const resp = await fetch(BASE + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId: "damani", history: [], message }),
    signal: AbortSignal.timeout(120_000),
    redirect: "manual",
  });
  const text = await resp.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: resp.status, body, raw: text };
}

// ── 0. version binding ────────────────────────────────────────────────────
const vResp = await fetch(BASE + "/api/version", { signal: AbortSignal.timeout(30_000) });
const version = await vResp.json().catch(() => ({}));
receipt.versionSha = version.sha ?? null;
const shaOk = EXPECTED_SHA === "" || version.sha === EXPECTED_SHA;
row("version-binding", vResp.status === 200 && shaOk,
  `GET /api/version -> ${vResp.status} sha=${version.sha}${EXPECTED_SHA ? ` (expected ${EXPECTED_SHA})` : ""}`);

// ── 1. positive canary: grounded=true after a REAL tool call ─────────────
for (let i = 1; i <= MAX_POSITIVE_ATTEMPTS; i++) {
  console.log(`\n— positive attempt ${i}/${MAX_POSITIVE_ATTEMPTS}: "${POSITIVE_QUESTION}" (anonymous, no symbol)`);
  let attempt;
  try {
    attempt = await chat(POSITIVE_QUESTION);
  } catch (e) {
    receipt.positive.attempts.push({ attempt: i, error: e.message });
    console.log(`  request failed: ${e.message}`);
    continue;
  }
  const evaluation = evaluatePositiveCanary(attempt, {
    expectedProvider: EXPECTED_PROVIDER,
    expectedModel: EXPECTED_MODEL,
    expectedTool: EXPECTED_TOOL,
    expectedSymbol: EXPECTED_SYMBOL,
  });
  receipt.positive.attempts.push({
    attempt: i,
    status: attempt.status,
    grounded: attempt.body?.provenance?.grounded ?? null,
    groundingMode: attempt.body?.provenance?.groundingMode ?? null,
    claimsVerified: attempt.body?.provenance?.claimsVerified ?? null,
    structuredResponse: attempt.body?.provenance?.structuredResponse ?? null,
    toolCalls: attempt.body?.provenance?.toolCalls ?? [],
    textHead: String(attempt.body?.text ?? "").slice(0, 200),
    // WHY a non-grounded attempt failed — the router's machine-readable
    // reasons (empty when grounded). Threaded to the wire since the
    // 2026-10-02 §10 fix; before that this was always [].
    groundingRejections: attempt.body?.provenance?.groundingRejections ?? [],
    timings: attempt.body?.provenance?.timings ?? null,
    checks: evaluation.checks,
  });
  for (const c of evaluation.checks) {
    console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
  }
  if (evaluation.allPassed) {
    receipt.positive.passed = true;
    receipt.positive.passingAttempt = i;
    break;
  }
}
row("positive-canary-grounded-tool-loop", receipt.positive.passed,
  receipt.positive.passed
    ? `attempt ${receipt.positive.passingAttempt}/${MAX_POSITIVE_ATTEMPTS} satisfied every §6 row (grounded=true, exact server surface, after a real ${EXPECTED_TOOL} call)`
    : `no attempt satisfied the contract in ${MAX_POSITIVE_ATTEMPTS} tries`);

// ── 2. negative canary: unknown symbol -> explicit failure, no fabrication ─
// Model choice is nondeterministic: the model may answer a fake symbol
// directly instead of requesting the tool. The CONTRACT (§7) requires
// demonstrating the explicit-failure path, so retry until the model
// actually requests the unknown symbol (every attempt is logged).
for (let i = 1; i <= MAX_NEGATIVE_ATTEMPTS; i++) {
  console.log(`\n— negative attempt ${i}/${MAX_NEGATIVE_ATTEMPTS}: "${NEGATIVE_QUESTION}"`);
  try {
    const neg = await chat(NEGATIVE_QUESTION);
    const evaluation = evaluateNegativeCanary(neg);
    receipt.negative.attempts.push({
      attempt: i,
      status: neg.status,
      grounded: neg.body?.provenance?.grounded ?? null,
      claimsVerified: neg.body?.provenance?.claimsVerified ?? null,
      structuredResponse: neg.body?.provenance?.structuredResponse ?? null,
      toolCalls: neg.body?.provenance?.toolCalls ?? [],
      textHead: String(neg.body?.text ?? "").slice(0, 200),
      groundingRejections: neg.body?.provenance?.groundingRejections ?? [],
      checks: evaluation.checks,
    });
    for (const c of evaluation.checks) {
      console.log(`  ${c.ok ? "ok " : "FAIL"} ${c.id} — ${c.detail}`);
    }
    if (evaluation.allPassed) {
      receipt.negative.passed = true;
      break;
    }
  } catch (e) {
    receipt.negative.attempts.push({ attempt: i, error: e.message });
    console.log(`  request failed: ${e.message}`);
  }
}
row("negative-canary-honest-failure", receipt.negative.passed,
  receipt.negative.passed
    ? `an attempt demonstrated the explicit failure state (unknown symbol; no fabricated answer, no numbers, no false grounding) within ${MAX_NEGATIVE_ATTEMPTS} tries`
    : `no attempt demonstrated the explicit-failure contract in ${MAX_NEGATIVE_ATTEMPTS} tries`);

// ── receipt + exit ────────────────────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + "\n");
const allPassed = shaOk && receipt.positive.passed && receipt.negative.passed;
console.log(`\n${allPassed ? "CANARY: PASS" : "CANARY: FAIL"} — receipt: ${OUT}`);
process.exit(allPassed ? 0 : 1);
