import type { Bond } from '../../../data/bonds';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreDalioBond(bond: Bond): RishiScore {
  // Dalio: All-Weather portfolio balance, macro positioning
  
  // 1. Macro Cycle Fit (Duration matches economic phase)
  let macroS = 50;
  if (bond.maturityYears <= 3) macroS = 75; // Short bonds = defensive
  else if (bond.maturityYears >= 7 && bond.maturityYears <= 15) macroS = 85; // Medium = balanced
  else if (bond.maturityYears > 15) macroS = 60; // Long = risk-on

  // 2. Diversification Value (Non-correlated to stocks)
  let diversityS = 80; // Bonds always diversify
  if (bond.rating === 'AAA') diversityS = 95; // Sovereign = zero correlation
  else if (bond.rating === 'AA+') diversityS = 85;

  // 3. Real Yield (YTM - inflation proxy)
  const inflationProxy = 5.0; // Expected inflation
  const realYield = bond.ytm - inflationProxy;
  const realYieldS = clamp(50 + realYield * 20);

  // 4. Currency Risk (Local vs foreign)
  const currencyRiskS = bond.country === 'India' ? 90 : 70; // Home bias protection

  // 5. Liquidity & Accessibility (All-Weather needs liquidity)
  let liquidityS = 80;
  if (bond.type === 'G-Sec' || bond.type === 'US-Treasury') liquidityS = 100;
  else if (bond.type === 'Corporate') liquidityS = 70;
  else liquidityS = 60;

  const total = macroS * 0.25 + diversityS * 0.20 + realYieldS * 0.20 + currencyRiskS * 0.15 + liquidityS * 0.20;

  return {
    name: 'Dalio',
    full: 'Ray Dalio',
    label: 'All-Weather Balance',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Macro Cycle Fit', v: Math.round(macroS), wt: 25, detail: `${bond.maturityYears}Y maturity` },
      { label: 'Portfolio Diversification', v: Math.round(diversityS), wt: 20, detail: `${bond.rating} rated` },
      { label: 'Real Yield', v: Math.round(realYieldS), wt: 20, detail: `${realYield.toFixed(2)}% real` },
      { label: 'Currency Safety', v: Math.round(currencyRiskS), wt: 15, detail: `${bond.country}` },
      { label: 'Liquidity Score', v: Math.round(liquidityS), wt: 20, detail: `${bond.type}` },
    ],
    insight: `For all-weather portfolio, ${bond.name} provides ${diversityS >= 90 ? 'excellent' : 'good'} stabilization at ${bond.ytm}% yield.`,
  };
}