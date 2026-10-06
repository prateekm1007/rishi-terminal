// scripts/backtest/shortWorld.ts (round 20) — the SHORT-model validation
// world, built on the canonical S2-02 machinery (lib/backtest/engine.ts)
// and the canonical PRNG from syntheticWorld.ts. The data-generating
// process is PRE-REGISTERED in docs/evidence/round20/short-radar-
// validation-contract.md section 4 + pre-run amendment A1 — do not change
// any parameter after a battery run.
//
// World model:
//   - Hidden short-quality s[i][q] ~ quarterly AR(1), rho = 0.6. High s =
//     a deteriorating name.
//   - Monthly returns load NEGATIVELY on the CURRENT calendar quarter's
//     quality: r = -0.06*(s - 0.5) + U(-0.05, +0.05); a delisting month
//     crashes -70%. Exactly like the canonical world, the return-driving
//     quarter is the freshest, UNFILED one.
//   - Fundamentals are filed for quarter q one month after q ends and
//     carry s[q] (the filed quarter's own quality — amendment A1.2), so
//     the freshest visible information at any rebalance is one quarter
//     behind the return driver.
//   - 30% of symbols delist (survivorship reality); benchmark has four
//     drift epochs (regimes).
//   - Facts are StockMetrics-shaped: each symbol-quarter emits one fact
//     PER FIELD (field name carried on the fact record — a subtype of the
//     engine's FundamentalFact; the engine's point-in-time gates operate
//     on it unchanged).

import type {
  FundamentalFact,
  PricePoint,
  UniverseEntry,
} from "../../lib/backtest/engine";
import { createRng } from "./syntheticWorld";

export type ShortField =
  | "pe" | "pb" | "roe" | "roce" | "opm" | "fcfMargin"
  | "debtToEquity" | "revenueCAGR3Y" | "epsCAGR3Y" | "promoterHolding"
  | "marketCap";

export interface ShortFundamentalFact extends FundamentalFact {
  field: ShortField;
}

/** Sectors mirror SECTOR_BENCHMARKS_CONFIG keys so the model reads the
 *  canonical sector benchmarks (no duplicated benchmark table). */
export const SHORT_WORLD_SECTORS: Array<{ sector: string; avgPE: number }> = [
  { sector: "IT", avgPE: 28 },
  { sector: "Banking", avgPE: 16 },
  { sector: "Pharma", avgPE: 32 },
  { sector: "FMCG", avgPE: 45 },
  { sector: "Auto", avgPE: 22 },
  { sector: "Energy", avgPE: 18 },
];

/** Pre-registered benchmark drift epochs (per month, 24 months each). */
export const BENCHMARK_EPOCHS = [0.012, 0.002, -0.008, 0.006] as const;

export interface ShortWorldOptions {
  seed: number;
  symbols: number;
  years: number;
  delistFraction: number;
  /** AR(1) persistence of hidden short-quality per quarter. */
  qualityPersistence: number;
  /** Monthly-return loading on current-quarter short-quality. */
  qualityAlpha: number;
  filingLagMonths: number;
  preWindowQuarters: number;
}

export const SHORT_WORLD_DEFAULTS: ShortWorldOptions = {
  seed: 20261006,
  symbols: 300,
  years: 8,
  delistFraction: 0.30,
  qualityPersistence: 0.60,
  qualityAlpha: 0.06,
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

function quarterOfWindowMonth(t: number): number {
  return Math.floor((12 + t) / 3);
}

export interface ShortWorld {
  universe: UniverseEntry[];
  prices: Map<string, PricePoint[]>;
  fundamentals: ShortFundamentalFact[];
  rebalanceDates: string[];
  benchmark: Array<{ date: string; level: number }>;
  /** Sector of each symbol (for the P9 concentration criterion). */
  sectorOf: Map<string, string>;
  /** First / last rebalance index of each benchmark epoch. */
  epochs: Array<{ startIdx: number; endIdx: number; drift: number }>;
}

export function buildShortWorld(opts: Partial<ShortWorldOptions> = {}): ShortWorld {
  const o = { ...SHORT_WORLD_DEFAULTS, ...opts };
  const rng = createRng(o.seed);
  const months = o.years * 12;
  const rebalanceDates: string[] = [];
  for (let t = 0; t <= months; t++) rebalanceDates.push(monthAdd(WINDOW_START, t));

  const totalQuarters = o.preWindowQuarters + Math.ceil(months / 3) + 2;

  // Hidden short-quality AR(1) per symbol per absolute quarter.
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
  const fundamentals: ShortFundamentalFact[] = [];
  const benchmark: Array<{ date: string; level: number }> = [];
  const sectorOf = new Map<string, string>();

  // Benchmark: four drift epochs (regimes).
  let bLevel = 100;
  for (let t = 0; t <= months; t++) {
    benchmark.push({ date: rebalanceDates[t], level: bLevel });
    const epoch = Math.min(Math.floor(t / (months / 4)), BENCHMARK_EPOCHS.length - 1);
    bLevel *= 1 + BENCHMARK_EPOCHS[epoch];
  }

  for (let i = 0; i < o.symbols; i++) {
    const sym = `SHRT${String(i).padStart(4, "0")}`;
    const sec = SHORT_WORLD_SECTORS[i % SHORT_WORLD_SECTORS.length];
    sectorOf.set(sym, sec.sector);

    const willDelist = rng() < o.delistFraction;
    const delistIdx = willDelist ? 6 + Math.floor(rng() * (months - 12)) : null;

    universe.push({
      symbol: sym,
      listedAt: rebalanceDates[0],
      delistedAt: delistIdx !== null ? rebalanceDates[delistIdx] : null,
    });

    // One fact per field per quarter, filed filingLagMonths after the
    // quarter ends; value loads on the FILED quarter's own quality (A1.2).
    const u = (w: number) => w * (rng() - 0.5) * 2; // uniform half-width w
    for (let q = 0; q < totalQuarters; q++) {
      const periodEnd = monthAdd(HISTORY_START, q * 3 + 2);
      const filedAt = monthAdd(periodEnd, o.filingLagMonths);
      const s = quality[i][q];
      const peBase = sec.avgPE;
      const fields: Array<[ShortField, number]> = [
        ["pe", peBase * Math.exp(0.9 * (s - 0.5) + u(0.15))],
        ["pb", 2 * Math.exp(0.7 * (s - 0.5) + u(0.2))],
        ["roe", 15 - 12 * s + u(3)],
        ["roce", 15 - 12 * s + u(3) + u(2)],
        ["opm", 14 - 10 * s + u(3)],
        ["fcfMargin", 4 - 12 * s + u(3)],
        ["debtToEquity", 0.5 + 2.5 * s + u(0.3)],
        ["revenueCAGR3Y", 12 - 20 * s + u(4)],
        ["epsCAGR3Y", 12 - 20 * s + u(4) + u(3)],
        ["promoterHolding", Math.min(90, Math.max(0, 55 - 25 * s + u(8)))],
        ["marketCap", 5000 * Math.exp(rng() * 2)],
      ];
      for (const [field, value] of fields) {
        fundamentals.push({ symbol: sym, periodEnd, filedAt, field, value });
      }
    }

    // Monthly adjusted prices; returns load on the CURRENT quarter's
    // quality (the freshest, unfiled one — canonical pattern).
    const series: PricePoint[] = [];
    let px = 100 * (0.5 + rng());
    for (let t = 0; t <= months; t++) {
      const q = quarterOfWindowMonth(t);
      const isFinalMonth = delistIdx !== null && t === delistIdx;
      if (t > 0) {
        let r = -o.qualityAlpha * (quality[i][q] - 0.5) + 0.05 * (rng() - 0.5) * 2;
        if (isFinalMonth) r = -0.70; // the delisting crash
        px *= 1 + r;
      }
      series.push({ date: rebalanceDates[t], price: Math.max(px, 0.01) });
      if (isFinalMonth) break; // no observations after delisting
    }
    prices.set(sym, series);
  }

  const epochLen = Math.floor(months / 4);
  const epochs = BENCHMARK_EPOCHS.map((drift, k) => ({
    startIdx: k * epochLen,
    endIdx: Math.min((k + 1) * epochLen, months - 1),
    drift,
  }));

  return { universe, prices, fundamentals, rebalanceDates, benchmark, sectorOf, epochs };
}

/** Latest visible value per (symbol, field) — per-field version of the
 *  canonical latestFundamentalFactor. */
export function latestFieldsPerSymbol(ctx: {
  visibleFacts: ShortFundamentalFact[];
}): Map<string, Map<ShortField, number>> {
  const out = new Map<string, Map<ShortField, number>>();
  const latestFiled = new Map<string, string>();
  for (const f of ctx.visibleFacts) {
    let perSym = out.get(f.symbol);
    if (!perSym) {
      perSym = new Map();
      out.set(f.symbol, perSym);
    }
    // Explicit recency comparison (canonical latestFundamentalFactor pattern).
    const key = f.symbol + "|" + f.field;
    const prevFiledAt = latestFiled.get(key);
    if (prevFiledAt === undefined || f.filedAt >= prevFiledAt) {
      perSym.set(f.field, f.value);
      latestFiled.set(key, f.filedAt);
    }
  }
  return out;
}
