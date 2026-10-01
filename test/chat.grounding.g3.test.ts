/**
 * Coder Directions G3 (audit round 2026-10-02) — CLOSE THE REMAINING
 * GROUNDING HOLE: the explicit semantic-assertion contract, stated as the
 * six MANDATORY negative cases + the two-state rule.
 *
 * Contract under test:
 *   structured claim
 *     → must contain evidenceIds
 *     → must contain assertions for every factual numeric statement
 *     → each assertion must map to a typed fact (field/value/unit)
 *     → the claim text must actually reference that field/value
 *     → the final answer numbers must come only from validated assertions
 *
 * Two explicit states (G3): a claim can be qualitative WITHOUT being
 * numerically grounded —
 *   "context-only"       (grounded=false; qualitative or unverifiable)
 *   "structured-claims"  (grounded=true; every number assertion-backed)
 * `evidenceIds` alone NEVER makes a claim grounded.
 *
 * Rule 21: the qualitative-classification cases (2a/2b/mixed) were written
 * and run BEFORE the validator changed — on the pre-fix tree they returned
 * grounded=true / mode "structured-claims" (raw output in the PR). Cases
 * 1/3/4/5/6 already failed closed before this round and are kept here as
 * the mandated regression set.
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "fundamental:RELIANCE:roe:2026-09-30",
    text: "ROE %: 12 | provenance: live, observed 2026-09-30 | fact: roe=12 percent (live)",
    facts: [{ field: "roe", value: 12, unit: "percent", source: "live" }],
  },
  {
    id: "fundamental:RELIANCE:pe:2026-09-30",
    text: "P/E: 99 | provenance: live, observed 2026-09-30 | fact: pe=99 multiple (live)",
    facts: [{ field: "pe", value: 99, unit: "multiple", source: "live" }],
  },
];
const ROE_ID = EVIDENCE[0].id;
const PE_ID = EVIDENCE[1].id;

describe("G3 mandatory negative #1 — value mismatch", () => {
  it("evidence ROE=12% + P/E=99x; claim 'ROE is 99%' with assertion roe=99 percent → reject", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 99%",
        evidenceIds: [ROE_ID, PE_ID],
        assertions: [{ field: "roe", value: 99, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("evidence-context");
    expect(r.rejections.join(" ")).toContain("roe");
  });
});

describe("G3 mandatory negative #2 — qualitative claims are context-only", () => {
  it("MUST FAIL PRE-FIX: claim 'The business is strong' + assertion roe=12 percent → context-only, NOT grounded", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "The business is strong",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("context-only");
    expect(r.validatedClaims).toHaveLength(0);
  });

  it("MUST FAIL PRE-FIX: evidenceIds alone (no numbers, no assertions) → context-only, NOT grounded", () => {
    const r = validateGrounding(EVIDENCE, [
      { claim: "The business is strong", evidenceIds: [ROE_ID] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("context-only");
  });

  it("mixed batch: a valid numeric claim grounds; the qualitative claim rides as context-only and does NOT poison the batch", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
      { claim: "The business is strong", evidenceIds: [PE_ID] },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
    expect(r.validatedClaims).toHaveLength(1);
    expect(r.validatedClaims[0].claim).toBe("ROE is 12%");
  });
});

describe("G3 mandatory negative #3 — unit mismatch", () => {
  it("claim 'ROE is 12x' with assertion roe=12 percent → reject", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12x",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("unit");
  });
});

describe("G3 mandatory negative #4 — field mismatch", () => {
  it("claim 'P/E is 12' with assertion roe=12 percent → reject", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "P/E is 12",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("G3 mandatory negative #5 — dates are never accidental evidence", () => {
  it("claim 'As of 2026-09-30, ROE is 12%' with value ROE=12% → 2026 does NOT support it → reject", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "As of 2026-09-30, ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("G3 mandatory negative #6 — the answer floor pools matched assertions only", () => {
  it("answer 'ROE is 12%. The company has 2026 stores.' with no store-count fact → NOT grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "ROE is 12%. The company has 2026 stores.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });
});

describe("G3 — the positive path is unchanged", () => {
  it("a numeric claim whose text references the asserted field/value/unit still grounds", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
    expect(r.validatedClaims).toHaveLength(1);
  });
});
