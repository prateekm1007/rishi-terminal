// lib/ai/philosophyGuard.ts — G7 (founder Round-22): the DISTINCT
// no-numbers / philosophy-mode validator.
//
// Contract: claim-free conceptual prose (philosophy, temperament,
// process-of-investing commentary with NO figures and NO factual claims)
// MAY take the context-only path. Anything else — prose carrying numbers
// that no verified evidence matched, or any structured claim — is
// REJECTED by this guard and stays inside the normal grounding contract
// (lib/ai/evidence.validateGrounding). This module NEVER bypasses the
// factual/evidence validator: it is the small, named gate that decides
// whether a reply even QUALIFIES for the claim-free path; the grounding
// validator remains the only authority over what is served as verified.
//
// Extraction note (rule 2 — names describe behavior): this is the
// router's inline `isCleanContextOnly` decision
// (claims.length === 0 && ungroundedNumbers.length === 0), extracted so
// the contract is a named, independently tested unit instead of two
// comparisons buried in the loop. Semantics are IDENTICAL — no check is
// weakened or strengthened by the extraction (rule 23).
//
// Isomorphic on purpose (like lib/modelStatus.ts): pure TypeScript, no
// server-only import, directly unit-testable.

export type PhilosophyVerdict =
  | { verdict: "philosophy-ok" }
  | { verdict: "reject"; reason: "has-claims" | "unsupported-number"; numbers: string[] };

export interface PhilosophyProseInput {
  /** The model's final answer prose. */
  answer: string;
  /** How many structured claims the reply carried. ANY claim (even a
   *  qualitative one) disqualifies the philosophy path — claims are the
   *  grounding validator's jurisdiction. */
  claimCount: number;
  /** The numbers extracted from the answer that NO verified evidence
   *  matched (the router computes extracted-minus-matched). Empty means
   *  every figure the prose named came from verified evidence — or there
   *  were none. */
  ungroundedNumbers: Iterable<string>;
}

/**
 * Decide whether a reply qualifies as claim-free conceptual prose.
 * Order matters: claims are rejected FIRST (the grounding contract owns
 * them), then unsupported numbers (a philosophy reply never carries
 * figures the evidence cannot back), then the prose passes.
 */
export function evaluatePhilosophyProse(input: PhilosophyProseInput): PhilosophyVerdict {
  const claimCount = Number(input.claimCount) || 0;
  if (claimCount > 0) {
    return { verdict: "reject", reason: "has-claims", numbers: [] };
  }
  const numbers = [...(input.ungroundedNumbers ?? [])];
  if (numbers.length > 0) {
    return { verdict: "reject", reason: "unsupported-number", numbers };
  }
  return { verdict: "philosophy-ok" };
}
