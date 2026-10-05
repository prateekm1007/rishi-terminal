/**
 * S2-02 (founder Round-16 C7) — backtest harness correctness.
 *
 * Acceptance (docs/ROADMAP.md, run on SYNTHETIC data per the founder's
 * Round-16 direction — the licensed D1 series are FD-1-blocked):
 *
 *   npx vitest run test/backtest.correctness.test.ts
 *   → perfect-foresight factor: IC ≈ 1
 *   → shuffled factor: |IC| < 0.05 over 1000 trials
 *   → look-ahead guard: shifting every filed_at forward by one quarter
 *     changes results
 *   → survivorship guard: removing delisted names from the universe
 *     changes results and the test asserts the direction
 *
 * Every property below was watched FAIL first (pre-engine, and pre-fix on
 * the guard margins) — see the PR's Proof section for the raw runs.
 */
import { describe, expect, it } from "vitest";
import { runBacktest, spearman, type BacktestConfig } from "../lib/backtest/engine";
import {
  buildSyntheticWorld,
  createRng,
  latestFundamentalFactor,
} from "../scripts/backtest/syntheticWorld";

const world = buildSyntheticWorld({ seed: 20261005 });

const cfg: BacktestConfig = {
  rebalanceDates: world.rebalanceDates,
  periodsPerYear: 12,
  transactionCostBps: 20,
  slippageBps: 10,
  benchmark: world.benchmark,
};

const fundamentalWorld = {
  universe: world.universe,
  prices: world.prices,
  fundamentals: world.fundamentals,
  factor: latestFundamentalFactor as never,
};

const base = runBacktest(cfg, fundamentalWorld);

describe("S2-02 — backtest harness correctness (synthetic data)", () => {
  it("perfect-foresight factor: IC ≈ 1", () => {
    // A prophet factor that KNOWS next period's return must rank-correlate
    // at ~1 — this validates the IC computation end to end. If the engine
    // mismeasures, even perfect information cannot score.
    const prophet = runBacktest(cfg, {
      ...fundamentalWorld,
      factor: ((ctx: { date: string; lastPrice: Map<string, number> }) => {
        const out = new Map<string, number>();
        const i = world.rebalanceDates.indexOf(ctx.date);
        const next = world.rebalanceDates[i + 1];
        for (const [sym] of ctx.lastPrice) {
          const series = world.prices.get(sym) ?? [];
          const at = (d: string) => series.find((p) => p.date === d)?.price;
          const a = at(ctx.date);
          const b = next ? at(next) : undefined;
          if (a !== undefined && b !== undefined && a > 0) out.set(sym, b / a - 1);
        }
        return out;
      }) as never,
    });
    expect(prophet.rankIC).not.toBeNull();
    expect(prophet.rankIC as number).toBeGreaterThan(0.999);
  });

  it("shuffled factor: |IC| < 0.05 over 1000 trials", () => {
    // Shuffle the factor across the cross-section at a mid-window
    // rebalance; the null IC must center on zero. Both the mean |IC| per
    // trial and |mean IC| stay under 0.05 (300 symbols -> per-trial IC
    // std is ~1/sqrt(299) = 0.058, so E|IC| ~ 0.046).
    const date = world.rebalanceDates[48];
    const inUniverse = world.universe.filter(
      (u) => u.listedAt <= date && (u.delistedAt === null || date < u.delistedAt),
    );
    const visible = world.fundamentals.filter(
      (f) => f.filedAt <= date && inUniverse.some((u) => u.symbol === f.symbol),
    );
    const factorMap = latestFundamentalFactor({ date, visibleFacts: visible });
    const syms = [...factorMap.keys()].sort();
    const vals = syms.map((s) => factorMap.get(s) as number);

    // Forward returns for the same cross-section.
    const next = world.rebalanceDates[49];
    const fwd = syms.map((s) => {
      const series = world.prices.get(s) ?? [];
      const a = series.find((p) => p.date === date)?.price;
      const b = series.find((p) => p.date === next)?.price;
      return a && b ? b / a - 1 : NaN;
    });
    const okMask = fwd.map((v) => Number.isFinite(v));
    const cleanFwd = fwd.filter((_, i) => okMask[i]);

    const rng = createRng(987654321);
    const ics: number[] = [];
    for (let trial = 0; trial < 1000; trial++) {
      const shuffled = vals.filter((_, i) => okMask[i]);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shifted(shuffled, i)];
      }
      const ic = spearman(shuffled, cleanFwd);
      if (ic !== null) ics.push(ic);
    }
    const meanAbs = ics.reduce((a, b) => a + Math.abs(b), 0) / ics.length;
    const meanSigned = ics.reduce((a, b) => a + b, 0) / ics.length;
    expect(ics.length).toBeGreaterThanOrEqual(990);
    expect(Math.abs(meanSigned)).toBeLessThan(0.05);
    expect(meanAbs).toBeLessThan(0.05);
  });

  it("look-ahead guard: shifting filed_at forward one quarter changes results (and decays IC)", () => {
    // Delaying every filing by one quarter means the factor measures the
    // PREVIOUS quarter's quality; with AR(1) persistence 0.85 the
    // information decays — a harness that ignores filedAt (and peeks at
    // the fresh quarter) would show NO change.
    const delayed = {
      ...fundamentalWorld,
      fundamentals: world.fundamentals.map((f) => ({
        ...f,
        filedAt: shiftQuarter(f.filedAt),
      })),
    };
    const late = runBacktest(cfg, delayed);
    expect(late.rankIC).not.toBeNull();
    expect(base.rankIC).not.toBeNull();
    // Results CHANGE...
    expect(late.finalNAV).not.toBe(base.finalNAV);
    expect(late.rankIC).not.toBe(base.rankIC);
    // ...in the HONEST direction: stale information predicts less well.
    expect(late.rankIC as number).toBeLessThan((base.rankIC as number) - 0.03);
  });

  it("survivorship guard: removing delisted names changes results (and inflates CAGR)", () => {
    // Dropping the names that crash -70% must CHANGE the backtest and in
    // the bias direction: survivor-only histories look better than the
    // honest universe that holds the doomed names.
    const survivorsOnly = {
      ...fundamentalWorld,
      universe: world.universe.filter((u) => u.delistedAt === null),
    };
    const survivors = runBacktest(cfg, survivorsOnly);
    expect(survivors.finalNAV).not.toBe(base.finalNAV);
    expect(survivors.cagr).toBeGreaterThan(base.cagr + 0.005); // ≥ 50 bps
  });

  it("determinism: same seed -> identical results", () => {
    const again = runBacktest(cfg, fundamentalWorld);
    expect(again.finalNAV).toBe(base.finalNAV);
    expect(again.rankIC).toBe(base.rankIC);
    expect(JSON.stringify(again.periods)).toBe(JSON.stringify(base.periods));
  });

  it("the engine runs the full window with a populated cross-section", () => {
    // Positive control: the synthetic world actually reaches the engine
    // (a vacuous pass with zero periods would pass everything above).
    expect(base.periods.length).toBeGreaterThanOrEqual(90);
    const ns = base.periods.map((p) => p.n);
    expect(Math.min(...ns)).toBeGreaterThanOrEqual(180);
    expect(base.rankIC).not.toBeNull();
  });
});

/** Swap helper: classic Fisher-Yates via an explicit temp read. */
function shifted(arr: number[], j: number): number {
  return arr[j] as number;
}

function shiftQuarter(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + 3;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
