import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

/**
 * George Soros — Reflexivity & Macro Contrarian
 * Philosophy: Markets are reflexive. Price affects fundamentals.
 * Buy when the crowd is wrong. Exploit market misconceptions.
 *
 * W4 (founder round-10) flatness fix: every component was a coarse
 * 4-step ladder (100/75/50/25), so the weighted total collapsed onto a
 * 6-point band for the middle half of the universe (sd 7.08 — the
 * flattest scorer) and carried almost no ranking information. The
 * ladders are now CONTINUOUS ramps over the same fields and thresholds:
 *
 *   - Reflexivity: 100 through price/NCAV 1.5x, graded down to 0 at
 *     6.5x — real NCAV discounts stay rare and keep their full signal.
 *   - Macro tailwind: revenue CAGR scaled 0 → 100 at 20% (was 4 steps).
 *   - Momentum: EPS CAGR scaled 0 → 100 at 25% (was 4 steps).
 *   - Leverage tolerance: full marks only with little debt (D/E 0.5 →
 *     100, 2.5 → 0); Soros tolerates leverage but does not reward it.
 *   - Liquidity: current ratio 1 → 50, 2 → 100 (was 4 steps).
 */
export function scoreSoros(s: Stock): RishiScore {
  // Reflexivity: is price disconnected from value? (contrarian signal)
  const ncav = (s.ca - s.tl) / s.sh;
  // Reflexivity: the component measures the discount to a POSITIVE net
  // current asset value. NCAV <= 0 means no asset-backed anchor exists —
  // the premise is unavailable, so the component scores 0 and the detail
  // SAYS so (rule 3). The pre-W4 code masked this case behind
  // Math.max(1, ncav): the component silently scored 0 (ptn = price/1
  // >= 3 for every real stock — verified on the 37 affected seed rows)
  // while the DETAIL displayed a fabricated "Price/NCAV <price>x" ratio
  // as if a positive NCAV existed; the W4 first commit kept the floor
  // and kept fabricating the ratio. Measured on the 916 seed: 37 rows
  // (4.0%) hit this branch. Pinned by test/scorerBoundaries.test.ts.
  let reflexS: number;
  let reflexDetail: string;
  if (ncav <= 0) {
    reflexS = 0;
    reflexDetail = 'NCAV <= 0 — no asset-backed anchor (crowd not wrong about value)';
  } else {
    const priceToNcav = s.price / ncav;
    reflexS = clamp(130 - priceToNcav * 20);
    reflexDetail = `Price/NCAV ${priceToNcav.toFixed(2)}x — crowd wrong?`;
  }

  // Macro trend: revenue growth signals macro tailwind (0 → 100 at 20%)
  const macroS = clamp(s.revcagr * 5);

  // Leverage tolerance: Soros uses leverage — but rewards only low debt
  const deS = clamp(100 - Math.max(0, s.de - 0.5) * 50);

  // Momentum proxy: EPS growth as trend confirmation (0 → 100 at 25%)
  const momS = clamp(s.epscagr * 4);

  // Liquidity: the current ratio needs POSITIVE liabilities. tl <= 0 is
  // nonsensical balance-sheet data — the ratio is not computable, the
  // component scores 0 and the detail SAYS so (rule 3; the W4
  // Math.max(1, tl) floor fabricated "Current ratio <ca>x"). Measured
  // incidence on the 916 seed: 0 rows — correctness-by-construction.
  // Ramp with real liabilities: current ratio 1.0 → 50, 2.0 → 100.
  let liqS: number;
  let liqDetail: string;
  if (s.tl <= 0) {
    liqS = 0;
    liqDetail = 'Total liabilities <= 0 — current ratio not computable';
  } else {
    const cr = s.ca / s.tl;
    liqS = clamp(50 + (cr - 1) * 50);
    liqDetail = `Current ratio ${cr.toFixed(2)}`;
  }

  const total = reflexS * 0.30 + macroS * 0.25 + deS * 0.15 + momS * 0.20 + liqS * 0.10;

  return {
    name: 'Soros',
    full: 'George Soros',
    label: 'Reflexivity Macro',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Reflexivity Signal',  v: Math.round(reflexS), wt: 30, detail: reflexDetail },
      { label: 'Macro Tailwind',      v: Math.round(macroS),  wt: 25, detail: `Rev CAGR ${s.revcagr}% — macro confirms` },
      { label: 'Momentum Confirm',    v: Math.round(momS),  wt: 20, detail: `EPS CAGR ${s.epscagr}% — trend in place` },
      { label: 'Leverage Tolerance',  v: Math.round(deS),   wt: 15, detail: `D/E ${s.de} — low debt rewarded` },
      { label: 'Liquidity Buffer',    v: Math.round(liqS),  wt: 10, detail: liqDetail },
    ],
    insight: `Soros sees ${reflexS > 70 ? 'a market misconception worth exploiting' : 'insufficient reflexive opportunity'}. Rev CAGR ${s.revcagr}% ${macroS > 70 ? 'confirms macro tailwind' : 'shows weak macro'}. ${total >= 70 ? 'The alchemy of finance favors this position.' : 'Soros would wait for a clearer dislocation.'}`,
  };
}
