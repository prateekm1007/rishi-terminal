import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreMunger(s: Stock): RishiScore {
  const circleS = s.roce >= 25 && s.de <= 0.5 ? 100 : clamp((s.roce * 2) + (s.de <= 0.5 ? 50 : 0));
  const inversionS = s.de > 2 || s.fcf < 0 ? 0 : 100;
  const lollaS = clamp(s.roe >= 20 && s.roce >= 20 ? 100 : (s.roe + s.roce) * 2);
  const patienceS = s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const total = circleS * 0.30 + inversionS * 0.25 + lollaS * 0.25 + patienceS * 0.20;
  return {
    name: 'Munger', full: 'Charlie Munger', label: 'Mental Models',
    score: Math.round(total), origin: 'Global',
    comps: [
      { label: 'Circle of Competence', v: Math.round(circleS), wt: 30, detail: `ROCE ${s.roce}% · D/E ${s.de.toFixed(2)}` },
      { label: 'Inversion Check', v: Math.round(inversionS), wt: 25, detail: `${s.de > 2 ? 'FAIL: High debt' : s.fcf < 0 ? 'FAIL: Negative FCF' : 'PASS: No red flags'}` },
      { label: 'Lollapalooza Effect', v: Math.round(lollaS), wt: 25, detail: `ROE ${s.roe}% + ROCE ${s.roce}% convergence` },
      { label: 'Patience Filter', v: Math.round(patienceS), wt: 20, detail: `Promoter ${s.promo}% commitment` },
    ],
    insight: `ROCE ${s.roce}% · ROE ${s.roe}% · D/E ${s.de.toFixed(2)}. ${inversionS === 0 ? 'Munger would avoid — fails inversion test.' : total >= 75 ? 'Wonderful business to own forever.' : 'Too complex or mediocre.'}`
  };
}
