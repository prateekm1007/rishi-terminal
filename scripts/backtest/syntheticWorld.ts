// scripts/backtest/syntheticWorld.ts (S2-02) — the deterministic synthetic
// data generator for the backtest harness.
//
// Everything here is SYNTHETIC AND LABELED (Constitution 4: no fabricated
// market claims ever leave the harness). The generator exists so the
// engine's correctness properties can be tested BEFORE the licensed data
// (FD-1) arrives; it is never used to publish a performance number.
//
// World model (documented so the tests' expected directions are readable):
//   - Each symbol has a hidden QUALITY following a quarterly AR(1) with
//     persistence rho. Low persistence = fast information decay, which is
//     what makes the LOOK-AHEAD guard bite: delaying every filing by one
//     quarter costs the factor exactly one rho of predictive correlation.
//   - Each quarter the symbol files a fundamental whose value = quality +
//     measurement noise, filed one month after the quarter ends. Four
//     quarters of filing HISTORY predate the backtest window, so the
//     first rebalance already sees data (an empty early cross-section
//     would make every average dishonest).
//   - Monthly returns load on the CURRENT calendar quarter's quality
//     (alpha) plus idiosyncratic noise (sigma) — the factor only ever
//     sees PAST quarters, exactly like a real fundamentals factor.
//   - A fixed fraction of symbols DELIST at a random month with a -70%
//     final crash. The fraction is high (30%) so the SURVIVORSHIP guard
//     is deterministic in direction: an honest universe that holds the
//     doomed names must underperform the survivor-only fantasy.
//   - The benchmark is a synthetic index (label: SYNTHETIC — never
//     presented as Nifty 500 TRI; the licensed series plugs in at FD-1).

import type {
  FundamentalFact,
  PricePoint,
  UniverseEntry,
} from "../../lib/backtest/engine";

/** Deterministic PRNG (mulberry32) — same seed, same world, always. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticWorld {
  universe: UniverseEntry[];
  prices: Map<string, PricePoint[]>;
  fundamentals: FundamentalFact[];
  rebalanceDates: string[];
  benchmark: Array<{ date: string; level: number }>;
}

export interface SyntheticOptions {
  seed: number;
  /** Symbols in the full universe (including the doomed ones). */
  symbols: number;
  /** Years of monthly rebalances. */
  years: number;
  /** Fraction of symbols that delist (crash -70%) at a random month. */
  delistFraction: number;
  /** AR(1) persistence of hidden quality per QUARTER (low = fast decay). */
  qualityPersistence: number;
  /** Monthly-return loading on current-quarter quality. */
  qualityAlpha: number;
  /** Idiosyncratic monthly return noise, half-width of a uniform. */
  noiseSigma: number;
  /** Fundamental measurement noise, half-width of a uniform. */
  fundamentalNoise: number;
  /** Filing lag: months between quarter end and filedAt. */
  filingLagMonths: number;
  /** Filing history quarters generated BEFORE the window starts. */
  preWindowQuarters: number;
}

export const DEFAULTS: SyntheticOptions = {
  seed: 20261005,
  symbols: 300,
  years: 8,
  delistFraction: 0.30,
  qualityPersistence: 0.60,
  qualityAlpha: 0.06,
  noiseSigma: 0.05,
  fundamentalNoise: 0.05,
  filingLagMonths: 1,
  preWindowQuarters: 4,
};

const WINDOW_START = "2016-01-01";
const HISTORY_START = "2015-01-01";

function monthAdd(iso: string, months: number): string {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/** Absolute quarter index (from HISTORY_START) of a rebalance month t. */
function quarterOfWindowMonth(t: number): number {
  // WINDOW_START is 12 months after HISTORY_START; months 0,1,2 of a
  // year belong to Q1 — month 12 (2016-01) is in quarter 4.
  return Math.floor((12 + t) / 3);
}

/** Build the deterministic synthetic world. */
export function buildSyntheticWorld(opts: Partial<SyntheticOptions> = {}): SyntheticWorld {
  const o = { ...DEFAULTS, ...opts };
  const rng = createRng(o.seed);
  const months = o.years * 12;
  const rebalanceDates: string[] = [];
  for (let t = 0; t <= months; t++) rebalanceDates.push(monthAdd(WINDOW_START, t));

  // Hidden quality per symbol per absolute quarter (AR(1)), including the
  // pre-window history so first-rebalance filings exist.
  const totalQuarters = o.preWindowQuarters + Math.ceil(months / 3) + 2;
  const quality: number[][] = [];
  for (let i = 0; i < o.symbols; i++) {
    const row: number[] = [rng()];
    for (let q = 1; q < totalQuarters; q++) {
      row.push(o.qualityPersistence * row[q - 1] + (1 - o.qualityPersistence) * rng());
    }
    quality.push(row);
  }

  const universe: UniverseEntry[] = [];
  const prices = new Map<string, PricePoint[]>();
  const fundamentals: FundamentalFact[] = [];
  const benchmark: Array<{ date: string; level: number }> = [];

  // Benchmark: slow synthetic uptrend with noise, labeled synthetic.
  let bLevel = 100;
  for (const d of rebalanceDates) {
    benchmark.push({ date: d, level: bLevel });
    bLevel *= 1 + 0.006 + 0.02 * (rng() - 0.5);
  }

  for (let i = 0; i < o.symbols; i++) {
    const sym = `SYN${String(i).padStart(4, "0")}`;
    const willDelist = rng() < o.delistFraction;
    const delistIdx = willDelist ? 6 + Math.floor(rng() * (months - 12)) : null;

    universe.push({
      symbol: sym,
      listedAt: rebalanceDates[0],
      delistedAt: delistIdx !== null ? rebalanceDates[delistIdx] : null,
    });

    // Quarterly fundamentals for every absolute quarter (incl. history):
    // periodEnd = last month of that quarter; filed one month later.
    for (let q = 0; q < totalQuarters; q++) {
      const periodEnd = monthAdd(HISTORY_START, q * 3 + 2);
      fundamentals.push({
        symbol: sym,
        periodEnd,
        filedAt: monthAdd(periodEnd, o.filingLagMonths),
        value: quality[i][q] + o.fundamentalNoise * (rng() - 0.5),
      });
    }

    // Monthly adjusted prices; the return loads on the CURRENT calendar
    // quarter's quality (which the factor cannot yet see — it is the
    // freshest, unfiled quarter exactly as in real markets).
    const series: PricePoint[] = [];
    let px = 100 * (0.5 + rng());
    for (let t = 0; t <= months; t++) {
      const q = quarterOfWindowMonth(t);
      const isFinalMonth = delistIdx !== null && t === delistIdx;
      if (t > 0) {
        let r = o.qualityAlpha * (quality[i][q] - 0.5) + o.noiseSigma * (rng() - 0.5) * 2;
        if (isFinalMonth) r = -0.70; // the delisting crash
        px *= 1 + r;
      }
      series.push({ date: rebalanceDates[t], price: Math.max(px, 0.01) });
      if (isFinalMonth) break; // no observations after delisting
    }
    prices.set(sym, series);
  }

  return { universe, prices, fundamentals, rebalanceDates, benchmark };
}

/** The fundamental factor: latest visible filed value per symbol. */
export function latestFundamentalFactor(ctx: {
  date: string;
  visibleFacts: FundamentalFact[];
}): Map<string, number> {
  const latest = new Map<string, FundamentalFact>();
  for (const f of ctx.visibleFacts) {
    const prev = latest.get(f.symbol);
    if (!prev || f.filedAt > prev.filedAt || (f.filedAt === prev.filedAt && f.periodEnd > prev.periodEnd)) {
      latest.set(f.symbol, f);
    }
  }
  const out = new Map<string, number>();
  for (const [sym, f] of latest) out.set(sym, f.value);
  return out;
}
