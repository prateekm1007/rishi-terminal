import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreJimRogers(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const category = c.category.toLowerCase();

  const isRealAsset =
    category.includes('metal') ||
    category.includes('energy') ||
    category.includes('agri') ||
    category.includes('commodity') ||
    true;

  const cycleValueS = rangePos < 35 ? 88 : rangePos < 60 ? 78 : rangePos < 80 ? 62 : 42;
  const scarcityS = category.includes('precious') ? 86 : category.includes('energy') ? 82 : category.includes('metal') ? 78 : 68;
  const inflationAssetS = isRealAsset ? 82 : 55;
  const momentumConfirmationS = c.changePct >= 0 ? clamp(60 + c.changePct * 7) : clamp(52 + c.changePct * 5);
  const cyclePositionS = clamp(100 - Math.abs(rangePos - 52) * 1.25);

  const total =
    cycleValueS * 0.25 +
    scarcityS * 0.20 +
    inflationAssetS * 0.20 +
    momentumConfirmationS * 0.20 +
    cyclePositionS * 0.15;

  return {
    name: 'Jim Rogers',
    full: 'Jim Rogers',
    label: 'Long Commodity Cycles',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Cycle Value', v: Math.round(cycleValueS), wt: 25, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Scarcity Theme', v: Math.round(scarcityS), wt: 20, detail: `${c.category} supply sensitivity` },
      { label: 'Inflation Asset', v: Math.round(inflationAssetS), wt: 20, detail: 'Real assets benefit from currency debasement cycles' },
      { label: 'Momentum Confirmation', v: Math.round(momentumConfirmationS), wt: 20, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% move` },
      { label: 'Cycle Position', v: Math.round(cyclePositionS), wt: 15, detail: rangePos < 80 ? 'Not fully exhausted' : 'Late-cycle pricing risk' },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Attractive long-cycle commodity setup.' : total >= 55 ? 'Reasonable commodity exposure, but not a screaming bargain.' : 'Cycle risk is high or value is insufficient.'}`
  };
}