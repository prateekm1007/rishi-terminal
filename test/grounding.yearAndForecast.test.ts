/**
 * Commit O / U6 (founder round 6): the two grounding gaps the founder's
 * adversarial harness caught.
 *
 * 1. Year/date tokens: "In 2025 ROE was 12%" was rejected because the year
 *    2025 looked like an unsupported market number. A year in date context
 *    is NOT a market observation — it is exempt from the unsupported-number
 *    gate (claim text AND answer prose).
 * 2. Atomic claims: "ROE is 12% and the company will double profits" passed
 *    as grounded — a verified number riding UNVERIFIED forecast language.
 *    A claim (or the answer prose) carrying closed-vocabulary forecast or
 *    advice-superlative language is rejected wholesale: facts are typed
 *    numbers, and no fact can ever back a forecast.
 *
 * Rule 21: both rows failed on the pre-fix tree
 * (docs/evidence/commit-o/failfirst-u6-raw.txt).
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const ROE_ITEM: AiEvidenceItem = {
  id: "fundamental:RELIANCE:roe:2026-10-01T10:00:00.000Z",
  text: "ROE %: 12 | provenance: live as of 2026-10-01T10:00:00.000Z | fact: roe=12 percent (live)",
  facts: [{ field: "roe", value: 12, unit: "percent", source: "live", observedAt: "2026-10-01T10:00:00.000Z" }],
};

function roeClaim(claim: string) {
  return [
    {
      claim,
      evidenceIds: [ROE_ITEM.id],
      assertions: [{ field: "roe", value: 12, unit: "percent" }],
    },
  ];
}

describe("MUST FAIL PRE-U6: years in date context are not market numbers", () => {
  it("'In 2025 ROE was 12%' grounds against the roe fact", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("In 2025 ROE was 12%."), "In 2025 ROE was 12%.");
    expect(g.grounded).toBe(true);
    expect(g.validatedClaims).toHaveLength(1);
    expect(g.rejections.join(" ")).not.toMatch(/2025/);
  });

  it("'ROE was 12% in FY2025' grounds (FY date form)", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("ROE was 12% in FY2025."), "ROE was 12% in FY2025.");
    expect(g.grounded).toBe(true);
  });

  it("a non-date 4-digit figure is still rejected (the exemption cannot launder a price)", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("ROE was 12 and the stock trades at 2500."), "ROE was 12.");
    expect(g.grounded).toBe(false);
  });
});

describe("MUST FAIL PRE-U6: forecast language rejects the whole claim (atomic claims)", () => {
  it("the founder's case — 'ROE is 12% and the company will double profits' is NOT grounded", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("ROE is 12% and the company will double profits."), "ROE is 12%.");
    expect(g.grounded).toBe(false);
    expect(g.validatedClaims).toHaveLength(0);
    expect(g.rejections.join(" ")).toMatch(/forecast/i);
  });

  it("forecast language in the ANSWER prose also rejects the batch", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("ROE is 12%."), "ROE is 12%, and profits are going to double.");
    expect(g.grounded).toBe(false);
    expect(g.rejections.join(" ")).toMatch(/forecast/i);
  });

  it("plain factual wording still grounds (no over-trigger)", () => {
    const g = validateGrounding([ROE_ITEM], roeClaim("ROE is 12%."), "ROE is 12%.");
    expect(g.grounded).toBe(true);
  });
});
