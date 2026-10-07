/**
 * X6 (Round 13) — consensus-weight and consensus-saturation gates.
 * Rule 21: the weight gate FAILS on the current latent defect (see the
 * unknown-scorer probe below); the saturation gate pins the measured
 * post-Nemish-fix consensus distribution so silent drift is impossible.
 *
 * Why these gates (the round-11 X6 direction: "consensus-weight/
 * saturation gates"):
 *   - RISHI_WEIGHT_CONFIG had NO gate. `getWeight` silently defaults
 *     unknown scorer names to 1.0 — if a scorer were renamed or added
 *     without a config entry, it would quietly become a Specialist and
 *     the published methodology (ROADMAP S2-01) would drift from the
 *     engine with no test failing.
 *   - The consensus OUTPUT distribution had no gate either: the W4 gate
 *     covers per-scorer health, but a panel-wide shift (every verdict
 *     creeping toward the same number) would pass silently.
 */
import { describe, it, expect } from "vitest";

import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/types";
import { RISHI_WEIGHT_CONFIG } from "@/lib/gurus/weights";
import { MIN_VALID_SCORERS, getWeight } from "@/lib/consensus/weights";
import { runAllScorers, TOTAL_RISHIS } from "@/lib/consensus/orchestrator";
import { buildConsensus } from "@/lib/consensus/engine";

const HEALTHY: Stock = {
  symbol: "HEAL", name: "Healthy Ltd", sector: "IT", exchange: "NSE",
  price: 1500, pe: 22, roe: 25, mktcap: 120000, ocf: 3000, rev: 10000,
  revcagr: 15, epscagr: 18, opm: 20, roce: 22, de: 0.2, fcf: 1800,
  promo: 55, ca: 5000, tl: 2000, sh: 80, np: 1400, dep: 300,
  capex: 700, bvps: 600,
};

describe("X6 — consensus weight configuration is pinned (no silent drift)", () => {
  it("the panel is exactly 20 rishis, matching the engine registry", () => {
    expect(RISHI_WEIGHT_CONFIG).toHaveLength(20);
    expect(TOTAL_RISHIS).toBe(20);
    expect(RISHI_WEIGHT_CONFIG.length).toBe(TOTAL_RISHIS);
  });

  it("names are unique", () => {
    const names = RISHI_WEIGHT_CONFIG.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every weight is finite and in (0, 5]", () => {
    for (const r of RISHI_WEIGHT_CONFIG) {
      expect(Number.isFinite(r.weight)).toBe(true);
      expect(r.weight).toBeGreaterThan(0);
      expect(r.weight).toBeLessThanOrEqual(5);
    }
  });

  it("tiers are exactly the published three, with the published counts (3 Legend / 7 Master / 10 Specialist)", () => {
    const tiers = new Set(RISHI_WEIGHT_CONFIG.map((r) => r.tier));
    expect([...tiers].sort()).toEqual(["Legend", "Master", "Specialist"]);
    const count = (t: string) => RISHI_WEIGHT_CONFIG.filter((r) => r.tier === t).length;
    expect(count("Legend")).toBe(3);
    expect(count("Master")).toBe(7);
    expect(count("Specialist")).toBe(10);
  });

  it("tier weights are strictly ordered: every Legend outweighs every Master outweighs every Specialist", () => {
    const legends = RISHI_WEIGHT_CONFIG.filter((r) => r.tier === "Legend").map((r) => r.weight);
    const masters = RISHI_WEIGHT_CONFIG.filter((r) => r.tier === "Master").map((r) => r.weight);
    const specialists = RISHI_WEIGHT_CONFIG.filter((r) => r.tier === "Specialist").map((r) => r.weight);
    expect(Math.min(...legends)).toBeGreaterThan(Math.max(...masters));
    expect(Math.min(...masters)).toBeGreaterThan(Math.max(...specialists));
  });

  it("GATE (bites on the latent defect): every scorer the engine returns has an EXPLICIT config entry — no silent 1.0 fallback", () => {
    const configured = new Set(RISHI_WEIGHT_CONFIG.map((r) => r.name));
    const engineNames = runAllScorers(HEALTHY).map((s) => s.name);
    const unconfigured = engineNames.filter((n) => !configured.has(n));
    expect(
      unconfigured,
      `scorers silently defaulting to weight 1.0 (getWeight ?? 1.0): ${unconfigured.join(", ")}`,
    ).toEqual([]);
    // And the lookup itself is fail-closed: an unconfigured scorer name
    // throws instead of silently scoring as a Specialist.
    expect(() => getWeight("__never_configured__")).toThrow(/no RISHI_WEIGHT_CONFIG entry/);
  });

  it("MIN_VALID_SCORERS is 12 and the true quorum property holds: every 12-of-20 quorum contains at least 2 Specialists", () => {
    expect(MIN_VALID_SCORERS).toBe(12);
    // Mechanical property, computed from the config: only 10 non-Specialists
    // exist, so any 12 valid scorers include >= 2 Specialists. Legend and
    // Master presence is NOT guaranteed by the quorum alone — the weights
    // document this honestly (a quorum of 10 Specialists + 2 Masters is
    // possible and is still a majority of the panel).
    const nonSpecialists = RISHI_WEIGHT_CONFIG.filter((r) => r.tier !== "Specialist").length;
    expect(TOTAL_RISHIS - nonSpecialists).toBe(10);
    expect(MIN_VALID_SCORERS - nonSpecialists).toBe(2);
  });
});

describe("X6 — consensus output saturation gate (measured on the seed universe)", () => {
  // Measured AFTER the X6 fixes on this tree (raw output in the PR):
  //   n=916 (0 nulls) mean=65.2 sd=7.9 %>=90: 0.0 %<=5: 0.0
  // (pre-fix: mean=64.4 sd=8.0 — the weight repair lifted two Masters from
  // their silent 1.0 to 2.0 and the Nemish nulls removed 259 placeholder
  // verdicts; consensus values changed on 489 of 916 stocks, max |delta| 4).
  // Thresholds carry documented headroom so legitimate seed/data evolution
  // does not trip the gate, but a panel-wide saturation drift cannot pass
  // silently.
  const cons = Object.values(STOCKS)
    .map((s) => buildConsensus(s).consensus)
    .filter((v): v is number => v !== null);
  const mean = cons.reduce((a, b) => a + b, 0) / cons.length;
  const sd = Math.sqrt(cons.reduce((a, b) => a + (b - mean) ** 2, 0) / (cons.length - 1));
  const pctLE5 = cons.filter((v) => v <= 5).length / cons.length;
  const pctGE90 = cons.filter((v) => v >= 90).length / cons.length;

  it("every seed stock produces a finite consensus (quorum holds)", () => {
    expect(cons.length).toBe(Object.values(STOCKS).length);
    expect(cons.length).toBeGreaterThan(890);
  });

  it("the consensus keeps real spread: sd >= 5 (measured baseline documented in the PR)", () => {
    expect(sd).toBeGreaterThanOrEqual(5);
  });

  it("the consensus is not saturated at the top: <= 5% of stocks at >= 90", () => {
    expect(pctGE90).toBeLessThanOrEqual(0.05);
  });

  it("the consensus is not piled at the floor: <= 5% of stocks at <= 5", () => {
    expect(pctLE5).toBeLessThanOrEqual(0.05);
  });
});
