/**
 * Q4 / R4-02 — numeric grounding verification.
 *
 * The auditor (round 4): "validateGrounding checks only that the cited
 * evidence IDs exist. A model can cite a valid ID for a false statement."
 * The fix: every number in the claims AND the answer must appear in the
 * CITED evidence text (units/percent/thousands normalized), else
 * grounded=false — fail closed.
 *
 * Acceptance (auditor): claim "ROE is 99%" citing a valid id whose ROE is 12
 * → rejected.
 */
import { describe, expect, it } from "vitest";
import { extractNormalizedNumbers, validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "fundamental:RELIANCE:roe:2026-09-30",
    text: "ROE %: 12 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z",
  },
  {
    id: "price:RELIANCE:2026-10-01T08:40:00.000Z",
    text: "Latest observed price: 1,420.5 (change 0.8%). Source: yahoo.",
  },
  {
    id: "score:RELIANCE:rishi-merit-v1:2026-09-30",
    text: "Rishi consensus score (rishi-merit-v1): 72/100 | category: HOLD.",
  },
];

const ROE_ID = "fundamental:RELIANCE:roe:2026-09-30";
const PRICE_ID = "price:RELIANCE:2026-10-01T08:40:00.000Z";
const SCORE_ID = "score:RELIANCE:rishi-merit-v1:2026-09-30";

describe("R4-02 — a valid id cited for a false number is rejected", () => {
  it("the auditor's exact case: 'ROE is 99%' citing the ROE id whose value is 12 → grounded=false", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "ROE is 99%", evidenceIds: [ROE_ID] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("evidence-context");
    expect(r.validatedClaims).toHaveLength(0);
    expect(r.rejections.join(" ")).toContain("99");
    expect(r.rejections.join(" ")).toContain("R4-02");
  });

  it("the true figure passes: 'ROE is 12%' → grounded=true", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "ROE is 12%", evidenceIds: [ROE_ID] },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
  });

  it("a number that exists in a DIFFERENT, uncited item does not save the claim", () => {
    // 1420.5 is real (price) but the claim cites only the ROE item.
    const r = validateGrounding(EVIDENCE, [
      { claim: "ROE is 1420.5%", evidenceIds: [ROE_ID] },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("R4-02 — normalization", () => {
  it("percent markers are interchangeable (12% == 12 == 12.0)", () => {
    expect(validateGrounding(EVIDENCE, [{ claim: "ROE is 12.0%", evidenceIds: [ROE_ID] }]).grounded).toBe(true);
    expect(validateGrounding(EVIDENCE, [{ claim: "ROE is 12", evidenceIds: [ROE_ID] }]).grounded).toBe(true);
  });

  it("thousands separators and currency symbols normalize away", () => {
    expect(validateGrounding(EVIDENCE, [{ claim: "price is ₹1,420.5", evidenceIds: [PRICE_ID] }]).grounded).toBe(true);
    expect(validateGrounding(EVIDENCE, [{ claim: "price is 1420.5", evidenceIds: [PRICE_ID] }]).grounded).toBe(true);
  });

  it("extractNormalizedNumbers is canonical and finite-only", () => {
    expect([...extractNormalizedNumbers("₹1,420.5 and 12% and 0.80")].sort()).toEqual(["0.8", "12", "1420.5"]);
    expect(extractNormalizedNumbers("no digits here").size).toBe(0);
  });
});

describe("R4-02 — the answer text is verified too", () => {
  it("a number in the answer absent from cited evidence → grounded=false", () => {
    const r = validateGrounding(
      EVIDENCE,
      [{ claim: "score is 72/100", evidenceIds: [SCORE_ID] }],
      "The score is 72/100 and the P/E is 21.4.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("21.4");
  });

  it("an answer whose every number traces to cited evidence stays grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        { claim: "score is 72/100", evidenceIds: [SCORE_ID] },
        { claim: "ROE is 12%", evidenceIds: [ROE_ID] },
        { claim: "the stock trades at 1420.5", evidenceIds: [PRICE_ID] },
      ],
      "Score 72/100 with ROE 12%; the stock trades at 1,420.5.",
    );
    expect(r.grounded).toBe(true);
  });
});

describe("R4-02 — fail-closed composition with the id checks", () => {
  it("unknown id is still rejected, and numeric notes do not mask it", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "ROE is 99%", evidenceIds: ["fundamental:RELIANCE:roe:made-up"] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("made-up");
  });

  it("claims=[] never becomes grounded, even with a plain answer", () => {
    const r = validateGrounding(EVIDENCE, [], "ROE is 12%");
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("evidence-context");
  });
});
