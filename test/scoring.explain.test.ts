// S2-05 — Score explainability (Round 13).
//
// Acceptance (roadmap): "sum of contributions reconstructs the score
// within 1e-6 for every universe stock."
//
// The contract pinned here, for EVERY consensus scorer on EVERY universe
// stock:
//   1. weights are COMPLETE: the comps' weights sum to exactly 100 — a
//      hidden constant pillar (a scorer term not shown anywhere) is a
//      Rule-1 lie and fails this gate;
//   2. every pillar value v is in [0, 100];
//   3. RECONSTRUCTION: sum(comps.v * comps.wt / 100) reproduces the
//      scorer's pre-round weighted sum (scoreRaw) within 1e-6 — the
//      breakdown on the page is the ACTUAL arithmetic, not a rounded
//      decoration;
//   4. the displayed score is exactly Math.round(scoreRaw).
//
// Rule 21: this test was written and RUN against the pre-fix tree, where
// it failed on all four contracts (comps carried Math.round-ed pillars,
// six scorers hid a constant 50-term, and scoreRaw did not exist). The
// recorded failure output is in the S2-05 PR description.

import { describe, it, expect } from "vitest";

import { STOCKS } from "../data/stocks";
import { runAllScorers, TOTAL_RISHIS } from "../lib/consensus/orchestrator";

const UNIVERSE = Object.values(STOCKS);

describe("S2-05 — every score is reconstructible from its published breakdown", () => {
  it(
    "every universe stock's every scorer: complete weights, in-range pillars, exact reconstruction, honest rounding",
    () => {
      expect(UNIVERSE.length).toBeGreaterThan(890);

      for (const stock of UNIVERSE) {
        const scores = runAllScorers(stock);
        expect(scores).toHaveLength(TOTAL_RISHIS);

        for (const rishi of scores) {
          if (rishi.score === null) {
            // T11: insufficient data — nothing is claimed, nothing is
            // reconstructible. The verdict must not invent a number.
            continue;
          }

          // The raw weighted sum MUST be published (no silent rounding).
          expect(
            rishi.scoreRaw,
            `${stock.symbol} ${rishi.name}: scoreRaw missing — the breakdown cannot explain the score`,
          ).toBeDefined();
          expect(rishi.scoreRaw).not.toBeNull();

          // (1) complete weights — no hidden pillars.
          const wtSum = rishi.comps.reduce((a, c) => a + c.wt, 0);
          expect(wtSum, `${stock.symbol} ${rishi.name}: comps weights sum to ${wtSum}, not 100 (hidden pillar)`).toBe(100);

          // (2) every pillar value is a score in [0, 100].
          for (const comp of rishi.comps) {
            expect(
              comp.v >= 0 && comp.v <= 100,
              `${stock.symbol} ${rishi.name}: pillar "${comp.label}" v=${comp.v} outside [0,100]`,
            ).toBe(true);
          }

          // (3) the contributions reconstruct the raw sum (1e-6).
          const sum = rishi.comps.reduce((a, c) => a + (c.v * c.wt) / 100, 0);
          expect(
            Math.abs(sum - (rishi.scoreRaw as number)),
            `${stock.symbol} ${rishi.name}: breakdown sums to ${sum}, scorer says ${rishi.scoreRaw}`,
          ).toBeLessThanOrEqual(1e-6);

          // (4) the displayed score is the honest rounding of the raw sum.
          expect(Math.round(rishi.scoreRaw as number)).toBe(rishi.score);
        }
      }
    },
    240_000,
  );

  it("the explain data survives sanitization (the page's data source carries scoreRaw + unrounded pillars)", async () => {
    const { sanitizeConsensus } = await import("../lib/consensus/sanitize");
    const { buildConsensus } = await import("../lib/consensus/engine");
    const stock = UNIVERSE[0];
    const sanitized = sanitizeConsensus(buildConsensus(stock));
    const withScore = sanitized.verdicts.find(v => v.score !== null);
    expect(withScore).toBeDefined();
    expect(withScore!.scoreRaw).toBeDefined();
    expect(withScore!.comps.length).toBeGreaterThan(0);
    const wtSum = withScore!.comps.reduce((a, c) => a + c.wt, 0);
    expect(wtSum).toBe(100);
  });
});
