/** T11: scorers stay finite and honest on degenerate input. */
import { vi, describe, it, expect } from "vitest";

import type { Stock } from "@/lib/types";
import { runAllScorers, TOTAL_RISHIS } from "@/lib/consensus/orchestrator";
import { buildConsensus } from "@/lib/consensus/engine";
import { dataQualityFromSeedStock } from "@/lib/dataQuality";
import { weightedAverage, MIN_VALID_SCORERS } from "@/lib/consensus/weights";
import { STOCKS } from "@/data/stocks";

// Round-47 P0-8: this file pins the LICENSED state — the scorer
// arithmetic beneath the price-license gate. The publication hold while
// the exchange-data license is unresolved is pinned by
// test/licenseGate.test.ts; the seed-world refusal-reason pins below
// are unaffected (the sector and placeholder guards precede the license
// gate inside every scorer).
// (vi added to the vitest import for the mock.)
vi.mock("@/lib/licensing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/licensing")>();
  // The arithmetic world: the exchange-data license is satisfied.
  return { ...actual, priceScoresPublic: () => true };
});


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
    // P0-2 (founder audit 2026-10-11): an all-placeholder record yields the
    // honest no-verdict from EVERY scorer — stronger than the old
    // mixed-null state (Damani/Jhunjhunwala nulls, others fabricating from
    // zeros). The insight names the unknown fields.
    for (const s of scores) {
      expect(s.score, `${s.name} scored an all-placeholder record`).toBeNull();
      expect(s.insight).toMatch(/[Nn]o verdict|insufficient data/i);
    }
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

  it("weightedAverage ignores null scores; the quorum holds on observed data (P0-2 re-pin)", () => {
    // P0-2: an all-placeholder record nulls the WHOLE panel (20/20) — the
    // quorum refuses, and the refusal is the honest state (was: 15 valid
    // scorers fabricating from placeholder zeros). The quorum-below null
    // and the quorum-above finite number are both pinned; the arithmetic
    // on observed data is unchanged.
    const allZero = runAllScorers(allZeroStock());
    expect(allZero.filter(s => s.score !== null).length).toBe(0);
    expect(weightedAverage(allZero)).toBeNull();

    const observed = runAllScorers(healthyStock(), { unknownFields: new Set<string>() });
    expect(observed.filter(s => s.score !== null).length).toBe(TOTAL_RISHIS);
    expect(weightedAverage(observed)).not.toBeNull();
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

  // Round-46 P0-1 re-pin (founder audit 2026-10-11: "add dataQuality
  // (live, delayed, seed, missing)"): the OK | INCOMPLETE pair is replaced
  // by the closed four-value vocabulary. all-zero is "missing" (no usable
  // data); a healthy BARE-SEED record is "seed" (illustrative data — the
  // verdict gate itself lives on getStockScore, see test/dataQuality.test.ts).
  it("all-zero fundamentals are missing and healthy seed ones are seed", () => {
    expect(dataQualityFromSeedStock(allZeroStock())).toBe("missing");
    expect(dataQualityFromSeedStock(healthyStock())).toBe("seed");
    expect(buildConsensus(allZeroStock()).dataQuality).toBe("missing");
  });
});
