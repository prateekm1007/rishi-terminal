import 'server-only';

// Types moved to ./wireIndex (R16 C5) so client components import the
// transport codec without touching this server-only module — one source
// of truth (Constitution 14); the re-exports below keep every existing
// import path working.
import type {
  SlimStockRow,
  SlimVerdictSummary,
  SlimVerdictScore,
} from '../transport/slimWire';

export type { SlimStockRow, SlimVerdictSummary, SlimVerdictScore };

// N1 (round 3): the slim index — what client LIST surfaces may receive.
//
// The auditor's finding: the full 944-record seed dataset and the scoring
// engine shipped in the public JS bundle, so any browser could recompute
// every per-Rishi verdict. Client components now receive RESULTS, not
// engines:
//
//   - list/sort surfaces (screener, lab tabs, chat picker) consume this
//     slim index via RSC props: the consensus number and category, the
//     topBull/topBear summaries, and pe/roe/mktcap/de display and
//     preset-filter fields.
//   - the FULL per-Rishi verdict set is served per-symbol: by the stock
//     page RSC (everyone — Commit M3 free access) and by
//     GET /api/rishis/[symbol] (authenticated client upgrades).
//   - the per-stock display record crosses via RSC props on
//     /stock/[symbol] or GET /api/stock/[symbol].
//
// The row is deliberately NARROW: it must never grow engine inputs
// (ocf, rev, np, dep, capex, ca, tl, sh, bvps, promo, fcf, price …),
// because the dataset + engine is exactly what N1 removes from the
// client. test/clientBoundary.test.ts and the ESLint
// no-server-only-imports-in-client rule enforce the boundary.

import { STOCKS } from '@/data/stocks';
import { getStockScore } from './index';

/** Per-Rishi verdict summary (name/label/score/origin only). */
// (interface SlimVerdictSummary lives in wireIndex.ts — see the re-export above.)

/**
 * One stock's free, display-safe fields. Deliberately narrow — see the
 * module header before adding anything. (Interface lives in wireIndex.ts;
 * re-exported above.)
 */
// interface SlimStockRow lives in wireIndex.ts.

/** Free-slice per-Rishi verdict (name/full/label/score/origin only). */
// (interface SlimVerdictScore lives in wireIndex.ts — re-exported above.)

function toSummary(v: {
  name: string;
  full: string;
  label: string;
  score: number | null;
} | undefined): SlimVerdictSummary | null {
  if (!v) return null;
  return { name: v.name, full: v.full, label: v.label, score: v.score };
}

let cache: SlimStockRow[] | null = null;

/** How many per-verdict summary rows a LIST row carries (see the
 *  summaryScores field comment — payload budget, not an entitlement). */
const LIST_SUMMARY_VERDICTS = 5;

/**
 * Server-generated slim index for all seed symbols. Deterministic
 * (seed + engine are static), so it is computed once per process and
 * passed to client components as RSC props — the 944-row flight payload
 * stays out of the shared client chunks (N1 acceptance greps
 * .next/static for the seed and engine literals and must find none).
 */
export function getSlimIndex(): SlimStockRow[] {
  if (cache) return cache;

  cache = Object.values(STOCKS).map((stock) => {
    const report = getStockScore(stock);
    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      consensus: report.consensus,
      category: report.category,
      dataQuality: report.dataQuality,
      topBull: toSummary(report.topBull),
      topBear: toSummary(report.topBear),
      tension: report.tension,
      tensionSpread: report.tensionSpread,
      summaryScores: report.scores.slice(0, LIST_SUMMARY_VERDICTS).map((rs) => ({
        name: rs.name,
        full: rs.full,
        label: rs.label,
        score: rs.score,
        origin: rs.origin,
      })),
      pe: stock.pe,
      roe: stock.roe,
      mktcap: stock.mktcap,
      de: stock.de,
      revcagr: stock.revcagr,
      fcf: stock.fcf,
    };
  });

  return cache;
}

/** Lookup map keyed by symbol (clients build this once per session). */
export function getSlimIndexBySymbol(): Map<string, SlimStockRow> {
  return new Map(getSlimIndex().map((row) => [row.symbol, row]));
}
