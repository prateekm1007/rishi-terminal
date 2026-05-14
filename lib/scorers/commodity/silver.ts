import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreSilverRishi(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const symbol = c.symbol.toUpperCase();
  const name = c.name.toLowerCase();
  const category = c.category.toLowerCase();

  const isSilver = symbol.includes('SILVER') || name.includes('silver');
  const isMetal = category.includes('metal') || isSilver;

  const industrialDemandS = isSilver ? 92 : isMetal ? 78 : 58;
  const monetaryBetaS = isSilver ? 88 : category.includes('precious') ? 72 : 50;
  const momentumS = clamp(50 + c.changePct * 11);
  const rangeBreakoutS = rangePos > 80 ? 95 : rangePos > 60 ? 78 : rangePos > 40 ? 58 : 38;
  const volatilityOpportunityS = clamp(58 + Math.abs(c.changePct) * 5);

  const total =
    industrialDemandS * 0.25 +
    monetaryBetaS * 0.20 +
    momentumS * 0.25 +
    rangeBreakoutS * 0.20 +
    volatilityOpportunityS * 0.10;

  return {
    name: 'Silver Rishi',
    full: 'Silver Dual-Use Sage',
    label: 'Industrial Metal + Monetary Beta',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Industrial Demand', v: Math.round(industrialDemandS), wt: 25, detail: isSilver ? 'Silver has industrial and energy-transition use cases' : `${c.category} exposure` },
      { label: 'Monetary Beta', v: Math.round(monetaryBetaS), wt: 20, detail: isSilver ? 'High beta precious metal' : 'Partial monetary linkage' },
      { label: 'Momentum', v: Math.round(momentumS), wt: 25, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% move` },
      { label: 'Range Breakout', v: Math.round(rangeBreakoutS), wt: 20, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Volatility Edge', v: Math.round(volatilityOpportunityS), wt: 10, detail: `${Math.abs(c.changePct).toFixed(2)}% absolute daily swing` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Strong silver-style breakout and beta signal.' : total >= 55 ? 'Moderate opportunity; watch confirmation from momentum.' : 'Weak setup; silver beta is not being rewarded yet.'}`
  };
}