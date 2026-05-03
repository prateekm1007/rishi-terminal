import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreSilverRishi(c: CommodityData): RishiScore {
  // Industrial Demand + Store of Value Hybrid
  // 1. Gold/Silver Ratio (lower = silver outperforming)
  // Proxy: If silver is above $30, industrial demand is strong
  const industrialDemandS = clamp(c.price >= 30 ? 100 : (c.price / 30) * 100);
  
  // 2. Momentum (silver is more volatile than gold)
  const momentumS = clamp(50 + c.changePct * 8); // Higher volatility weight
  
  // 3. Range position
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  
  // 4. Breakout signal (above $32 = industrial boom)
  const breakoutS = clamp(c.price >= 32 ? 100 : c.price >= 28 ? 70 : (c.price / 28) * 70);
  
  const total = industrialDemandS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + breakoutS * 0.20;
  
  return {
    name: 'Silver Rishi',
    full: 'Industrial Demand Guru',
    label: 'Dual-Purpose Metal',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Industrial Strength', v: Math.round(industrialDemandS), wt: 30, detail: `$${c.price}/oz (target >$30)` },
      { label: 'Momentum Volatility', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: '52W Range Position', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of range` },
      { label: 'Breakout Signal', v: Math.round(breakoutS), wt: 20, detail: c.price >= 32 ? 'Industrial boom' : 'Below breakout' },
    ],
    insight: `Silver at $${c.price}/oz · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong industrial demand.' : total >= 50 ? 'Moderate manufacturing signal.' : 'Weak industrial activity.'}`
  };
}