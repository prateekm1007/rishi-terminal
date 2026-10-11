import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, safeDiv } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Buffett (T11 zero-guard + P0-2): owner-earnings yield divides by market
 * cap; a degenerate mktcap of 0 yields a documented null ("insufficient
 * data"). P0-2 (founder audit 2026-10-11) extends the same no-verdict
 * contract to every required pillar input: ROE, OPM and promoter holding
 * that were never observed (null / seed placeholder zero) yield
 * `score: null` — the observed-data arithmetic is unchanged (W4).
 */
export function scoreBuffett(s: Stock, ctx?: ScoringContext): RishiScore {
  const roeUnknown = inputMissing(s, ctx, 'roe');
  const opmUnknown = inputMissing(s, ctx, 'opm');
  const promoUnknown = inputMissing(s, ctx, 'promo');

  // ROE sustainability
  const roeS = roeUnknown ? null : clamp(s.roe! >= 20 ? 100 : s.roe! * 5);

  // Economic moat (via Operating Profit Margin)
  const moatS = opmUnknown ? null : clamp(s.opm! >= 20 ? 100 : s.opm! * 5);

  // Owner Earnings = Net Profit + Depreciation - 70% of Capex
  const oe = s.np + s.dep - s.capex * 0.7;
  const oeY = safeDiv(oe, s.mktcap);
  const oeS = oeY === null ? null : clamp(oeY >= 8 ? 100 : oeY * 12.5);

  // Management skin in the game
  const mgS = promoUnknown ? null : clamp(s.promo >= 30 ? 100 : s.promo * 3.33);

  const total = roeS === null || moatS === null || oeS === null || mgS === null
    ? null
    : roeS * 0.30 + moatS * 0.25 + oeS * 0.20 + mgS * 0.15 + 50 * 0.10;

  return {
    name: 'Buffett',
    full: 'Warren Buffett',
    label: 'Quality Moat',
    score: total === null ? null : Math.round(total),
    scoreRaw: total,
    origin: 'Global',
    comps: [
      {
        label: 'ROE Sustainability',
        v: roeS === null ? 0 : roeS,
        wt: 30,
        detail: roeUnknown ? insuffDetail('ROE') : `${s.roe}% target >20%`
      },
      {
        label: 'Economic Moat',
        v: moatS === null ? 0 : moatS,
        wt: 25,
        detail: opmUnknown ? insuffDetail('operating margin (OPM)') : `OPM ${s.opm}% target >20%`
      },
      {
        label: 'Owner Earnings Yield',
        v: oeS === null ? 0 : oeS,
        wt: 20,
        detail: oeY === null ? 'insufficient data (market cap is 0)' : `${oeY.toFixed(1)}% target >8%`
      },
      {
        label: 'Management Skin',
        v: mgS === null ? 0 : mgS,
        wt: 15,
        detail: promoUnknown ? insuffDetail('promoter holding') : `Promoter ${s.promo}%`
      },
      {
        label: 'Neutral Base',
        v: 50,
        wt: 10,
        detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)'
      },
    ],
    insight: total === null
      ? 'Insufficient data \u2014 placeholder or missing inputs in the Quality Moat pillars (ROE / OPM / owner earnings / promoter holding), no Buffett verdict.'
      : `ROE ${s.roe}% · OE yield ${oeY!.toFixed(1)}% · OPM ${s.opm}%. ${total >= 75 ? 'Wonderful compounder.' : 'Lacks durable moat.'}`
  };
}
