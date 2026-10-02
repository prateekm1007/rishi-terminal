import 'server-only';

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
export interface SlimVerdictSummary {
  name: string;
  full: string;
  label: string;
  /** null = insufficient data (T11) — rendered as an em dash. */
  score: number | null;
}

/**
 * One stock's free, display-safe fields. Deliberately narrow — see the
 * module header before adding anything.
 */
export interface SlimStockRow {
  symbol: string;
  name: string;
  sector: string;
  /** THE consensus number (free for everyone); null = insufficient data. */
  consensus: number | null;
  category: string;
  dataQuality: 'OK' | 'INCOMPLETE';
  topBull: SlimVerdictSummary | null;
  topBear: SlimVerdictSummary | null;
  /** Council tension summary (free fields, part of SanitizedConsensus). */
  tension: string;
  tensionSpread: number;
  /**
   * A BOUNDED per-Rishi summary slice for LIST payloads (Commit M3 free
   * access: this is a transport budget, NOT an entitlement — the full
   * verdict set is public on every stock page and served by
   * GET /api/rishis/[symbol] to any authenticated caller, which the lab
   * tabs use to upgrade these rows). 936 stocks x every verdict would
   * balloon the screener/lab flight payload (already the M5 perf
   * bottleneck), so the list rows carry the first few and say so.
   */
  summaryScores: SlimVerdictScore[];
  /** Free display / preset-filter fields (shown on every stock page). */
  pe: number;
  roe: number;
  mktcap: number;
  de: number;
  /**
   * Revenue CAGR and free cash flow — free display fields (rendered on
   * every stock page by MetricsPanel) needed by the lab's portfolio
   * style-box and FCF-yield analytics. Not engine-sufficient: verdicts
   * cannot be recomputed from this row.
   */
  revcagr: number;
  fcf: number;
}

/** Free-slice per-Rishi verdict (name/full/label/score/origin only). */
export interface SlimVerdictScore {
  name: string;
  full: string;
  label: string;
  score: number | null;
  origin: 'Global' | 'India' | 'Bharat' | 'Crypto' | 'Commodity' | 'Forex/Macro';
}

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
