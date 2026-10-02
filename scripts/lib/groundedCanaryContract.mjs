/**
 * Commit N (Coder Directions 2026-10-02 §6/§7) — THE grounded-canary
 * contract, shared by scripts/prodGroundedCanary.mjs (nondeterministic
 * production evidence) and scripts/prodDeterministicAiGate.mjs (the
 * deterministic production gate), and unit-tested by
 * test/canaryContract.test.mjs.
 *
 * POSITIVE contract (§6) — a passing attempt must satisfy EVERY row:
 *   http-200-anonymous        anonymous chat status 200
 *   tool-expected-ok          toolCalls contains EXACTLY the expected
 *                             {tool, status:"ok", symbol}
 *   grounded-true             provenance.grounded === true
 *   claims-verified-true      provenance.claimsVerified === true (the
 *                             router's own flag, not its derivation)
 *   mode-structured-claims    groundingMode === "structured-claims"
 *   structured-valid          structuredResponse === "valid"
 *   validated-claim-present   ≥1 claim, every claim cites ≥1 evidence id
 *   verified-surface-exact    text EXACTLY equals the deduped server-
 *                             generated statements of the claims'
 *                             verifiedFacts joined by "\n" — not merely
 *                             "contains price =" (§6: "text exactly equals
 *                             the server-generated verified-fact
 *                             statements")
 *   no-extra-prose            no line of the grounded text is anything
 *                             other than a verified-fact statement
 *   facts-claims-bijection    every claim's every verifiedFact statement
 *                             appears in text AND every text line appears
 *                             in some claim's verifiedFacts (§6: "every
 *                             returned verified fact is represented by the
 *                             validated claim set")
 *   commentary-present        provenance.commentary is a nonempty string
 *                             DISTINCT from text
 *   numbers-covered           every number in text (ISO timestamps
 *                             stripped) is one of the validated fact
 *                             values
 *   identity-attested-exact   provider AND model EQUAL the expected
 *                             attested identity (exact strings)
 *
 * NEGATIVE contract (§7) — STRUCTURAL, not "no 3-digit numbers":
 *   http-200                  the endpoint answered (the failure is data
 *                             honesty, not transport)
 *   no-verified-price-fact    zero claims, zero verifiedFacts anywhere
 *   no-false-grounding        grounded !== true AND claimsVerified !== true
 *   no-server-price-stmt      text contains no "price =" statement at all
 *   no-numeric-answer         NO number whatsoever in text (ISO
 *                             timestamps stripped) — a hallucinated "42"
 *                             fails exactly like "1234" would
 *   explicit-failure-state    toolCalls shows unknown-symbol / unknown-
 *                             tool / invalid-args, OR structuredResponse
 *                             is "blocked", OR text starts "BLOCKED:"
 *   no-fake-commentary        no commentary field (commentary rides ONLY
 *                             grounded responses — a commentary here
 *                             would be an unverified model fallback
 *                             presented next to a failure state)
 */

/** ISO-8601 timestamps carry digits that are NOT market numbers. */
const ISO_TS_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g;

export function extractNumbers(text) {
  const stripped = String(text ?? "").replace(ISO_TS_RE, " ");
  const out = new Set();
  for (const raw of stripped.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []) {
    out.add(raw.replace(/[,\s]/g, ""));
  }
  return out;
}

/** The server-generated verified surface for a claim set: the deduped
 *  verifiedFact statements, in first-appearance order, joined by "\n" —
 *  mirroring lib/ai/evidence.ts's verifiedAnswer construction exactly. */
export function expectedVerifiedSurface(claims) {
  const seen = new Set();
  const lines = [];
  for (const c of claims ?? []) {
    for (const f of c.verifiedFacts ?? []) {
      if (!seen.has(f.statement)) {
        seen.add(f.statement);
        lines.push(f.statement);
      }
    }
  }
  return lines.join("\n");
}

/**
 * @param {{status:number, body:any}} attempt raw chat response
 * @param {{expectedProvider:string, expectedModel:string, expectedTool:string,
 *          expectedSymbol:string}} ctx attested identity + expected tool row
 * @returns {{checks:Array<{id:string,ok:boolean,detail:string}>, allPassed:boolean}}
 */
export function evaluatePositiveCanary(attempt, ctx) {
  const checks = [];
  const ok = (id, cond, detail) => {
    checks.push({ id, ok: !!cond, detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
    return !!cond;
  };
  const prov = attempt.body?.provenance ?? {};

  ok("http-200-anonymous", attempt.status === 200, `anonymous chat status=${attempt.status}`);

  const toolOk = (prov.toolCalls ?? []).some(
    (tc) => tc.tool === ctx.expectedTool && tc.status === "ok" && tc.symbol === ctx.expectedSymbol,
  );
  ok("tool-expected-ok", toolOk, `toolCalls=${JSON.stringify(prov.toolCalls ?? [])}`);

  ok("grounded-true", prov.grounded === true, `grounded=${prov.grounded}`);
  ok("claims-verified-true", prov.claimsVerified === true, `claimsVerified=${prov.claimsVerified}`);
  ok("mode-structured-claims", prov.groundingMode === "structured-claims", `mode=${prov.groundingMode}`);
  ok("structured-valid", prov.structuredResponse === "valid", `structuredResponse=${prov.structuredResponse}`);

  const claims = prov.claims ?? [];
  ok(
    "validated-claim-present",
    claims.length >= 1 && claims.every((c) => (c.evidenceIds ?? []).length >= 1),
    `claims=${claims.length}`,
  );

  // §6: text EXACTLY equals the server-generated verified statements.
  const text = String(attempt.body?.text ?? "");
  const expected = expectedVerifiedSurface(claims);
  ok(
    "verified-surface-exact",
    claims.length > 0 && text === expected,
    `text !== expected surface\n  text:     ${JSON.stringify(text)}\n  expected: ${JSON.stringify(expected)}`,
  );

  // §6: no additional unvalidated prose in the grounded text — every line
  // is a verified-fact statement (and nothing is missing or extra).
  const textLines = text.split("\n");
  const statementSet = new Set(
    (claims ?? []).flatMap((c) => (c.verifiedFacts ?? []).map((f) => f.statement)),
  );
  ok(
    "no-extra-prose",
    text.length > 0 && textLines.every((line) => statementSet.has(line)),
    `lines=${textLines.length}, non-statement lines=${JSON.stringify(textLines.filter((l) => !statementSet.has(l)))}`,
  );

  // §6: facts <-> claims bijection (both directions).
  const expectedLines = expected.split("\n").filter(Boolean);
  ok(
    "facts-claims-bijection",
    expectedLines.length > 0 &&
      expectedLines.every((line) => textLines.includes(line)) &&
      textLines.every((line) => expectedLines.includes(line)),
    `text lines=${textLines.length}, fact statements=${expectedLines.length}`,
  );

  ok(
    "commentary-present",
    typeof prov.commentary === "string" && prov.commentary.length > 0 && prov.commentary !== text,
    prov.commentary
      ? `commentary present (${prov.commentary.length} chars), distinct=${prov.commentary !== text}`
      : "no commentary",
  );

  // Every number in the verified surface must be a validated fact value.
  const factValues = new Set((claims ?? []).flatMap((c) => (c.verifiedFacts ?? []).map((f) => String(f.value))));
  const textNumbers = [...extractNumbers(text)];
  const uncovered = textNumbers.filter((n) => !factValues.has(n));
  ok(
    "numbers-covered-by-facts",
    uncovered.length === 0,
    `numbers=${JSON.stringify(textNumbers)} facts=${JSON.stringify([...factValues])} uncovered=${JSON.stringify(uncovered)}`,
  );

  // §6: EXACT provider/model identity (attested strings, not just nonempty).
  ok(
    "identity-attested-exact",
    prov.provider === ctx.expectedProvider && prov.model === ctx.expectedModel,
    `provider=${JSON.stringify(prov.provider)} (expected ${JSON.stringify(ctx.expectedProvider)}), model=${JSON.stringify(prov.model)} (expected ${JSON.stringify(ctx.expectedModel)})`,
  );

  return { checks, allPassed: checks.every((c) => c.ok) };
}

/**
 * @param {{status:number, body:any}} attempt raw chat response
 * @returns {{checks:Array<{id:string,ok:boolean,detail:string}>, allPassed:boolean}}
 */
export function evaluateNegativeCanary(attempt) {
  const checks = [];
  const ok = (id, cond, detail) => {
    checks.push({ id, ok: !!cond, detail: typeof detail === "string" ? detail : JSON.stringify(detail) });
    return !!cond;
  };
  const prov = attempt.body?.provenance ?? {};
  const text = String(attempt.body?.text ?? "");
  const claims = prov.claims ?? [];
  const allFacts = claims.flatMap((c) => c.verifiedFacts ?? []);

  ok("http-200", attempt.status === 200, `status=${attempt.status}`);
  ok("no-verified-price-fact", claims.length === 0 && allFacts.length === 0,
    `claims=${claims.length}, verifiedFacts=${allFacts.length}`);
  ok("no-false-grounding", prov.grounded !== true && prov.claimsVerified !== true,
    `grounded=${prov.grounded}, claimsVerified=${prov.claimsVerified}`);
  ok("no-server-price-stmt", !/^\s*price\s*=/m.test(text) && !text.includes("price = "),
    `text head: ${JSON.stringify(text.slice(0, 120))}`);

  // §7: NO numeric market answer whatsoever — any number (not only 3+
  // digit ones) fails. The old contract let a hallucinated "42" through.
  const numbers = [...extractNumbers(text)];
  ok("no-numeric-answer", numbers.length === 0, `numbers found: ${JSON.stringify(numbers)}`);

  const explicitFailure =
    (prov.toolCalls ?? []).some(
      (tc) => tc.status === "unknown-symbol" || tc.status === "unknown-tool" || tc.status === "invalid-args",
    ) ||
    prov.structuredResponse === "blocked" ||
    text.startsWith("BLOCKED:");
  ok("explicit-failure-state", explicitFailure,
    `toolCalls=${JSON.stringify(prov.toolCalls ?? [])}, structuredResponse=${prov.structuredResponse}, textStartsBLOCKED=${text.startsWith("BLOCKED:")}`);

  ok("no-fake-commentary", prov.commentary === undefined,
    `commentary=${prov.commentary === undefined ? "(absent)" : JSON.stringify(String(prov.commentary).slice(0, 80))}`);

  return { checks, allPassed: checks.every((c) => c.ok) };
}
