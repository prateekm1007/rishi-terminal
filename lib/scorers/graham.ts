import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Graham — Deep Value. P0-2 (founder audit 2026-10-11): a required pillar
 * input that was never observed (null / seed placeholder zero / a P/E that
 * is not a valuation observation) yields `score: null` — no verdict. The
 * observed-data arithmetic is unchanged (W4: no cosmetic re-tuning; the
 * round-5 P/E-0-is-not-cheap fix is preserved inside the guarded branch).
 */
export function scoreGraham(s: Stock, ctx?: ScoringContext): RishiScore {
  const peUnknown = inputMissing(s, ctx, 'pe');
  const deUnknown = inputMissing(s, ctx, 'de');
  const ncavUnknown = inputMissing(s, ctx, 'sh') || inputMissing(s, ctx, 'ca') || inputMissing(s, ctx, 'tl');
  const insufficient = peUnknown || deUnknown || ncavUnknown;

  // NCAV (Net Current Asset Value) approach
  const ncav = (s.ca - s.tl) / s.sh;
  const ncavDisc = ((ncav - s.price) / s.price) * 100;
  const ncavS = ncavUnknown ? null : clamp(ncavDisc >= 30 ? 100 : ncavDisc > 0 ? ncavDisc * 3.33 : 50 + ncavDisc);

  // P/E valuation — round-5 audit (finding 1): P/E 0 means "no meaningful
  // earnings" (loss-maker or missing data); it is NOT ultra-cheap. A zero
  // P/E used to score a perfect 100 here, which pushed placeholder records
  // like KWALITY to the top of Top Buys. No earnings -> no value points.
  // P0-2: the placeholder class is null at the data layer and the whole
  // verdict is null (not a zero-point pillar).
  const peS = peUnknown ? null : clamp(s.pe! > 0 ? (s.pe! <= 15 ? 100 : Math.max(0, 100 - (s.pe! - 15) * 5)) : 0);

  // Current ratio safety
  const cr = s.ca / Math.max(1, s.tl);
  const crS = clamp(cr * 50);

  // Debt safety
  const deS = deUnknown ? null : clamp(s.de! <= 0.5 ? 100 : Math.max(0, 100 - s.de! * 100));

  const total = insufficient
    ? null
    : ncavS! * 0.40 + peS! * 0.25 + crS * 0.15 + deS! * 0.20;

  return {
    name: 'Graham',
    full: 'Benjamin Graham',
    label: 'Deep Value',
    score: total === null ? null : Math.round(total),
    scoreRaw: total,
    origin: 'Global',
    comps: [
      {
        label: 'NCAV Discount',
        v: ncavS === null ? 0 : ncavS,
        wt: 40,
        detail: ncavUnknown ? insuffDetail('current assets / liabilities / share count for NCAV') : `NCAV ${Math.round(ncav)} vs ${s.price} (${ncavDisc > 0 ? '+' : ''}${Math.round(ncavDisc)}%)`
      },
      {
        label: 'P/E Value',
        v: peS === null ? 0 : peS,
        wt: 25,
        detail: peUnknown ? insuffDetail('valuation (no meaningful P/E)') : `P/E ${s.pe} target <15`
      },
      {
        label: 'Current Ratio Safety',
        v: crS,
        wt: 15,
        detail: `Ratio ${cr.toFixed(2)} target >2`
      },
      {
        label: 'Debt Safety',
        v: deS === null ? 0 : deS,
        wt: 20,
        detail: deUnknown ? insuffDetail('debt (D/E)') : `D/E ${s.de!.toFixed(2)} target <0.5`
      },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the Deep Value pillars (NCAV operands / P/E / D/E), no Graham verdict.'
      : `NCAV ${Math.round(ncav)} vs price ${s.price} · P/E ${s.pe}. ${ncavDisc > 0 ? 'Trading below liquidation value!' : 'Premium to net assets.'}`
  };
}
