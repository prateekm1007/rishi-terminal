import type { Bond } from '../../../data/bonds';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreBuffettBond(bond: Bond): RishiScore {
  // 1. Yield vs Risk-Free Rate (US Treasuries baseline ~4.5%)
  const baselineYield = 4.5;
  const yieldPremium = bond.ytm - baselineYield;
  const yieldS = clamp(30 + yieldPremium * 10); // Each 1% premium = +10 points

  // 2. Duration Risk (shorter = safer, Buffett prefers short-medium)
  const durationS = bond.duration <= 3 ? 100 : bond.duration <= 7 ? 80 : bond.duration <= 10 ? 60 : 40;

  // 3. Credit Quality (Sovereign > Investment Grade > High Yield)
  let creditS = 50;
  if (bond.type === 'G-Sec' || bond.type === 'US-Treasury') creditS = 95;
  else if (bond.rating === 'AAA') creditS = 90;
  else if (bond.rating === 'AA+') creditS = 80;
  else if (bond.rating === 'AA') creditS = 70;
  else creditS = 50;

  // 4. Price to Par (below 100 = discount = value)
  const priceToParS = clamp(200 - bond.price * 2); // 98 = 100, 100 = 0

  // 5. Maturity Ladder Appeal (Buffett likes intermediate bonds)
  let maturityS = 50;
  if (bond.maturityYears >= 5 && bond.maturityYears <= 10) maturityS = 90;
  else if (bond.maturityYears >= 3 && bond.maturityYears <= 15) maturityS = 75;
  else maturityS = 50;

  const total = yieldS * 0.25 + durationS * 0.25 + creditS * 0.25 + priceToParS * 0.15 + maturityS * 0.10;

  return {
    name: 'Buffett',
    full: 'Warren Buffett',
    label: 'Bond Value',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Yield Premium', v: Math.round(yieldS), wt: 25, detail: `YTM ${bond.ytm}% vs baseline ${baselineYield}%` },
      { label: 'Duration Risk', v: Math.round(durationS), wt: 25, detail: `Duration ${bond.duration} years` },
      { label: 'Credit Quality', v: Math.round(creditS), wt: 25, detail: `Rating ${bond.rating} (${bond.type})` },
      { label: 'Price Discount', v: Math.round(priceToParS), wt: 15, detail: `Price ${bond.price} (par 100)` },
      { label: 'Maturity Appeal', v: Math.round(maturityS), wt: 10, detail: `Maturity ${bond.maturityYears}Y` },
    ],
    insight: `${bond.name} offers ${bond.ytm}% yield with ${bond.rating} credit. ${total >= 75 ? 'Strong value opportunity.' : total >= 55 ? 'Moderate yield for risk.' : 'Limited margin of safety.'}`,
  };
}