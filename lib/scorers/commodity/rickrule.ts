import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreRickRule(c: CommodityData): RishiScore {
  // Rick Rule - Precious Metals + Resource Cycle Expert
  // Focus: Gold/Silver as savings, resource sector cycles

  // 1. Precious metals premium (silver/gold focus)
  let metalPremiumS = 50;
  if (c.symbol === 'GOLD') metalPremiumS = clamp(c.price >= 2600 ? 100 : (c.price / 2600) * 100);
  else if (c.symbol === 'SILVER') metalPremiumS = clamp(c.price >= 32 ? 100 : (c.price / 32) * 100);
  else if (c.symbol === 'PLATINUM') metalPremiumS = clamp(c.price >= 1100 ? 100 : (c.price / 1100) * 100);
  else metalPremiumS = 40; // not a precious metal

  // 2. Momentum (volatile metals need momentum)
  const momentumS = clamp(50 + c.changePct * 8);

  // 3. Range position
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);

  // 4. Breakout potential
  const breakoutS = c.changePct > 3 ? 100 : c.changePct > 1 ? 70 : clamp(50 + c.changePct * 20);

  const total = metalPremiumS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + breakoutS * 0.20;

  return {
    name: 'Rick Rule',
    full: 'Rick Rule',
    label: 'Precious Metals Strategist',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Metal Premium', v: Math.round(metalPremiumS), wt: 30, detail: `${c.symbol} pricing strength` },
      { label: 'Volatility Momentum', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` },
      { label: 'Cycle Position', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Breakout Signal', v: Math.round(breakoutS), wt: 20, detail: c.changePct > 3 ? 'Strong breakout' : 'Building base' },
    ],
    insight: `${c.name} at ${c.price}${c.unit} · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong resource cycle — accumulate physical.' : total >= 50 ? 'Moderate strength — wait for confirmation.' : 'Weak cycle — patience is key.'}`
  };
}