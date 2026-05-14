import type { CommodityData } from '../../../data/markets';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function rangePosition(c: CommodityData): number {
  const range = c.high52w - c.low52w;
  return range > 0 ? clamp(((c.price - c.low52w) / range) * 100) : 50;
}

export function scoreRickRule(c: CommodityData): RishiScore {
  const rangePos = rangePosition(c);
  const category = c.category.toLowerCase();
  const name = c.name.toLowerCase();

  const isResource =
    category.includes('metal') ||
    category.includes('energy') ||
    name.includes('gold') ||
    name.includes('silver') ||
    name.includes('copper') ||
    name.includes('oil') ||
    name.includes('uranium');

  const contrarianValueS = rangePos < 30 ? 95 : rangePos < 55 ? 82 : rangePos < 75 ? 58 : 34;
  const resourceOptionalityS = isResource ? 88 : 62;
  const momentumConfirmationS = c.changePct > 0 ? clamp(62 + c.changePct * 9) : clamp(48 + c.changePct * 6);
  const riskDisciplineS = rangePos > 85 ? 35 : rangePos < 15 ? 58 : 82;
  const scarcityUpsideS = category.includes('precious') ? 88 : category.includes('energy') ? 78 : category.includes('metal') ? 80 : 65;

  const total =
    contrarianValueS * 0.30 +
    resourceOptionalityS * 0.20 +
    momentumConfirmationS * 0.20 +
    riskDisciplineS * 0.15 +
    scarcityUpsideS * 0.15;

  return {
    name: 'Rick Rule',
    full: 'Rick Rule',
    label: 'Resource Contrarian',
    score: Math.round(total),
    origin: 'Commodity',
    comps: [
      { label: 'Contrarian Value', v: Math.round(contrarianValueS), wt: 30, detail: `${rangePos.toFixed(0)}% of 52W range` },
      { label: 'Resource Optionality', v: Math.round(resourceOptionalityS), wt: 20, detail: isResource ? 'Resource market optionality present' : `${c.category} exposure` },
      { label: 'Momentum Confirmation', v: Math.round(momentumConfirmationS), wt: 20, detail: `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}% move` },
      { label: 'Risk Discipline', v: Math.round(riskDisciplineS), wt: 15, detail: rangePos > 85 ? 'Chasing risk elevated' : 'Risk/reward acceptable' },
      { label: 'Scarcity Upside', v: Math.round(scarcityUpsideS), wt: 15, detail: `${c.category} scarcity profile` },
    ],
    insight: `${c.name} at ${c.price}${c.unit}. ${total >= 75 ? 'Attractive resource contrarian setup.' : total >= 55 ? 'Reasonable opportunity, but insist on discipline.' : 'Not enough value or optionality for a Rick Rule-style bet.'}`
  };
}