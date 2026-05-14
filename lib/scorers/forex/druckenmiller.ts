import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreDruckenmiller(c: CommodityData): RishiScore {
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  const momentumS = clamp(50 + c.changePct * 10);
  const asymmetryS = c.changePct > 1 && rangePos > 50 ? 100 : c.changePct > 0 ? 65 : clamp(50 + c.changePct * 10);
  const riskRewardS = rangePos > 60 && c.changePct > 0 ? 100 : rangePos > 40 ? 60 : 30;
  const total = momentumS * 0.30 + asymmetryS * 0.30 + riskRewardS * 0.25 + rangePosS * 0.15;
  return {
    name: 'Druckenmiller',
    full: 'Stanley Druckenmiller',
    label: 'Top-Down Macro + Timing',
    score: Math.round(total),
    origin: 'Forex/Macro',
    comps: [
      { label: 'Macro Momentum', v: Math.round(momentumS), wt: 30, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: 'Asymmetric Setup', v: Math.round(asymmetryS), wt: 30, detail: c.changePct > 1 ? 'High conviction setup' : 'Moderate setup' },
      { label: 'Risk/Reward', v: Math.round(riskRewardS), wt: 25, detail: `${rangePos.toFixed(0)}% range position` },
      { label: 'Cycle Position', v: Math.round(rangePosS), wt: 15, detail: `52W: ${c.low52w} - ${c.high52w}` },
    ],
    insight: `${c.name} at ${c.price}${c.unit} - ${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%. ${total >= 75 ? 'High conviction setup - size up the position.' : total >= 55 ? 'Moderate opportunity - half position.' : 'Unfavorable risk/reward - stay flat.'}`
  };
}