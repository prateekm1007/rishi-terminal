import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { SCORER_VERDICT_CONTRACT, unknownAmong, noVerdictScore } from './verdictGuards';

export function scoreJohnTempleton(s: Stock, ctx?: ScoringContext): RishiScore {
  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(s, SCORER_VERDICT_CONTRACT["John Templeton"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["John Templeton"], p02Missing);

  const pessimismScore = s.pe <= 10 ? 100 : s.pe <= 15 ? 80 : s.pe <= 20 ? 60 : clamp(100 - (s.pe - 20) * 5);
  const discountScore = s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.5 ? 80 : clamp(100 - (s.price / s.bvps - 1.5) * 40);
  const globalScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('pharma') ? 100 : 70;
  const contrarianScore = s.mktcap <= 100000 ? 100 : s.mktcap <= 500000 ? 80 : clamp(100 - (s.mktcap - 500000) / 50000);
  const total = pessimismScore * 0.35 + discountScore * 0.30 + globalScore * 0.20 + contrarianScore * 0.15;
  return { name: 'John Templeton', full: 'John Templeton', label: 'Maximum Pessimism', score: Math.round(total), scoreRaw: total, origin: 'Global', comps: [ { label: 'Maximum Pessimism', v: pessimismScore, wt: 35, detail: `P/E ${s.pe}` }, { label: 'Discount to Book', v: discountScore, wt: 30, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Quality', v: globalScore, wt: 20, detail: `${s.sector}` }, { label: 'Contrarian', v: contrarianScore, wt: 15, detail: `Mktcap Rs${Math.round(s.mktcap/1000)}K` } ], insight: `P/E ${s.pe} dot P/B ${(s.price/s.bvps).toFixed(1)}x. ${total >= 75 ? 'Maximum pessimism' : 'Not pessimistic'}` };
}