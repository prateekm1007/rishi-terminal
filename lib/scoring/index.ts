/**
 * lib/scoring — THE ONLY PUBLIC SCORING SURFACE (remediation T10).
 *
 * One score, one input set:
 * - `getStockScore` runs `buildConsensus` (Rishi Merit System v1) — the single
 *   consensus engine behind the stock page, screener, lab, chat and nightly
 *   rishiMemory snapshots. Nothing else may be presented as "the Rishi Score".
 * - `resolveStockMetrics` merges the static seed dataset with live
 *   fundamentals and records, for every field, where the value came from
 *   (`seed` | `live` | `derived`) and when it was captured (`asOf`).
 *   UI code must render values from this resolution instead of mixing its own
 *   sources, so every entry path scores the same input set.
 *
 * The former "Rishi Score v2" engine is demoted to a distinct, honestly
 * labelled metric: the Quality-Value Pillar Score (QVPS, `calculateQvps`).
 * It is a pillar-style factor model, NOT the Rishi Score, and UI surfaces
 * must label it as such.
 */

import { STOCKS, SEED_AS_OF } from "@/data/stocks";
import type { Stock, ConsensusResult } from "@/lib/consensus/types";
import { buildConsensus } from "@/lib/consensus/engine";
import {
  calculateQvps,
  calculateQvpsDual,
} from "@/lib/scorers/rishiScoreV2";
import type { StockMetrics, RishiScoreResult, ScoreMode } from "@/lib/scorers/types";
import type { FullFundamentals } from "@/hooks/useFundamentals";

export { SCORE_ENGINE_VERSION } from "@/lib/consensus/version";

export type { Stock, ConsensusResult, StockMetrics, RishiScoreResult, ScoreMode };

/** Where a resolved field's value came from. */
export type FieldSource = "seed" | "live" | "derived";

export interface ResolvedField<T = number> {
  value: T;
  source: FieldSource;
  /** ISO date (seed snapshot) or ISO timestamp (live fetch). */
  asOf?: string;
}

export interface ResolvedStockMetrics {
  symbol: string;
  name: string;
  sector: string;
  /** Merged Stock (seed values overridden by live fundamentals). */
  stock: Stock;
  /** QVPS pillar-model input derived from the same resolution. */
  metrics: StockMetrics;
  /** Provenance for every meaningful field (T10/T14). */
  fields: Record<string, ResolvedField>;
  /** When the seed snapshot was captured; live fields carry their own asOf. */
  seedAsOf: string;
}

function isResolved(x: unknown): x is ResolvedStockMetrics {
  return typeof x === "object" && x !== null && "fields" in x && "stock" in x;
}

function pick(
  liveValue: number | undefined,
  seedValue: number,
): { value: number; source: FieldSource } {
  // A failed live fetch must never zero out a real seed value: only a finite,
  // strictly-positive live number overrides the seed.
  if (typeof liveValue === "number" && Number.isFinite(liveValue) && liveValue > 0) {
    return { value: liveValue, source: "live" };
  }
  return { value: seedValue, source: "seed" };
}

/**
 * Merge the static seed record with live fundamentals.
 * Returns null when the symbol is unknown (callers decide 404 vs empty state).
 */
export function resolveStockMetrics(
  symbol: string,
  live?: FullFundamentals | null,
): ResolvedStockMetrics | null {
  const sym = symbol?.trim().toUpperCase();
  const seed = STOCKS[sym];
  if (!seed) return null;

  const now = new Date().toISOString();
  const fields: Record<string, ResolvedField> = {};

  const set = (key: string, r: { value: number; source: FieldSource }) => {
    fields[key] = {
      value: r.value,
      source: r.source,
      asOf: r.source === "live" ? now : SEED_AS_OF,
    };
  };

  const pe = pick(live?.pe, seed.pe);
  const roe = pick(live?.roe, seed.roe);
  const roce = pick(live?.roce, seed.roce);
  const opm = pick(live?.opm, seed.opm);
  const de = pick(live?.debtToEquity, seed.de);
  const promo = pick(live?.promoterHolding, seed.promo);
  const revCagr = pick(live?.revCagr3y, seed.revcagr);
  const epsCagr = pick(live?.epsCagr, seed.epscagr);
  const mktcap = pick(
    live?.marketCap !== undefined ? live.marketCap / 10000000 : undefined,
    seed.mktcap,
  );
  const bvps = pick(live?.bookValue, seed.bvps);

  set("pe", pe);
  set("roe", roe);
  set("roce", roce);
  set("opm", opm);
  set("de", de);
  set("promo", promo);
  set("revcagr", revCagr);
  set("epscagr", epsCagr);
  set("mktcap", mktcap);
  set("bvps", bvps);

  // Derived from other resolved fields — never invented.
  const pb: ResolvedField = {
    value: bvps.value > 0 ? Number((seed.price / bvps.value).toFixed(4)) : 0,
    source: "derived",
    asOf: now,
  };
  fields.pb = pb;
  const fcfMargin: ResolvedField = {
    value: seed.rev > 0 ? Number(((seed.fcf / seed.rev) * 100).toFixed(4)) : 0,
    source: "seed",
    asOf: SEED_AS_OF,
  };
  fields.fcfMargin = fcfMargin;

  const mergedStock: Stock = {
    ...seed,
    pe: pe.value,
    roe: roe.value,
    roce: roce.value,
    opm: opm.value,
    de: de.value,
    promo: promo.value,
    revcagr: revCagr.value,
    epscagr: epsCagr.value,
    mktcap: mktcap.value,
    bvps: bvps.value,
  };

  const metrics: StockMetrics = {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    pe: pe.value,
    pb: pb.value,
    roe: roe.value,
    roce: roce.value,
    opm: opm.value,
    fcfMargin: fcfMargin.value,
    revenueCAGR3Y: revCagr.value,
    epsCAGR3Y: epsCagr.value,
    debtToEquity: de.value,
    promoterHolding: promo.value,
    marketCap: mktcap.value,
  };

  return {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    stock: mergedStock,
    metrics,
    fields,
    seedAsOf: SEED_AS_OF,
  };
}

/**
 * THE stock score. Runs the single consensus engine (Rishi Merit System v1)
 * over a raw Stock or over a resolved metrics object. UI surfaces show
 * `consensus` (or an em dash when null, per T11) and must never present a
 * competing number as "the Rishi Score".
 */
export function getStockScore(input: Stock | ResolvedStockMetrics): ConsensusResult {
  const stock: Stock = isResolved(input) ? input.stock : input;
  return buildConsensus(stock);
}

/** Quality-Value Pillar Score (QVPS) — the demoted former "v2" engine. */
export function getQvps(
  resolved: ResolvedStockMetrics,
  mode: ScoreMode = "LONG",
): RishiScoreResult {
  return calculateQvps(resolved.metrics, mode);
}

export { calculateQvps, calculateQvpsDual };
