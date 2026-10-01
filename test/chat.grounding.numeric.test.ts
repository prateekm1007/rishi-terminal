/**
 * Q4 / R4-02 — numeric grounding verification (semantic contract).
 *
 * Round 4 found: "validateGrounding checks only that the cited evidence IDs
 * exist." The first fix (PR #29) added number-presence checking. The
 * founder's follow-up audit (Commit A, §5/§9) escalated: presence alone
 * passes "ROE is 99%" when P/E=99 sits in the same cited evidence. The
 * contract is now SEMANTIC and per-claim:
 *   - every numeric claim carries assertions [{field, value, unit}];
 *   - each assertion must EXACTLY match a typed fact on one of the claim's
 *     OWN cited items (field/value/unit canonicalized);
 *   - numbers are pooled per claim, never across claims;
 *   - the answer's numbers must trace to the validated claims' own cites.
 *
 * This file keeps the original auditor scenarios, expressed in the stricter
 * contract. The pure semantic cases live in test/chat.grounding.semantic.test.ts.
 * NOTE (Constitution art. 23): this update TIGHTENS the gate — the old
 * assertions-free requests are now rejected (see semantic suite), none were
 * weakened.
 */
import { describe, expect, it } from "vitest";
import { extractNormalizedNumbers, validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "fundamental:RELIANCE:roe:2026-09-30",
    text: "ROE %: 12 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z | fact: roe=12 percent (live)",
    facts: [{ field: "roe", value: 12, unit: "percent", source: "live" }],
  },
  {
    id: "price:RELIANCE:2026-10-01T08:40:00.000Z",
    text: "Latest observed price: 1,420.5 (change 0.8%). Source: yahoo | fact: price=1420.5 inr (live); change=0.8 percent (live)",
    facts: [
      { field: "price", value: 1420.5, unit: "inr", source: "live" },
      { field: "change", value: 0.8, unit: "percent", source: "live" },
    ],
  },
  {
    id: "score:RELIANCE:rishi-merit-v1:2026-09-30",
    text: "Rishi consensus score (rishi-merit-v1): 72/100 | category: HOLD | fact: score=72 points (derived)",
    facts: [{ field: "score", value: 72, unit: "points", source: "derived" }],
  },
];

const ROE_ID = "fundamental:RELIANCE:roe:2026-09-30";
const PRICE_ID = "price:RELIANCE:2026-10-01T08:40:00.000Z";
const SCORE_ID = "score:RELIANCE:rishi-merit-v1:2026-09-30";

describe("R4-02 — a valid id cited for a false number is rejected", () => {
  it("the auditor's exact case: 'ROE is 99%' asserting roe=99 vs the fact roe=12 → grounded=false", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 99%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("evidence-context");
    expect(r.validatedClaims).toHaveLength(0);
    expect(r.rejections.join(" ")).toContain("roe=99");
    expect(r.rejections.join(" ")).toContain("R4-02");
  });

  it("the true figure passes: 'ROE is 12%' with the matching assertion → grounded=true", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
  });

  it("a number that exists in a DIFFERENT, uncited item does not save the claim", () => {
    // 1420.5 is real (price fact) but the claim cites only the ROE item.
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 1420.5%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 1420.5, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("R4-02 — normalization", () => {
  it("percent markers are interchangeable (12% == 12 == 12.0)", () => {
    expect(
      validateGrounding(EVIDENCE, [{ claim: "ROE is 12.0%", evidenceIds: [ROE_ID], assertions: [{ field: "roe", value: 12.0, unit: "percent" }] }]).grounded,
    ).toBe(true);
    expect(
      validateGrounding(EVIDENCE, [{ claim: "ROE is 12", evidenceIds: [ROE_ID], assertions: [{ field: "roe", value: 12, unit: "%" }] }]).grounded,
    ).toBe(true);
  });

  it("thousands separators and currency symbols normalize away", () => {
    expect(
      validateGrounding(EVIDENCE, [{ claim: "price is ₹1,420.5", evidenceIds: [PRICE_ID], assertions: [{ field: "price", value: 1420.5, unit: "inr" }] }]).grounded,
    ).toBe(true);
    expect(
      validateGrounding(EVIDENCE, [{ claim: "price is 1420.5", evidenceIds: [PRICE_ID], assertions: [{ field: "price", value: 1420.5, unit: "₹" }] }]).grounded,
    ).toBe(true);
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
      [{ claim: "score is 72/100", evidenceIds: [SCORE_ID], assertions: [{ field: "score", value: 72, unit: "points" }] }],
      "The score is 72/100 and the P/E is 21.4.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("21.4");
  });

  it("an answer whose every number traces to cited evidence stays grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        { claim: "score is 72/100", evidenceIds: [SCORE_ID], assertions: [{ field: "score", value: 72, unit: "points" }] },
        { claim: "ROE is 12%", evidenceIds: [ROE_ID], assertions: [{ field: "roe", value: 12, unit: "percent" }] },
        { claim: "the stock trades at 1420.5", evidenceIds: [PRICE_ID], assertions: [{ field: "price", value: 1420.5, unit: "inr" }] },
      ],
      "Score 72/100 with ROE 12%; the stock trades at 1,420.5.",
    );
    expect(r.grounded).toBe(true);
  });
});

describe("R4-02 — fail-closed composition with the id checks", () => {
  it("unknown id is still rejected, and numeric notes do not mask it", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 99%",
        evidenceIds: ["fundamental:RELIANCE:roe:made-up"],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
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
