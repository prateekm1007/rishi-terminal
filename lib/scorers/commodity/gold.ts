import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreGoldRishi(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const symbol = c.symbol.toUpperCase();
  const name = c.name.toLowerCase();
  const category = c.category.toLowerCase();

  const isGold = symbol.includes('GOLD') || name.includes('gold');
  const isPrecious = category.includes('precious') || isGold;

  const safeHavenS = isGold ? 95 : isPrecious ? 82 : 55;
  const momentumS = clamp(55 + c.changePct * 8);
  const inflationHedgeS = c.changePct >= 0 ? clamp(72 + c.changePct * 5) : clamp(62 + c.changePct * 4);
  const rangeStrengthS = rangePos >= 75 ? 95 : rangePos >= 55 ? 78 : rangePos >= 35 ? 58 : 38;

  const drawdownFromHigh = c.high52w > 0 ? ((c.price - c.high52w) / c.high52w) * 100 : 0;
  const highProximityS = clamp(100 + drawdownFromHigh * 2);

  const total =
    safeHavenS * 0.25 +
    inflationHedgeS * 0.25 +
    rangeStrengthS * 0.20 +
    highProximityS * 0.15 +
    momentumS * 0.15;

  return {
    name: 'Gold Rishi',
    full: 'Gold Safe-Haven Sage',
    label: 'Monetary Metal & Crisis Hedge',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Safe-Haven Quality', v: Math.round(safeHavenS), wt: 25, detail: isGold ? 'Primary monetary metal' : `${c.category} exposure` },
      { label: 'Inflation Hedge', v: Math.round(inflationHedgeS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% move` },
      { label: 'Range Strength', v: Math.round(rangeStrengthS), wt: 20, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'High Proximity', v: Math.round(highProximityS), wt: 15, detail: `${drawdownFromHigh.toFixed(1)}% from 52W high` },
      { label: 'Momentum', v: Math.round(momentumS), wt: 15, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% daily change` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Strong safe-haven and monetary hedge signal.' : total >= 55 ? 'Moderate hedge value, but conviction is not extreme.' : 'Weak gold-style setup; wait for better macro confirmation.'}`
  };
}