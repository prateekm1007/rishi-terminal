/**
 * Q4 Commit D — the REMAINING semantic-grounding escape hatches (founder
 * directions §2A). Commit A made assertions mandatory, but three escape
 * routes survived:
 *
 *   1. citedTextNumbers: a number that merely APPEARS in the cited evidence
 *      prose (a date, an id, another metric's value) accepted any claim text
 *      carrying it — "ROE is 2026%" passed because "2026-09-30" was in the
 *      evidence text.
 *   2. The model's free-form claim prose was served VERBATIM as the verified
 *      claim as long as its number matched an assertion — so "P/E is 12"
 *      (assertion roe=12 percent) and "ROE is 12x" (assertion roe=12
 *      percent) were both published as grounded.
 *   3. The answer floor pooled cited TEXT numbers, so "valuation cycle 2026"
 *      became grounded because 2026 sat in evidence prose.
 *
 * Contract under test (most deterministic fail-closed design, no fuzzy NLP):
 *   - every number in a numeric claim's text must be a VALIDATED ASSERTION
 *     value (presence in evidence prose is never sufficient);
 *   - a unit marker attached to a number in prose must match the asserted
 *     unit (12x ≠ 12 percent);
 *   - a field named in a numeric claim's prose must be an asserted field
 *     (closed label table — conservative, deterministic);
 *   - the SERVED grounded claim for a numeric claim is SERVER-GENERATED from
 *     the validated assertions — model prose is never the verified surface;
 *   - the answer's numbers must trace to validated assertions or to TYPED
 *     FACTS of the cited items — never to evidence prose.
 *
 * Bite-proof: written and run BEFORE the implementation changed; every test
 * marked "MUST FAIL PRE-FIX" failed on the presence-based validator (raw
 * output in the PR description).
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

/** Evidence whose TEXT carries the incidental year 2026 (as-of date) —
 *  exactly the shape the founder's bites describe. */
const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z",
    text: "ROE %: 12 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z | fact: roe=12 percent (live)",
    facts: [{ field: "roe", value: 12, unit: "percent", source: "live" }],
  },
  {
    id: "fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z",
    text: "P/E: 99 | provenance: live via vendor screener, observed/as-of 2026-09-30T10:00:00.000Z | fact: pe=99 multiple (live)",
    facts: [{ field: "pe", value: 99, unit: "multiple", source: "live" }],
  },
];
const ROE_ID = "fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z";
const PE_ID = "fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z";

describe("Commit D §2A bite 1 — prose numbers are not assertions (2026 case)", () => {
  it("MUST FAIL PRE-FIX: 'ROE is 2026%' with a TRUE assertion (roe=12) — 2026 sits in the cited as-of date", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 2026%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });

  it("MUST FAIL PRE-FIX: 'ROE is 12% and the fiscal year is 2026' — the year is not an asserted figure", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12% and the fiscal year is 2026",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });
});

describe("Commit D §2A bite 2 — the prose field must be the asserted field", () => {
  it("MUST FAIL PRE-FIX: 'P/E is 12' while asserting roe=12 percent → rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "P/E is 12",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("pe");
  });

  it("the same sentence with the matching field is accepted", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
  });

  it("a claim naming TWO fields but asserting only one is rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "Compared to the industry P/E, ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });
});

describe("Commit D §2A bite 3 — the prose unit must be the asserted unit", () => {
  it("MUST FAIL PRE-FIX: 'ROE is 12x' (multiple marker) while asserting roe=12 percent → rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12x",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
  });

  it("MUST FAIL PRE-FIX: 'the score is 72 percent' (wrong marker) while asserting points → rejected", () => {
    const r = validateGrounding(
      [
        {
          id: "score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z",
          text: "Rishi consensus score (rishi-merit-v1): 72/100 | fact: score=72 points (derived)",
          facts: [{ field: "score", value: 72, unit: "points", source: "derived" }],
        },
      ],
      [
        {
          claim: "the score is 72 percent",
          evidenceIds: ["score:RELIANCE:rishi-merit-v1:2026-09-30T10:00:00.000Z"],
          assertions: [{ field: "score", value: 72, unit: "points" }],
        },
      ],
    );
    expect(r.grounded).toBe(false);
  });

  it("matching markers pass: 'P/E is 99x' with pe=99 multiple", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "P/E is 99x",
        evidenceIds: [PE_ID],
        assertions: [{ field: "pe", value: 99, unit: "multiple" }],
      },
    ]);
    expect(r.grounded).toBe(true);
  });
});

describe("Commit D §2A bite 4 — 2026 in cited TEXT validates nothing else", () => {
  it("MUST FAIL PRE-FIX: a second figure in prose (0.8% change is real elsewhere is irrelevant — here: 'Promoter holding is 2026') is rejected", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "Promoter holding is 2026",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });

  it("the VALID claim still passes while the evidence text carries 2026", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
  });
});

describe("Commit D §2A bite 5 — the answer floor no longer trusts evidence prose", () => {
  it("MUST FAIL PRE-FIX: answer 'ROE is 12%; valuation cycle 2026' — 2026 must not become grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "ROE is 12%; valuation cycle 2026",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("2026");
  });

  it("MUST FAIL PRE-FIX: answer naming an unasserted field with a matched value ('P/E is 12' vs roe) is rejected", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "The P/E is 12 here.",
    );
    expect(r.grounded).toBe(false);
  });

  it("an answer whose numbers are validated assertions (or typed facts of the cited items) stays grounded", () => {
    const r = validateGrounding(
      EVIDENCE,
      [
        {
          claim: "ROE is 12%",
          evidenceIds: [ROE_ID],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
        {
          claim: "P/E is 99x",
          evidenceIds: [PE_ID],
          assertions: [{ field: "pe", value: 99, unit: "multiple" }],
        },
      ],
      "ROE is 12% while the P/E is 99x.",
    );
    expect(r.grounded).toBe(true);
  });
});

describe("Commit D §2A — the served grounded claim is SERVER-GENERATED, not model prose", () => {
  it("MUST FAIL PRE-FIX: the validated numeric claim is the canonical assertion statement, not the model's sentence", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "ROE is 12%",
        evidenceIds: [ROE_ID],
        assertions: [{ field: "roe", value: 12, unit: "percent" }],
      },
    ]);
    expect(r.grounded).toBe(true);
    // The verified surface is derived from the VALIDATED ASSERTION and names
    // the evidence item that carries it — whatever the model wrote stays out.
    expect(r.validatedClaims[0].claim).toContain("roe = 12 percent");
    expect(r.validatedClaims[0].claim).toContain(`verified against ${ROE_ID}`);
    expect(r.validatedClaims[0].claim).not.toBe("ROE is 12%");
  });

  it("a qualitative (number-free) claim keeps the model's text — only ids are verified there", () => {
    const r = validateGrounding(EVIDENCE, [
      {
        claim: "The market capitalization is disclosed in the dataset.",
        evidenceIds: [PE_ID],
      },
    ]);
    expect(r.grounded).toBe(true);
    expect(r.validatedClaims[0].claim).toBe("The market capitalization is disclosed in the dataset.");
  });
});
