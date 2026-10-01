/**
 * Audit 2026-10-02 (P0) — grounding: the text-number escape hatch is REMOVED.
 *
 * The round-4 semantic validator matched assertions against typed facts, but
 * still accepted any claim/answer number that merely APPEARED in the cited
 * item's prose — so a date ("As of 2026-09-30 the ROE is 12%") passed
 * because 2026 existed in the cited text. The audit directive is explicit:
 * for a grounded numeric assertion, claim -> typed assertion -> typed
 * evidence fact is the SOLE semantic authority.
 *
 * New contract (this file, written pre-fix per rule 21):
 *   1. every number stated in a claim must be a MATCHED ASSERTION VALUE
 *      (dates/ids in claim text are unsupported figures -> reject);
 *   2. a number attributed to a field mention ("P/E = 12") requires an
 *      assertion FOR THAT FIELD;
 *   3. a unit token attached to the number ("ROE = 12x") must match the
 *      assertion's unit;
 *   4. the answer floor pools ONLY matched assertion values (an unrelated
 *      2026 in the answer -> grounded=false);
 *   5. "N/100" is a scale notation, not a second number;
 *   6. batch fail-closed is preserved (one invalid claim -> zero grounded).
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
    text: "P/E: 21 | provenance: live via vendor screener | fact: pe=21 multiple (live)",
    facts: [{ field: "pe", value: 21, unit: "multiple", source: "live" }],
  },
];

const ROE_ID = "fundamental:RELIANCE:roe:2026-09-30";

describe("audit 2026-10-02 — the four directive cases", () => {
  it("MUST FAIL PRE-FIX: claim 'ROE = 2026' with assertion roe=12 percent -> REJECT (2026 is a date, not an assertion value)", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE = 2026",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });

  it("MUST FAIL PRE-FIX: claim 'P/E = 12' with assertion roe=12 percent -> REJECT (attributed field has no assertion)", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "P/E = 12",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("attributed to pe");
  });

  it("MUST FAIL PRE-FIX: claim 'ROE = 12x' with assertion roe=12 percent -> REJECT (unit token mismatch)", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE = 12x",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });

  it("MUST FAIL PRE-FIX: valid claims + answer that adds an unrelated 2026 -> NOT grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "ROE is 12%. As of 2026-09-30 everything looks stable.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });
});

describe("audit 2026-10-02 — dates in claims are no longer incidental pass-throughs", () => {
  it("MUST FAIL PRE-FIX (it passed on the old validator): 'As of 2026-09-30 the ROE is 12%' -> REJECT", () => {
    // The old suite explicitly allowed this via cited-text presence. The
    // audit directive removed that escape: 2026/9/30 are not assertion
    // values, so the claim is not semantically grounded.
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "As of 2026-09-30 the ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });

  it("the honest form still grounds: 'ROE is 12%'", () => {
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

  it("'72/100' is a scale notation: the 100 is not a second figure", () => {
    const score: AiEvidenceItem = {
      id: "score:RELIANCE:rishi-merit-v1:seed-derived",
      text: "Rishi consensus score (rishi-merit-v1): 72/100 | fact: score=72 points (derived)",
      facts: [{ field: "score", value: 72, unit: "points", source: "derived" }],
    };
    const r = validateGrounding([score], [
      {
        claim: "The consensus score is 72/100",
        evidenceIds: [score.id],
        assertions: [{ field: "consensus", value: 72, unit: "points" }],
      },
    ]);
    expect(r.grounded).toBe(true);
  });

  it("an answer restating only the matched assertion value stays grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "ROE is 12% — a solid return on equity.",
    );
    expect(r.grounded).toBe(true);
  });

  it("batch fail-closed preserved: one bad claim rejects every claim", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
      {
        claim: "ROE = 2026",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.validatedClaims).toHaveLength(0);
    expect(r.mode).toBe("evidence-context");
  });

  it("multiple fields: each attributed number needs its own assertion (pe=21x now grounds)", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12% and P/E is 21x",
        evidenceIds: [ROE_ID, "fundamental:RELIANCE:pe:2026-09-30"],
        assertions: [
          { field: "roe", value: 12, unit: "percent" },
          { field: "pe", value: 21, unit: "multiple" },
        ],
      },
    ]);
    expect(r.grounded).toBe(true);
  });
});
