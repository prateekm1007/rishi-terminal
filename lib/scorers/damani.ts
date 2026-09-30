import { Stock, RishiScore } from '../types';
import { clamp, fin, safeDiv } from '../utils';

/**
 * Damani — "Zero-Debt Fortress" (remediation T11).
 *
 * Zero-guard: the FCF-margin component divides by revenue. On degenerate
 * all-zero records (dead tickers like LAKSHVILAS) rev === 0 previously made
 * fcf/rev = NaN, which propagated through the weighted average and poisoned
 * the whole consensus. Any missing component now yields a documented
 * `score: null` ("insufficient data") instead of a non-finite number;
 * `weightedAverage` ignores null scores.
 */
export function scoreDamani(s: Stock): RishiScore {
  const de = fin(s.de);
  const roce = fin(s.roce);
  const opm = fin(s.opm);
  const fcfM = safeDiv(s.fcf, s.rev);

  const deS = de === null ? null : de <= 0.1 ? 100 : de <= 0.3 ? 70 : clamp(100 - de * 100);
  const roceS = roce === null ? null : clamp(roce >= 25 ? 100 : roce * 4);
  const cfS = fcfM === null ? null : clamp(fcfM >= 10 ? 100 : fcfM * 10);
  const moatS = opm === null ? null : clamp(opm >= 15 ? 100 : opm * 6.67);

  const parts = [deS, roceS, cfS, moatS];
  const insufficient = parts.some(p => p === null);
  const total = insufficient
    ? null
    : deS! * 0.30 + roceS! * 0.25 + cfS! * 0.20 + moatS! * 0.15 + 50 * 0.10;

  return {
    name: 'Damani', full: 'Radhakishan Damani', label: 'Zero-Debt Fortress',
    score: total === null ? null : Math.round(total), origin: 'Bharat',
    comps: [
      { label: 'Zero-Debt Filter', v: deS === null ? 0 : Math.round(deS), wt: 30, detail: de === null ? 'insufficient data' : `D/E ${de.toFixed(2)} target <= 0.1` },
      { label: 'ROCE Sustainability', v: roceS === null ? 0 : Math.round(roceS), wt: 25, detail: roce === null ? 'insufficient data' : `${roce}% target >25%` },
      { label: 'Cash Flow Predictability', v: cfS === null ? 0 : Math.round(cfS), wt: 20, detail: fcfM === null ? 'insufficient data (revenue is 0)' : `FCF margin ${fcfM.toFixed(1)}% target >10%` },
      { label: 'Defensive Moat', v: moatS === null ? 0 : Math.round(moatS), wt: 15, detail: opm === null ? 'insufficient data' : `OPM ${opm}% target >15%` },
    ],
    insight: insufficient
      ? 'Insufficient data — core fundamentals missing or zero, no Damani verdict.'
      : `D/E ${de!.toFixed(2)} · ROCE ${roce}% · FCF margin ${fcfM!.toFixed(1)}%. ${de! <= 0.1 ? 'Passes' : 'Fails'} Damani zero-debt test.`
  };
}
