import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreNemish(s: Stock): RishiScore {
  const consistencyScore = s.epscagr >= 12 ? 100 : clamp(s.epscagr * 8.33);
  const debtScore = s.de <= 0.3 ? 100 : s.de <= 0.6 ? 80 : clamp(100 - s.de * 100);
  const mgmtScore = s.promo >= 35 ? 100 : clamp(s.promo * 2.86);
  const valueScore = s.pe <= 25 ? 100 : s.pe <= 35 ? 70 : clamp(100 - (s.pe - 35) * 3);
  const total = consistencyScore * 0.35 + debtScore * 0.30 + mgmtScore * 0.20 + valueScore * 0.15;
  return { name: 'Nemish', full: 'Nemish Shah', label: 'Steady Compounder', score: Math.round(total), origin: 'Bharat', comps: [ { label: 'EPS Consistency', v: Math.round(consistencyScore), wt: 35, detail: `${s.epscagr}%` }, { label: 'Debt Free', v: Math.round(debtScore), wt: 30, detail: `D/E ${s.de}` }, { label: 'Management', v: Math.round(mgmtScore), wt: 20, detail: `${s.promo}%` }, { label: 'Valuation', v: Math.round(valueScore), wt: 15, detail: `P/E ${s.pe}` } ], insight: `Boring steady. EPS ${s.epscagr}% dot Debt ${s.de} dot P/E ${s.pe}. ${total >= 75 ? 'Long term hold' : 'Not ready'}` };
}