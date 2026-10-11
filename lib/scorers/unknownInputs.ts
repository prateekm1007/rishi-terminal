import 'server-only';

import type { Stock } from '../types';
import type { ScoringContext } from '../consensus/orchestrator';

/**
 * P0-2 (founder audit 2026-10-11): "use null, never 0, and return
 * no_verdict on missing inputs."
 *
 * ONE shared definition of "this required pillar input is missing",
 * used by every consensus scorer:
 *
 *   - `null`            — the data layer never observed it (the P0-2
 *                         placeholder class: impossible/undefined P/E,
 *                         undefined ROE, concept-inapplicable bank
 *                         D/E and OPM). Missing, always.
 *   - `pe <= 0`         — no input set exists in which a zero (or
 *                         negative) P/E is a valuation observation:
 *                         a live P/E must be strictly positive (G5 —
 *                         0/negative is the provider sentinel), and a
 *                         seed 0 is the placeholder (Y4). Missing
 *                         regardless of provenance (the X6 rule).
 *   - `0` with seed     — Y4: a seed-sourced 0 is the June placeholder
 *     semantics          for UNKNOWN, not an observation. A LIVE-sourced
 *                         0 IS an observation (G5: debt-free D/E = 0,
 *                         promoter stake 0, stagnant CAGR 0, loss-year
 *                         ROE 0) and MUST score — the context carries
 *                         the provenance, so the same value scores or
 *                         not depending on where it came from.
 *   - anything else     — observed. Scores.
 *
 * Scorers call this for every REQUIRED pillar input and return
 * `score: null` (no verdict) when any is missing — the nemish X6
 * semantics, extended to the whole panel per the founder's P0-2 order.
 */
export type RequiredInputField =
  | 'pe' | 'roe' | 'opm' | 'de' | 'roce' | 'promo'
  | 'revcagr' | 'epscagr' | 'fcf' | 'np' | 'mktcap' | 'bvps'
  | 'ocf' | 'rev' | 'ca' | 'tl' | 'sh' | 'dep' | 'capex';

export function inputMissing(
  s: Stock,
  ctx: ScoringContext | undefined,
  field: RequiredInputField,
): boolean {
  const v = s[field];
  if (v === null) return true;
  if (field === 'pe') return v <= 0;
  if (v === 0) return ctx ? ctx.unknownFields.has(field) : true;
  return false;
}

/** The shared insufficient-data comp detail (one wording, rule 14). */
export function insuffDetail(what: string): string {
  return `insufficient data (seed placeholder — ${what} unknown, no verdict)`;
}
