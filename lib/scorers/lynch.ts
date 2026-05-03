import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreLynch(s: Stock): RishiScore {
  const peg = s.pe / Math.max(1, s.epscagr);
  const pegS = clamp(peg <= 1 ? 100 : peg <= 1.5 ? 70 : Math.max(0, 100 - (peg - 1) * 50));
  const gS = clamp(s.epscagr >= 15 ? 100 : s.epscagr * 6.67);
  const cfS = s.fcf > 0 ? 100 : 0;
  const stS = clamp(s.revcagr >= 12 ? 100 : s.revcagr * 8.33);
  const total = pegS * 0.30 + gS * 0.25 + cfS * 0.20 + stS * 0.15 + 50 * 0.10;
  return {
    name: 'Lynch', full: 'Peter Lynch', label: 'GARP',
    score: Math.round(total), origin: 'Global',
    comps: [
      { label: 'PEG Ratio', v: Math.round(pegS), wt: 30, detail: `PEG ${peg.toFixed(2)} (P/E ${s.pe} ÷ ${s.epscagr}% growth)` },
      { label: 'EPS Growth Rate', v: Math.round(gS), wt: 25, detail: `${s.epscagr}% CAGR target >15%` },
      { label: 'Free Cash Flow', v: Math.round(cfS), wt: 20, detail: `${Math.round(s.fcf / 1000)}K Cr ${s.fcf > 0 ? 'positive' : 'negative'}` },
      { label: 'Revenue Story', v: Math.round(stS), wt: 15, detail: `${s.revcagr}% revenue growth` },
    ],
    insight: `PEG ${peg.toFixed(2)} · EPS CAGR ${s.epscagr}% · Rev ${s.revcagr}%. ${peg <= 1 ? "Paying below 1x for growth — Lynch sweet spot." : peg <= 1.5 ? "Reasonable GARP." : "Growth not worth the price."}`
  };
}
