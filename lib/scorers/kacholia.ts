import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Kacholia — Whale Small-Cap Hunter. P0-2 (founder audit 2026-10-11):
 * a required pillar input that was never observed (null / seed
 * placeholder zero) yields `score: null` — no verdict. Observed-data
 * arithmetic unchanged (W4).
 */
export function scoreKacholia(s: Stock, ctx?: ScoringContext): RishiScore {
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const epscagrUnknown = inputMissing(s, ctx, 'epscagr');
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const roceUnknown = inputMissing(s, ctx, 'roce');
  const insufficient = promoUnknown || epscagrUnknown || mktcapUnknown || roceUnknown;

  const skinS = promoUnknown ? null : clamp(s.promo >= 50 ? 100 : s.promo * 2);
  const fcfGrowth = epscagrUnknown ? null : s.epscagr * 1.2;
  const fcfS = fcfGrowth === null ? null : clamp(fcfGrowth >= 25 ? 100 : fcfGrowth * 4);
  const sizeS = mktcapUnknown ? null : s.mktcap >= 200 && s.mktcap <= 3000 ? 100 : s.mktcap < 200 ? 50 : clamp(100 - (s.mktcap - 3000) / 100);
  const nicheS = roceUnknown ? null : clamp(s.roce >= 20 ? 100 : s.roce * 5);
  const total = insufficient
    ? null
    : skinS! * 0.30 + fcfS! * 0.25 + nicheS! * 0.20 + sizeS! * 0.15 + 50 * 0.10;
  return {
    name: 'Kacholia', full: 'Ashish Kacholia', label: 'Whale Small-Cap Hunter',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Bharat',
    comps: [
      { label: 'Promoter Skin', v: skinS === null ? 0 : skinS, wt: 30, detail: promoUnknown ? insuffDetail('promoter holding') : `${s.promo}% holding target >50%` },
      { label: 'FCF Acceleration', v: fcfS === null ? 0 : fcfS, wt: 25, detail: fcfS === null ? insuffDetail('EPS growth') : `${fcfGrowth!.toFixed(1)}% growth target >25%` },
      { label: 'Niche ROCE', v: nicheS === null ? 0 : nicheS, wt: 20, detail: roceUnknown ? insuffDetail('ROCE') : `ROCE ${s.roce}% target >20%` },
      { label: 'Small-Cap Size', v: sizeS === null ? 0 : sizeS, wt: 15, detail: mktcapUnknown ? insuffDetail('market cap') : `${Math.round(s.mktcap)}Cr (sweet spot 200-3000Cr)` },
      { label: 'Neutral Base', v: 50, wt: 10, detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)' },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Whale Hunter pillars (promoter holding / EPS growth / ROCE / size), no Kacholia verdict.'
      : `${Math.round(s.mktcap)}Cr mktcap · ${s.promo}% promoter · ROCE ${s.roce}%. ${s.mktcap >= 200 && s.mktcap <= 3000 && s.promo >= 50 ? 'Kacholia sweet spot!' : 'Outside hunting zone.'}`
  };
}
