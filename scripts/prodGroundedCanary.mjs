/**
 * Commit N7/N18 — PRODUCTION grounded-AI canary + negative canary
 * (Coder Directions 2026-10-02 §7/§18).
 *
 * THE remaining production gap: the free-access matrix proved the tool
 * loop can EXECUTE (getScore:ok) but the loop's final answer was
 * grounded=false / mode=evidence-context — tool-execution proof, not
 * end-to-end proof. This probe closes that distinction or fails loudly.
 *
 * Positive canary (anonymous caller — no sign-in, per the founder
 * decision deployed by PR #46; no symbol preselected, so the general chat
 * path is exercised and the MODEL must request the canonical tool itself):
 *   user ─▶ model ─▶ {"tool":"getPrices","args":{"symbol":"RELIANCE"}}
 *        ─▶ executeAiTool (server) ─▶ canonical evidence
 *        ─▶ model structured final claims ─▶ validateGrounding
 *        ─▶ grounded=true + SERVER-GENERATED verified surface + separate
 *            commentary ─▶ ChatWire ─▶ (this probe asserts the wire).
 *
 * Required rows (all must hold on at least one attempt, ≤3 attempts —
 * model choice is nondeterministic; every attempt is logged in the
 * receipt, and a passing attempt must satisfy EVERY row):
 *   version-binding   /api/version sha == expected (when given)
 *   anonymous-access  POST /api/chat without a session returns 200
 *                     (quota-keyed to the per-IP identity)
 *   tool-expected     audit trail shows getPrices with status ok on the
 *                     exact registry symbol
 *   structured-claims groundingMode === "structured-claims"
 *   grounded          provenance.grounded === true with ≥1 validated claim
 *   verified-surface  text is the SERVER-generated statement (contains
 *                     "price = <value> <unit> — <source state>"), never
 *                     the model prose
 *   separate-commentary  provenance.commentary exists and differs from text
 *   numbers-covered   every number in the verified surface (timestamps
 *                     stripped) is one of the validated fact values
 *   identity          provider/model attested on the wire
 *
 * Negative canary: an unknown-symbol data question must produce an
 * EXPLICIT failure (tool status unknown-symbol, or the deterministic
 * intent guard's BLOCKED state) — never a fabricated price and never a
 * false grounded=true.
 *
 * Usage: node scripts/prodGroundedCanary.mjs [BASE_URL] [EXPECTED_SHA]
 * Output: docs/evidence/commit-n/production-grounded-canary.json
 * Exit: 0 all rows PASS · 1 any required row FAIL · 2 config error.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "https://rishi-terminal.vercel.app";
const EXPECTED_SHA = process.argv[3] || "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "evidence", "commit-n", "production-grounded-canary.json");

const POSITIVE_QUESTION = "What is the latest price of RELIANCE?";
const NEGATIVE_QUESTION = "What is the latest price of ZZZZNOPE?";
const MAX_POSITIVE_ATTEMPTS = 3;
const MAX_NEGATIVE_ATTEMPTS = 3;

/** ISO-8601 timestamps carry digits that are NOT market numbers. */
const ISO_TS_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;

function extractNumbers(text) {
  const stripped = String(text ?? "").replace(ISO_TS_RE, " ");
  const out = new Set();
  for (const raw of stripped.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []) {
    out.add(raw.replace(/[,\s]/g, ""));
  }
  return out;
}

const receipt = {
  probe: "production-grounded-canary",
  baseUrl: BASE,
  expectedSha: EXPECTED_SHA || null,
  versionSha: null,
  generatedAt: new Date().toISOString(),
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

function evaluatePositive(attempt) {
  const checks = [];
  const prov = attempt.body?.provenance ?? {};
  const ok = (id, cond, detail) => {
    checks.push({ id, ok: !!cond, detail });
    return !!cond;
  };

  ok("http-200-anonymous", attempt.status === 200, `anonymous chat status=${attempt.status}`);
  const priceTool = (prov.toolCalls ?? []).find(
    (tc) => tc.tool === "getPrices" && tc.status === "ok" && tc.symbol === "RELIANCE",
  );
  ok("tool-expected-ok", !!priceTool, `toolCalls=${JSON.stringify(prov.toolCalls ?? [])}`);
  ok("grounded-true", prov.grounded === true, `grounded=${prov.grounded}`);
  ok("mode-structured-claims", prov.groundingMode === "structured-claims", `mode=${prov.groundingMode}`);
  ok("structured-valid", prov.structuredResponse === "valid", `structuredResponse=${prov.structuredResponse}`);
  const claims = prov.claims ?? [];
  ok("validated-claim-present",
    claims.length >= 1 && claims.every((c) => (c.evidenceIds ?? []).length >= 1),
    `claims=${claims.length}`);

  const text = String(attempt.body?.text ?? "");
  const facts = claims.flatMap((c) => c.verifiedFacts ?? []);
  ok("verified-surface-server-generated",
    facts.length >= 1 && facts.some((f) => f.field === "price" && text.includes(`${f.field} = `)),
    `text head: ${text.slice(0, 120)}`);
  ok("commentary-separate",
    typeof prov.commentary === "string" && prov.commentary.length > 0 && prov.commentary !== text,
    prov.commentary ? `commentary head: ${prov.commentary.slice(0, 80)}` : "no commentary");

  // Every number in the verified surface must be a validated fact value
  // (ISO timestamps are infrastructure, not market numbers).
  const factValues = new Set(facts.map((f) => String(f.value)));
  const textNumbers = [...extractNumbers(text)];
  const uncovered = textNumbers.filter((n) => !factValues.has(n));
  ok("numbers-covered-by-facts",
    uncovered.length === 0,
    `numbers=${JSON.stringify(textNumbers)} facts=${JSON.stringify([...factValues])} uncovered=${JSON.stringify(uncovered)}`);

  ok("identity-attested",
    typeof prov.provider === "string" && prov.provider.length > 0 && typeof prov.model === "string" && prov.model.length > 0,
    `provider=${prov.provider} model=${prov.model}`);

  return { checks, allPassed: checks.every((c) => c.ok) };
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
  const evaluation = evaluatePositive(attempt);
  receipt.positive.attempts.push({
    attempt: i,
    status: attempt.status,
    grounded: attempt.body?.provenance?.grounded ?? null,
    groundingMode: attempt.body?.provenance?.groundingMode ?? null,
    structuredResponse: attempt.body?.provenance?.structuredResponse ?? null,
    toolCalls: attempt.body?.provenance?.toolCalls ?? [],
    textHead: String(attempt.body?.text ?? "").slice(0, 200),
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
    ? `attempt ${receipt.positive.passingAttempt}/${MAX_POSITIVE_ATTEMPTS} satisfied every row (grounded=true after a real getPrices call)`
    : `no attempt satisfied the contract in ${MAX_POSITIVE_ATTEMPTS} tries`);

// ── 2. negative canary: unknown symbol -> explicit failure, no fabrication ─
// Model choice is nondeterministic: the model may answer a fake symbol
// directly instead of requesting the tool. The CONTRACT (Coder Directions
// §7) requires demonstrating the explicit-failure path, so retry until the
// model actually requests the unknown symbol (every attempt is logged).
for (let i = 1; i <= MAX_NEGATIVE_ATTEMPTS; i++) {
  console.log(`\n— negative attempt ${i}/${MAX_NEGATIVE_ATTEMPTS}: "${NEGATIVE_QUESTION}"`);
  try {
    const neg = await chat(NEGATIVE_QUESTION);
    const prov = neg.body?.provenance ?? {};
    const explicitFailure =
      (prov.toolCalls ?? []).some((tc) => tc.status === "unknown-symbol" || tc.status === "unknown-tool" || tc.status === "invalid-args")
      || prov.structuredResponse === "blocked";
    const noFalseGrounding = prov.grounded !== true;
    const noFabricatedPrice = !/\d{3,}/.test(String(neg.body?.text ?? "").replace(ISO_TS_RE, " "));
    const negChecks = {
      "http-200": neg.status === 200,
      "explicit-failure-state": explicitFailure,
      "no-false-grounded": noFalseGrounding,
      "no-fabricated-price": noFabricatedPrice,
    };
    receipt.negative.attempts.push({
      attempt: i,
      status: neg.status,
      grounded: prov.grounded ?? null,
      structuredResponse: prov.structuredResponse ?? null,
      toolCalls: prov.toolCalls ?? [],
      textHead: String(neg.body?.text ?? "").slice(0, 200),
      checks: Object.entries(negChecks).map(([id, ok]) => ({ id, ok })),
    });
    for (const [id, ok] of Object.entries(negChecks)) {
      console.log(`  ${ok ? "ok " : "FAIL"} ${id}`);
    }
    if (Object.values(negChecks).every(Boolean)) {
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
    ? `an attempt demonstrated the explicit failure state (unknown symbol; no fabricated answer, no false grounding) within ${MAX_NEGATIVE_ATTEMPTS} tries`
    : `no attempt demonstrated the explicit-failure contract in ${MAX_NEGATIVE_ATTEMPTS} tries`);

// ── receipt + exit ────────────────────────────────────────────────────────
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(receipt, null, 2) + "\n");
const allPassed = shaOk && receipt.positive.passed && receipt.negative.passed;
console.log(`\n${allPassed ? "CANARY: PASS" : "CANARY: FAIL"} — receipt: ${OUT}`);
process.exit(allPassed ? 0 : 1);
