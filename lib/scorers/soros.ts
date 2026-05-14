import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';

/**
 * George Soros — Reflexivity & Macro Contrarian
 * Philosophy: Markets are reflexive. Price affects fundamentals.
 * Buy when the crowd is wrong. Exploit market misconceptions.
 */
export function scoreSoros(s: Stock): RishiScore {
  // Reflexivity: is price disconnected from value? (contrarian signal)
  const ncav = (s.ca - s.tl) / s.sh;
  const priceToNcav = s.price / Math.max(1, ncav);
  const reflexS = clamp(priceToNcav < 1 ? 100 : priceToNcav < 2 ? 75 : priceToNcav < 3 ? 50 : Math.max(0, 100 - priceToNcav * 15));

  // Macro trend: revenue growth signals macro tailwind
  const macroS = clamp(s.revcagr >= 20 ? 100 : s.revcagr >= 12 ? 75 : s.revcagr >= 6 ? 50 : 25);

  // Leverage tolerance: Soros uses leverage — moderate debt ok
  const deS = clamp(s.de <= 1.0 ? 100 : s.de <= 2.0 ? 70 : s.de <= 3.0 ? 40 : 15);

  // Momentum proxy: EPS growth as trend confirmation
  const momS = clamp(s.epscagr >= 25 ? 100 : s.epscagr >= 15 ? 75 : s.epscagr >= 8 ? 50 : 20);

  // Liquidity: current assets vs liabilities
  const cr = s.ca / Math.max(1, s.tl);
  const liqS = clamp(cr >= 2 ? 100 : cr >= 1.5 ? 75 : cr >= 1 ? 50 : 20);

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
      { label: 'Momentum Confirm',    v: Math.round(momS),    wt: 20, detail: `EPS CAGR ${s.epscagr}% — trend in place` },
      { label: 'Leverage Tolerance',  v: Math.round(deS),     wt: 15, detail: `D/E ${s.de} — Soros tolerates leverage` },
      { label: 'Liquidity Buffer',    v: Math.round(liqS),    wt: 10, detail: `Current ratio ${cr.toFixed(2)}` },
    ],
    insight: `Soros sees ${reflexS > 70 ? 'a market misconception worth exploiting' : 'insufficient reflexive opportunity'}. Rev CAGR ${s.revcagr}% ${macroS > 70 ? 'confirms macro tailwind' : 'shows weak macro'}. ${total >= 70 ? 'The alchemy of finance favors this position.' : 'Soros would wait for a clearer dislocation.'}`,
  };
}
