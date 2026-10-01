/**
 * Q4 Commit A — SEMANTIC per-claim grounding (field/value/unit).
 *
 * The round-4 numeric-presence check proved only "the number appears
 * somewhere in the cited evidence". The auditor's escalation (round 4,
 * directions §5/§9): with ROE=12% and P/E=99x in the cited evidence, a claim
 * "ROE is 99%" still passed, because 99 occurs in the same text block.
 *
 * The fix contract: every numeric claim must carry an explicit assertion
 * {field, value, unit} that EXACTLY matches a typed fact on one of the
 * claim's OWN cited items (field normalized, value canonicalized, unit
 * normalized). Presence of a number in cited text is no longer sufficient
 * for an asserted metric.
 *
 * Bite-proof: this file was written and run BEFORE the implementation
 * changed; every case marked "MUST FAIL PRE-FIX" produced grounded=true on
 * the presence-only validator (raw output in the PR description).
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "fundamental:RELIANCE:roe:2026-09-30",
    text: "ROE %: 12 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z | fact: roe=12 percent (live)",
    facts: [{ field: "roe", value: 12, unit: "percent", source: "live" }],
  },
  {
    id: "fundamental:RELIANCE:pe:2026-09-30",
    text: "P/E: 99 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z | fact: pe=99 multiple (live)",
    facts: [{ field: "pe", value: 99, unit: "multiple", source: "live" }],
  },
  {
    id: "fundamental:RELIANCE:mktcap:seed",
    text: "Market cap (Cr): 1,600,000 | provenance: SEED DATA | fact: mktcap=1600000 inr_crore (seed)",
    facts: [{ field: "mktcap", value: 1_600_000, unit: "inr_crore", source: "seed" }],
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
    id: "fundamental:COMBINED:roe-and-pe:seed",
    // The auditor's exact model: ONE evidence item carrying BOTH numbers.
    text: "Snapshot: ROE 12%, P/E 99x | fact: roe=12 percent (seed); pe=99 multiple (seed)",
    facts: [
      { field: "roe", value: 12, unit: "percent", source: "seed" },
      { field: "pe", value: 99, unit: "multiple", source: "seed" },
    ],
  },
];

const ROE_ID = "fundamental:RELIANCE:roe:2026-09-30";
const PE_ID = "fundamental:RELIANCE:pe:2026-09-30";
const SCORE_ITEM: AiEvidenceItem = {
  id: "score:RELIANCE:rishi-merit-v1:2026-09-30",
  text: "Rishi consensus score (rishi-merit-v1): 72/100 | fact: score=72 points (derived)",
  facts: [{ field: "score", value: 72, unit: "points", source: "derived" }],
};
const COMBINED_ID = "fundamental:COMBINED:roe-and-pe:seed";

describe("R4-02 §9 — the exact regression: ROE=99% with P/E=99 in the cited evidence", () => {
  it("MUST FAIL PRE-FIX: one cited item containing BOTH roe=12 and pe=99 — 'ROE is 99%' is rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 99%",
        evidenceIds: [COMBINED_ID],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("roe");
  });

  it("MUST FAIL PRE-FIX: pe item cited alongside — the 99 exists in the cited pool but the FIELDS mismatch", () => {
    const r = validateGrounding([EVIDENCE[0], EVIDENCE[1]], [
      {
        claim: "ROE is 99%",
        evidenceIds: [ROE_ID, PE_ID],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("roe=99");
  });

  it("the true assertion (roe=12 percent) is accepted", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
    expect(r.validatedClaims[0].assertions).toHaveLength(1);
  });
});

describe("R4-02 — field/value/unit must ALL match", () => {
  const base = { claim: "ROE is 12%", evidenceIds: [ROE_ID] };

  it("wrong field (score=12 points cited for an ROE claim) → rejected", () => {
    const r = validateGrounding([EVIDENCE[0], SCORE_ITEM], [
      { ...base, evidenceIds: [ROE_ID, SCORE_ITEM.id], assertions: [{ field: "score", value: 12, unit: "points" }] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("score=12");
  });

  it("wrong unit (roe=12 multiple — the fact is percent) → rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      { ...base, assertions: [{ field: "roe", value: 12, unit: "multiple" }] },
    ]);
    expect(r.grounded).toBe(false);
  });

  it("wrong value (roe=13 percent) → rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      { ...base, assertions: [{ field: "roe", value: 13, unit: "percent" }] },
    ]);
    expect(r.grounded).toBe(false);
  });

  it("field aliases normalize (return_on_equity == roe; P/E == pe)", () => {
    expect(
      validateGrounding(EVIDENCE, [
        { ...base, assertions: [{ field: "return_on_equity", value: 12, unit: "percent" }] },
      ]).grounded,
    ).toBe(true);
    expect(
      validateGrounding(EVIDENCE, [
        {
          claim: "P/E is 99",
          evidenceIds: [PE_ID],
          assertions: [{ field: "P/E", value: 99, unit: "x" }],
        },
      ]).grounded,
    ).toBe(true);
  });
});

describe("R4-02 — per-claim pooling (no cross-claim number laundering)", () => {
  it("MUST FAIL PRE-FIX: a number real in claim 1's citation cannot support claim 2", () => {
    // 99 exists only in the PE item; claim 1 legitimately cites it.
    // Claim 2 asserts roe=99 but cites ROE+score items — the PE fact is
    // NOT in claim 2's own citation pool, so it cannot save the claim.
    const r = validateGrounding([EVIDENCE[0], EVIDENCE[1], SCORE_ITEM], [
      {
        claim: "P/E is 99",
        evidenceIds: [PE_ID],
        assertions: [{ field: "pe", value: 99, unit: "multiple" }],
      },
      {
        claim: "ROE is 99 too",
        evidenceIds: [ROE_ID, SCORE_ITEM.id],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("claim 2");
  });
});

describe("R4-02 — no assertion for a numeric claim is fail-closed", () => {
  it("MUST FAIL PRE-FIX: a numeric claim without assertions is rejected (even when the number is in the text)", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "ROE is 12%", evidenceIds: [ROE_ID] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("assertion");
  });

  it("a claim with no numbers needs no assertions (qualitative claims survive)", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "The market capitalization is disclosed in the dataset.", evidenceIds: ["fundamental:RELIANCE:mktcap:seed"] },
    ]);
    expect(r.grounded).toBe(true);
  });

  it("TIGHTENED by Commit D §2A: incidental prose numbers (dates) no longer ride on cited-text presence — every number in a claim must be a validated assertion value", () => {
    // The old contract let "2026" pass because the as-of date sat in the
    // cited evidence text. The founder's bite: a number that merely appears
    // in evidence prose is NOT a validated assertion — the claim is rejected
    // (the model must write "ROE is 12%", not "As of 2026-09-30 the ROE is 12%").
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "As of 2026-09-30 the ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });
});

describe("R4-02 — derived facts are explicit; the model may not derive", () => {
  it("the score fact is marked derived and is assertable as-is (72 points)", () => {
    // Commit D §2A: the claim text must not carry numbers beyond the asserted
    // value — "72/100" mints an unasserted 100, so the clean form is used.
    const r = validateGrounding([SCORE_ITEM], [
      {
        claim: "The consensus score is 72",
        evidenceIds: [SCORE_ITEM.id],
        assertions: [{ field: "consensus", value: 72, unit: "points" }],
      },
    ]);
    expect(r.grounded).toBe(true);
    expect(SCORE_ITEM.facts![0].source).toBe("derived");
  });

  it("a derived number the assembler never emitted (midpoint) is NOT assertable", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "The midpoint of price and 0 is 710.25",
        evidenceIds: [EVIDENCE[3].id],
        assertions: [{ field: "midpoint", value: 710.25, unit: "inr" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("R4-02 — fail-closed composition is preserved", () => {
  it("mixed valid + invalid claims: one bad assertion rejects the WHOLE batch", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
      {
        claim: "ROE is also 99%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.validatedClaims).toHaveLength(0);
    expect(r.mode).toBe("evidence-context");
  });

  it("unknown ids are still rejected first", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: ["fundamental:RELIANCE:roe:made-up"],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("made-up");
  });

  it("the answer floor still applies (answer numbers must trace to the cited evidence)", () => {
    const r = validateGrounding(
      EVIDENCE,
      [{ claim: "ROE is 12%", evidenceIds: [ROE_ID], assertions: [{ field: "roe", value: 12, unit: "percent" }] }],
      "ROE is 12% and the price is 9999.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("9999");
  });
});
