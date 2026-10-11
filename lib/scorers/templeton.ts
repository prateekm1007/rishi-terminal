import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { licenseRefusal, SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreJohnTempleton(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "John Templeton");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["John Templeton"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["John Templeton"], p02Missing);
  // P0-8 (founder directive 2026-10-11): the price-license gate — the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
  const p08Refusal = licenseRefusal("John Templeton");
  if (p08Refusal) return p08Refusal;
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const pessimismScore = s.pe <= 10 ? 100 : s.pe <= 15 ? 80 : s.pe <= 20 ? 60 : clamp(100 - (s.pe - 20) * 5);
  const discountScore = s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.5 ? 80 : clamp(100 - (s.price / s.bvps - 1.5) * 40);
  const globalScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('pharma') ? 100 : 70;
  const contrarianScore = s.mktcap <= 100000 ? 100 : s.mktcap <= 500000 ? 80 : clamp(100 - (s.mktcap - 500000) / 50000);
  const total = pessimismScore * 0.35 + discountScore * 0.30 + globalScore * 0.20 + contrarianScore * 0.15;
  return { name: 'John Templeton', full: 'John Templeton', label: 'Maximum Pessimism', score: Math.round(total), scoreRaw: total, origin: 'Global', comps: [ { label: 'Maximum Pessimism', v: pessimismScore, wt: 35, detail: `P/E ${s.pe}` }, { label: 'Discount to Book', v: discountScore, wt: 30, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Quality', v: globalScore, wt: 20, detail: `${s.sector}` }, { label: 'Contrarian', v: contrarianScore, wt: 15, detail: `Mktcap Rs${Math.round(s.mktcap/1000)}K` } ], insight: `P/E ${s.pe} dot P/B ${(s.price/s.bvps).toFixed(1)}x. ${total >= 75 ? 'Maximum pessimism' : 'Not pessimistic'}` };
}