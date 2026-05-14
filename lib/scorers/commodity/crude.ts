import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreCrudeRishi(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const symbol = c.symbol.toUpperCase();
  const name = c.name.toLowerCase();
  const category = c.category.toLowerCase();

  const isEnergy =
    category.includes('energy') ||
    symbol.includes('CRUDE') ||
    symbol.includes('OIL') ||
    symbol.includes('BRENT') ||
    symbol.includes('WTI') ||
    name.includes('crude') ||
    name.includes('oil') ||
    name.includes('gas');

  const energyRelevanceS = isEnergy ? 95 : 52;
  const demandMomentumS = c.changePct >= 0 ? clamp(60 + c.changePct * 9) : clamp(55 + c.changePct * 7);
  const priceRegimeS = c.price >= 70 && c.price <= 95 ? 90 : c.price >= 55 && c.price <= 110 ? 70 : 45;
  const supplyRiskS = isEnergy ? clamp(72 + Math.abs(c.changePct) * 4) : 45;
  const trendS = rangePos > 70 ? 92 : rangePos > 50 ? 74 : rangePos > 30 ? 52 : 32;

  const total =
    energyRelevanceS * 0.25 +
    demandMomentumS * 0.25 +
    priceRegimeS * 0.20 +
    supplyRiskS * 0.15 +
    trendS * 0.15;

  return {
    name: 'Crude Rishi',
    full: 'Crude Oil Cycle Sage',
    label: 'Energy Supply-Demand Cycle',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Energy Relevance', v: Math.round(energyRelevanceS), wt: 25, detail: isEnergy ? 'Direct energy commodity' : `${c.category} commodity` },
      { label: 'Demand Momentum', v: Math.round(demandMomentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% daily move` },
      { label: 'Price Regime', v: Math.round(priceRegimeS), wt: 20, detail: `${c.price}${c.unit}` },
      { label: 'Supply Risk Premium', v: Math.round(supplyRiskS), wt: 15, detail: isEnergy ? 'Energy markets price geopolitical and supply risk' : 'Lower direct supply-risk sensitivity' },
      { label: 'Trend Position', v: Math.round(trendS), wt: 15, detail: `${rangePos.toFixed(0)}% of 52W range` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Strong energy-cycle signal with favorable supply-demand tension.' : total >= 55 ? 'Moderate energy setup; position sizing matters.' : 'Weak crude-style setup; wait for stronger demand or supply shock.'}`
  };
}