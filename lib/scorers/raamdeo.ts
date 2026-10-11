import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Raamdeo Agrawal — QGLP Framework (Quality, Growth, Longevity, Price).
 * P0-2 (founder audit 2026-10-11): a required pillar input that was
 * never observed (null / seed placeholder zero / non-positive P/E)
 * yields `score: null` — no verdict. Observed-data arithmetic unchanged.
 */
export function scoreRaamdeo(s: Stock, ctx?: ScoringContext): RishiScore {
  const roceUnknown = inputMissing(s, ctx, 'roce');
  const roeUnknown = inputMissing(s, ctx, 'roe');
  const revcagrUnknown = inputMissing(s, ctx, 'revcagr');
  const epscagrUnknown = inputMissing(s, ctx, 'epscagr');
  const deUnknown = inputMissing(s, ctx, 'de');
  const peUnknown = inputMissing(s, ctx, 'pe');
  const insufficient = roceUnknown || roeUnknown || revcagrUnknown || epscagrUnknown || deUnknown || peUnknown;

  const qualityScore = roceUnknown || roeUnknown
    ? null
    : clamp((s.roce >= 20 ? 100 : s.roce * 5) * 0.5 + (s.roe! >= 20 ? 100 : s.roe! * 5) * 0.5);
  const growthScore = revcagrUnknown || epscagrUnknown
    ? null
    : clamp(Math.min(50, s.revcagr * 6.25) + Math.min(50, s.epscagr * 5.56));
  const longevityScore = deUnknown ? null : s.de! <= 0.5 ? 100 : s.de! <= 1.5 ? 70 : clamp(100 - s.de! * 40);
  const priceScore = peUnknown ? null : s.pe! <= 25 ? 100 : s.pe! <= 40 ? 60 : clamp(100 - (s.pe! - 40) * 2);
  const total = insufficient
    ? null
    : qualityScore! * 0.30 + growthScore! * 0.25 + longevityScore! * 0.25 + priceScore! * 0.20;
  return { name: 'Raamdeo', full: 'Raamdeo Agrawal', label: 'QGLP Framework',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Quality', v: qualityScore === null ? 0 : qualityScore, wt: 30, detail: qualityScore === null ? insuffDetail('ROCE / ROE') : `ROCE ${s.roce}% ROE ${s.roe}%` },
      { label: 'Growth', v: growthScore === null ? 0 : growthScore, wt: 25, detail: growthScore === null ? insuffDetail('revenue / EPS growth') : `${s.revcagr}% rev` },
      { label: 'Longevity', v: longevityScore === null ? 0 : longevityScore, wt: 25, detail: deUnknown ? insuffDetail('debt (D/E)') : `D/E ${s.de}` },
      { label: 'Price', v: priceScore === null ? 0 : priceScore, wt: 20, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe}` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the QGLP pillars (quality / growth / longevity / price), no Raamdeo verdict.'
      : `QGLP score ${Math.round(total!)}. ${total! >= 75 ? 'Excellent compounder' : 'Check factors'}` };
}
