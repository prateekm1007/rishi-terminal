import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Walter Schloss — Cigar Butt. P0-2 (founder audit 2026-10-11): a
 * required pillar input that was never observed (null / seed
 * placeholder zero) yields `score: null` — no verdict. In particular a
 * D/E nobody observed is never "Zero Debt" perfection. Observed-data
 * arithmetic unchanged (W4).
 */
export function scoreWalterSchloss(s: Stock, ctx?: ScoringContext): RishiScore {
  const bvpsUnknown = inputMissing(s, ctx, 'bvps');
  const deUnknown = inputMissing(s, ctx, 'de');
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const insufficient = bvpsUnknown || deUnknown || promoUnknown || mktcapUnknown;

  const pbScore = bvpsUnknown ? null : s.price <= s.bvps ? 100 : s.price <= s.bvps * 1.3 ? 80 : clamp(100 - (s.price / s.bvps - 1.3) * 100);
  const debtScore = deUnknown ? null : s.de! <= 0.2 ? 100 : s.de! <= 0.5 ? 80 : clamp(100 - s.de! * 100);
  const insiderScore = promoUnknown ? null : s.promo >= 40 ? 100 : clamp(s.promo * 2.5);
  const diversityScore = mktcapUnknown ? null : s.mktcap >= 50000 && s.mktcap <= 200000 ? 100 : clamp(50 + (s.mktcap >= 30000 ? 25 : 0) + (s.mktcap <= 300000 ? 25 : 0));
  const total = insufficient
    ? null
    : pbScore! * 0.40 + debtScore! * 0.30 + insiderScore! * 0.20 + diversityScore! * 0.10;
  return { name: 'Walter Schloss', full: 'Walter Schloss', label: 'Cigar Butt',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Price to Book', v: pbScore === null ? 0 : pbScore, wt: 40, detail: bvpsUnknown ? insuffDetail('book value') : `P/B ${(s.price / s.bvps).toFixed(1)}x` },
      { label: 'Zero Debt', v: debtScore === null ? 0 : debtScore, wt: 30, detail: deUnknown ? insuffDetail('debt (D/E)') : `D/E ${s.de}` },
      { label: 'Insider Owner', v: insiderScore === null ? 0 : insiderScore, wt: 20, detail: promoUnknown ? insuffDetail('promoter holding') : `${s.promo}%` },
      { label: 'Size', v: diversityScore === null ? 0 : diversityScore, wt: 10, detail: mktcapUnknown ? insuffDetail('market cap') : `Mktcap good` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Cigar Butt pillars (book value / debt / promoter holding / size), no Schloss verdict.'
      : `Cigar butt. P/B ${(s.price / s.bvps).toFixed(1)}x. ${total! >= 75 ? 'Squeeze profits' : 'Not a butt'}` };
}
