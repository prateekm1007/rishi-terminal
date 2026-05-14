import type { Bond } from '../../../data/bonds';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreLynchBond(bond: Bond): RishiScore {
  // Lynch: Look for underappreciated opportunities, growth potential
  
  // 1. Yield Attractiveness (Simple: higher yield = better opportunity)
  const yieldS = clamp(50 + bond.ytm * 8);

  // 2. Price Momentum (Below par = recovery potential)
  const priceS = bond.price < 100 ? 90 : bond.price === 100 ? 60 : 30;

  // 3. Issuer Quality for Corporate (Company strength)
  let issuerS = 60;
  if (bond.issuer.includes('HDFC') || bond.issuer.includes('Infosys')) issuerS = 95;
  else if (bond.issuer.includes('Reliance')) issuerS = 85;
  else if (bond.type === 'G-Sec') issuerS = 100;
  else issuerS = 60;

  // 4. Coupon Coverage (Can issuer pay? Use YTM proxy)
  const couponCoverageS = bond.coupon > 0 ? clamp(50 + (bond.coupon / bond.ytm) * 30) : 80;

  // 5. Time Horizon (5-10Y sweet spot for growth bonds)
  const horizonS = bond.maturityYears >= 5 && bond.maturityYears <= 10 ? 100 : 70;

  const total = yieldS * 0.25 + priceS * 0.20 + issuerS * 0.25 + couponCoverageS * 0.15 + horizonS * 0.15;

  return {
    name: 'Lynch',
    full: 'Peter Lynch',
    label: 'Opportunity Hunter',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Yield Attractiveness', v: Math.round(yieldS), wt: 25, detail: `YTM ${bond.ytm}%` },
      { label: 'Price Opportunity', v: Math.round(priceS), wt: 20, detail: `Trading at ${bond.price}` },
      { label: 'Issuer Quality', v: Math.round(issuerS), wt: 25, detail: `${bond.issuer}` },
      { label: 'Coupon Coverage', v: Math.round(couponCoverageS), wt: 15, detail: `Coupon ${bond.coupon}%` },
      { label: 'Time Horizon', v: Math.round(horizonS), wt: 15, detail: `Maturity ${bond.maturityYears}Y` },
    ],
    insight: `${bond.name} presents a ${total >= 75 ? 'compelling' : total >= 55 ? 'decent' : 'limited'} opportunity at current yields.`,
  };
}