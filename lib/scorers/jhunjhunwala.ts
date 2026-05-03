import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

export function scoreJhunjhunwala(s: Stock): RishiScore {
  const pcf = s.mktcap / s.ocf;
  const pcfS = pcf >= 25 && pcf <= 35 ? 100 : pcf < 25 ? clamp(100 - (25 - pcf) * 2) : clamp(100 - (pcf - 35) * 3);
  const gS = clamp(Math.min(40, s.revcagr * 4) + Math.min(40, s.epscagr * 2.67) + Math.min(20, s.opm * 1.14));
  const fcfM = (s.fcf / s.rev) * 100;
  const qS = clamp(Math.min(40, s.roce * 2.67) + Math.min(40, s.de <= 0.5 ? 40 : Math.max(0, 40 - s.de * 80)) + Math.min(20, fcfM * 2.5));
  const cvS = clamp(s.promo >= 45 ? 100 : s.promo * 2.22);
  const total = pcfS * 0.25 + gS * 0.25 + qS * 0.20 + cvS * 0.20 + 50 * 0.10;
  return {
    name: 'Jhunjhunwala', full: 'Rakesh Jhunjhunwala', label: 'Conviction Multibagger',
    score: Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'P/CF Ratio', v: Math.round(pcfS), wt: 25, detail: `${pcf.toFixed(1)}x (ideal 25-35x)` },
      { label: 'Growth Composite', v: Math.round(gS), wt: 25, detail: `Rev ${s.revcagr}% EPS ${s.epscagr}% OPM ${s.opm}%` },
      { label: 'Quality ROCE/Debt/FCF', v: Math.round(qS), wt: 20, detail: `ROCE ${s.roce}% D/E ${s.de} FCF ${fcfM.toFixed(1)}%` },
      { label: 'Promoter Conviction', v: Math.round(cvS), wt: 20, detail: `${s.promo}% holding target >45%` },
    ],
    insight: `P/CF ${pcf.toFixed(1)}x · ${s.revcagr}% rev CAGR · ${s.promo}% promoter. ${total >= 75 ? 'High multibagger probability.' : 'Below conviction threshold.'}`
  };
}
