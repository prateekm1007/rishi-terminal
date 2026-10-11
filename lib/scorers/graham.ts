import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { SCORER_VERDICT_CONTRACT, unknownAmong, noVerdictScore } from './verdictGuards';

export function scoreGraham(s: Stock, ctx?: ScoringContext): RishiScore {
  // P0-2 (founder audit 2026-10-11): a placeholder zero in a required
  // field is UNKNOWN — no verdict, never an interpretation of zero.
  const p02Missing = unknownAmong(s, SCORER_VERDICT_CONTRACT["Graham"].required, ctx);
  if (p02Missing.length) return noVerdictScore(SCORER_VERDICT_CONTRACT["Graham"], p02Missing);

  // NCAV (Net Current Asset Value) approach
  const ncav = (s.ca - s.tl) / s.sh;
  const ncavDisc = ((ncav - s.price) / s.price) * 100;
  const ncavS = clamp(ncavDisc >= 30 ? 100 : ncavDisc > 0 ? ncavDisc * 3.33 : 50 + ncavDisc);

  // P/E valuation — round-5 audit (finding 1): P/E 0 means "no meaningful
  // earnings" (loss-maker or missing data); it is NOT ultra-cheap. A zero
  // P/E used to score a perfect 100 here, which pushed placeholder records
  // like KWALITY to the top of Top Buys. No earnings -> no value points.
  const peS = clamp(s.pe > 0 ? (s.pe <= 15 ? 100 : Math.max(0, 100 - (s.pe - 15) * 5)) : 0);

  // Current ratio safety
  const cr = s.ca / Math.max(1, s.tl);
  const crS = clamp(cr * 50);

  // Debt safety
  const deS = clamp(s.de <= 0.5 ? 100 : Math.max(0, 100 - s.de * 100));

  const total = ncavS * 0.40 + peS * 0.25 + crS * 0.15 + deS * 0.20;

  return {
    name: 'Graham',
    full: 'Benjamin Graham',
    label: 'Deep Value',
    score: Math.round(total),
    scoreRaw: total,
    origin: 'Global',
    comps: [
      {
        label: 'NCAV Discount',
        v: ncavS,
        wt: 40,
        detail: `NCAV ${Math.round(ncav)} vs ${s.price} (${ncavDisc > 0 ? '+' : ''}${Math.round(ncavDisc)}%)`
      },
      {
        label: 'P/E Value',
        v: peS,
        wt: 25,
        detail: `P/E ${s.pe} target <15`
      },
      {
        label: 'Current Ratio Safety',
        v: crS,
        wt: 15,
        detail: `Ratio ${cr.toFixed(2)} target >2`
      },
      {
        label: 'Debt Safety',
        v: deS,
        wt: 20,
        detail: `D/E ${s.de.toFixed(2)} target <0.5`
      },
    ],
    insight: `NCAV ${Math.round(ncav)} vs price ${s.price} · P/E ${s.pe}. ${ncavDisc > 0 ? 'Trading below liquidation value!' : 'Premium to net assets.'}`
  };
}
