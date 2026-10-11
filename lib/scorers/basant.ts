import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Basant Maheshwari — Consumption Growth. P0-2 (founder audit
 * 2026-10-11): a required pillar input that was never observed (null /
 * seed placeholder zero / non-positive P/E) yields `score: null` — no
 * verdict. Observed-data arithmetic unchanged (W4).
 */
export function scoreBasant(s: Stock, ctx?: ScoringContext): RishiScore {
  const revcagrUnknown = inputMissing(s, ctx, 'revcagr');
  const opmUnknown = inputMissing(s, ctx, 'opm');
  const peUnknown = inputMissing(s, ctx, 'pe');
  const insufficient = revcagrUnknown || opmUnknown || peUnknown;

  const consumerScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('retail') ? 100 : 50;
  const trendScore = revcagrUnknown ? null : s.revcagr >= 15 ? 100 : clamp(s.revcagr * 6.67);
  const visibilityScore = opmUnknown ? null : s.opm! >= 15 ? 100 : clamp(s.opm! * 6.67);
  const peScore = peUnknown ? null : s.pe! <= 40 ? 100 : s.pe! <= 60 ? 70 : clamp(100 - (s.pe! - 60) * 2);
  const total = insufficient
    ? null
    : consumerScore * 0.30 + trendScore! * 0.25 + visibilityScore! * 0.25 + peScore! * 0.20;
  return { name: 'Basant', full: 'Basant Maheshwari', label: 'Consumption Growth',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Consumer Trend', v: consumerScore, wt: 30, detail: `${s.sector}` },
      { label: 'Revenue Trend', v: trendScore === null ? 0 : trendScore, wt: 25, detail: revcagrUnknown ? insuffDetail('revenue growth') : `${s.revcagr}%` },
      { label: 'Margin Visibility', v: visibilityScore === null ? 0 : visibilityScore, wt: 25, detail: opmUnknown ? insuffDetail('operating margin (OPM)') : `OPM ${s.opm}%` },
      { label: 'Valuation', v: peScore === null ? 0 : peScore, wt: 20, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe}` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Consumption Growth pillars (revenue growth / margin / valuation), no Basant verdict.'
      : `India consumption. Sector ${s.sector} dot Revenue ${s.revcagr}%. ${total! >= 75 ? 'Riding wave' : 'Not ready'}` };
}
