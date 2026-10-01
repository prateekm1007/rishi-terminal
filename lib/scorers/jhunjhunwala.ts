import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, fin, safeDiv } from '../utils';

/**
 * Jhunjhunwala — "Conviction Multibagger" (remediation T11).
 *
 * Zero-guards: P/CF divides by operating cash flow and the quality component
 * divides FCF by revenue. On degenerate all-zero records (dead tickers) both
 * previously produced NaN/Infinity that poisoned the consensus. Any missing
 * component now yields a documented `score: null` ("insufficient data");
 * `weightedAverage` ignores null scores.
 */
export function scoreJhunjhunwala(s: Stock): RishiScore {
  const pcf = safeDiv(s.mktcap, s.ocf);
  const revcagr = fin(s.revcagr);
  const epscagr = fin(s.epscagr);
  const opm = fin(s.opm);
  const roce = fin(s.roce);
  const de = fin(s.de);
  const promo = fin(s.promo);
  const fcfM = safeDiv(s.fcf, s.rev);

  const pcfS = pcf === null ? null
    : pcf >= 25 && pcf <= 35 ? 100 : pcf < 25 ? clamp(100 - (25 - pcf) * 2) : clamp(100 - (pcf - 35) * 3);
  const gS = (revcagr === null || epscagr === null || opm === null) ? null
    : clamp(Math.min(40, revcagr * 4) + Math.min(40, epscagr * 2.67) + Math.min(20, opm * 1.14));
  const qS = (roce === null || de === null || fcfM === null) ? null
    : clamp(Math.min(40, roce * 2.67) + Math.min(40, de <= 0.5 ? 40 : Math.max(0, 40 - de * 80)) + Math.min(20, fcfM * 2.5));
  const cvS = promo === null ? null : clamp(promo >= 45 ? 100 : promo * 2.22);

  const parts = [pcfS, gS, qS, cvS];
  const insufficient = parts.some(p => p === null);
  const total = insufficient
    ? null
    : pcfS! * 0.25 + gS! * 0.25 + qS! * 0.20 + cvS! * 0.20 + 50 * 0.10;

  return {
    name: 'Jhunjhunwala', full: 'Rakesh Jhunjhunwala', label: 'Conviction Multibagger',
    score: total === null ? null : Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'P/CF Ratio', v: pcfS === null ? 0 : Math.round(pcfS), wt: 25, detail: pcf === null ? 'insufficient data (OCF is 0)' : `${pcf.toFixed(1)}x (ideal 25-35x)` },
      { label: 'Growth Composite', v: gS === null ? 0 : Math.round(gS), wt: 25, detail: `Rev ${s.revcagr}% EPS ${s.epscagr}% OPM ${s.opm}%` },
      { label: 'Quality ROCE/Debt/FCF', v: qS === null ? 0 : Math.round(qS), wt: 20, detail: `ROCE ${s.roce}% D/E ${s.de} FCF ${fcfM === null ? 'n/a' : fcfM.toFixed(1) + '%'}` },
      { label: 'Promoter Conviction', v: cvS === null ? 0 : Math.round(cvS), wt: 20, detail: `${s.promo}% holding target >45%` },
    ],
    insight: insufficient
      ? 'Insufficient data — core fundamentals missing or zero, no Jhunjhunwala verdict.'
      : `P/CF ${pcf!.toFixed(1)}x · ${s.revcagr}% rev CAGR · ${s.promo}% promoter. ${total! >= 75 ? 'High multibagger probability.' : 'Below conviction threshold.'}`
  };
}
