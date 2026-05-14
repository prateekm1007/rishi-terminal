import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scorePaulTudorJones(c: CommodityData): RishiScore {
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  const technicalS = rangePos > 65 ? 100 : rangePos > 50 ? 75 : rangePos > 35 ? 50 : 25;
  const momentumS = clamp(50 + c.changePct * 12);
  const breakoutS = c.changePct > 2 ? 100 : c.changePct > 0.5 ? 65 : clamp(40 + c.changePct * 15);
  const total = technicalS * 0.35 + momentumS * 0.30 + breakoutS * 0.20 + rangePosS * 0.15;
  return {
    name: 'Paul Tudor Jones',
    full: 'Paul Tudor Jones',
    label: 'Macro + Technical Trader',
    score: Math.round(total),
    origin: 'Forex/Macro',
    comps: [
      { label: 'Technical Setup', v: Math.round(technicalS), wt: 35, detail: `${rangePos.toFixed(0)}% 52W position` },
      { label: 'Price Momentum', v: Math.round(momentumS), wt: 30, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: 'Breakout Signal', v: Math.round(breakoutS), wt: 20, detail: c.changePct > 2 ? 'Breakout confirmed' : 'Pre-breakout' },
      { label: '52W Position', v: Math.round(rangePosS), wt: 15, detail: `${c.low52w} - ${c.high52w}` },
    ],
    insight: `${c.name} at ${c.price}${c.unit} - ${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%. ${total >= 75 ? 'Strong technical breakout - trend trade setup confirmed.' : total >= 55 ? 'Developing setup - wait for momentum confirmation.' : 'No technical edge - stand aside.'}`
  };
}