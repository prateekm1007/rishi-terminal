import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreDanielYergin(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const symbol = c.symbol.toUpperCase();
  const name = c.name.toLowerCase();
  const category = c.category.toLowerCase();

  const isEnergy =
    category.includes('energy') ||
    symbol.includes('OIL') ||
    symbol.includes('CRUDE') ||
    symbol.includes('BRENT') ||
    symbol.includes('WTI') ||
    name.includes('oil') ||
    name.includes('gas') ||
    name.includes('crude');

  const energySystemS = isEnergy ? 96 : category.includes('metal') ? 68 : 55;
  const supplyDemandS = rangePos > 60 && c.changePct > 0 ? 88 : rangePos > 40 ? 70 : c.changePct > 0 ? 60 : 45;
  const geopoliticalPremiumS = isEnergy ? clamp(72 + Math.abs(c.changePct) * 4) : clamp(55 + Math.abs(c.changePct) * 2);
  const marketBalanceS = rangePos > 25 && rangePos < 80 ? 82 : 52;
  const stabilityS = clamp(100 - Math.abs(c.changePct) * 9);

  const total =
    energySystemS * 0.25 +
    supplyDemandS * 0.25 +
    geopoliticalPremiumS * 0.20 +
    marketBalanceS * 0.15 +
    stabilityS * 0.15;

  return {
    name: 'Daniel Yergin',
    full: 'Daniel Yergin',
    label: 'Energy History & Geopolitics',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Energy System Relevance', v: Math.round(energySystemS), wt: 25, detail: isEnergy ? 'Core energy market' : `${c.category} with indirect macro linkage` },
      { label: 'Supply-Demand Balance', v: Math.round(supplyDemandS), wt: 25, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Geopolitical Premium', v: Math.round(geopoliticalPremiumS), wt: 20, detail: `${Math.abs(c.changePct).toFixed(2)}% volatility signal` },
      { label: 'Market Balance', v: Math.round(marketBalanceS), wt: 15, detail: rangePos > 25 && rangePos < 80 ? 'Balanced but constructive range' : 'Extreme pricing zone' },
      { label: 'Stability', v: Math.round(stabilityS), wt: 15, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% daily move` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Strong geopolitical and supply-demand setup.' : total >= 55 ? 'Balanced macro commodity signal.' : 'Weak setup; market structure is not compelling.'}`
  };
}