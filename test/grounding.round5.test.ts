/**
 * Round-5 audit (2026-10-02) — Q4 grounding bypasses, carried over from the
 * round-4 PR audit. Rule 21: these tests were written from the auditor's
 * repro instructions and watched FAILING on the pre-fix code before the fix.
 *
 *  B1 number words: "fifty percent" must be a stated number, so a claim
 *     stating it without a matching assertion is rejected.
 *  B2 South-Asian scale: "1.2 lakh crore" must normalize to the canonical
 *     120000 inr_crore form before the answer-floor check.
 *  B3 cross-field ride: "Debt to equity is 12" backed only by an roe=12
 *     assertion must be rejected (attribution + distance-hardening).
 *  B4 digitless metric fabrication: a claim mentioning a metric field with
 *     no number must cite an item that actually carries that field.
 *
 * Controls: correctly-grounded and purely-qualitative claims still pass.
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "../lib/ai/evidence";
import type { AiEvidenceItem } from "../lib/ai/schemas";

const roeItem: AiEvidenceItem = {
  id: "fundamental:TEST:roe:2026-10-01",
  text: "Return on equity 12% | fact: roe=12 percent (live)",
  facts: [{ field: "roe", value: 12, unit: "percent", source: "live" }],
};

const capItem: AiEvidenceItem = {
  id: "fundamental:TEST:mktcap:2026-10-01",
  text: "Market cap 120000 Cr | fact: mktcap=120000 inr_crore (live)",
  facts: [{ field: "mktcap", value: 120000, unit: "inr_crore", source: "live" }],
};

const newsItem: AiEvidenceItem = {
  id: "news:TEST:1",
  text: "Company XYZ announced a new plant.",
  facts: [],
};

describe("round-5 Q4 bypasses — must be CLOSED", () => {
  it("B1: number words are stated numbers (fifty percent)", () => {
    const r = validateGrounding(
      [roeItem],
      [
        {
          claim: "Return on equity is fifty percent.",
          evidenceIds: [roeItem.id],
          assertions: [],
        },
      ],
      "Return on equity is fifty percent.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toMatch(/fifty/i);
  });

  it("B2: '1.2 lakh crore' normalizes to 120000 inr_crore", () => {
    const r = validateGrounding(
      [capItem],
      [
        {
          claim: "Market cap is 1.2 lakh crore.",
          evidenceIds: [capItem.id],
          assertions: [{ field: "mktcap", value: 120000, unit: "inr_crore" }],
        },
      ],
      "Market cap is 1.2 lakh crore.",
    );
    expect(r.grounded).toBe(true);
  });

  it("B2b: '1.2 lakh crore' with the WRONG scale still fails", () => {
    const r = validateGrounding(
      [capItem],
      [
        {
          claim: "Market cap is 12 lakh crore.",
          evidenceIds: [capItem.id],
          assertions: [{ field: "mktcap", value: 120000, unit: "inr_crore" }],
        },
      ],
      "Market cap is 12 lakh crore.",
    );
    expect(r.grounded).toBe(false);
  });

  it("B3: 'Debt to equity is 12' cannot ride an roe=12 assertion", () => {
    const r = validateGrounding(
      [roeItem],
      [
        {
          claim: "Debt to equity is 12.",
          evidenceIds: [roeItem.id],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "Debt to equity is 12.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toMatch(/de|debt/i);
  });

  it("B3b: attribution cannot be dodged by prose distance", () => {
    const r = validateGrounding(
      [roeItem],
      [
        {
          claim: "The ratio of debt to equity for this business stands at 12.",
          evidenceIds: [roeItem.id],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "The ratio of debt to equity for this business stands at 12.",
    );
    expect(r.grounded).toBe(false);
  });

  it("B4: digitless metric fabrication must cite the field's item", () => {
    const r = validateGrounding(
      [newsItem, roeItem],
      [
        {
          claim: "Debt to equity is alarming and deteriorating fast.",
          evidenceIds: [newsItem.id],
          assertions: [],
        },
      ],
      "Debt to equity is alarming and deteriorating fast.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toMatch(/de|debt/i);
  });
});

describe("round-5 Q4 controls — must still PASS", () => {
  it("CONTROL: correctly grounded roe claim passes", () => {
    const r = validateGrounding(
      [roeItem],
      [
        {
          claim: "Return on equity is 12%.",
          evidenceIds: [roeItem.id],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "Return on equity is 12%.",
    );
    expect(r.grounded).toBe(true);
  });

  it("CONTROL: purely qualitative claim passes", () => {
    const r = validateGrounding(
      [newsItem],
      [
        {
          claim: "The company announced a new plant.",
          evidenceIds: [newsItem.id],
          assertions: [],
        },
      ],
      "The company announced a new plant.",
    );
    expect(r.grounded).toBe(true);
  });

  it("CONTROL: number word consistent with the fact passes", () => {
    const r = validateGrounding(
      [roeItem],
      [
        {
          claim: "Return on equity is twelve percent.",
          evidenceIds: [roeItem.id],
          assertions: [{ field: "roe", value: 12, unit: "percent" }],
        },
      ],
      "Return on equity is twelve percent.",
    );
    expect(r.grounded).toBe(true);
  });
});
