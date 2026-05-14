import type { Bond } from '../../../data/bonds';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreGrahamBond(bond: Bond): RishiScore {
  // Graham: Safety margin, conservative
  
  // 1. Safety Margin (Yield above risk-free)
  const safetyYield = bond.ytm - 4.0; // 4% risk-free baseline
  const safetyS = clamp(50 + safetyYield * 15); // Higher yield = more safety margin

  // 2. Credit Rating Strength (AAA is ideal)
  let ratingS = 0;
  if (bond.rating === 'AAA') ratingS = 100;
  else if (bond.rating === 'AA+') ratingS = 85;
  else if (bond.rating === 'AA') ratingS = 70;
  else if (bond.rating.startsWith('A')) ratingS = 50;
  else ratingS = 25;

  // 3. Discount to Par (Safety margin via price)
  const discountS = bond.price < 100 ? clamp(20 + (100 - bond.price) * 10) : 40;

  // 4. Default Risk (Spread penalty)
  const defaultRiskS = clamp(100 - bond.spread * 2); // Higher spread = more risk

  // 5. Time to Maturity (Shorter = less default risk)
  const timeS = bond.maturityYears <= 3 ? 90 : bond.maturityYears <= 7 ? 75 : bond.maturityYears <= 15 ? 60 : 40;

  const total = safetyS * 0.25 + ratingS * 0.30 + discountS * 0.15 + defaultRiskS * 0.15 + timeS * 0.15;

  return {
    name: 'Graham',
    full: 'Benjamin Graham',
    label: 'Safety Margin',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Safety Yield Margin', v: Math.round(safetyS), wt: 25, detail: `${safetyYield.toFixed(2)}% above risk-free` },
      { label: 'Credit Rating', v: Math.round(ratingS), wt: 30, detail: `${bond.rating}` },
      { label: 'Price Discount', v: Math.round(discountS), wt: 15, detail: `${bond.price} vs par 100` },
      { label: 'Default Risk', v: Math.round(defaultRiskS), wt: 15, detail: `Spread ${bond.spread}bps` },
      { label: 'Time to Maturity', v: Math.round(timeS), wt: 15, detail: `${bond.maturityYears}Y` },
    ],
    insight: `Graham sees ${bond.rating}-rated ${bond.name}. ${total >= 80 ? 'Excellent margin of safety.' : total >= 60 ? 'Adequate safety with good yield.' : 'Limited margin of safety.'}`,
  };
}