import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreGeorgeSoros(c: CommodityData): RishiScore {
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  const momentumS = clamp(50 + c.changePct * 12);
  const reflexivityS = c.changePct > 2 ? 100 : c.changePct > 0.5 ? 70 : clamp(50 + c.changePct * 20);
  const trendStrengthS = clamp(rangePosS > 70 ? 100 : rangePosS > 50 ? 70 : rangePosS);
  const total = momentumS * 0.35 + reflexivityS * 0.30 + trendStrengthS * 0.20 + rangePosS * 0.15;
  return {
    name: 'George Soros',
    full: 'George Soros',
    label: 'Reflexivity & Macro',
    score: Math.round(total),
    origin: 'Forex/Macro',
    comps: [
      { label: 'Momentum Signal', v: Math.round(momentumS), wt: 35, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% change` },
      { label: 'Reflexivity Trigger', v: Math.round(reflexivityS), wt: 30, detail: c.changePct > 2 ? 'Strong reflexive trend' : 'Building momentum' },
      { label: 'Trend Strength', v: Math.round(trendStrengthS), wt: 20, detail: `Range position ${rangePos.toFixed(0)}%` },
      { label: 'Macro Position', v: Math.round(rangePosS), wt: 15, detail: `52W: ${c.low52w} - ${c.high52w}` },
    ],
    insight: `${c.name} at ${c.price}${c.unit} · ${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%. ${total >= 75 ? 'Reflexivity in play — trend accelerating, ride it.' : total >= 55 ? 'Moderate macro signal — position sizing key.' : 'No clear reflexive trend — wait for inflection.'}`
  };
}