import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { SCORER_VERDICT_CONTRACT, noVerdictScore, observed, sectorRefusal, unknownAmong } from './verdictGuards';

export function scoreBasant(input: Stock, ctx?: ScoringContext): RishiScore {
  // P0-3 (founder audit 2026-10-11): THE SECTOR GATE — a lender row is
  // never scored on the metrics its sector does not have (D/E, OPM,
  // FCF, P/NCAV, current ratio); Greenblatt refuses lenders entirely.
  const p03Refusal = sectorRefusal(input, "Basant");
  if (p03Refusal) return p03Refusal;

  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(input, SCORER_VERDICT_CONTRACT["Basant"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Basant"], p02Missing);
  // P0-2b: the guard proved every required field observed — lift the
  // nullable classes to their observed types for the arithmetic below.
  const s = observed(input);

  const consumerScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('retail') ? 100 : 50;
  const trendScore = s.revcagr >= 15 ? 100 : clamp(s.revcagr * 6.67);
  const visibilityScore = s.opm >= 15 ? 100 : clamp(s.opm * 6.67);
  const peScore = s.pe <= 40 ? 100 : s.pe <= 60 ? 70 : clamp(100 - (s.pe - 60) * 2);
  const total = consumerScore * 0.30 + trendScore * 0.25 + visibilityScore * 0.25 + peScore * 0.20;
  return { name: 'Basant', full: 'Basant Maheshwari', label: 'Consumption Growth', score: Math.round(total), scoreRaw: total, origin: 'Bharat', comps: [ { label: 'Consumer Trend', v: consumerScore, wt: 30, detail: `${s.sector}` }, { label: 'Revenue Trend', v: trendScore, wt: 25, detail: `${s.revcagr}%` }, { label: 'Margin Visibility', v: visibilityScore, wt: 25, detail: `OPM ${s.opm}%` }, { label: 'Valuation', v: peScore, wt: 20, detail: `P/E ${s.pe}` } ], insight: `India consumption. Sector ${s.sector} dot Revenue ${s.revcagr}%. ${total >= 75 ? 'Riding wave' : 'Not ready'}` };
}