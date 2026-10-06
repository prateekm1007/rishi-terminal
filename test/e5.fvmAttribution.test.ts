/**
 * E5-FVM (Round 18, 2026-10-06): the field-value-mismatch attribution
 * defects measured by the r18 authenticated battery
 * (docs/evidence/round18/ai-latency-battery-r18-authenticated.json) —
 * 11 of 14 FVM rows were the model's assertions EXACTLY RIGHT while the
 * claim-text attribution mis-assigned the PRICE level to the `change`
 * field; 1 row was the "Nifty 50" index-name digits parsed as a figure.
 *
 * Fail-first (pre-fix raw): 4 failed / 1 passed —
 *   shape1/2/control rejected "claims change=\"1006.35\" but the matched
 *   change assertion is -1.386"; shape3 rejected "number \"50\" is not a
 *   matched assertion value".
 * Post-fix: 5/5 (the adversarial case stays rejected via the
 * no-price-assertion path — fail-closed preserved).
 *
 * The fix (lib/ai/evidence.ts statedNumbers) is three attribution
 * repairs, none touching a grounded-value gate:
 *   1. currency-unit numbers attributed to `change` re-attribute to
 *      `price` (change is ALWAYS percent in the fact model);
 *   2. "changed to/at <level>" introduces a level, not the metric;
 *   3. index-name digits (Nifty 50 / S&P 500 / FTSE 100) are name
 *      components (the YEAR_TOKEN_RE skip pattern).
 * Plus the digit-path unit trim (space-separated units were silently
 * dropped: "1006.35 inr" carried unit=null).
 */
import { describe, expect, it } from "vitest";
import { validateGrounding } from "@/lib/ai/evidence";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

const SBIN: AiEvidenceItem[] = [{
  id: "price:SBIN:2026-10-06T08:48:08.000Z",
  text: "Latest observed price: 1006.35 (change -1.386%). Source: yahoo | fact: price=1006.35 inr (live); change=-1.386 percent (live)",
  facts: [
    { field: "price", value: 1006.35, unit: "inr", source: "live" },
    { field: "change", value: -1.386, unit: "percent", source: "live" },
  ],
}];
const NIFTY: AiEvidenceItem[] = [{
  id: "price:NIFTY50:2026-10-06T08:57:57.000Z",
  text: "Latest observed level: 22697.4 (change 0.628%). Source: yahoo | fact: price=22697.4 points (live); change=0.628 percent (live)",
  facts: [
    { field: "price", value: 22697.4, unit: "points", source: "live" },
    { field: "change", value: 0.628, unit: "percent", source: "live" },
  ],
}];

describe("E5-FVM shapes (r18 battery field-value-mismatch reconstructions)", () => {
  it("battery shape 1: 'changed to <price>' — price stated under the word change (11/14 rows)", () => {
    const r = validateGrounding(SBIN, [{
      claim: "SBIN changed to 1006.35 inr, a change of -1.386 percent.",
      evidenceIds: [SBIN[0].id],
      assertions: [
        { field: "price", value: 1006.35, unit: "inr" },
        { field: "change", value: -1.386, unit: "percent" },
      ],
    }]);
    console.log("shape1 grounded:", r.grounded, "| rejections:", JSON.stringify(r.rejections));
    expect(r.grounded).toBe(true); // the assertions are exactly right
  });

  it("battery shape 2: 'changed by <pct> to <price>' — trailing price near the change verb", () => {
    const r = validateGrounding(SBIN, [{
      claim: "SBIN has changed by -1.386 percent to 1006.35 inr.",
      evidenceIds: [SBIN[0].id],
      assertions: [
        { field: "price", value: 1006.35, unit: "inr" },
        { field: "change", value: -1.386, unit: "percent" },
      ],
    }]);
    console.log("shape2 grounded:", r.grounded, "| rejections:", JSON.stringify(r.rejections));
    expect(r.grounded).toBe(true);
  });

  it("battery shape 3: index-name digits — 'Nifty 50 at 22697.4 points' (1/14 rows)", () => {
    const r = validateGrounding(NIFTY, [{
      claim: "Nifty 50 trades at 22697.4 points.",
      evidenceIds: [NIFTY[0].id],
      assertions: [{ field: "price", value: 22697.4, unit: "points" }],
    }]);
    console.log("shape3 grounded:", r.grounded, "| rejections:", JSON.stringify(r.rejections));
    expect(r.grounded).toBe(true);
  });

  it("CONTROL (passes today): 'trades at X inr with a positive change of Y percent'", () => {
    const r = validateGrounding(SBIN, [{
      claim: "SBIN trades at 1006.35 inr with a change of -1.386 percent.",
      evidenceIds: [SBIN[0].id],
      assertions: [
        { field: "price", value: 1006.35, unit: "inr" },
        { field: "change", value: -1.386, unit: "percent" },
      ],
    }]);
    console.log("control grounded:", r.grounded, "| rejections:", JSON.stringify(r.rejections));
    expect(r.grounded).toBe(true);
  });

  it("ADVERSARIAL (must stay rejected): prose claims change=999 but assertion says -1.386", () => {
    const r = validateGrounding(SBIN, [{
      claim: "SBIN changed by 999 inr today.",
      evidenceIds: [SBIN[0].id],
      assertions: [{ field: "change", value: -1.386, unit: "percent" }],
    }]);
    console.log("adversarial grounded:", r.grounded, "| rejections:", JSON.stringify(r.rejections));
    expect(r.grounded).toBe(false);
  });
});
