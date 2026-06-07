import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scorePabrai(s: Stock): RishiScore {
  const cloneS = s.promo >= 50 ? 100 : clamp(s.promo * 2);
  const ownerS = s.promo >= 30 ? 100 : clamp(s.promo * 3.33);
  const lowRiskS = s.de <= 0.5 && s.fcf > 0 ? 100 : clamp((s.de <= 0.5 ? 50 : 0) + (s.fcf > 0 ? 50 : 0));
  const uncertainS = s.pe <= 20 ? 100 : clamp(Math.max(0, 100 - (s.pe - 20) * 5));
  const total = cloneS * 0.30 + ownerS * 0.25 + lowRiskS * 0.25 + uncertainS * 0.20;
  return {
    name: 'Pabrai', full: 'Mohnish Pabrai', label: 'Dhandho Cloner',
    score: Math.round(total), origin: 'Global',
    comps: [
      { label: 'Clone Score', v: Math.round(cloneS), wt: 30, detail: `Promoter ${s.promo}% (cloning insiders)` },
      { label: 'Owner Operator', v: Math.round(ownerS), wt: 25, detail: `${s.promo}% skin in game` },
      { label: 'Low Risk', v: Math.round(lowRiskS), wt: 25, detail: `D/E ${s.de.toFixed(2)} · FCF ${s.fcf > 0 ? '+' : '-'}` },
      { label: 'High Uncertainty Discount', v: Math.round(uncertainS), wt: 20, detail: `P/E ${s.pe} target <20` },
    ],
    insight: `Dhandho: ${s.promo}% promoter · D/E ${s.de.toFixed(2)} · P/E ${s.pe}. ${total >= 75 ? 'Heads I win, tails I do not lose much!' : 'Risk/reward not asymmetric enough.'}`
  };
}
