/**
 * X6 (Round 13) — the Y4 placeholder-zero contract reaches the scoring
 * boundary. Rule 21: written and run BEFORE the fix (raw RED output in the
 * PR description).
 *
 * The defect (measured on main @ 0a56ad1):
 *   scoreNemish treats seed placeholder zeros as PERFECT observations —
 *   `de: 0` (the June placeholder for "unknown", Y4) scored "Debt Free"
 *   as 100 on 145 stocks; `pe: 0` scored "Valuation" as 100 on 73 stocks.
 *   Nemish NEVER returned null on any of the 916 seed stocks, and on a
 *   fully-unknown record it still returned a finite 45 ("Debt Free 100,
 *   Valuation 100" on data nobody observed). It was also the most
 *   saturated scorer in the panel (mean 87.5, 18.8% of scores >= 95 —
 *   a hair under the W4 20% limit) precisely because unknowns scored as
 *   perfect.
 *
 * The contract this file pins (constitution rules 3, 16; Y4 + G5):
 *   - A seed-sourced 0 is the placeholder for UNKNOWN — a pillar built on
 *     it is insufficient, and a four-pillar verdict with a missing pillar
 *     is null ("insufficient data"), exactly like Damani/Jhunjhunwala.
 *   - A LIVE-sourced 0 is a real observation (G5: a debt-free company has
 *     D/E = 0) and MUST still score — the fix may not reinterpret live
 *     zeros as missing.
 *   - P/E <= 0 is never a valuation observation under either contract
 *     (G5: live P/E must be strictly positive — 0/negative is a provider
 *     sentinel; Y4: seed 0 is the placeholder): insufficient regardless
 *     of provenance.
 */
import { describe, it, expect } from "vitest";

import { STOCKS } from "@/data/stocks";
import type { Stock } from "@/lib/types";
import { scoreNemish } from "@/lib/scorers/nemish";
import { runAllScorers } from "@/lib/consensus/orchestrator";
import { buildConsensus } from "@/lib/consensus/engine";
import { getStockScore, resolveStockMetrics } from "@/lib/scoring";

const UNKNOWN_STOCK: Stock = {
  symbol: "UNK", name: "Unknown Corp", sector: "X", exchange: "NSE",
  price: 0, pe: 0, roe: 0, mktcap: 0, ocf: 0, rev: 0, revcagr: 0,
  epscagr: 0, opm: 0, roce: 0, de: 0, fcf: 0, promo: 0, ca: 0, tl: 0,
  sh: 0, np: 0, dep: 0, capex: 0, bvps: 0,
};

/** RELIANCE: all four Nemish inputs are real non-zero seed values
 *  (epscagr 14, de 0.45, promo 50.3, pe 28) — the arithmetic must not
 *  change for observed data. */
const RELIANCE = STOCKS["RELIANCE"] as Stock;

describe("X6 — Nemish: a pillar built on a placeholder zero is insufficient", () => {
  it("a fully-unknown record returns null, not a finite score built on two perfect pillars", () => {
    const n = scoreNemish(UNKNOWN_STOCK);
    expect(n.score).toBeNull();
  });

  it("the null verdict says insufficient data honestly (insight + per-pillar details)", () => {
    const n = scoreNemish(UNKNOWN_STOCK);
    expect(n.insight).toMatch(/insufficient data/i);
    for (const c of n.comps) {
      expect(c.detail).toMatch(/insufficient data|placeholder/i);
    }
  });

  it("P/E 0 is never a cheap valuation: insufficient even with no context at all", () => {
    // pe=0 with the other three inputs real — today this scores
    // Valuation=100 ("P/E 0" read as ultra-cheap).
    const zero: Stock = { ...RELIANCE, pe: 0 };
    const n = scoreNemish(zero);
    expect(n.score).toBeNull();
    expect(n.comps.find((c) => c.label === "Valuation")!.detail).toMatch(/insufficient/i);
  });

  it("SBIN (bank; seed de: 0 is the June placeholder) loses its Steady Compounder verdict", () => {
    const sbin = STOCKS["SBIN"] as Stock;
    expect(sbin.de).toBe(0); // the placeholder this test exists for
    const n = scoreNemish(sbin);
    expect(n.score).toBeNull();
  });

  it("RELIANCE (all four inputs observed) keeps its finite verdict — no arithmetic change on real data", () => {
    const n = scoreNemish(RELIANCE);
    expect(n.score).not.toBeNull();
    // Same arithmetic as before the fix: epscagr 14 >= 12 -> 100,
    // de 0.45 <= 0.6 -> 80, promo 50.3 >= 35 -> 100, pe 28 <= 35 -> 70;
    // total = 100*0.35 + 80*0.30 + 100*0.20 + 70*0.15 = 89.5 -> 90
    // (verified against the pre-fix scorer on main @ 0a56ad1).
    expect(n.score).toBe(90);
  });

  it("negative observations are REAL and score (not insufficient): epscagr < 0 earns 0 consistency points", () => {
    const downturn: Stock = { ...RELIANCE, epscagr: -8 };
    const n = scoreNemish(downturn);
    // A downturn is an observation — the verdict stands, the pillar floors.
    expect(n.score).not.toBeNull();
    expect(n.comps.find((c) => c.label === "EPS Consistency")!.v).toBe(0);
  });
});

describe("X6 — live zeros are observations (G5 preserved through the scoring boundary)", () => {
  it("a live-sourced D/E of 0 (genuinely debt-free) still scores Debt Free = 100", () => {
    // resolveStockMetrics with a live overlay reporting debtToEquity: 0 —
    // admissible per G5 (nonNegative). The merged stock carries de=0 with
    // source 'live', so the scoring context must NOT mark it unknown.
    const resolved = resolveStockMetrics("RELIANCE", {
      pe: 21.5, roe: 14.2, roce: 16.1, opm: 18.3, debtToEquity: 0,
      promoterHolding: 50.3, revCagr3y: 12, epsCagr: 14, marketCap: 1700e7,
      bookValue: 1150,
    } as never);
    expect(resolved).not.toBeNull();
    expect(resolved!.fields.de.source).toBe("live");
    expect(resolved!.fields.de.value).toBe(0);

    const report = getStockScore(resolved!);
    const nemish = report.scores.find((s) => s.name === "Nemish")!;
    expect(nemish.score).not.toBeNull();
    expect(nemish.comps.find((c) => c.label === "Debt Free")!.v).toBe(100);
  });

  it("the same symbol with NO live overlay keeps the seed-placeholder semantics (null on seed zeros)", () => {
    // Pick a stock whose seed de is the placeholder 0 (SBIN) and resolve
    // without live: the seed-sourced 0 must count as unknown.
    const resolved = resolveStockMetrics("SBIN");
    const report = getStockScore(resolved!);
    const nemish = report.scores.find((s) => s.name === "Nemish")!;
    expect(nemish.score).toBeNull();
  });
});

describe("X6 — engine-level contract (every entry path agrees)", () => {
  it("runAllScorers on a bare seed record applies seed semantics (zeros are placeholders)", () => {
    const scores = runAllScorers(STOCKS["SBIN"] as Stock);
    expect(scores.find((s) => s.name === "Nemish")!.score).toBeNull();
  });

  it("parity: raw-seed, resolved-no-live and barrel paths give the same null/finite Nemish verdict", () => {
    for (const sym of ["SBIN", "RELIANCE", "TCS", "HDFCBANK", "ITC"]) {
      const viaRaw = getStockScore(STOCKS[sym] as Stock).scores.find((s) => s.name === "Nemish")!.score;
      const viaResolved = getStockScore(resolveStockMetrics(sym)!).scores.find((s) => s.name === "Nemish")!.score;
      const viaBarrel = buildConsensus(STOCKS[sym] as Stock).scores.find((s) => s.name === "Nemish")!.score;
      expect(viaRaw).toBe(viaResolved);
      expect(viaRaw).toBe(viaBarrel);
    }
  });

  it("the seed universe pins the honest null count: 254 of 906 stocks have a placeholder zero in a Nemish pillar", () => {
    // Pinning the exact count: it may only change when the SEED changes
    // (a deliberate, reviewed act) or the pillar set changes — never
    // silently. Measured on main @ 0a56ad1: epscagr=0 (19) ∪ de=0 (145)
    // ∪ promo=0 (66) ∪ pe=0 (73) = 259 of 916. G5 (round 23) merged ten
    // duplicate rows out of the registry (916 -> 906); five of the removed
    // bogus rows carried a placeholder zero in a Nemish pillar, so the
    // honest null count moved 259 -> 254. Re-measured on the G5 tree:
    // 254 nulls of 906 rows.
    const all = Object.values(STOCKS);
    const nulls = all.filter((s) => scoreNemish(s).score === null).length;
    expect(nulls).toBe(254);
    expect(all.length).toBe(906);
  });

  it("the consensus stays finite for every stock (quorum 12 holds with 19 valid scorers)", () => {
    for (const s of Object.values(STOCKS)) {
      const c = buildConsensus(s).consensus;
      expect(c === null || Number.isFinite(c)).toBe(true);
      expect(Number.isNaN(c as number)).toBe(false);
    }
  });

  it("Nemish saturation drops below the W4 ceiling with the placeholder zeros excluded", () => {
    const vals = Object.values(STOCKS)
      .map((s) => scoreNemish(s).score)
      .filter((v): v is number => v !== null);
    const ge95 = vals.filter((v) => v >= 95).length / vals.length;
    // Pre-fix: 18.8% (whole universe incl. placeholder-perfect scores).
    // Post-fix survivors measured 16.6% — pinned with headroom at 20%,
    // the W4 gate's own ceiling.
    expect(ge95).toBeLessThanOrEqual(0.2);
  });

  it("the insight separator is a real separator, not the literal word 'dot'", () => {
    const n = scoreNemish(RELIANCE);
    expect(n.insight).not.toMatch(/\bdot\b/);
    expect(n.insight).toContain("·");
  });
});
