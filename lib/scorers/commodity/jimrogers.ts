import { CommodityData } from '../../../data/markets';
import { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreJimRogers(c: CommodityData): RishiScore {
  // Jim Rogers - Commodities Supercycle + Inflation Hedge Framework
  // 1. Distance from 52W high (closer = stronger bull market)
  const distFromHigh = ((c.high52w - c.price) / c.high52w) * 100;
  const highProxS = clamp(100 - distFromHigh * 2);

  // 2. Momentum (positive change = bull cycle)
  const momentumS = clamp(50 + c.changePct * 10);

  // 3. Range position (higher in 52W range = supercycle phase)
  const range52w = c.high52w - c.low52w;
  const rangePos = range52w > 0 ? ((c.price - c.low52w) / range52w) * 100 : 50;
  const rangePosS = clamp(rangePos);

  // 4. Absolute price strength (commodity-specific targets)
  let priceStrengthS = 50;
  if (c.symbol === 'GOLD') priceStrengthS = clamp(c.price >= 2500 ? 100 : (c.price / 2500) * 100);
  else if (c.symbol === 'SILVER') priceStrengthS = clamp(c.price >= 30 ? 100 : (c.price / 30) * 100);
  else if (c.symbol === 'WTI') priceStrengthS = clamp(c.price >= 75 ? 100 : (c.price / 75) * 100);
  else priceStrengthS = rangePosS; // fallback

  const total = highProxS * 0.30 + momentumS * 0.25 + rangePosS * 0.25 + priceStrengthS * 0.20;

  return {
    name: 'Jim Rogers',
    full: 'Jim Rogers',
    label: 'Commodities Supercycle',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Bull Market Proximity', v: Math.round(highProxS), wt: 30, detail: `${distFromHigh.toFixed(1)}% from 52W high` },
      { label: 'Momentum Signal', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% change` },
      { label: 'Supercycle Position', v: Math.round(rangePosS), wt: 25, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Price Strength', v: Math.round(priceStrengthS), wt: 20, detail: `${c.symbol} at ${c.price}${c.unit}` },
    ],
    insight: `${c.name} at ${c.price}${c.unit} · ${c.changePct >= 0 ? 'Rising' : 'Falling'} ${Math.abs(c.changePct).toFixed(2)}%. ${total >= 70 ? 'Strong supercycle signal — accumulate physical assets.' : total >= 50 ? 'Moderate commodity strength — watch for breakout.' : 'Weak cycle phase — patience required.'}`
  };
}