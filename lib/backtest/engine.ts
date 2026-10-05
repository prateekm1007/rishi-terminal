// lib/backtest/engine.ts (S2-02) — the walk-forward backtest harness.
//
// Founder Round-16 C7: "S2-02 backtest harness on synthetic data, with its
// correctness tests (perfect-foresight factor IC ≈ 1, shuffled ≈ 0,
// look-ahead and survivorship guards)." The roadmap's licensed-source
// inputs (D1-04/D1-05, Nifty 500 TRI) are FD-1-blocked, so the engine is
// INPUT-DRIVEN: it consumes synthetic data in tests today and the licensed
// series later, without code changes.
//
// Point-in-time contract (the whole point of the harness):
//   - A fundamental fact is VISIBLE at rebalance date R iff filedAt <= R.
//     Shifting filedAt forward must change results (the look-ahead guard).
//   - The universe at R contains a symbol iff listedAt <= R < delistedAt.
//     Dropping delisted names must change results (the survivorship guard).
//   - Prices are ADJUSTED (splits/bonuses folded in); a delisting is
//     simply the last price observation (the crash is in the series).
//
// Determinism (Constitution 18): the engine itself never samples; all
// randomness lives in the world generator (scripts/backtest/syntheticWorld.ts)
// which takes a seed. Same inputs -> same outputs, always.
//
// Metrics (definitions pinned so the report cannot soften them):
//   - rankIC        mean over periods of Spearman(factor, forward return)
//                   across the rebalance cross-section.
//   - decileSpread  mean of (top-decile - bottom-decile) period return.
//   - CAGR          (finalNAV / initialNAV) ** (periodsPerYear / T) - 1.
//   - volatility    stdev(periodReturns) * sqrt(periodsPerYear).
//   - maxDrawdown   max peak-to-trough fall of the NAV series.
//   - turnover      mean per-rebalance fraction of portfolio value traded
//                   (sum of |weight_i - prevWeight_i| / 2).
//   - hitRate       fraction of periods with portfolioReturn > benchmark.

/** One adjusted price observation per rebalance period, per symbol. */
export interface PricePoint {
  /** ISO date of the period START (the rebalance date). */
  date: string;
  /** Adjusted price; the symbol's LAST observation before delisting. */
  price: number;
}

/** A point-in-time fundamental fact. */
export interface FundamentalFact {
  symbol: string;
  /** Fiscal quarter end (information date of the CONTENT). */
  periodEnd: string;
  /** When the fact became PUBLIC — the point-in-time gate. */
  filedAt: string;
  /** The factor input (synthetic worlds define its meaning). */
  value: number;
}

export interface UniverseEntry {
  symbol: string;
  listedAt: string;
  /** null = still listed (survives the whole window). */
  delistedAt: string | null;
}

export interface BacktestConfig {
  /** Rebalance dates (ISO, ascending, period starts). */
  rebalanceDates: string[];
  /** Periods per year for annualization (12 = monthly, 4 = quarterly). */
  periodsPerYear: number;
  /** Transaction cost per unit traded, in basis points (1e-4 fraction). */
  transactionCostBps: number;
  /** Slippage per unit traded, in basis points. */
  slippageBps: number;
  /** The benchmark series (adjusted index level per rebalance date). */
  benchmark: Array<{ date: string; level: number }>;
}

/** The factor callback: scores the cross-section from VISIBLE facts only. */
export type FactorFn = (
  ctx: {
    date: string;
    /** Facts with filedAt <= date, for symbols in the universe at date. */
    visibleFacts: FundamentalFact[];
    /** Latest adjusted price at or before date, per in-universe symbol. */
    lastPrice: Map<string, number>;
  },
) => Map<string, number>;

export interface PeriodResult {
  date: string;
  /** Symbols in the cross-section (listed, not delisted, priced, scored). */
  n: number;
  rankIC: number | null;
  portfolioReturn: number;
  benchmarkReturn: number;
  topDecileReturn: number | null;
  bottomDecileReturn: number | null;
  turnover: number;
}

export interface BacktestResult {
  periods: PeriodResult[];
  finalNAV: number;
  rankIC: number | null;
  decileSpread: number | null;
  cagr: number;
  volatility: number;
  maxDrawdown: number;
  turnover: number;
  hitRate: number;
}

/** Spearman rank correlation; null when a side is constant or n < 3. */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n !== ys.length || n < 3) return null;
  const rank = (vals: number[]): number[] => {
    const idx = vals.map((v, i) => [v, i] as [number, number]).sort((a, b) => a[0] - b[0]);
    const out = new Array<number>(n).fill(0);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1; // average rank for ties
      for (let k = i; k <= j; k++) out[idx[k][1]] = avg;
      i = j + 1;
    }
    return out;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Binary-search the index of the last date <= target in an ascending
 *  series; -1 when target precedes the series. */
function lastAtOrBefore(series: Array<{ date: string }>, target: string): number {
  let lo = 0, hi = series.length - 1, res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= target) { res = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return res;
}

export function runBacktest(cfg: BacktestConfig, world: {
  universe: UniverseEntry[];
  prices: Map<string, PricePoint[]>; // per symbol, ascending by date
  fundamentals: FundamentalFact[];
  factor: FactorFn;
}): BacktestResult {
  const { rebalanceDates } = cfg;
  const periods: PeriodResult[] = [];
  let nav = 1;
  let prevWeights = new Map<string, number>();
  const navSeries: number[] = [1];

  for (let t = 0; t + 1 < rebalanceDates.length; t++) {
    const date = rebalanceDates[t];
    const nextDate = rebalanceDates[t + 1];

    // 1. Universe at date (survivorship gate).
    const inUniverse = world.universe.filter(
      (u) => u.listedAt <= date && (u.delistedAt === null || date < u.delistedAt),
    );

    // 2. Visible facts (look-ahead gate): filedAt <= date.
    const inUniverseSet = new Set(inUniverse.map((u) => u.symbol));
    const visibleFacts = world.fundamentals.filter(
      (f) => f.filedAt <= date && inUniverseSet.has(f.symbol),
    );

    // 3. Latest adjusted price at or before date, per symbol.
    const lastPrice = new Map<string, number>();
    for (const u of inUniverse) {
      const series = world.prices.get(u.symbol) ?? [];
      const i = lastAtOrBefore(series, date);
      if (i >= 0) lastPrice.set(u.symbol, series[i].price);
    }

    // 4. Factor scores from visible data only.
    const scores = world.factor({ date, visibleFacts, lastPrice });

    // 5. Forward returns date -> nextDate (adjusted; delisting = last obs).
    const fwd = new Map<string, number>();
    for (const u of inUniverse) {
      const series = world.prices.get(u.symbol) ?? [];
      const i0 = lastAtOrBefore(series, date);
      const i1 = lastAtOrBefore(series, nextDate);
      if (i0 >= 0 && i1 >= 0 && series[i0].price > 0) {
        fwd.set(u.symbol, series[i1].price / series[i0].price - 1);
      }
    }

    // 6. Cross-section: scored AND forward-returnable.
    const xs: string[] = [];
    for (const s of scores.keys()) if (fwd.has(s)) xs.push(s);
    xs.sort(); // determinism before ranking

    const factorVals = xs.map((s) => scores.get(s) as number);
    const fwdVals = xs.map((s) => fwd.get(s) as number);
    const rankIC = spearman(factorVals, fwdVals);

    // 7. Deciles by factor rank (top = highest factor).
    const order = xs.map((s, i) => ({ s, v: factorVals[i] })).sort((a, b) => b.v - a.v);
    const decile = Math.max(1, Math.floor(order.length / 10));
    const top = order.slice(0, decile).map((o) => o.s);
    const bottom = order.slice(Math.max(0, order.length - decile)).map((o) => o.s);
    const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const topRet = top.length ? mean(top.map((s) => fwd.get(s) as number)) : null;
    const bottomRet = bottom.length ? mean(bottom.map((s) => fwd.get(s) as number)) : null;

    // 8. Portfolio (equal-weight top decile), costs on turnover.
    const grossReturn = topRet ?? 0;
    const weights = new Map<string, number>(top.map((s) => [s, 1 / top.length]));
    let traded = 0;
    for (const [sym, w] of weights) traded += Math.abs(w - (prevWeights.get(sym) ?? 0));
    for (const [sym, w] of prevWeights) if (!weights.has(sym)) traded += w;
    const turnover = Math.min(1, traded / 2);
    const cost = (turnover * (cfg.transactionCostBps + cfg.slippageBps)) / 1e4;
    const portfolioReturn = grossReturn - cost;

    // 9. Benchmark return over the same period.
    const bIdx0 = lastAtOrBefore(cfg.benchmark, date);
    const bIdx1 = lastAtOrBefore(cfg.benchmark, nextDate);
    const benchmarkReturn =
      bIdx0 >= 0 && bIdx1 >= 0 && cfg.benchmark[bIdx0].level > 0
        ? cfg.benchmark[bIdx1].level / cfg.benchmark[bIdx0].level - 1
        : 0;

    nav *= 1 + portfolioReturn;
    navSeries.push(nav);
    prevWeights = weights;

    periods.push({
      date,
      n: xs.length,
      rankIC,
      portfolioReturn,
      benchmarkReturn,
      topDecileReturn: topRet,
      bottomDecileReturn: bottomRet,
      turnover,
    });
  }

  // ── Metrics ──
  const ics = periods.map((p) => p.rankIC).filter((v): v is number => v !== null);
  const rankICMean = ics.length ? ics.reduce((a, b) => a + b, 0) / ics.length : null;
  const spreads = periods
    .map((p) => (p.topDecileReturn !== null && p.bottomDecileReturn !== null
      ? p.topDecileReturn - p.bottomDecileReturn : null))
    .filter((v): v is number => v !== null);
  const decileSpread = spreads.length ? spreads.reduce((a, b) => a + b, 0) / spreads.length : null;

  const T = periods.length;
  const cagr = T > 0 ? nav ** (cfg.periodsPerYear / T) - 1 : 0;
  const rets = periods.map((p) => p.portfolioReturn);
  const mRet = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const variance = rets.length > 1
    ? rets.reduce((a, r) => a + (r - mRet) ** 2, 0) / (rets.length - 1) : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(cfg.periodsPerYear);
  let peak = -Infinity, maxDD = 0;
  for (const v of navSeries) {
    peak = Math.max(peak, v);
    maxDD = Math.max(maxDD, (peak - v) / peak);
  }
  const turnoverMean = T > 0 ? periods.reduce((a, p) => a + p.turnover, 0) / T : 0;
  const hitRate = T > 0
    ? periods.filter((p) => p.portfolioReturn > p.benchmarkReturn).length / T : 0;

  return {
    periods,
    finalNAV: nav,
    rankIC: rankICMean,
    decileSpread,
    cagr,
    volatility,
    maxDrawdown: maxDD,
    turnover: turnoverMean,
    hitRate,
  };
}
