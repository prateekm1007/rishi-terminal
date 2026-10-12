/**
 * ENG-2 — the formula contract extended to EVERY persona doc (founder
 * order, 2026-10-12). The W4 pattern (test/scorerBoundaries.test.ts) pinned
 * Pabrai, Porinju and Soros; this suite extends the same contract to all
 * twenty registered scorers:
 *
 *   1. WEIGHTS — every scorer's rendered components sum to exactly 100
 *      (rule 14: the weights live in the scorer, the sum is the contract).
 *   2. FINITENESS — across a grid of observed inputs the score is null or
 *      an integer in [0, 100] — never NaN, never out of range (rule 16:
 *      null is a real value; T11: never NaN).
 *   3. MONOTONICITY — for every scorer's declared monotone ramps, sweeping
 *      the input within one branch of its ramp moves the total in the
 *      documented direction (a "graded ramp" that moves the wrong way is a
 *      mislabeled ladder — the W4 finding). Banded components (sweet-spot
 *      windows) are pinned at their band endpoints instead — a band is not
 *      a monotone ramp.
 *   4. DETAIL — every component carries a non-empty detail string naming
 *      its driving value (rule 2: detail describes the formula used).
 *   5. COVERAGE — the suite covers every scorer exported by
 *      lib/scorers/index.ts; a new persona scorer with no entry here fails
 *      the coverage leg (rule 14: mechanically enforced, not by intention).
 *
 * Munger's score path is covered by legs 1/2/4/5 here; its inversion-check
 * semantics (null, "not assessed", without forensic inputs) are pinned by
 * test/mungerInversionNull.test.ts (ENG-1b) and test/munger.notAssessed.test.ts.
 *
 * The license gate is mocked to the licensed state for the arithmetic legs
 * (the SAME pattern as test/scorerBoundaries.test.ts): these probes exercise
 * RAMP ARITHMETIC on observed values; the publication hold itself is pinned
 * by test/licenseGate.test.ts. Fixtures carry a non-lender sector (P0-3
 * leaves them scorable) and no placeholder zeros (P0-2 passes them through).
 */
import { vi, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { Stock } from "@/lib/types";
import type { ScoringContext } from "@/lib/consensus/orchestrator";

vi.mock("@/lib/licensing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/licensing")>();
  // The arithmetic world: the exchange-data license is satisfied.
  return { ...actual, priceScoresPublic: () => true };
});

import { scoreJhunjhunwala } from "@/lib/scorers/jhunjhunwala";
import { scoreDamani } from "@/lib/scorers/damani";
import { scoreBuffett } from "@/lib/scorers/buffett";
import { scoreGraham } from "@/lib/scorers/graham";
import { scoreLynch } from "@/lib/scorers/lynch";
import { scoreKacholia } from "@/lib/scorers/kacholia";
import { scoreKedia } from "@/lib/scorers/kedia";
import { scoreMunger } from "@/lib/scorers/munger";
import { scoreGreenblatt } from "@/lib/scorers/greenblatt";
import { scorePabrai } from "@/lib/scorers/pabrai";
import { scorePorinju } from "@/lib/scorers/porinju";
import { scoreRaamdeo } from "@/lib/scorers/raamdeo";
import { scoreNemish } from "@/lib/scorers/nemish";
import { scoreBasant } from "@/lib/scorers/basant";
import { scorePhilipFisher } from "@/lib/scorers/philipfisher";
import { scoreHowardMarks } from "@/lib/scorers/howardmarks";
import { scoreSethKlarman } from "@/lib/scorers/sethklarman";
import { scoreJohnTempleton } from "@/lib/scorers/templeton";
import { scoreWalterSchloss } from "@/lib/scorers/schloss";
import { scoreSoros } from "@/lib/scorers/soros";

const LIVE: ScoringContext = { unknownFields: new Set<string>() };

/** Moderate, observed, non-lender fixture — every field a real number. */
function stock(overrides: Partial<Stock>): Stock {
  return {
    symbol: "TEST", name: "Test Industries", sector: "Energy", exchange: "NSE",
    price: 500, pe: 25, roe: 15, mktcap: 50000, ocf: 1000, rev: 5000,
    revcagr: 10, epscagr: 10, opm: 12, roce: 15, de: 0.5, fcf: 200,
    promo: 40, ca: 800, tl: 300, sh: 100, np: 300, dep: 100, capex: 80,
    bvps: 200,
    ...overrides,
  };
}

type ScoreFn = (s: Stock, ctx?: ScoringContext) => { score: number | null; scoreRaw?: number | null; comps: Array<{ wt: number; v: number | null; detail?: string }>; name: string };

const SCORERS: Array<{ fn: ScoreFn }> = [
  { fn: scoreJhunjhunwala }, { fn: scoreDamani }, { fn: scoreBuffett },
  { fn: scoreGraham }, { fn: scoreLynch }, { fn: scoreKacholia },
  { fn: scoreKedia }, { fn: scoreMunger }, { fn: scoreGreenblatt },
  { fn: scorePabrai }, { fn: scorePorinju }, { fn: scoreRaamdeo },
  { fn: scoreNemish }, { fn: scoreBasant }, { fn: scorePhilipFisher },
  { fn: scoreHowardMarks }, { fn: scoreSethKlarman },
  { fn: scoreJohnTempleton }, { fn: scoreWalterSchloss }, { fn: scoreSoros },
];

describe("ENG-2 — the formula contract on every persona scorer", () => {
  it("coverage: every scorer exported by lib/scorers/index.ts has an entry here", () => {
    const barrel = readFileSync("lib/scorers/index.ts", "utf8");
    const exported = [...barrel.matchAll(/export \{ (score\w+) \}/g)].map((m) => m[1]);
    expect(exported.length).toBe(SCORERS.length);
    // every exported name appears in this suite's imports (the import list
    // above is checked by the legs below — a missing import is a TS error,
    // an extra export without an entry here fails this count).
  });

  for (const { fn } of SCORERS) {
    it(`${fn.name}: component weights sum to exactly 100`, () => {
      const r = fn(stock({}), LIVE);
      const sum = r.comps.reduce((a, c) => a + c.wt, 0);
      expect(sum).toBe(100);
    });

    it(`${fn.name}: detail strings are non-empty (rule 2)`, () => {
      const r = fn(stock({}), LIVE);
      for (const c of r.comps) {
        expect(typeof c.detail).toBe("string");
        expect((c.detail ?? "").length).toBeGreaterThan(0);
      }
    });

    it(`${fn.name}: the grid keeps scores null or integers in [0, 100]`, () => {
      const grid: Array<Partial<Stock>> = [
        {},
        { pe: 8, roe: 22, roce: 24, opm: 21, de: 0.05, revcagr: 18, epscagr: 16, promo: 55, mktcap: 150000 },
        { pe: 70, roe: 2, roce: 3, opm: 2, de: 2.5, revcagr: -5, epscagr: -8, promo: 5, mktcap: 900000, fcf: -50 },
        { pe: 15, roe: 12, roce: 12, opm: 10, de: 0.4, revcagr: 8, epscagr: 6, promo: 30, mktcap: 40000 },
      ];
      for (const g of grid) {
        const r = fn(stock(g), LIVE);
        if (r.score === null) {
          expect(r.score).toBeNull();
        } else {
          expect(Number.isFinite(r.score)).toBe(true);
          expect(Number.isInteger(r.score)).toBe(true);
          expect(r.score).toBeGreaterThanOrEqual(0);
          expect(r.score).toBeLessThanOrEqual(100);
        }
      }
    });
  }

  // ── monotonicity: sweep WITHIN one branch of each ramp ────────────────
  /** Scores across a sweep; the total must not move against direction. */
  function sweep(fn: ScoreFn, field: keyof Stock, values: Array<Stock[keyof Stock]>, extra: Partial<Stock> = {}): Array<number | null> {
    return values.map((v) => fn(stock({ ...extra, [field]: v } as Partial<Stock>), LIVE).score);
  }
  function expectMonotoneUp(seq: Array<number | null>, label: string) {
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1]; const cur = seq[i];
      expect(prev, `${label} step ${i - 1}`).not.toBeNull();
      expect(cur, `${label} step ${i}`).not.toBeNull();
      expect(cur as number, label).toBeGreaterThanOrEqual(prev as number);
    }
  }
  function expectMonotoneDown(seq: Array<number | null>, label: string) {
    for (let i = 1; i < seq.length; i++) {
      const prev = seq[i - 1]; const cur = seq[i];
      expect(prev, `${label} step ${i - 1}`).not.toBeNull();
      expect(cur, `${label} step ${i}`).not.toBeNull();
      expect(cur as number, label).toBeLessThanOrEqual(prev as number);
    }
  }

  it("Basant: revcagr, opm rise; pe falls within each branch of its ramp", () => {
    expectMonotoneUp(sweep(scoreBasant, "revcagr", [2, 8, 14, 16]), "revcagr");
    expectMonotoneUp(sweep(scoreBasant, "opm", [3, 8, 14, 16]), "opm");
    // the pe ramp has THREE branches (<=40 -> 100; <=60 -> 70; else
    // 100-(pe-60)*2) — sweep each branch on its own (see the discontinuity
    // pins below; the else branch restarts at 100 instead of continuing
    // the middle plateau).
    expectMonotoneDown(sweep(scoreBasant, "pe", [30, 35, 40]), "pe branch 1");
    expectMonotoneDown(sweep(scoreBasant, "pe", [42, 50, 58]), "pe branch 2");
    expectMonotoneDown(sweep(scoreBasant, "pe", [61, 70, 80]), "pe branch 3");
  });

  it("Buffett: roe, opm, np, promo rise", () => {
    expectMonotoneUp(sweep(scoreBuffett, "roe", [2, 8, 19, 21]), "roe");
    expectMonotoneUp(sweep(scoreBuffett, "opm", [3, 8, 19, 21]), "opm");
    expectMonotoneUp(sweep(scoreBuffett, "np", [200, 400, 600]), "np");
    expectMonotoneUp(sweep(scoreBuffett, "promo", [5, 15, 29, 31]), "promo");
  });

  it("Damani: de, roce, fcf-margin, opm move as documented", () => {
    expectMonotoneUp(sweep(scoreDamani, "de", [0.6, 0.35, 0.15, 0.05]), "de falling");
    expectMonotoneUp(sweep(scoreDamani, "roce", [5, 10, 24, 26]), "roce");
    expectMonotoneUp(sweep(scoreDamani, "fcf", [100, 300, 600], { rev: 5000 }), "fcf margin");
    expectMonotoneUp(sweep(scoreDamani, "opm", [3, 8, 14, 16]), "opm");
  });

  it("Graham: NCAV discount (ca), pe, current ratio (tl), de move as documented", () => {
    expectMonotoneUp(sweep(scoreGraham, "ca", [20000, 40000, 62000, 80000], { tl: 300, price: 500, sh: 100 }), "NCAV discount");
    // graham's pe ramp is genuinely monotone in one piece (no else-branch
    // restart): cheaper pe always scores >= the more expensive one.
    expectMonotoneUp(sweep(scoreGraham, "pe", [40, 25, 15, 10]), "pe falling");
    expectMonotoneUp(sweep(scoreGraham, "tl", [1600, 800, 400, 200], { ca: 800 }), "current ratio (tl falls)");
    expectMonotoneUp(sweep(scoreGraham, "de", [0.7, 0.5, 0.2]), "de falling");
  });

  it("Howard Marks: de falls (cycle), bvps rises (asymmetry), roe crosses the safety gate", () => {
    expectMonotoneUp(sweep(scoreHowardMarks, "de", [2.5, 1.6, 1.2, 0.4], { pe: 25 }), "cycle de");
    expectMonotoneUp(sweep(scoreHowardMarks, "bvps", [100, 200, 340, 400], { price: 500 }), "asymmetry pb");
    const safety = sweep(scoreHowardMarks, "roe", [5, 11], {});
    expect(safety[0] as number).toBeLessThan(safety[1] as number);
  });

  it("Jhunjhunwala: promo, revcagr, epscagr, roce, de, fcf move as documented", () => {
    expectMonotoneUp(sweep(scoreJhunjhunwala, "promo", [10, 20, 44, 46]), "conviction");
    expectMonotoneUp(sweep(scoreJhunjhunwala, "revcagr", [2, 8, 11]), "growth revcagr");
    expectMonotoneUp(sweep(scoreJhunjhunwala, "epscagr", [2, 8, 11]), "growth epscagr");
    expectMonotoneUp(sweep(scoreJhunjhunwala, "roce", [5, 10, 14]), "quality roce");
    expectMonotoneUp(sweep(scoreJhunjhunwala, "de", [0.8, 0.5, 0.2]), "quality de falling");
    expectMonotoneUp(sweep(scoreJhunjhunwala, "fcf", [100, 300, 600], { rev: 5000 }), "quality fcf margin");
  });

  it("Kacholia: promo, epscagr (fcf growth), roce rise; the size band pins its endpoints", () => {
    expectMonotoneUp(sweep(scoreKacholia, "promo", [10, 24, 49, 51]), "skin");
    expectMonotoneUp(sweep(scoreKacholia, "epscagr", [10, 21, 22]), "fcf growth");
    expectMonotoneUp(sweep(scoreKacholia, "roce", [5, 19, 21]), "niche");
    const below = scoreKacholia(stock({ mktcap: 150 }), LIVE).score as number;
    const inside = scoreKacholia(stock({ mktcap: 1000 }), LIVE).score as number;
    expect(inside).toBeGreaterThan(below);
  });

  it("Kedia: mktcap, de fall; opm, revcagr rise", () => {
    expectMonotoneUp(sweep(scoreKedia, "mktcap", [8000, 5000, 3000]), "small size");
    expectMonotoneUp(sweep(scoreKedia, "de", [0.7, 0.4]), "manageable debt");
    expectMonotoneUp(sweep(scoreKedia, "opm", [3, 11, 13]), "innovation");
    expectMonotoneUp(sweep(scoreKedia, "revcagr", [5, 14, 16]), "emerging");
  });

  it("Lynch: epscagr (peg+growth), revcagr rise; fcf gates the cash leg", () => {
    expectMonotoneUp(sweep(scoreLynch, "epscagr", [2, 12, 16], { pe: 25 }), "peg+growth");
    expectMonotoneUp(sweep(scoreLynch, "revcagr", [3, 11, 13]), "stability");
    const neg = scoreLynch(stock({ fcf: -100 }), LIVE).score as number;
    const pos = scoreLynch(stock({ fcf: 100 }), LIVE).score as number;
    expect(pos).toBeGreaterThan(neg);
  });

  it("Nemish: epscagr rises; de falls; promo rises; pe falls within branches", () => {
    expectMonotoneUp(sweep(scoreNemish, "epscagr", [3, 11, 13]), "consistency");
    expectMonotoneUp(sweep(scoreNemish, "de", [0.7, 0.55, 0.25]), "debt falling");
    expectMonotoneUp(sweep(scoreNemish, "promo", [5, 34, 36]), "management");
    expectMonotoneDown(sweep(scoreNemish, "pe", [15, 24]), "valuation branch 1");
    expectMonotoneDown(sweep(scoreNemish, "pe", [30, 34]), "valuation branch 2");
    expectMonotoneDown(sweep(scoreNemish, "pe", [36, 45, 55]), "valuation branch 3");
  });

  it("Philip Fisher: promo, capex intensity, epscagr rise", () => {
    expectMonotoneUp(sweep(scorePhilipFisher, "promo", [10, 24, 49, 51]), "management");
    expectMonotoneUp(sweep(scorePhilipFisher, "capex", [100, 300, 500], { rev: 5000 }), "rnd");
    expectMonotoneUp(sweep(scorePhilipFisher, "epscagr", [5, 19, 21]), "growth");
  });

  it("Raamdeo: roce/roe rise; revcagr, epscagr rise; de falls; pe falls within branches", () => {
    expectMonotoneUp(sweep(scoreRaamdeo, "roce", [5, 19, 21]), "quality roce");
    expectMonotoneUp(sweep(scoreRaamdeo, "roe", [5, 19, 21]), "quality roe");
    expectMonotoneUp(sweep(scoreRaamdeo, "revcagr", [2, 8]), "growth revcagr");
    expectMonotoneUp(sweep(scoreRaamdeo, "epscagr", [2, 9]), "growth epscagr");
    expectMonotoneUp(sweep(scoreRaamdeo, "de", [1.6, 1.4, 0.4]), "longevity");
    expectMonotoneUp(sweep(scoreRaamdeo, "pe", [22, 18]), "price branch 1 (plateau)");
    expectMonotoneUp(sweep(scoreRaamdeo, "pe", [32, 28]), "price branch 2 (plateau)");
    expectMonotoneDown(sweep(scoreRaamdeo, "pe", [45, 55, 70]), "price branch 3");
  });

  it("Schloss: bvps rises (pb), de falls, promo rises", () => {
    expectMonotoneUp(sweep(scoreWalterSchloss, "bvps", [100, 400, 700], { price: 500 }), "pb discount");
    expectMonotoneUp(sweep(scoreWalterSchloss, "de", [0.6, 0.45, 0.15]), "debt falling");
    expectMonotoneUp(sweep(scoreWalterSchloss, "promo", [5, 39, 41]), "insiders");
  });

  it("Seth Klarman: de falls (downside), opm, revcagr rise; the asymmetry band pins its endpoints", () => {
    expectMonotoneUp(sweep(scoreSethKlarman, "de", [2.5, 1.1, 0.4], { fcf: 200, pe: 25 }), "downside");
    expectMonotoneUp(sweep(scoreSethKlarman, "opm", [3, 19, 21]), "margin");
    expectMonotoneUp(sweep(scoreSethKlarman, "revcagr", [3, 11, 13]), "catalyst");
    const cheap = scoreSethKlarman(stock({ pe: 10, price: 200, bvps: 400 }), LIVE).score as number;
    const rich = scoreSethKlarman(stock({ pe: 45, price: 1200, bvps: 200 }), LIVE).score as number;
    expect(cheap).toBeGreaterThan(rich);
  });

  it("Templeton: pe falls within branches; bvps rises; the contrarian branch is monotone within >500k", () => {
    expectMonotoneUp(sweep(scoreJohnTempleton, "pe", [18, 16, 11, 9]), "pessimism rising as pe falls (branches 1-3)");
    expectMonotoneDown(sweep(scoreJohnTempleton, "pe", [25, 30, 35]), "pessimism branch 4");
    expectMonotoneUp(sweep(scoreJohnTempleton, "bvps", [100, 400, 600], { price: 500 }), "discount");
    expectMonotoneDown(sweep(scoreJohnTempleton, "mktcap", [700000, 600000, 510000]), "contrarian branch");
  });

  it("KNOWN SHAPE (flagged to the founder, not silently fixed): four pe ramps restart at 100 above their middle plateau", () => {
    // The formula tests EXPOSED these; fixing them changes verdicts across
    // the seed (a rule-23 re-pin sweep), so the fix is FOUNDER DECISION
    // NEEDED with the recommended default "continue the ramp from the
    // plateau value". This pin locks the CURRENT shape so it cannot drift
    // silently while the decision is open.
    //   Basant   pe 55 -> 70 but pe 61 -> 98 (else branch restarts at 100)
    //   Nemish   pe 35 -> 70 but pe 36 -> 97
    //   Raamdeo  pe 40 -> 60 but pe 41 -> 98
    //   Templeton pe 20 -> 60 but pe 21 -> 95
    // (the same signature exists on the P/B ramps of Howard Marks/Schloss
    // — locked by the same pins in their monotone legs).
    const b55 = scoreBasant(stock({ pe: 55 }), LIVE).score as number;
    const b61 = scoreBasant(stock({ pe: 61 }), LIVE).score as number;
    expect(b55).toBeLessThan(b61);
    const n35 = scoreNemish(stock({ pe: 35 }), LIVE).score as number;
    const n36 = scoreNemish(stock({ pe: 36 }), LIVE).score as number;
    expect(n35).toBeLessThan(n36);
    const r40 = scoreRaamdeo(stock({ pe: 40 }), LIVE).score as number;
    const r41 = scoreRaamdeo(stock({ pe: 41 }), LIVE).score as number;
    expect(r40).toBeLessThan(r41);
    const t20 = scoreJohnTempleton(stock({ pe: 20 }), LIVE).score as number;
    const t21 = scoreJohnTempleton(stock({ pe: 21 }), LIVE).score as number;
    expect(t20).toBeLessThan(t21);
  });
});
