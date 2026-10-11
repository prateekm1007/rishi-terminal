import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Seth Klarman — Asymmetric Safety. P0-2 (founder audit 2026-10-11): a
 * required pillar input that was never observed (null / seed placeholder
 * zero / non-positive P/E) yields `score: null` — no verdict.
 * Observed-data arithmetic unchanged (W4).
 */
export function scoreSethKlarman(s: Stock, ctx?: ScoringContext): RishiScore {
  const deUnknown = inputMissing(s, ctx, 'de');
  const fcfUnknown = inputMissing(s, ctx, 'fcf');
  const peUnknown = inputMissing(s, ctx, 'pe');
  const bvpsUnknown = inputMissing(s, ctx, 'bvps');
  const opmUnknown = inputMissing(s, ctx, 'opm');
  const revcagrUnknown = inputMissing(s, ctx, 'revcagr');
  const insufficient = deUnknown || fcfUnknown || peUnknown || bvpsUnknown || opmUnknown || revcagrUnknown;

  const downsideScore = deUnknown || fcfUnknown
    ? null
    : s.de! <= 0.5 && s.fcf > 0 ? 100 : s.de! > 2 || s.fcf <= 0 ? 20 : clamp(50 + (s.de! <= 1 ? 25 : 0) + (s.fcf > 0 ? 25 : 0));
  const asymmetricScore = peUnknown || bvpsUnknown
    ? null
    : s.pe! <= 15 && s.price <= s.bvps * 1.5 ? 100 : s.pe! > 40 || s.price > s.bvps * 3 ? 20 : clamp(50 + (s.pe! <= 25 ? 25 : 0) + (s.price <= s.bvps * 2 ? 25 : 0));
  const marginScore = opmUnknown ? null : s.opm! >= 20 ? 100 : clamp(s.opm! * 5);
  const catalystScore = revcagrUnknown ? null : s.revcagr >= 12 ? 100 : clamp(s.revcagr * 8.33);
  const total = insufficient
    ? null
    : downsideScore! * 0.40 + asymmetricScore! * 0.30 + marginScore! * 0.15 + catalystScore! * 0.15;
  return { name: 'Seth Klarman', full: 'Seth Klarman', label: 'Asymmetric Safety',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Downside Protection', v: downsideScore === null ? 0 : downsideScore, wt: 40, detail: downsideScore === null ? insuffDetail('debt (D/E) / cash flow') : `Debt ${s.de}` },
      { label: 'Asymmetric', v: asymmetricScore === null ? 0 : asymmetricScore, wt: 30, detail: asymmetricScore === null ? insuffDetail('valuation (P/E) / book value') : `P/E ${s.pe}` },
      { label: 'Margin Safety', v: marginScore === null ? 0 : marginScore, wt: 15, detail: marginScore === null ? insuffDetail('operating margin (OPM)') : `OPM ${s.opm}%` },
      { label: 'Catalyst', v: catalystScore === null ? 0 : catalystScore, wt: 15, detail: catalystScore === null ? insuffDetail('revenue growth') : `Growth ${s.revcagr}%` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Asymmetric Safety pillars (debt / valuation / margin / growth), no Klarman verdict.'
      : `Conservative value. ${total! >= 75 ? 'Margin excellent' : 'Risk present'}` };
}
