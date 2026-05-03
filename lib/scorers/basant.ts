import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreBasant(s: Stock): RishiScore {
  const consumerScore = s.sector.toLowerCase().includes('fmcg') || s.sector.toLowerCase().includes('retail') ? 100 : 50;
  const trendScore = s.revcagr >= 15 ? 100 : clamp(s.revcagr * 6.67);
  const visibilityScore = s.opm >= 15 ? 100 : clamp(s.opm * 6.67);
  const peScore = s.pe <= 40 ? 100 : s.pe <= 60 ? 70 : clamp(100 - (s.pe - 60) * 2);
  const total = consumerScore * 0.30 + trendScore * 0.25 + visibilityScore * 0.25 + peScore * 0.20;
  return { name: 'Basant', full: 'Basant Maheshwari', label: 'Consumption Growth', score: Math.round(total), origin: 'Bharat', comps: [ { label: 'Consumer Trend', v: Math.round(consumerScore), wt: 30, detail: `${s.sector}` }, { label: 'Revenue Trend', v: Math.round(trendScore), wt: 25, detail: `${s.revcagr}%` }, { label: 'Margin Visibility', v: Math.round(visibilityScore), wt: 25, detail: `OPM ${s.opm}%` }, { label: 'Valuation', v: Math.round(peScore), wt: 20, detail: `P/E ${s.pe}` } ], insight: `India consumption. Sector ${s.sector} dot Revenue ${s.revcagr}%. ${total >= 75 ? 'Riding wave' : 'Not ready'}` };
}