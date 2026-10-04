// S2-06 — the disagreement metric (Round 13).
//
// Acceptance (roadmap): unit tests on constructed cases (unanimous → 0;
// split → high); monotonic in spread. The normative definition lives in
// docs/methodology/dispersion.md; the normative code is
// lib/consensus/dispersion.ts.
//
// Rule 21: the engine wiring assertions FAIL on the pre-fix tree (the
// ConsensusResult carried no dispersion field) — recorded in the PR.

import { describe, it, expect } from "vitest";

import { dispersion } from "../lib/consensus/dispersion";

describe("S2-06 — constructed cases", () => {
  it("unanimous panel → 0", () => {
    expect(dispersion([70, 70, 70, 70])).toBe(0);
    expect(dispersion([0, 0, 0])).toBe(0);
    expect(dispersion([100, 100])).toBe(0);
  });

  it("a fully split panel → the theoretical maximum, 50", () => {
    expect(dispersion([0, 100])).toBe(50);
    expect(dispersion([0, 0, 100, 100])).toBe(50);
  });

  it("a half-split 20-panel is high (50), not laundered by the majority", () => {
    const panel = [...Array(10).fill(0), ...Array(10).fill(100)];
    expect(dispersion(panel)).toBe(50);
  });

  it("null verdicts are excluded, never coerced to 0 (rule 16)", () => {
    // [80, 80] with two insufficient-data verdicts agrees: σ 0 — NOT σ 40
    // (which treating the nulls as 0 would claim).
    expect(dispersion([80, 80, null, null])).toBe(0);
    // the valid-only σ equals the σ of the filtered array
    expect(dispersion([90, 70, null, 80])).toBeCloseTo(dispersion([90, 70, 80])!, 12);
  });

  it("one valid verdict → null (one voice is not agreement)", () => {
    expect(dispersion([70])).toBeNull();
    expect(dispersion([70, null])).toBeNull();
    expect(dispersion([])).toBeNull();
  });

  it("non-finite garbage is not a verdict either", () => {
    expect(dispersion([70, Number.NaN, 70])).toBe(0);
    expect(dispersion([70, Number.NaN])).toBeNull();
  });

  it("monotone in spread (fixed mean, fixed N)", () => {
    // all panels share mean 50 and N = 20; spread grows stepwise
    const spreads = [0, 5, 10, 20, 40].map((halfSpread) => {
      const panel: number[] = [];
      for (let i = 0; i < 10; i++) panel.push(50 - halfSpread);
      for (let i = 0; i < 10; i++) panel.push(50 + halfSpread);
      return dispersion(panel)!;
    });
    expect(spreads[0]).toBe(0);
    for (let i = 1; i < spreads.length; i++) {
      expect(spreads[i]).toBeGreaterThan(spreads[i - 1]);
    }
    // this two-point family has σ = halfSpread exactly (mass at mean±h);
    // the most extreme panel here is [10,…,10,90,…,90] → σ 40 — the true
    // [0,100] maximum is pinned separately above
    expect(spreads[spreads.length - 1]).toBe(40);
  });

  it("monotone when a middle verdict moves away from the pack", () => {
    const base = [60, 60, 60, 60];
    expect(dispersion([...base, 60])).toBeLessThan(dispersion([...base, 70])!);
    expect(dispersion([...base, 70])).toBeLessThan(dispersion([...base, 90])!);
  });
});

describe("S2-06 — the engine serves the metric (fails pre-fix)", () => {
  it("buildConsensus exposes dispersion; unanimous construction → 0", async () => {
    const { buildConsensus } = await import("../lib/consensus/engine");
    const { STOCKS } = await import("../data/stocks");
    const stock = Object.values(STOCKS)[0];
    const result = buildConsensus(stock);
    // wired: the field exists and is a number or the documented null
    expect(result.dispersion === null || typeof result.dispersion === "number").toBe(true);
    if (result.dispersion !== null) {
      // it is the σ of THIS result's valid scores (recalculated independently)
      const valid = result.scores.map((s) => s.score).filter((s): s is number => s !== null);
      expect(result.dispersion).toBeCloseTo(dispersion(valid)!, 12);
      // range sanity on the 0-100 scale
      expect(result.dispersion).toBeGreaterThanOrEqual(0);
      expect(result.dispersion).toBeLessThanOrEqual(50);
    }
  });

  it("sanitizeConsensus carries the metric across the RSC boundary (the page's source)", async () => {
    const { buildConsensus } = await import("../lib/consensus/engine");
    const { sanitizeConsensus } = await import("../lib/consensus/sanitize");
    const { STOCKS } = await import("../data/stocks");
    const stock = Object.values(STOCKS)[0];
    const sanitized = sanitizeConsensus(buildConsensus(stock));
    expect("dispersion" in sanitized).toBe(true);
    expect(sanitized.dispersion === null || typeof sanitized.dispersion === "number").toBe(true);
  });
});
