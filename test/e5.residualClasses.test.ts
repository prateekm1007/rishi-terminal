/**
 * E5 (founder directives 14-17, 2026-10-06) — the first-pass contract pins
 * for the REMAINING measured failure classes after #208.
 *
 * The R18 fresh production battery (44 effective rows) classified the
 * residual repair mass: unsupported-numeric-prose 5 (the dominant shape:
 * the model COMPUTED a figure from two annotated numbers and stated it as
 * if annotated — "40" was a self-calculated percentage), field-value-
 * mismatch 3 (the change value typed into the price field's assertion),
 * missing-claims on honest no-data paths (repair-recaptured, correct end
 * states). malformed-json stayed 0 (the #208 fix, independently
 * replicated).
 *
 * These pins hold the CONTRACT accountable for teaching compliance with
 * the measured classes: the grounding contract must carry the
 * no-computed-numbers rule, and the validator must keep rejecting a
 * computed figure (the invariant that makes the rule necessary). Fail-first:
 * remove the contract rule (or weaken the validator) and the pins go red.
 */
import { describe, expect, it } from "vitest";
import { evidenceBlock, classifyGroundingRejections } from "@/lib/ai/router";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "ev-1",
    source: "tool",
    symbol: "TEST",
    annotation: "fact: price=100 inr (live) · fact: peerPrice=150 inr (live)",
    facts: [
      { field: "price", value: 100, unit: "inr", state: "live" },
      { field: "peerPrice", value: 150, unit: "inr", state: "live" },
    ],
  } as unknown as AiEvidenceItem,
];

// The contract's prescribed shape: ONE field per claim.
const CLEAN_CLAIMS = [
  {
    claim: "TEST trades at 100 inr.",
    evidenceIds: ["ev-1"],
    assertions: [{ field: "price", value: 100, unit: "inr" }],
  },
  {
    claim: "TEST's peer trades at 150 inr.",
    evidenceIds: ["ev-1"],
    assertions: [{ field: "peerPrice", value: 150, unit: "inr" }],
  },
];

describe("E5 — the contract teaches the measured residual classes", () => {
  it("the grounding contract carries the no-computed-numbers rule (R18 battery: derived figures were the dominant unsupported-prose shape)", () => {
    const block = evidenceBlock(EVIDENCE);
    expect(block).toContain("Never COMPUTE a number the annotations do not contain");
    expect(block).toContain("state the two annotated numbers side by side");
  });
});

describe("E5 — the validator invariant behind the rule still bites", () => {
  it("a self-computed figure in the answer is rejected as unsupported prose (never matched)", () => {
    // The model computed 100 → 150 itself (-33.33%); neither -33.33 nor
    // 33.33 exists in the annotations — layer 3 must refuse the reply.
    const result = validateGrounding(
      EVIDENCE,
      CLEAN_CLAIMS,
      "TEST trades 33.33 percent below its peer.",
    );
    expect(result.grounded).toBe(false);
    expect(result.rejections.join(" ")).toMatch(/not a matched assertion value/);
    expect(classifyGroundingRejections(result.rejections)).toContain("unsupported-numeric-prose");
  });

  it("the SAME answer without the computed figure grounds (the contract's prescribed shape)", () => {
    const result = validateGrounding(
      EVIDENCE,
      CLEAN_CLAIMS,
      "TEST trades at 100 inr; its peer price is 150 inr.",
    );
    expect(result.grounded).toBe(true);
    expect(result.validatedClaims.length).toBe(2);
  });

  it("a change value typed into the price field's assertion is rejected (R18 field-value-mismatch shape)", () => {
    // The measured slip: the price assertion carried another field's number
    // (3.726 — the change value — in the battery's KOTAKBANK row). The
    // validator refuses the cross-field attribution.
    const result = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "TEST trades at 100 inr.",
          evidenceIds: ["ev-1"],
          assertions: [{ field: "price", value: 150, unit: "inr" }],
        },
      ],
      "TEST trades at 100 inr.",
    );
    expect(result.grounded).toBe(false);
    expect(result.rejections.join(" ")).toMatch(/no matching field\/value\/unit fact/);
  });
});
