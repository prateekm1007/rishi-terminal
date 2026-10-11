import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Philip Fisher — Scuttlebutt Growth. P0-2 (founder audit 2026-10-11):
 * a required pillar input that was never observed (null / seed
 * placeholder zero) yields `score: null` — no verdict. Observed-data
 * arithmetic unchanged (W4).
 */
export function scorePhilipFisher(s: Stock, ctx?: ScoringContext): RishiScore {
  const promoUnknown = inputMissing(s, ctx, 'promo');
  const capexUnknown = inputMissing(s, ctx, 'capex');
  const revUnknown = inputMissing(s, ctx, 'rev');
  const epscagrUnknown = inputMissing(s, ctx, 'epscagr');
  const mktcapUnknown = inputMissing(s, ctx, 'mktcap');
  const insufficient = promoUnknown || capexUnknown || revUnknown || epscagrUnknown || mktcapUnknown;

  const mgmtScore = promoUnknown ? null : clamp(s.promo >= 50 ? 100 : s.promo * 2);
  const rndScore = capexUnknown || revUnknown ? null : clamp(s.capex >= s.rev * 0.08 ? 100 : clamp((s.capex / s.rev) * 100 * 12.5));
  const growthScore = epscagrUnknown ? null : clamp(s.epscagr >= 20 ? 100 : s.epscagr * 5);
  const marketScore = mktcapUnknown ? null : s.mktcap >= 50000 && s.mktcap <= 500000 ? 100 : s.mktcap < 50000 ? 70 : clamp(100 - (s.mktcap - 500000) / 100000);
  const total = insufficient
    ? null
    : mgmtScore! * 0.25 + rndScore! * 0.25 + growthScore! * 0.25 + marketScore! * 0.25;
  return { name: 'Philip Fisher', full: 'Philip Fisher', label: 'Scuttlebutt Growth',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'Management Quality', v: mgmtScore === null ? 0 : mgmtScore, wt: 25, detail: promoUnknown ? insuffDetail('promoter holding') : `Insider ${s.promo}%` },
      { label: 'RandD Investment', v: rndScore === null ? 0 : rndScore, wt: 25, detail: rndScore === null ? insuffDetail('capex / revenue') : `Capex ${((s.capex / s.rev) * 100).toFixed(1)}%` },
      { label: 'Growth Rate', v: growthScore === null ? 0 : growthScore, wt: 25, detail: epscagrUnknown ? insuffDetail('EPS growth') : `EPS CAGR ${s.epscagr}%` },
      { label: 'Market Size', v: marketScore === null ? 0 : marketScore, wt: 25, detail: mktcapUnknown ? insuffDetail('market cap') : `Mktcap Rs${Math.round(s.mktcap / 1000)}K` },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Scuttlebutt pillars (management / R&D / growth / market size), no Fisher verdict.'
      : `Growth compounder. Mgmt ${s.promo}%. ${total! >= 75 ? 'Buy signal' : 'Research more'}` };
}
