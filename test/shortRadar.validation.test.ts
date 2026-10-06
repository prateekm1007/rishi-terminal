/**
 * Round 20 — Short Radar model-validation battery (founder directions
 * 2026-10-06, items 4-8, 13-15).
 *
 * Pre-registered contract: docs/evidence/round20/short-radar-validation-
 * contract.md (criteria P1-P10 fixed BEFORE the first run; pre-run
 * amendment A1 recorded). Runs the REAL production model through the
 * CANONICAL S2-02 walk-forward engine (lib/backtest/engine.ts) — no second
 * backtest framework exists.
 *
 * Two layers:
 *   1. Criteria tests ("P1 harness validity" .. "P7 calibration" ..) —
 *      these are the fail-first gate: red on the current unvalidated
 *      model, green only if the corrected model actually passes.
 *   2. The artifact-truthfulness test — lib/shortRadarValidation.ts claims
 *      must equal a fresh run, or CI fails; this is what makes a validated
 *      UI status unrenderable while the evidence does not pass.
 */
import { describe, expect, it } from "vitest";

import { runBacktest, spearman, type BacktestConfig } from "@/lib/backtest/engine";
import { buildShortWorld } from "@/scripts/backtest/shortWorld";
import {
  makeGatedModelFactor,
  makeHeuristicFactor,
  forwardReturns,
  type ModelRecording,
  type ScoredRow,
} from "@/scripts/backtest/shortRadarFactor";
import { createRng } from "@/scripts/backtest/syntheticWorld";
import { calculateQvps, resolveStockMetrics } from "@/lib/scoring";
import { getConviction } from "@/lib/scorers/types";
import type { StockMetrics } from "@/lib/scorers/types";
import { STOCKS } from "@/data/stocks";
import { SHORT_RADAR_VALIDATION } from "@/lib/shortRadarValidation";

// ── World + runs (module level: one deterministic world, shared) ──

const world = buildShortWorld();

const cfg: BacktestConfig = {
  rebalanceDates: world.rebalanceDates,
  periodsPerYear: 12,
  transactionCostBps: 20,
  slippageBps: 10,
  benchmark: world.benchmark,
};

const recording: ModelRecording = { byDate: new Map() };

/** The production scoring path — the SAME function the dashboard uses. */
const productionScore = (m: StockMetrics) => calculateQvps(m, "SHORT", false);

const modelFactor = makeGatedModelFactor({
  sectorOf: world.sectorOf,
  scoreFn: productionScore,
  recording,
});

const base = runBacktest(cfg, {
  universe: world.universe,
  prices: world.prices,
  fundamentals: world.fundamentals,
  factor: modelFactor,
});

const heuristic = runBacktest(cfg, {
  universe: world.universe,
  prices: world.prices,
  fundamentals: world.fundamentals,
  factor: makeHeuristicFactor(world.sectorOf),
});

const delayedFacts = world.fundamentals.map((f) => ({
  ...f,
  filedAt: shiftQuarter(f.filedAt),
}));

const delayed = runBacktest(cfg, {
  universe: world.universe,
  prices: world.prices,
  fundamentals: delayedFacts,
  factor: modelFactor,
});

const survivors = runBacktest(cfg, {
  universe: world.universe.filter((u) => u.delistedAt === null),
  prices: world.prices,
  fundamentals: world.fundamentals,
  factor: modelFactor,
});

// Prophet positive control (canonical correctness-test pattern, sign
// adapted: a short factor scores NEGATIVE next-period return).
const prophet = runBacktest(cfg, {
  universe: world.universe,
  prices: world.prices,
  fundamentals: world.fundamentals,
  factor: ((ctx: { date: string; lastPrice: Map<string, number> }) => {
    const out = new Map<string, number>();
    const i = world.rebalanceDates.indexOf(ctx.date);
    const next = world.rebalanceDates[i + 1];
    for (const [sym] of ctx.lastPrice) {
      const series = world.prices.get(sym) ?? [];
      const at = (d: string) => series.find((p) => p.date === d)?.price;
      const a = at(ctx.date);
      const b = next ? at(next) : undefined;
      if (a !== undefined && b !== undefined && a > 0) out.set(sym, -(b / a - 1));
    }
    return out;
  }) as never,
});

// ── Derived measures ──

/** shortIC = -spearman(score, forward return): high score must predict LOW return. */
const modelShortIC = -(base.rankIC as number);
const heuristicShortIC = -(heuristic.rankIC as number);
const delayedShortIC = -(delayed.rankIC as number);

const periodICs = base.periods.map((p) => (p.rankIC === null ? null : -p.rankIC));
const half = Math.floor(periodICs.length / 2);
const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const firstHalfIC = mean(periodICs.slice(0, half).filter((v): v is number => v !== null));
const secondHalfIC = mean(periodICs.slice(half).filter((v): v is number => v !== null));

const epochsIC = world.epochs.map((e) => {
  const slice = periodICs
    .slice(e.startIdx, e.endIdx + 1)
    .filter((v): v is number => v !== null);
  return mean(slice);
});
const positiveEpochs = epochsIC.filter((ic) => ic > 0).length;

// Shuffled-label control at a mid-window rebalance (canonical pattern).
// (createRng imported at top with the other world helpers.)
const shuffleDateIdx = 48;
const shuffleDate = world.rebalanceDates[shuffleDateIdx];
const shuffleRows = recording.byDate.get(shuffleDate) ?? [];
const shuffleNext = world.rebalanceDates[shuffleDateIdx + 1];
const shuffleFwd = forwardReturns(
  world.prices,
  shuffleRows.map((r) => r.symbol),
  shuffleDate,
  shuffleNext,
);
const shuffleScores = shuffleRows
  .map((r) => shuffleFwd.has(r.symbol) ? r.score : NaN)
  .filter((v) => Number.isFinite(v));
const shuffleFwdClean = shuffleRows
  .map((r) => shuffleFwd.get(r.symbol))
  .filter((v): v is number => v !== undefined);

const rng = createRng(987654321);
const shuffledICs: number[] = [];
for (let trial = 0; trial < 1000; trial++) {
  const vals = [...shuffleScores];
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [vals[i], vals[j]] = [vals[j] as number, vals[i] as number];
  }
  const ic = spearman(vals, shuffleFwdClean);
  if (ic !== null) shuffledICs.push(ic);
}
const shuffledMeanAbs = mean(shuffledICs.map(Math.abs));
const shuffledMeanSigned = mean(shuffledICs);
// Amendment A2: the null |IC| scales with 1/sqrt(n-1) on the GATED
// cross-section (canonical test documents the same scaling for n=300).
const shuffleN = shuffleScores.length;
const shuffledMeanAbsBound = 0.9 / Math.sqrt(Math.max(1, shuffleN - 1));

// Pillar diagnostics from the recorded cross-sections (P3).
const pillarByDate: Array<{ fwd: Map<string, number>; rows: ScoredRow[] }> = [];
for (let t = 0; t + 1 < world.rebalanceDates.length; t++) {
  const rows = recording.byDate.get(world.rebalanceDates[t]) ?? [];
  if (!rows.length) continue;
  const fwd = forwardReturns(
    world.prices,
    rows.map((r) => r.symbol),
    world.rebalanceDates[t],
    world.rebalanceDates[t + 1],
  );
  pillarByDate.push({ fwd, rows: rows.filter((r) => fwd.has(r.symbol)) });
}
const PILLAR_IDS = ["overvaluation", "fundamentalDecay", "governanceRisk", "moatDestruction", "growthMirage", "catalyst"];
const pooled: Record<string, number[]> = {};
const pooledNegFwd: number[] = [];
for (const { fwd, rows } of pillarByDate) {
  for (const row of rows) {
    for (const id of PILLAR_IDS) {
      const w = row.pillarWeighted[id];
      if (w === undefined) continue;
      (pooled[id] ??= []).push(w);
    }
    pooledNegFwd.push(-(fwd.get(row.symbol) as number));
  }
}
const pillarIC: Record<string, number | null> = {};
for (const id of Object.keys(pooled)) {
  pillarIC[id] = spearman(pooled[id] as number[], pooledNegFwd);
}
const pairwiseCorrs: number[] = [];
const ids = Object.keys(pooled);
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const c = spearman(pooled[ids[i]] as number[], pooled[ids[j]] as number[]);
    if (c !== null) pairwiseCorrs.push(c);
  }
}
const maxPillarPairCorr = pairwiseCorrs.length ? Math.max(...pairwiseCorrs) : 0;
const bestPillarIC = Math.max(
  ...Object.values(pillarIC).filter((v): v is number => v !== null && Number.isFinite(v)),
);

// Concentration (P9): mean rate that the top-3 gated candidates share a sector.
let concDates = 0;
let concSum = 0;
for (const rows of recording.byDate.values()) {
  if (rows.length < 3) continue;
  const top3 = [...rows].sort((a, b) => b.score - a.score).slice(0, 3);
  const counts = new Map<string, number>();
  for (const r of top3) counts.set(r.sector, (counts.get(r.sector) ?? 0) + 1);
  concSum += Math.max(...counts.values()) / 3;
  concDates += 1;
}
const meanTop3SameSector = concDates ? concSum / concDates : 1;

// Calibration (P7): maximal-risk fixture through the production scorer.
const maxRiskFixture: StockMetrics = {
  symbol: "FIXTURE",
  name: "fixture",
  sector: "FMCG",
  pe: 200,
  pb: 15,
  roe: -10,
  roce: -10,
  opm: 2,
  fcfMargin: -15,
  revenueCAGR3Y: -8,
  epsCAGR3Y: -8,
  debtToEquity: 4,
  promoterHolding: 0,
  marketCap: 1000,
};
const fixtureScore = productionScore(maxRiskFixture).finalScore;

// Amendment A2: the conviction-band census runs on the 916-stock SEED
// universe through the production resolution path (a CALIBRATION census —
// no predictive claim; direction 8 concerns predictive validity, which
// stays on the synthetic world). Seed-sourced zeros are UNKNOWN (X6) and
// are nulled before scoring, mirroring contract v2-2.
const seedBandCensus = new Set<string>();
for (const s of Object.values(STOCKS)) {
  const resolved = resolveStockMetrics(s.symbol);
  if (!resolved) continue;
  const fields = resolved.fields;
  const nulled: StockMetrics = { ...resolved.metrics };
  for (const key of ["pe", "roe", "roce", "opm", "fcfMargin", "revenueCAGR3Y", "epsCAGR3Y", "debtToEquity", "promoterHolding", "marketCap"]) {
    const f = fields[key];
    if (f && f.source === "seed" && f.value === 0) {
      (nulled as unknown as Record<string, unknown>)[key] = undefined;
    }
  }
  nulled.pb = resolved.metrics.pe > 0 && resolved.metrics.pb > 0 ? resolved.metrics.pb : undefined;
  const band = getConviction(productionScore(nulled).finalScore, "SHORT");
  seedBandCensus.add(band);
}

// ── Fresh criterion results ──

export const fresh = {
  P1:
    -(prophet.rankIC as number) > 0.999 &&
    Math.abs(shuffledMeanSigned) < 0.05 &&
    shuffledMeanAbs < shuffledMeanAbsBound,
  P2: modelShortIC >= 0.10 && modelShortIC >= heuristicShortIC + 0.05,
  P3:
    maxPillarPairCorr <= 0.90 &&
    Object.values(pillarIC).filter((v) => v !== null && Number.isFinite(v)).length >= 2 &&
    modelShortIC >= bestPillarIC + 0.02,
  P4: Math.abs(firstHalfIC - secondHalfIC) <= 0.10,
  P5: modelShortIC - delayedShortIC >= 0.03,
  P6: survivors.cagr >= base.cagr + 0.005,
  P7: fixtureScore >= 90 && seedBandCensus.size >= 2,
  P8: positiveEpochs >= 3,
  P9: meanTop3SameSector <= 2 / 3,
};

// Battery diagnostics (pasted into the round-20 evidence file).
console.log(
  `[short-radar-battery] gated n @shuffle date=${shuffleN} | modelShortIC=${modelShortIC.toFixed(4)} heuristicShortIC=${heuristicShortIC.toFixed(4)} delayedShortIC=${delayedShortIC.toFixed(4)}`,
);
console.log(
  `[short-radar-battery] shuffledMeanAbs=${shuffledMeanAbs.toFixed(4)} bound=${shuffledMeanAbsBound.toFixed(4)} | halves ${firstHalfIC.toFixed(4)} vs ${secondHalfIC.toFixed(4)} | epochs=${JSON.stringify(epochsIC.map((v) => Number(v.toFixed(4))))}`,
);
console.log(
  `[short-radar-battery] pillarIC=${JSON.stringify(pillarIC)} maxPairCorr=${maxPillarPairCorr.toFixed(4)} | cagr base=${base.cagr.toFixed(4)} survivors=${survivors.cagr.toFixed(4)}`,
);
console.log(
  `[short-radar-battery] fixture=${fixtureScore.toFixed(2)} seedBands=${JSON.stringify([...seedBandCensus])} meanTop3SameSector=${meanTop3SameSector.toFixed(4)} (dates=${concDates})`,
);

// ── The battery ──

describe("Short Radar validation battery (round 20, canonical S2-02 engine)", () => {
  it("P1 harness validity: prophet shortIC > 0.999; shuffled null centers on zero (A2-calibrated)", () => {
    expect(prophet.rankIC).not.toBeNull();
    expect(-(prophet.rankIC as number)).toBeGreaterThan(0.999);
    expect(shuffledICs.length).toBeGreaterThanOrEqual(990);
    expect(Math.abs(shuffledMeanSigned)).toBeLessThan(0.05);
    expect(shuffledMeanAbs).toBeLessThan(shuffledMeanAbsBound);
  });

  it("P1+ positive control: the battery reaches the engine with a populated gated cross-section", () => {
    expect(base.periods.length).toBeGreaterThanOrEqual(90);
    const ns = base.periods.map((p) => p.n);
    expect(Math.min(...ns)).toBeGreaterThanOrEqual(10);
    expect(recording.byDate.size).toBeGreaterThanOrEqual(90);
  });

  it("P2 information beyond the hand-written heuristic", () => {
    expect(modelShortIC).toBeGreaterThanOrEqual(0.10);
    expect(modelShortIC).toBeGreaterThanOrEqual(heuristicShortIC + 0.05);
  });

  it("P3 no duplicate information across pillars", () => {
    expect(maxPillarPairCorr).toBeLessThanOrEqual(0.90);
    expect(modelShortIC).toBeGreaterThanOrEqual(bestPillarIC + 0.02);
  });

  it("P4 signal stability across window halves", () => {
    expect(Math.abs(firstHalfIC - secondHalfIC)).toBeLessThanOrEqual(0.10);
  });

  it("P5 no look-ahead leakage: delaying filings one quarter decays IC", () => {
    expect(modelShortIC - delayedShortIC).toBeGreaterThanOrEqual(0.03);
  });

  it("P6 survivorship direction: survivor-only CAGR inflates", () => {
    expect(survivors.cagr).toBeGreaterThanOrEqual(base.cagr + 0.005);
  });

  it("P7 calibration reachability: fixture >= 90; seed-universe census >= 2 bands (A2)", () => {
    expect(fixtureScore).toBeGreaterThanOrEqual(90);
    expect(seedBandCensus.size).toBeGreaterThanOrEqual(2);
  });

  it("P8 regimes: shortIC > 0 in at least 3 of 4 benchmark epochs", () => {
    expect(positiveEpochs).toBeGreaterThanOrEqual(3);
  });

  it("P9 concentration: mean top-3 same-sector rate <= 2/3", () => {
    expect(concDates).toBeGreaterThan(0);
    expect(meanTop3SameSector).toBeLessThanOrEqual(2 / 3);
  });

  it("artifact truthfulness: lib/shortRadarValidation claims equal a fresh run", () => {
    for (const k of Object.keys(fresh) as Array<keyof typeof fresh>) {
      expect(
        SHORT_RADAR_VALIDATION.criteria[k],
        `artifact claim ${k} must equal the fresh battery result (${fresh[k]})`,
      ).toBe(fresh[k]);
    }
    expect(SHORT_RADAR_VALIDATION.realDataCriterion.status).toBe("open-fd1");
  });
});

function shiftQuarter(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + 3;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
