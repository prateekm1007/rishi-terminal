import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreGoldRishi(c: CommodityData): RishiScore {
  // Inflation Hedge Scoring
  // 1. Distance from 52W high (closer = stronger inflation fear)
  const distFromHigh = ((c.high52w - c.price) / c.high52w) * 100;
  const highProxS = clamp(100 - distFromHigh * 2); // Penalty for being far from high
  
  // 2. Momentum (positive change = inflation concerns rising)
  const momentumS = clamp(50 + c.changePct * 10); // +5% = 100, -5% = 0
  
  // 3. Range position (higher in 52W range = bull market)
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);
  
  // 4. Absolute price strength (above $2500 = strong)
  const priceStrengthS = clamp(c.price >= 2500 ? 100 : (c.price / 2500) * 100);
  
  const total = highProxS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + priceStrengthS * 0.20;
  
  return {
    name: 'Gold Rishi',
    full: 'Inflation Hedge Guru',
    label: 'Safe Haven Shield',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Inflation Fear Proxy', v: Math.round(highProxS), wt: 30, detail: `${distFromHigh.toFixed(1)}% from 52W high` },
      { label: 'Momentum Signal', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% change` },
      { label: '52W Range Position', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of range` },
      { label: 'Price Strength', v: Math.round(priceStrengthS), wt: 20, detail: `$${c.price}/oz (target >$2500)` },
    ],
    insight: `Gold at $${c.price}/oz · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong inflation hedge signal.' : total >= 50 ? 'Moderate safe-haven demand.' : 'Weak inflation protection.'}`
  };
}