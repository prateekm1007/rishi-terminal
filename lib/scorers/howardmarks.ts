import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Howard Marks — Risk Cycle. P0-2 (founder audit 2026-10-11): a required
 * pillar input that was never observed (null / seed placeholder zero /
 * non-positive P/E) yields `score: null` — no verdict. Observed-data
 * arithmetic unchanged (W4).
 */
export function scoreHowardMarks(s: Stock, ctx?: ScoringContext): RishiScore {
  const deUnknown = inputMissing(s, ctx, 'de');
  const peUnknown = inputMissing(s, ctx, 'pe');
  const fcfUnknown = inputMissing(s, ctx, 'fcf');
  const roeUnknown = inputMissing(s, ctx, 'roe');
  const bvpsUnknown = inputMissing(s, ctx, 'bvps');
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const insufficient = deUnknown || peUnknown || fcfUnknown || roeUnknown || bvpsUnknown || mktcapUnknown;

  const cycleScore = deUnknown || peUnknown
    ? null
    : s.de! <= 0.5 && s.pe! <= 20 ? 100 : s.de! > 2 || s.pe! > 50 ? 20 : clamp(50 + (s.de! <= 1.5 ? 25 : 0) + (s.pe! <= 30 ? 25 : 0));
  const safetyScore = fcfUnknown || roeUnknown
    ? null
    : s.fcf > 0 && s.roe! > 10 ? 100 : s.fcf > 0 ? 70 : 30;
  const asymmetryScore = bvpsUnknown ? null : (s.price / s.bvps) <= 1.5 ? 100 : (s.price / s.bvps) <= 3 ? 70 : clamp(100 - (s.price / s.bvps - 3) * 20);
  const opportunityScore = mktcapUnknown ? null : s.mktcap >= 100000 && s.mktcap <= 500000 ? 100 : clamp(50 + (s.mktcap >= 50000 ? 25 : 0) + (s.mktcap <= 800000 ? 25 : 0));
  const total = insufficient
    ? null
    : cycleScore! * 0.30 + safetyScore! * 0.25 + asymmetryScore! * 0.25 + opportunityScore! * 0.20;
  return { name: 'Howard Marks', full: 'Howard Marks', label: 'Risk Cycle',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Cycle Position', v: cycleScore === null ? 0 : cycleScore, wt: 30, detail: cycleScore === null ? insuffDetail('debt (D/E) / valuation (P/E)') : `Debt ${s.de}` },
      { label: 'Safety Margin', v: safetyScore === null ? 0 : safetyScore, wt: 25, detail: safetyScore === null ? insuffDetail('cash flow / ROE') : `FCF positive` },
      { label: 'Asymmetric Payoff', v: asymmetryScore === null ? 0 : asymmetryScore, wt: 25, detail: asymmetryScore === null ? insuffDetail('book value') : `P/B ${(s.price / s.bvps).toFixed(1)}x` },
      { label: 'Market Opp', v: opportunityScore === null ? 0 : opportunityScore, wt: 20, detail: opportunityScore === null ? insuffDetail('market cap') : `Mktcap good` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Risk Cycle pillars (debt / valuation / cash flow / book value / size), no Howard Marks verdict.'
      : `Risk cycle analysis. ${total! >= 75 ? 'Heads I win' : 'Unfavorable'}` };
}
