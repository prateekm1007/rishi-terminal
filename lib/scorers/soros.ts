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
 *   - Reflexivity: graded from deep NCAV discount (100) through fair
 *     price toward disconnection (0 at price/NCAV 6.5x) — real NCAV
 *     discounts stay rare and keep their full signal.
 *   - Macro tailwind: revenue CAGR scaled 0 → 100 at 20% (was 4 steps).
 *   - Momentum: EPS CAGR scaled 0 → 100 at 25% (was 4 steps).
 *   - Leverage tolerance: full marks only with little debt (D/E 0.5 →
 *     100, 2.5 → 0); Soros tolerates leverage but does not reward it.
 *   - Liquidity: current ratio 1 → 50, 2 → 100 (was 4 steps).
 */
export function scoreSoros(s: Stock): RishiScore {
  // Reflexivity: is price disconnected from value? (contrarian signal)
  const ncav = (s.ca - s.tl) / s.sh;
  const priceToNcav = s.price / Math.max(1, ncav);
  const reflexS = clamp(130 - priceToNcav * 20);

  // Macro trend: revenue growth signals macro tailwind (0 → 100 at 20%)
  const macroS = clamp(s.revcagr * 5);

  // Leverage tolerance: Soros uses leverage — but rewards only low debt
  const deS = clamp(100 - Math.max(0, s.de - 0.5) * 50);

  // Momentum proxy: EPS growth as trend confirmation (0 → 100 at 25%)
  const momS = clamp(s.epscagr * 4);

  // Liquidity: current assets vs liabilities (1.0 → 50, 2.0 → 100)
  const cr = s.ca / Math.max(1, s.tl);
  const liqS = clamp(50 + (cr - 1) * 50);

  const total = reflexS * 0.30 + macroS * 0.25 + deS * 0.15 + momS * 0.20 + liqS * 0.10;

  return {
    name: 'Soros',
    full: 'George Soros',
    label: 'Reflexivity Macro',
    score: Math.round(total),
    origin: 'Global',
    comps: [
      { label: 'Reflexivity Signal',  v: Math.round(reflexS), wt: 30, detail: `Price/NCAV ${priceToNcav.toFixed(2)}x — crowd wrong?` },
      { label: 'Macro Tailwind',      v: Math.round(macroS),  wt: 25, detail: `Rev CAGR ${s.revcagr}% — macro confirms` },
      { label: 'Momentum Confirm',    v: Math.round(momS),  wt: 20, detail: `EPS CAGR ${s.epscagr}% — trend in place` },
      { label: 'Leverage Tolerance',  v: Math.round(deS),   wt: 15, detail: `D/E ${s.de} — Soros tolerates leverage` },
      { label: 'Liquidity Buffer',    v: Math.round(liqS),  wt: 10, detail: `Current ratio ${cr.toFixed(2)}` },
    ],
    insight: `Soros sees ${reflexS > 70 ? 'a market misconception worth exploiting' : 'insufficient reflexive opportunity'}. Rev CAGR ${s.revcagr}% ${macroS > 70 ? 'confirms macro tailwind' : 'shows weak macro'}. ${total >= 70 ? 'The alchemy of finance favors this position.' : 'Soros would wait for a clearer dislocation.'}`,
  };
}
