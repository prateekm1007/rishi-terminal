import 'server-only';

import { Stock, RishiScore } from '../types';
import { clamp } from '../utils';
import type { ScoringContext } from '../consensus/orchestrator';
import { inputMissing, insuffDetail } from './unknownInputs';

/**
 * Lynch — GARP. P0-2 (founder audit 2026-10-11): a required pillar input
 * that was never observed (null / seed placeholder zero / a P/E that is
 * not a valuation observation) yields `score: null` — no verdict. The
 * observed-data arithmetic is unchanged (W4: no cosmetic re-tuning).
 */
export function scoreLynch(s: Stock, ctx?: ScoringContext): RishiScore {
  const peUnknown = inputMissing(s, ctx, 'pe');
  const epsUnknown = inputMissing(s, ctx, 'epscagr');
  const fcfUnknown = inputMissing(s, ctx, 'fcf');
  const revUnknown = inputMissing(s, ctx, 'revcagr');
  const insufficient = peUnknown || epsUnknown || fcfUnknown || revUnknown;

  const peg = peUnknown ? null : s.pe! / Math.max(1, s.epscagr);
  const pegS = peg === null ? null : clamp(peg <= 1 ? 100 : peg <= 1.5 ? 70 : Math.max(0, 100 - (peg - 1) * 50));
  const gS = clamp(s.epscagr >= 15 ? 100 : s.epscagr * 6.67);
  const cfS = s.fcf > 0 ? 100 : 0;
  const stS = clamp(s.revcagr >= 12 ? 100 : s.revcagr * 8.33);
  const total = insufficient
    ? null
    : pegS! * 0.30 + gS * 0.25 + cfS * 0.20 + stS * 0.15 + 50 * 0.10;
  return {
    name: 'Lynch', full: 'Peter Lynch', label: 'GARP',
    score: total === null ? null : Math.round(total), scoreRaw: total, origin: 'Global',
    comps: [
      { label: 'PEG Ratio', v: pegS === null ? 0 : pegS, wt: 30, detail: peg === null ? insuffDetail('P/E for the PEG ratio') : `PEG ${peg.toFixed(2)} (P/E ${s.pe} ÷ ${s.epscagr}% growth)` },
      { label: 'EPS Growth Rate', v: gS, wt: 25, detail: `${s.epscagr}% CAGR target >15%` },
      { label: 'Free Cash Flow', v: cfS, wt: 20, detail: `${Math.round(s.fcf / 1000)}K Cr ${s.fcf > 0 ? 'positive' : 'negative'}` },
      { label: 'Revenue Story', v: stS, wt: 15, detail: `${s.revcagr}% revenue growth` },
      { label: 'Neutral Base', v: 50, wt: 10, detail: 'design constant — the scorer holds a neutral 50 at 10% weight (S2-05: published, not hidden)' },
    ],
    insight: insufficient
      ? 'Insufficient data — placeholder or missing inputs in the GARP pillars (P/E / EPS growth / FCF / revenue growth), no verdict.'
      : `PEG ${peg!.toFixed(2)} · EPS CAGR ${s.epscagr}% · Rev ${s.revcagr}%. ${peg! <= 1 ? "Paying below 1x for growth — Lynch sweet spot." : peg! <= 1.5 ? "Reasonable GARP." : "Growth not worth the price."}`
  };
}
