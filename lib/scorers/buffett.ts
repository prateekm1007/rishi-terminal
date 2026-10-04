import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp, safeDiv } from '../utils';

/**
 * Buffett (T11 zero-guard): owner-earnings yield divides by market cap;
 * a degenerate mktcap of 0 yields a documented null ("insufficient data").
 */
export function scoreBuffett(s: Stock): RishiScore {
  // ROE sustainability
  const roeS = clamp(s.roe >= 20 ? 100 : s.roe * 5);

  // Economic moat (via Operating Profit Margin)
  const moatS = clamp(s.opm >= 20 ? 100 : s.opm * 5);

  // Owner Earnings = Net Profit + Depreciation - 70% of Capex
  const oe = s.np + s.dep - s.capex * 0.7;
  const oeY = safeDiv(oe, s.mktcap);
  const oeS = oeY === null ? null : clamp(oeY >= 8 ? 100 : oeY * 12.5);

  // Management skin in the game
  const mgS = clamp(s.promo >= 30 ? 100 : s.promo * 3.33);

  const total = oeS === null
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
        v: roeS,
        wt: 30,
        detail: `${s.roe}% target >20%`
      },
      {
        label: 'Economic Moat',
        v: moatS,
        wt: 25,
        detail: `OPM ${s.opm}% target >20%`
      },
      {
        label: 'Owner Earnings Yield',
        v: oeS === null ? 0 : oeS,
        wt: 20,
        detail: oeY === null ? 'insufficient data (market cap is 0)' : `${oeY.toFixed(1)}% target >8%`
      },
      {
        label: 'Management Skin',
        v: mgS,
        wt: 15,
        detail: `Promoter ${s.promo}%`
      },
      {
        label: 'Neutral Base',
        v: 50,
        wt: 10,
        detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)'
      },
    ],
    insight: total === null
      ? 'Insufficient data \u2014 market cap missing, no Buffett verdict.'
      : `ROE ${s.roe}% · OE yield ${oeY!.toFixed(1)}% · OPM ${s.opm}%. ${total >= 75 ? 'Wonderful compounder.' : 'Lacks durable moat.'}`
  };
}
