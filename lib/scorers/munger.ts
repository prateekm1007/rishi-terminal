import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Munger — Mental Models. P0-2 (founder audit 2026-10-11): a required
 * pillar input that was never observed (null / seed placeholder zero)
 * yields `score: null` — no verdict. In particular the Inversion Check
 * can never say "PASS: No red flags" on a D/E nobody observed: missing
 * inputs are NOT ASSESSED, never a pass. Observed-data arithmetic is
 * unchanged (W4).
 */
export function scoreMunger(s: Stock, ctx?: ScoringContext): RishiScore {
  const roceUnknown = inputMissing(s, ctx, 'roce');
  const deUnknown = inputMissing(s, ctx, 'de');
  const roeUnknown = inputMissing(s, ctx, 'roe');
  const fcfUnknown = inputMissing(s, ctx, 'fcf');
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const insufficient = roceUnknown || deUnknown || roeUnknown || fcfUnknown || promoUnknown;

  const circleS = roceUnknown || deUnknown
    ? null
    : s.roce >= 25 && s.de! <= 0.5 ? 100 : clamp((s.roce * 2) + (s.de! <= 0.5 ? 50 : 0));
  const inversionS = deUnknown || fcfUnknown
    ? null
    : s.de! > 2 || s.fcf < 0 ? 0 : 100;
  const lollaS = roeUnknown || roceUnknown
    ? null
    : clamp(s.roe! >= 20 && s.roce >= 20 ? 100 : (s.roe! + s.roce) * 2);
  const patienceS = promoUnknown ? null : s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const total = insufficient
    ? null
    : circleS! * 0.30 + inversionS! * 0.25 + lollaS! * 0.25 + patienceS! * 0.20;
  return {
    name: 'Munger', full: 'Charlie Munger', label: 'Mental Models',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Circle of Competence', v: circleS === null ? 0 : circleS, wt: 30, detail: circleS === null ? insuffDetail('ROCE / D/E') : `ROCE ${s.roce}% · D/E ${s.de!.toFixed(2)}` },
      { label: 'Inversion Check', v: inversionS === null ? 0 : inversionS, wt: 25, detail: inversionS === null ? 'NOT ASSESSED — debt or cash-flow inputs missing; a missing input is never a pass' : `${s.de! > 2 ? 'FAIL: High debt' : s.fcf < 0 ? 'FAIL: Negative FCF' : 'PASS: No red flags'}` },
      { label: 'Lollapalooza Effect', v: lollaS === null ? 0 : lollaS, wt: 25, detail: lollaS === null ? insuffDetail('ROE / ROCE') : `ROE ${s.roe}% + ROCE ${s.roce}% convergence` },
      { label: 'Patience Filter', v: patienceS === null ? 0 : patienceS, wt: 20, detail: patienceS === null ? insuffDetail('promoter holding') : `Promoter ${s.promo}% commitment` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Mental Models pillars (ROCE / D/E / ROE / FCF / promoter holding), no Munger verdict.'
      : `ROCE ${s.roce}% · ROE ${s.roe}% · D/E ${s.de!.toFixed(2)}. ${inversionS === 0 ? 'Munger would avoid — fails inversion test.' : total! >= 75 ? 'Wonderful business to own forever.' : 'Too complex or mediocre.'}`
  };
}
