// scripts/backtest/shortRadarFactor.ts (round 20) — factor adapters that
// run the REAL Short Radar model (calculateQvps via lib/scoring — the
// sanctioned surface) inside the canonical S2-02 walk-forward engine, plus
// the hand-written-heuristic control and battery instrumentation.
//
// No scoring logic lives here: the factor builds StockMetrics from the
// world's visible facts and calls the same production function the
// dashboard calls. The candidate gate (>= 2 trigger flags) mirrors the
// product path and uses the ONE flag definition (lib/scorers/shortFlags).

import type { FactorFn } from "../../lib/backtest/engine";
import type { PricePoint } from "../../lib/backtest/engine";
import {
  latestFieldsPerSymbol,
  type ShortFundamentalFact,
  type ShortField,
} from "./shortWorld";
import { shortFlagsFromMetrics } from "../../lib/scorers/shortFlags";
import type { StockMetrics } from "../../lib/scorers/types";

export function metricsFromFields(
  symbol: string,
  sector: string,
  fields: Map<ShortField, number>,
): StockMetrics {
  const num = (f: ShortField): number | undefined => {
    const v = fields.get(f);
    return v === undefined ? undefined : v;
  };
  return {
    symbol,
    name: symbol,
    sector,
    pe: num("pe") ?? 0,
    pb: num("pb") ?? 0,
    roe: num("roe") ?? 0,
    roce: num("roce"),
    opm: num("opm"),
    fcfMargin: num("fcfMargin"),
    revenueCAGR3Y: num("revenueCAGR3Y"),
    epsCAGR3Y: num("epsCAGR3Y"),
    debtToEquity: num("debtToEquity"),
    promoterHolding: num("promoterHolding"),
    marketCap: num("marketCap"),
  };
}

export interface ScoredRow {
  symbol: string;
  sector: string;
  score: number;
  flagCount: number;
  pillarWeighted: Record<string, number>;
}

export interface ModelRecording {
  /** date -> gated, scored rows (insertion order = cross-section order). */
  byDate: Map<string, ScoredRow[]>;
}

/**
 * The production model factor: build metrics from visible facts, gate on
 * >= 2 trigger flags, score with calculateQvps(metrics, "SHORT").
 * `scoreFn` is injected so the battery runs the CURRENT production path —
 * the caller passes (metrics) => calculateQvps(metrics, "SHORT", false).
 */
export function makeGatedModelFactor(deps: {
  sectorOf: Map<string, string>;
  scoreFn: (m: StockMetrics) => { finalScore: number; pillars: Array<{ id: string; weighted: number }> };
  recording?: ModelRecording;
}): FactorFn {
  return (ctx) => {
    const fieldsBySymbol = latestFieldsPerSymbol({
      visibleFacts: ctx.visibleFacts as ShortFundamentalFact[],
    });
    const out = new Map<string, number>();
    const rows: ScoredRow[] = [];
    for (const [sym, fields] of fieldsBySymbol) {
      const m = metricsFromFields(sym, deps.sectorOf.get(sym) ?? "Default", fields);
      const flags = shortFlagsFromMetrics(m);
      if (flags.length < 2) continue; // the product's candidate gate
      const res = deps.scoreFn(m);
      out.set(sym, res.finalScore);
      const pillarWeighted: Record<string, number> = {};
      for (const p of res.pillars) pillarWeighted[p.id] = p.weighted;
      rows.push({
        symbol: sym,
        sector: m.sector,
        score: res.finalScore,
        flagCount: flags.length,
        pillarWeighted,
      });
    }
    if (deps.recording) deps.recording.byDate.set(ctx.date, rows);
    return out;
  };
}

/**
 * The hand-written heuristic control (contract P2): rank gated candidates
 * by trigger-flag COUNT — the pre-existing ranking idea, expressed as a
 * factor. Higher = more short-worthy.
 */
export function makeHeuristicFactor(sectorOf: Map<string, string>): FactorFn {
  return (ctx) => {
    const fieldsBySymbol = latestFieldsPerSymbol({
      visibleFacts: ctx.visibleFacts as ShortFundamentalFact[],
    });
    const out = new Map<string, number>();
    for (const [sym, fields] of fieldsBySymbol) {
      const m = metricsFromFields(sym, sectorOf.get(sym) ?? "Default", fields);
      const flags = shortFlagsFromMetrics(m);
      if (flags.length < 2) continue;
      out.set(sym, flags.length);
    }
    return out;
  };
}

/** Forward return per symbol between two rebalance dates (battery
 *  instrumentation for pillar diagnostics; the ENGINE's own rankIC /
 *  portfolio stats remain the canonical measures). */
export function forwardReturns(
  prices: Map<string, PricePoint[]>,
  symbols: string[],
  date: string,
  nextDate: string,
): Map<string, number> {
  const at = (sym: string, d: string): number | undefined => {
    const series = prices.get(sym) ?? [];
    let res: number | undefined;
    for (const p of series) {
      if (p.date <= d) res = p.price;
      else break;
    }
    return res;
  };
  const out = new Map<string, number>();
  for (const sym of symbols) {
    const a = at(sym, date);
    const b = at(sym, nextDate);
    if (a !== undefined && b !== undefined && a > 0) out.set(sym, b / a - 1);
  }
  return out;
}
