import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, safeDiv } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Damani — "Zero-Debt Fortress" (remediation T11).
 *
 * Zero-guard: the FCF-margin component divides by revenue. On degenerate
 * all-zero records (dead tickers like LAKSHVILAS) rev === 0 previously made
 * fcf/rev = NaN, which propagated through the weighted average and poisoned
 * the whole consensus. Any missing component now yields a documented
 * `score: null` ("insufficient data") instead of a non-finite number;
 * `weightedAverage` ignores null scores.
 *
 * P0-2 (founder audit 2026-10-11): the same no-verdict contract covers
 * the data-layer nulls and the seed placeholder zeros (the X6/Y4
 * semantics) — `fin()` only caught non-finite values, so a seed `de: 0`
 * still scored as "perfectly debt-free". Observed-data arithmetic
 * unchanged (W4).
 */
export function scoreDamani(s: Stock, ctx?: ScoringContext): RishiScore {
  const de = inputMissing(s, ctx, 'de') ? null : s.de;
  const roce = inputMissing(s, ctx, 'roce') ? null : s.roce;
  const opm = inputMissing(s, ctx, 'opm') ? null : s.opm;
  const fcfM = inputMissing(s, ctx, 'fcf') || inputMissing(s, ctx, 'rev') ? null : safeDiv(s.fcf, s.rev);

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
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Zero-Debt Filter', v: deS === null ? 0 : deS, wt: 30, detail: de === null ? insuffDetail('debt (D/E)') : `D/E ${de.toFixed(2)} target <= 0.1` },
      { label: 'ROCE Sustainability', v: roceS === null ? 0 : roceS, wt: 25, detail: roce === null ? insuffDetail('ROCE') : `${roce}% target >25%` },
      { label: 'Cash Flow Predictability', v: cfS === null ? 0 : cfS, wt: 20, detail: fcfM === null ? insuffDetail('cash flow / revenue') : `FCF margin ${fcfM.toFixed(1)}% target >10%` },
      { label: 'Defensive Moat', v: moatS === null ? 0 : moatS, wt: 15, detail: opm === null ? insuffDetail('operating margin (OPM)') : `OPM ${opm}% target >15%` },
      { label: 'Neutral Base', v: 50, wt: 10, detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)' },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Zero-Debt Fortress pillars (D/E / ROCE / FCF margin / OPM), no Damani verdict.'
      : `D/E ${de!.toFixed(2)} · ROCE ${roce}% · FCF margin ${fcfM!.toFixed(1)}%. ${de! <= 0.1 ? 'Passes' : 'Fails'} Damani zero-debt test.`
  };
}
