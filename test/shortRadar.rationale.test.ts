/**
 * P10 (round 20) — rationale traceability + placeholder suppression,
 * mechanical (founder direction 13). Contract:
 * docs/evidence/round20/short-radar-validation-contract.md section 3.
 *
 * Fail-first: on the v1 model the promoter/leverage/CAGR flags DISPLAY on
 * the radar while their features contribute NOTHING to the ranking score
 * (the pillars that would read them receive no resolvable input), and
 * seed-placeholder zeros (e.g. NAZARA promoterHolding 0.0%) fire flags and
 * render as facts. Both must be red here before the repair.
 */
import { describe, expect, it } from "vitest";

import { computeShortRadar, shortFlags } from "@/lib/scoring/rankings";
import { resolveStockMetrics, calculateQvps } from "@/lib/scoring";
import { STOCKS } from "@/data/stocks";
import type { StockMetrics } from "@/lib/scorers/types";

/** Each trigger flag maps to exactly ONE scoring feature. */
const FLAG_FIELD: Record<string, keyof StockMetrics> = {
  overvalued: "pe",
  decay: "revenueCAGR3Y",
  leverage: "debtToEquity",
  cash_burn: "fcfMargin",
  governance: "promoterHolding",
};

describe("P10 — Short Radar rationale contract (round 20)", () => {
  const radar = computeShortRadar(20);

  it("positive control: the radar is non-empty (an absence must not pass)", () => {
    expect(radar.length).toBeGreaterThan(0);
  });

  it("every displayed flag's feature contributes to that candidate's ranking score", () => {
    for (const c of radar) {
      const resolved = resolveStockMetrics(c.symbol);
      if (!resolved) continue;
      const flags = shortFlags(STOCKS[c.symbol]);
      expect(flags.length, `${c.symbol}: gate and display must agree`).toBe(c.flagCount);
      const baseScore = calculateQvps(resolved.metrics, "SHORT", false).finalScore;
      for (const f of flags) {
        const field = FLAG_FIELD[f.key];
        const without: StockMetrics = { ...resolved.metrics, [field]: undefined };
        const reduced = calculateQvps(without, "SHORT", false).finalScore;
        expect(
          reduced,
          `${c.symbol} displays "${f.label}" but its feature (${field}) contributes nothing to the score`,
        ).toBeLessThan(baseScore);
      }
    }
  });

  it("seed-placeholder zeros fire no flag (missing data is never a value)", () => {
    for (const s of Object.values(STOCKS)) {
      const flags = shortFlags(s);
      if (s.pe === 0) {
        expect(flags.some((f) => f.key === "overvalued"), `${s.symbol} pe=0 placeholder`).toBe(false);
      }
      if (s.revcagr === 0) {
        expect(flags.some((f) => f.key === "decay"), `${s.symbol} revcagr=0 placeholder`).toBe(false);
      }
      if (s.de === 0) {
        expect(flags.some((f) => f.key === "leverage"), `${s.symbol} de=0 placeholder`).toBe(false);
      }
      if (s.promo === 0) {
        expect(flags.some((f) => f.key === "governance"), `${s.symbol} promo=0 placeholder`).toBe(false);
      }
    }
    // The founder's screenshot case: NAZARA's "Low promoter skin-in-game
    // (0.0%)" is a placeholder rendered as a fact — it must never fire.
    expect(shortFlags(STOCKS.NAZARA).some((f) => f.key === "governance")).toBe(false);
  });

  it("founder screenshot symbols: every displayed warning traces to the ranking", () => {
    for (const sym of ["DELHIVERY", "GMRAIRPORT", "NAZARA"]) {
      const candidate = computeShortRadar(20).find((x) => x.symbol === sym);
      if (!candidate) continue; // no longer gating >= 2 flags is an honest outcome
      for (const f of shortFlags(STOCKS[sym])) {
        expect(candidate.reason).toContain(f.label);
      }
    }
  });
});
