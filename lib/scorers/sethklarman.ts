import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreSethKlarman(s: Stock): RishiScore {
  const downsideScore = s.de <= 0.5 && s.fcf > 0 ? 100 : s.de > 2 || s.fcf <= 0 ? 20 : clamp(50 + (s.de <= 1 ? 25 : 0) + (s.fcf > 0 ? 25 : 0));
  const asymmetricScore = s.pe <= 15 && s.price <= s.bvps * 1.5 ? 100 : s.pe > 40 || s.price > s.bvps * 3 ? 20 : clamp(50 + (s.pe <= 25 ? 25 : 0) + (s.price <= s.bvps * 2 ? 25 : 0));
  const marginScore = s.opm >= 20 ? 100 : clamp(s.opm * 5);
  const catalystScore = s.revcagr >= 12 ? 100 : clamp(s.revcagr * 8.33);
  const total = downsideScore * 0.40 + asymmetricScore * 0.30 + marginScore * 0.15 + catalystScore * 0.15;
  return { name: 'Seth Klarman', full: 'Seth Klarman', label: 'Asymmetric Safety', score: Math.round(total), origin: 'Global', comps: [ { label: 'Downside Protection', v: Math.round(downsideScore), wt: 40, detail: `Debt ${s.de}` }, { label: 'Asymmetric', v: Math.round(asymmetricScore), wt: 30, detail: `P/E ${s.pe}` }, { label: 'Margin Safety', v: Math.round(marginScore), wt: 15, detail: `OPM ${s.opm}%` }, { label: 'Catalyst', v: Math.round(catalystScore), wt: 15, detail: `Growth ${s.revcagr}%` } ], insight: `Conservative value. ${total >= 75 ? 'Margin excellent' : 'Risk present'}` };
}