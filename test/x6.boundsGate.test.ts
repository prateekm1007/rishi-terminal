// X6 (Round 13 / carry-over): the distribution gate gets its HONEST shape.
//
// Two corrections from the founder's X6:
//   1. The Greenblatt allow-list REASON is corrected: the low pile (26.9%
//      of the universe at score <= 5) reflects the PLACEHOLDER SEED's
//      earnings values (np placeholders), not a property of the scorer.
//   2. The at-bounds criterion tightens from 20% to 15%: a scorer whose
//      share of scores sits at its own bounds (<= 5 or >= 95) above 15%
//      is an offender. The founder states the expected honest result:
//      Nemish measures ~19% at >= 95 (18.8% measured on the current seed)
//      and MUST be named by the gate.
//
// Written to FAIL FIRST against the pre-X6 gate (Rule 21/24): the gate
// function does not exist as an importable pure unit and the thresholds
// are 20.

import { describe, it, expect } from "vitest";
import { evaluateDistributionGate } from "../scripts/w4Audit";

describe("X6 — the distribution gate (sd / at-bounds shares)", () => {
  it("a healthy scorer passes (sd >= 8, small boundary piles)", () => {
    const r = evaluateDistributionGate({ name: "Pabrai", sd: 17.09, pctLE5: 0.0, pctGE95: 3.4 });
    expect(r.offenders).toHaveLength(0);
    expect(r.pass).toBe(true);
  });

  it("low sd is an offender (unchanged criterion)", () => {
    const r = evaluateDistributionGate({ name: "X", sd: 5.0, pctLE5: 0, pctGE95: 0 });
    expect(r.offenders.join(" ")).toContain("sd");
  });

  it("a scorer with >15% of scores at its own bound is an offender (Nemish: 18.8% >= 95)", () => {
    const r = evaluateDistributionGate({ name: "Nemish", sd: 12.65, pctLE5: 0.0, pctGE95: 18.8 });
    expect(r.pass).toBe(false);
    expect(r.offenders.join(" ")).toContain("Nemish");
    expect(r.offenders.join(" ")).toContain(">= 95");
  });

  it("a scorer exactly AT 15% passes; just above 15% fails (the tightened threshold)", () => {
    expect(evaluateDistributionGate({ name: "A", sd: 12, pctLE5: 15.0, pctGE95: 0 }).pass).toBe(true);
    expect(evaluateDistributionGate({ name: "B", sd: 12, pctLE5: 0, pctGE95: 15.1 }).pass).toBe(false);
  });

  it("the Greenblatt exemption applies ONLY to its documented low pile and states the corrected reason", () => {
    const r = evaluateDistributionGate({
      name: "Greenblatt",
      sd: 24.0,
      pctLE5: 26.9, // the placeholder-seed earnings pile
      pctGE95: 1.7,
    });
    expect(r.pass).toBe(true);
    expect(r.exemptReason).toContain("placeholder");
    expect(r.exemptReason).toContain("seed");
    // the exemption must NOT extend to the >= 95 side
    const r2 = evaluateDistributionGate({
      name: "Greenblatt",
      sd: 24.0,
      pctLE5: 26.9,
      pctGE95: 40.0,
    });
    expect(r2.pass).toBe(false);
    expect(r2.offenders.join(" ")).toContain(">= 95");
  });
});
