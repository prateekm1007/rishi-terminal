import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scorePorinju(s: Stock): RishiScore {
  const contraryScore = s.pe <= 15 ? 100 : s.pe <= 25 ? 60 : clamp(100 - (s.pe - 25) * 3);
  const mgmtScore = s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const undervalScore = s.price < s.bvps * 2.5 ? 100 : clamp(100 - (s.price / s.bvps - 2.5) * 20);
  const catalystScore = s.revcagr >= 15 ? 80 : s.revcagr >= 10 ? 100 : clamp(s.revcagr * 10);
  const total = contraryScore * 0.30 + mgmtScore * 0.25 + undervalScore * 0.25 + catalystScore * 0.20;
  return { name: 'Porinju', full: 'Porinju Veliyath', label: 'Contrarian Deep Value', score: Math.round(total), origin: 'Bharat', comps: [ { label: 'Contrarian', v: Math.round(contraryScore), wt: 30, detail: `P/E ${s.pe}` }, { label: 'Management', v: Math.round(mgmtScore), wt: 25, detail: `${s.promo}%` }, { label: 'Undervaluation', v: Math.round(undervalScore), wt: 25, detail: `P/B ${(s.price/s.bvps).toFixed(1)}x` }, { label: 'Catalyst', v: Math.round(catalystScore), wt: 20, detail: `Rev ${s.revcagr}%` } ], insight: `P/E ${s.pe} dot Book ${(s.price/s.bvps).toFixed(1)}x. ${total >= 75 ? 'Turnaround candidate' : 'Waiting'}` };
}