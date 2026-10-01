import 'server-only';

// N1 (round 3): the slim index — what client surfaces may receive.
//
// The auditor's finding: the full 944-record seed dataset and the scoring
// engine shipped in the public JS bundle, so any browser could recompute
// every paid per-Rishi verdict (docs/PAID_CONTENT.md: verdicts 6–20 are
// paid). Client components now receive RESULTS, not engines:
//
//   - list/sort surfaces (screener, lab tabs, chat picker) consume this
//     slim index via RSC props — free fields only: the consensus number
//     and category are free for everyone, topBull/topBear summaries are
//     free for everyone, and pe/roe/mktcap/de are the free display and
//     preset-filter fields already shown on every stock page.
//   - per-Rishi verdicts 6..20 are served only by GET /api/rishis/[symbol]
//     (tier-gated, server-enforced).
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
import { TIER_CONFIG } from '@/lib/premium';

/** Free per-Rishi summary (PAID_CONTENT: topBull/topBear are free). */
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
   * The SEEKER-visible per-Rishi verdict slice (PAID_CONTENT: first 5 are
   * free for everyone; 6..20 are paid and served only by the tier-gated
   * GET /api/rishis/[symbol]). Lab analytics aggregate this free slice;
   * paid tiers upgrade per-symbol verdicts through the route.
   */
  freeScores: SlimVerdictScore[];
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

/**
 * Server-generated slim index for all seed symbols. Deterministic
 * (seed + engine are static), so it is computed once per process and
 * passed to client components as RSC props — the 944-row flight payload
 * stays out of the shared client chunks (N1 acceptance greps
 * .next/static for the seed and engine literals and must find none).
 */
export function getSlimIndex(): SlimStockRow[] {
  if (cache) return cache;

  const seekerVisible = TIER_CONFIG.seeker.rishisVisible;
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
      freeScores: report.scores.slice(0, seekerVisible).map((rs) => ({
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
