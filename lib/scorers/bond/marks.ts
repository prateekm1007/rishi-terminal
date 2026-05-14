import type { Bond } from '../../../data/bonds';
import type { RishiScore } from '../../types';

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function scoreMarksBond(bond: Bond): RishiScore {
  // Marks: Risk assessment, second-level thinking, opportunity cost
  
  // 1. Risk vs Reward (Spread = compensation for risk)
  const riskRewardS = clamp(40 + bond.spread / 2); // Higher spread = better compensation

  // 2. Credit Cycle Position (What's the likelihood of defaults?)
  let creditCycleS = 70;
  if (bond.type === 'G-Sec') creditCycleS = 95; // Sovereign immune to cycle
  else if (bond.type === 'US-Treasury') creditCycleS = 95;
  else if (bond.type === 'Corporate') creditCycleS = bond.rating === 'AAA' ? 85 : 65;

  // 3. Yield Adequacy (Is yield enough for risk taken?)
  const adequacyS = bond.ytm > 7.0 ? 90 : bond.ytm > 6.5 ? 75 : bond.ytm > 5.5 ? 60 : 40;

  // 4. Duration Positioning (Interest rate risk)
  const durationRiskS = bond.duration <= 5 ? 85 : bond.duration <= 10 ? 70 : 50;

  // 5. Opportunity Cost (vs alternatives)
  // Higher yield vs peers = lower opportunity cost
  const opportunityS = bond.ytm >= 7.5 ? 90 : bond.ytm >= 6.5 ? 75 : 55;

  const total = riskRewardS * 0.25 + creditCycleS * 0.25 + adequacyS * 0.20 + durationRiskS * 0.15 + opportunityS * 0.15;

  return {
    name: 'Marks',
    full: 'Howard Marks',
    label: 'Risk Intelligence',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Risk vs Reward', v: Math.round(riskRewardS), wt: 25, detail: `Spread ${bond.spread}bps` },
      { label: 'Credit Cycle', v: Math.round(creditCycleS), wt: 25, detail: `${bond.rating} in ${bond.type}` },
      { label: 'Yield Adequacy', v: Math.round(adequacyS), wt: 20, detail: `YTM ${bond.ytm}%` },
      { label: 'Duration Risk', v: Math.round(durationRiskS), wt: 15, detail: `Duration ${bond.duration}Y` },
      { label: 'Opportunity Cost', v: Math.round(opportunityS), wt: 15, detail: `vs peers` },
    ],
    insight: `Marks evaluates ${bond.name}: ${total >= 80 ? 'Compelling risk-adjusted returns.' : total >= 60 ? 'Adequate compensation for risk.' : 'Insufficient yield for risk profile.'}`,
  };
}