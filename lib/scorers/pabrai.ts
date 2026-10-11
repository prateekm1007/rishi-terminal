import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * W4 (founder round-10) saturation fix: every component was a STEP
 * function at thresholds most of the universe passes (field profile on
 * the 916-stock seed: promo >= 50 for 35%, promo >= 30 for 91%,
 * D/E <= 0.5 AND FCF > 0 for 88%), so 35.6% of stocks scored >= 95 and
 * the scorer carried almost no ranking information near the top.
 *
 * The criteria and their directions are UNCHANGED (Pabrai's Dhandho:
 * clone proven businesses with aligned, low-risk owners at prices where
 * uncertainty is priced in) — each component is now a GRADED ramp over
 * the same field, positioned at the data's quantiles so the pass region
 * itself discriminates:
 *   - Clone: 35 at promoter 35%, 0 at 0%, 100 from 57.75% (the ramp's
 *     exact clamp point: 35 + 22.75 x 100/35; was flat 100 for >= 50%)
 *     — pinned by test/scorerBoundaries.test.ts, not the review draft's
 *     "0 at 35%".
 *   - Owner: 0 at 20% → 100 at 60% (was flat 100 for >= 30% — 91%!)
 *   - Low risk: 100 at D/E 0 declining to 0 at D/E 100/45 (~2.22),
 *     x0.6 without FCF
 *   - Uncertainty discount: 100 at P/E 10 → 0 at 40 (was flat 100 <= 20)
 *
 * P0-2 (founder audit 2026-10-11): a required pillar input that was
 * never observed (null / seed placeholder zero / non-positive P/E)
 * yields `score: null` — no verdict. Observed-data arithmetic unchanged.
 */
export function scorePabrai(s: Stock, ctx?: ScoringContext): RishiScore {
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const deUnknown = inputMissing(s, ctx, 'de');
  const fcfUnknown = inputMissing(s, ctx, 'fcf');
  const peUnknown = inputMissing(s, ctx, 'pe');
  const insufficient = promoUnknown || deUnknown || fcfUnknown || peUnknown;

  const cloneS = promoUnknown ? null : clamp(35 + (s.promo - 35) * (100 / 35));
  const ownerS = promoUnknown ? null : clamp((s.promo - 20) * 2.5);
  const lowRiskS = deUnknown || fcfUnknown
    ? null
    : clamp(Math.round(clamp(100 - s.de! * 45) * (s.fcf > 0 ? 1 : 0.6)));
  const uncertainS = peUnknown ? null : clamp(100 - Math.max(0, s.pe! - 10) * (100 / 30));
  const total = insufficient
    ? null
    : cloneS! * 0.30 + ownerS! * 0.25 + lowRiskS! * 0.25 + uncertainS! * 0.20;
  return {
    name: 'Pabrai', full: 'Mohnish Pabrai', label: 'Dhandho Cloner',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Clone Score', v: cloneS === null ? 0 : cloneS, wt: 30, detail: promoUnknown ? insuffDetail('promoter holding') : `Promoter ${s.promo}% (cloning insiders)` },
      { label: 'Owner Operator', v: ownerS === null ? 0 : ownerS, wt: 25, detail: promoUnknown ? insuffDetail('promoter holding') : `${s.promo}% skin in game` },
      { label: 'Low Risk', v: lowRiskS === null ? 0 : lowRiskS, wt: 25, detail: lowRiskS === null ? insuffDetail('debt (D/E) / cash flow') : `D/E ${s.de!.toFixed(2)} · FCF ${s.fcf > 0 ? '+' : '-'}` },
      { label: 'High Uncertainty Discount', v: uncertainS === null ? 0 : uncertainS, wt: 20, detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe} target <10` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Dhandho pillars (promoter holding / debt / cash flow / valuation), no Pabrai verdict.'
      : `Dhandho: ${s.promo}% promoter · D/E ${s.de!.toFixed(2)} · P/E ${s.pe}. ${total! >= 75 ? 'Heads I win, tails I do not lose much!' : 'Risk/reward not asymmetric enough.'}`
  };
}
