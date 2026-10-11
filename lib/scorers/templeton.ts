import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * John Templeton — Maximum Pessimism. P0-2 (founder audit 2026-10-11):
 * a required pillar input that was never observed (null / seed
 * placeholder zero / non-positive P/E) yields `score: null` — no
 * verdict. Observed-data arithmetic unchanged (W4).
 */
export function scoreJohnTempleton(s: Stock, ctx?: ScoringContext): RishiScore {
  const peUnknown = inputMissing(s, ctx, 'pe');
  const bvpsUnknown = inputMissing(s, ctx, 'bvps');
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const insufficient = peUnknown || bvpsUnknown || mktcapUnknown;

  const pessimismScore = peUnknown ? null : s.pe! <= 10 ? 100 : s.pe! <= 15 ? 80 : s.pe! <= 20 ? 60 : clamp(100 - (s.pe! - 20) * 5);
  const discountScore = bvpsUnknown ? null : s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.5 ? 80 : clamp(100 - (s.price / s.bvps - 1.5) * 40);
  const globalScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('pharma') ? 100 : 70;
  const contrarianScore = mktcapUnknown ? null : s.mktcap <= 100000 ? 100 : s.mktcap <= 500000 ? 80 : clamp(100 - (s.mktcap - 500000) / 50000);
  const total = insufficient
    ? null
    : pessimismScore! * 0.35 + discountScore! * 0.30 + globalScore * 0.20 + contrarianScore! * 0.15;
  return { name: 'John Templeton', full: 'John Templeton', label: 'Maximum Pessimism',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Maximum Pessimism', v: pessimismScore === null ? 0 : pessimismScore, wt: 35, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe}` },
      { label: 'Discount to Book', v: discountScore === null ? 0 : discountScore, wt: 30, detail: bvpsUnknown ? insuffDetail('book value') : `P/B ${(s.price / s.bvps).toFixed(1)}x` },
      { label: 'Quality', v: globalScore, wt: 20, detail: `${s.sector}` },
      { label: 'Contrarian', v: contrarianScore === null ? 0 : contrarianScore, wt: 15, detail: mktcapUnknown ? insuffDetail('market cap') : `Mktcap Rs${Math.round(s.mktcap / 1000)}K` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Maximum Pessimism pillars (P/E / book value / size), no Templeton verdict.'
      : `P/E ${s.pe} dot P/B ${(s.price / s.bvps).toFixed(1)}x. ${total! >= 75 ? 'Maximum pessimism' : 'Not pessimistic'}` };
}
