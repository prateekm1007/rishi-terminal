/**
 * scripts/ci/promptfoo/verifierProvider.ts — the promptfoo CI provider for
 * the grounded-answers regression eval (PROMPTFOO-CI, round 56; the
 * founder's batch-2 adoption record row 6: "promptfoo — CI only").
 *
 * The provider is the REPO'S OWN VERIFIER, not a model: each test's
 * prompt is a JSON payload { evidence, claims, answer } and the output is
 * the GroundingResult of lib/ai/evidence.validateGrounding (or, for
 * `deterministic-surface` cases, buildDeterministicVerifiedSurface).
 *
 * Consequences (all deliberate, recorded in the evidence file):
 * - ZERO provider spend: no network, no API key, no model call — the
 *   A4 no-model-surface pin is untouched (the eval never reaches a
 *   provider SDK; the verifier is a pure function).
 * - The eval can FAIL: a verifier regression (grounded-laundering, a
 *   broken rejection, a changed verified statement) flips the pinned
 *   assertions in promptfooconfig.yaml and the CI job goes red.
 */

import { validateGrounding, buildDeterministicVerifiedSurface, type AiEvidenceItem } from "../../../lib/ai/evidence";

interface EvalPayload {
  mode?: "grounding" | "deterministic-surface";
  evidence: AiEvidenceItem[];
  claims?: Array<{
    claim: string;
    evidenceIds: string[];
    assertions?: Array<{ field: string; value: number; unit: string }>;
  }>;
  answer?: string;
}

const raw = process.argv[2] ?? "";
if (!raw) {
  console.error("usage: verifierProvider.ts '<json payload>'");
  process.exit(1);
}

let payload: EvalPayload;
try {
  payload = JSON.parse(raw) as EvalPayload;
} catch (e) {
  console.error("invalid payload JSON:", String(e).slice(0, 200));
  process.exit(1);
}

try {
  if (payload.mode === "deterministic-surface") {
    const surface = buildDeterministicVerifiedSurface(payload.evidence);
    // Honest empty surface: null (no typed facts) is a REAL result — never
    // fabricated into an answer (rule 4).
    process.stdout.write(JSON.stringify({ surface }));
  } else {
    const result = validateGrounding(payload.evidence, payload.claims ?? [], payload.answer ?? "");
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  console.error("verifier threw:", String(e).slice(0, 300));
  process.exit(1);
}
