import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreHowardMarks(s: Stock): RishiScore {
  const cycleScore = s.de <= 0.5 && s.pe <= 20 ? 100 : s.de > 2 || s.pe > 50 ? 20 : clamp(50 + (s.de <= 1.5 ? 25 : 0) + (s.pe <= 30 ? 25 : 0));
  const safetyScore = s.fcf > 0 && s.roe > 10 ? 100 : s.fcf > 0 ? 70 : 30;
  const asymmetryScore = (s.price / s.bvps) <= 1.5 ? 100 : (s.price / s.bvps) <= 3 ? 70 : clamp(100 - (s.price / s.bvps - 3) * 20);
  const opportunityScore = s.mktcap >= 100000 && s.mktcap <= 500000 ? 100 : clamp(50 + (s.mktcap >= 50000 ? 25 : 0) + (s.mktcap <= 800000 ? 25 : 0));
  const total = cycleScore * 0.30 + safetyScore * 0.25 + asymmetryScore * 0.25 + opportunityScore * 0.20;
  return { name: 'Howard Marks', full: 'Howard Marks', label: 'Risk Cycle', score: Math.round(total), origin: 'Global', comps: [ { label: 'Cycle Position', v: Math.round(cycleScore), wt: 30, detail: `Debt ${s.de}` }, { label: 'Safety Margin', v: Math.round(safetyScore), wt: 25, detail: `FCF positive` }, { label: 'Asymmetric Payoff', v: Math.round(asymmetryScore), wt: 25, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Market Opp', v: Math.round(opportunityScore), wt: 20, detail: `Mktcap good` } ], insight: `Risk cycle analysis. ${total >= 75 ? 'Heads I win' : 'Unfavorable'}` };
}