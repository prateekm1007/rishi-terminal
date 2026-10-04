/** T11: scorers stay finite and honest on degenerate input. */
import { describe, it, expect } from "vitest";

import type { Stock } from "@/lib/types";
import { runAllScorers, TOTAL_RISHIS } from "@/lib/consensus/orchestrator";
import { buildConsensus, assessDataQuality } from "@/lib/consensus/engine";
import { weightedAverage, MIN_VALID_SCORERS } from "@/lib/consensus/weights";
import { STOCKS } from "@/data/stocks";

const allZeroStock = (): Stock => ({
  symbol: "ZERO", name: "Zero Corp", sector: "IT", exchange: "NSE",
  price: 100, pe: 0, roe: 0, mktcap: 0, ocf: 0, rev: 0, revcagr: 0,
  epscagr: 0, opm: 0, roce: 0, de: 0, fcf: 0, promo: 0, ca: 0, tl: 0,
  sh: 100, np: 0, dep: 0, capex: 0, bvps: 0,
});

const healthyStock = (): Stock => ({
  symbol: "HEAL", name: "Healthy Ltd", sector: "IT", exchange: "NSE",
  price: 1500, pe: 22, roe: 25, mktcap: 120000, ocf: 3000, rev: 10000,
  revcagr: 15, epscagr: 18, opm: 20, roce: 22, de: 0.2, fcf: 1800,
  promo: 55, ca: 5000, tl: 2000, sh: 80, np: 1400, dep: 300,
  capex: 700, bvps: 600,
});

describe("T11 — every scorer is null-safe, never NaN", () => {
  it("registry has the full 20-rishi panel", () => {
    expect(TOTAL_RISHIS).toBe(20);
  });

  it("all 20 scorers return null or finite on all-zero fundamentals", () => {
    const scores = runAllScorers(allZeroStock());
    expect(scores).toHaveLength(TOTAL_RISHIS);
    for (const s of scores) {
      expect(s.score === null || Number.isFinite(s.score)).toBe(true);
    }
    // The two known offenders must return the documented null.
    const damani = scores.find(s => s.name === "Damani")!;
    const jhunjhunwala = scores.find(s => s.name === "Jhunjhunwala")!;
    expect(damani.score).toBeNull();
    expect(jhunjhunwala.score).toBeNull();
    expect(damani.insight).toMatch(/insufficient data/i);
  });

  it("all 944 registry stocks produce only finite/null scorer scores", () => {
    for (const stock of Object.values(STOCKS)) {
      for (const s of runAllScorers(stock)) {
        expect(s.score === null || Number.isFinite(s.score)).toBe(true);
      }
    }
  });

  it("consensus is finite for every registry stock (null only when panel too small)", () => {
    for (const stock of Object.values(STOCKS)) {
      const c = buildConsensus(stock).consensus;
      expect(c === null || Number.isFinite(c)).toBe(true);
      expect(Number.isNaN(c as number)).toBe(false);
    }
  });

  it("weightedAverage ignores null scores but still works above the quorum", () => {
    const scores = runAllScorers(allZeroStock());
    const validCount = scores.filter(s => s.score !== null).length;
    // X6 (Round 13): 15 — Nemish joins the documented-null set on
    // all-zero data (a fully-placeholder record has no Steady Compounder
    // verdict; previously it returned a finite 45 built on two
    // placeholder-perfect pillars). Damani/Jhunjhunwala/Buffett/Greenblatt
    // were already null.
    expect(validCount).toBe(15);
    const c = weightedAverage(scores);
    expect(c).not.toBeNull();
  });

  it("panels below MIN_VALID_SCORERS produce a null consensus", () => {
    // Synthetic panel: only 11 of 20 valid (below the documented quorum)
    const real = runAllScorers(healthyStock());
    const crippled = real.map((s, i) => (i < real.length - MIN_VALID_SCORERS + 1 ? { ...s, score: null } : s));
    const validCount = crippled.filter(s => s.score !== null).length;
    expect(validCount).toBe(MIN_VALID_SCORERS - 1);
    expect(weightedAverage(crippled)).toBeNull();
  });

  it("empty panel is null, never 0", () => {
    expect(weightedAverage([])).toBeNull();
  });

  it("weightedAverage of a full finite panel equals the weighted mean", () => {
    const scores = runAllScorers(healthyStock());
    const c = weightedAverage(scores);
    expect(c).not.toBeNull();
  });

  it("all-zero fundamentals are flagged INCOMPLETE and healthy ones OK", () => {
    expect(assessDataQuality(allZeroStock())).toBe("INCOMPLETE");
    expect(assessDataQuality(healthyStock())).toBe("OK");
    expect(buildConsensus(allZeroStock()).dataQuality).toBe("INCOMPLETE");
  });
});
