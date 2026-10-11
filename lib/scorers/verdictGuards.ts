import 'server-only';

import type { Stock, RishiScore } from '../types';
import type { ScoringContext } from '../consensus/orchestrator';

/**
 * Round-46 P0-2 — the SCORER VERDICT CONTRACT (founder audit 2026-10-11:
 * "use null, never 0, and return no_verdict on missing inputs").
 *
 * Before P0-2 the X6/Y4 contract (a seed-sourced 0 is the placeholder for
 * UNKNOWN, never an observation) was consumed by exactly ONE scorer
 * (Nemish, X6 Round 13) — the other nineteen read placeholder zeros as
 * facts: SBIN's D/E 0.00 scored "debt-free" passes in six frameworks on
 * the same input where Nemish returned no verdict. The panel disagreed
 * about what "unknown" means.
 *
 * This module is the one declaration that fixes it panel-wide:
 *
 *   - SCORER_VERDICT_CONTRACT — per scorer: the attribution shell
 *     (name/full/label/origin) and the numeric fields its verdict
 *     REQUIRES. A placeholder zero in any required field means the
 *     framework cannot honestly evaluate — score: null.
 *   - unknownAmong — which of those fields are placeholder unknowns for
 *     THIS input (the ScoringContext decides; no context = seed
 *     semantics, the fail-closed default: every zero is a placeholder).
 *   - noVerdictScore — the honest null verdict: attribution preserved,
 *     NO fabricated comps, an insight that names the unknown fields.
 *
 * A LIVE-sourced zero is a real observation (G5: a genuinely debt-free
 * company has D/E = 0) and still scores — the resolved path's context
 * carries that provenance, and the guard passes it through. Negative
 * observations are real and score (a downturn is an observation, not
 * missing data). Only the placeholder zero is refused.
 */

export interface ScorerVerdictContract {
  name: string;
  full: string;
  label: string;
  origin: 'Global' | 'India' | 'Bharat';
  /** The numeric Stock fields this verdict REQUIRES — a placeholder zero
   *  in any of them yields no_verdict (never an interpretation of zero). */
  required: readonly string[];
}

export const SCORER_VERDICT_CONTRACT: Record<string, ScorerVerdictContract> = {
  Graham:        { name: 'Graham',        full: 'Benjamin Graham',   label: 'Deep Value',            origin: 'Global', required: ['pe', 'ca', 'tl', 'sh', 'price', 'de'] },
  Buffett:       { name: 'Buffett',       full: 'Warren Buffett',    label: 'Quality Moat',          origin: 'Global', required: ['roe', 'opm', 'np', 'dep', 'capex', 'mktcap', 'promo'] },
  Damani:        { name: 'Damani',        full: 'Radhakishan Damani',label: 'Zero-Debt Fortress',    origin: 'Bharat', required: ['de', 'roce', 'fcf', 'rev', 'opm'] },
  'Howard Marks':{ name: 'Howard Marks',  full: 'Howard Marks',      label: 'Risk Cycle',            origin: 'Global', required: ['de', 'pe', 'fcf', 'roe', 'price', 'bvps', 'mktcap'] },
  Jhunjhunwala:  { name: 'Jhunjhunwala',  full: 'Rakesh Jhunjhunwala',label: 'Conviction Multibagger',origin: 'Bharat', required: ['mktcap', 'ocf', 'revcagr', 'epscagr', 'opm', 'roce', 'de', 'promo', 'fcf', 'rev'] },
  Basant:        { name: 'Basant',        full: 'Basant Maheshwari', label: 'Consumption Growth',    origin: 'Bharat', required: ['revcagr', 'opm', 'pe'] },
  Kacholia:      { name: 'Kacholia',      full: 'Ashish Kacholia',   label: 'Whale Small-Cap Hunter',origin: 'Bharat', required: ['promo', 'epscagr', 'mktcap', 'roce'] },
  Kedia:         { name: 'Kedia',         full: 'Vijay Kedia',       label: 'SMILE Formula',         origin: 'Bharat', required: ['mktcap', 'de', 'opm', 'revcagr'] },
  Lynch:         { name: 'Lynch',         full: 'Peter Lynch',       label: 'GARP',                  origin: 'Global', required: ['pe', 'epscagr', 'fcf', 'revcagr'] },
  Munger:        { name: 'Munger',        full: 'Charlie Munger',    label: 'Mental Models',         origin: 'Global', required: ['roce', 'de', 'fcf', 'roe', 'promo'] },
  Nemish:        { name: 'Nemish',        full: 'Nemish Shah',       label: 'Steady Compounder',     origin: 'Bharat', required: ['epscagr', 'de', 'promo'] },
  Pabrai:        { name: 'Pabrai',        full: 'Mohnish Pabrai',    label: 'Dhandho Cloner',        origin: 'Global', required: ['promo', 'de', 'fcf', 'pe'] },
  'Philip Fisher':{name: 'Philip Fisher', full: 'Philip Fisher',     label: 'Scuttlebutt Growth',    origin: 'Global', required: ['promo', 'capex', 'rev', 'epscagr', 'mktcap'] },
  Porinju:       { name: 'Porinju',       full: 'Porinju Veliyath',  label: 'Contrarian Deep Value', origin: 'Bharat', required: ['pe', 'promo', 'bvps', 'price', 'revcagr'] },
  Raamdeo:       { name: 'Raamdeo',       full: 'Raamdeo Agrawal',   label: 'QGLP Framework',        origin: 'Bharat', required: ['roce', 'roe', 'revcagr', 'epscagr', 'de', 'pe'] },
  'Walter Schloss':{name: 'Walter Schloss',full: 'Walter Schloss',    label: 'Cigar Butt',            origin: 'Global', required: ['price', 'bvps', 'de', 'promo', 'mktcap'] },
  'Seth Klarman':{ name: 'Seth Klarman',  full: 'Seth Klarman',      label: 'Asymmetric Safety',     origin: 'Global', required: ['de', 'fcf', 'pe', 'price', 'bvps', 'opm', 'revcagr'] },
  Soros:         { name: 'Soros',         full: 'George Soros',      label: 'Reflexivity Macro',     origin: 'Global', required: ['ca', 'tl', 'sh', 'price', 'revcagr', 'de', 'epscagr'] },
  'John Templeton':{name: 'John Templeton',full: 'John Templeton',    label: 'Maximum Pessimism',     origin: 'Global', required: ['bvps', 'mktcap', 'pe', 'price'] },
  Greenblatt:    { name: 'Greenblatt',    full: 'Joel Greenblatt',   label: 'Magic Formula',         origin: 'Global', required: ['np', 'mktcap'] },
};

/**
 * Which of the required fields are placeholder unknowns for THIS input.
 * The context decides (the resolved path marks exactly the seed-sourced
 * zeros); no context = bare-seed semantics, fail-closed: every zero is a
 * placeholder. A non-zero value is never "unknown" here — negative and
 * small observations are real (G5/Y4).
 *
 * P0-2b (the data-layer leg): a NULL value is unknown REGARDLESS of
 * provenance — the surgery moved the placeholder classes (impossible /
 * undefined P/E, undefined ROE, banking-inapplicable D/E and OPM) from
 * typed zeros to null at the data layer, so null is the "never observed"
 * marker itself. Live-sourced values are never null (the admissibility
 * gate), so this branch is seed/data-layer only.
 */
export function unknownAmong(
  stock: Stock,
  fields: readonly string[],
  ctx?: ScoringContext,
): string[] {
  return fields.filter((f) => {
    const v = (stock as unknown as Record<string, number | null>)[f];
    if (v === null) return true;
    if (v !== 0) return false;
    return ctx ? ctx.unknownFields.has(f) : true;
  });
}

/**
 * P0-2b: the type-level lift the guard pays for. `unknownAmong` proved
 * every required field observed (non-null), so the arithmetic below the
 * guard may treat the four nullable Stock fields as numbers. ONE cast,
 * justified by the guard directly above it — never use this without the
 * guard.
 */
export type ObservedStock = Stock & {
  pe: number;
  roe: number;
  opm: number;
  de: number;
};

export function observed(s: Stock): ObservedStock {
  return s as ObservedStock;
}

/** The honest null verdict — attribution shell preserved, nothing fabricated. */
export function noVerdictScore(c: ScorerVerdictContract, missing: string[]): RishiScore {
  const list = missing.join(', ');
  return {
    name: c.name,
    full: c.full,
    label: c.label,
    score: null,
    origin: c.origin,
    comps: [],
    insight: `No verdict \u2014 ${list} ${missing.length > 1 ? 'are' : 'is'} a placeholder zero (unknown); the ${c.full} framework does not score missing data.`,
  };
}
