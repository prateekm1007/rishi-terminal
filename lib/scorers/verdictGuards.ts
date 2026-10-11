import 'server-only';

import type { Stock, RishiScore } from '../types';
import type { ScoringContext } from '../consensus/orchestrator';
import { isLenderSector, inapplicableAmong, describeFields } from './sectorGate';
import { priceScoresPublic } from '../licensing';

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
  /**
   * P0-3: the lender policy. "field-gated" (the default) refuses a lender
   * row when any REQUIRED field is sector-inapplicable (de/opm/fcf/ca/tl
   * — the fields behind D/E, OPM, FCF, P/NCAV and the current ratio).
   * "refuse" refuses EVERY lender row: the framework's tests presume a
   * non-lender balance sheet even when its inputs compute. Greenblatt is
   * the one "refuse" declaration (founder: "Greenblatt must refuse
   * banks").
   */
  lenderPolicy?: 'refuse' | 'field-gated';
  /**
   * P0-8 (founder directive 2026-10-11): does this verdict READ a
   * price-derived input? true = the scorer's arithmetic (or a weighted
   * component of it) consumes P/E, market capitalisation or price — an
   * automated calculation on market data under NSE's non-display policy.
   * The classification is per-scorer (NOT derived from `required`
   * mechanically): Nemish's P/E leg is optional in its required list but
   * the verdict still reads it, so the honest declaration is "true".
   * REQUIRED (never optional): a scorer that has not declared cannot
   * compile, and an undeclared price read would silently bypass the
   * license gate.
   */
  priceBased: boolean;
}

export const SCORER_VERDICT_CONTRACT: Record<string, ScorerVerdictContract> = {
  Graham:        { name: 'Graham',        full: 'Benjamin Graham',   label: 'Deep Value',            origin: 'Global', required: ['pe', 'ca', 'tl', 'sh', 'price', 'de'], priceBased: true },
  Buffett:       { name: 'Buffett',       full: 'Warren Buffett',    label: 'Quality Moat',          origin: 'Global', required: ['roe', 'opm', 'np', 'dep', 'capex', 'mktcap', 'promo'], priceBased: true },
  Damani:        { name: 'Damani',        full: 'Radhakishan Damani',label: 'Zero-Debt Fortress',    origin: 'Bharat', required: ['de', 'roce', 'fcf', 'rev', 'opm'], priceBased: false },
  'Howard Marks':{ name: 'Howard Marks',  full: 'Howard Marks',      label: 'Risk Cycle',            origin: 'Global', required: ['de', 'pe', 'fcf', 'roe', 'price', 'bvps', 'mktcap'], priceBased: true },
  Jhunjhunwala:  { name: 'Jhunjhunwala',  full: 'Rakesh Jhunjhunwala',label: 'Conviction Multibagger',origin: 'Bharat', required: ['mktcap', 'ocf', 'revcagr', 'epscagr', 'opm', 'roce', 'de', 'promo', 'fcf', 'rev'], priceBased: true },
  Basant:        { name: 'Basant',        full: 'Basant Maheshwari', label: 'Consumption Growth',    origin: 'Bharat', required: ['revcagr', 'opm', 'pe'], priceBased: true },
  Kacholia:      { name: 'Kacholia',      full: 'Ashish Kacholia',   label: 'Whale Small-Cap Hunter',origin: 'Bharat', required: ['promo', 'epscagr', 'mktcap', 'roce'], priceBased: true },
  Kedia:         { name: 'Kedia',         full: 'Vijay Kedia',       label: 'SMILE Formula',         origin: 'Bharat', required: ['mktcap', 'de', 'opm', 'revcagr'], priceBased: true },
  Lynch:         { name: 'Lynch',         full: 'Peter Lynch',       label: 'GARP',                  origin: 'Global', required: ['pe', 'epscagr', 'fcf', 'revcagr'], priceBased: true },
  Munger:        { name: 'Munger',        full: 'Charlie Munger',    label: 'Mental Models',         origin: 'Global', required: ['roce', 'de', 'fcf', 'roe', 'promo'], priceBased: false },
  Nemish:        { name: 'Nemish',        full: 'Nemish Shah',       label: 'Steady Compounder',     origin: 'Bharat', required: ['epscagr', 'de', 'promo'], priceBased: true },
  Pabrai:        { name: 'Pabrai',        full: 'Mohnish Pabrai',    label: 'Dhandho Cloner',        origin: 'Global', required: ['promo', 'de', 'fcf', 'pe'], priceBased: true },
  'Philip Fisher':{name: 'Philip Fisher', full: 'Philip Fisher',     label: 'Scuttlebutt Growth',    origin: 'Global', required: ['promo', 'capex', 'rev', 'epscagr', 'mktcap'], priceBased: true },
  Porinju:       { name: 'Porinju',       full: 'Porinju Veliyath',  label: 'Contrarian Deep Value', origin: 'Bharat', required: ['pe', 'promo', 'bvps', 'price', 'revcagr'], priceBased: true },
  Raamdeo:       { name: 'Raamdeo',       full: 'Raamdeo Agrawal',   label: 'QGLP Framework',        origin: 'Bharat', required: ['roce', 'roe', 'revcagr', 'epscagr', 'de', 'pe'], priceBased: true },
  'Walter Schloss':{name: 'Walter Schloss',full: 'Walter Schloss',    label: 'Cigar Butt',            origin: 'Global', required: ['price', 'bvps', 'de', 'promo', 'mktcap'], priceBased: true },
  'Seth Klarman':{ name: 'Seth Klarman',  full: 'Seth Klarman',      label: 'Asymmetric Safety',     origin: 'Global', required: ['de', 'fcf', 'pe', 'price', 'bvps', 'opm', 'revcagr'], priceBased: true },
  Soros:         { name: 'Soros',         full: 'George Soros',      label: 'Reflexivity Macro',     origin: 'Global', required: ['ca', 'tl', 'sh', 'price', 'revcagr', 'de', 'epscagr'], priceBased: true },
  'John Templeton':{name: 'John Templeton',full: 'John Templeton',    label: 'Maximum Pessimism',     origin: 'Global', required: ['bvps', 'mktcap', 'pe', 'price'], priceBased: true },
  Greenblatt:    { name: 'Greenblatt',    full: 'Joel Greenblatt',   label: 'Magic Formula',         origin: 'Global', required: ['np', 'mktcap'], lenderPolicy: 'refuse', priceBased: true },
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

/**
 * P0-3: the sector refusal reasons. "inapplicable" — the named required
 * fields do not exist for this stock's sector; "lender-formula" — the
 * framework declares lenderPolicy "refuse" (Greenblatt).
 */
export type SectorRefusal =
  | { kind: 'inapplicable'; sector: string }
  | { kind: 'lender-formula'; sector: string };

/** The honest null verdict — attribution shell preserved, nothing fabricated. */
export function noVerdictScore(
  c: ScorerVerdictContract,
  missing: string[],
  sector?: SectorRefusal,
): RishiScore {
  const list = missing.join(', ');
  const insight = sector
    ? sector.kind === 'lender-formula'
      ? `No verdict \u2014 the ${c.full} ${c.label} framework does not apply to a ${sector.sector} company; its earnings-yield and return-on-capital tests presume a non-lender balance sheet.`
      : (() => { const d = describeFields(missing); return `No verdict \u2014 ${d.text} (fields ${d.rawList}) ${d.isAre} not applicable to a ${sector.sector} company; the ${c.full} framework does not score lender balance sheets on them.`; })()
    : `No verdict \u2014 ${list} ${missing.length > 1 ? 'are' : 'is'} a placeholder zero (unknown); the ${c.full} framework does not score missing data.`;
  return {
    name: c.name,
    full: c.full,
    label: c.label,
    score: null,
    origin: c.origin,
    comps: [],
    insight,
  };
}

/**
 * P0-8 — THE PRICE-LICENSE REFUSAL (round-47, founder directive
 * 2026-10-11: "Treat any price-based score as unresolved until NSE
 * answers in writing"). A price-based scorer refuses EVERY row while
 * `priceScoresPublic()` is false — the refusal is a PUBLICATION hold,
 * not a data property: the license state is global, so the verdict is
 * row-independent. Consulted by every scorer AFTER the sector gate and
 * the placeholder guard: a lender row keeps naming the sector truth, a
 * placeholder row keeps naming the unknown fields, and the license is
 * the LAST line nothing price-based crosses.
 */
export function licenseRefusal(scorerName: string): RishiScore | null {
  const contract = SCORER_VERDICT_CONTRACT[scorerName];
  if (!contract) {
    // Config defect, not a pass-through (rule 6): an unregistered name
    // must never silently score.
    throw new Error(
      `license gate: scorer "${scorerName}" has no SCORER_VERDICT_CONTRACT entry — declare it (lib/scorers/verdictGuards.ts) instead of scoring ungated`,
    );
  }
  if (priceScoresPublic()) return null;
  if (!contract.priceBased) return null;
  return {
    name: contract.name,
    full: contract.full,
    label: contract.label,
    score: null,
    origin: contract.origin,
    comps: [],
    // FD-26 (founder default, 11 Oct 2026): every price-based refusal
    // CARRIES the canonical label first; the P0-8 disclosure follows.
    insight: `Licence pending \u2014 no verdict: the ${contract.full} ${contract.label} framework is price-based: its verdict reads price-derived inputs (P/E, market capitalisation or price). Price-based scores are unresolved while the exchange-data licence is pending (NSE display / non-display enquiry, sent for a written answer); until it arrives they are own-use only and are not published here.`,
  };
}

/**
 * P0-3 — THE SECTOR GATE, the one refusal a scorer consults before its
 * placeholder guard. A lender row is refused when the framework declares
 * lenderPolicy "refuse" (Greenblatt) or when any REQUIRED field is
 * sector-inapplicable; every other row passes through untouched (the
 * gate is a no-op off the lender vocabulary — the positive control pins
 * it). Inapplicability is checked BEFORE the P0-2 placeholder guard:
 * the metric does not exist for the sector, which no observation can
 * cure.
 */
export function sectorRefusal(stock: Stock, scorerName: string): RishiScore | null {
  const contract = SCORER_VERDICT_CONTRACT[scorerName];
  if (!contract) {
    // Config defect, not a pass-through (rule 6): an unregistered name
    // must never silently score.
    throw new Error(
      `sector gate: scorer "${scorerName}" has no SCORER_VERDICT_CONTRACT entry — declare it (lib/scorers/verdictGuards.ts) instead of scoring ungated`,
    );
  }
  if (!isLenderSector(stock.sector)) return null;
  if (contract.lenderPolicy === 'refuse') {
    return noVerdictScore(contract, [], { kind: 'lender-formula', sector: stock.sector });
  }
  const fields = inapplicableAmong(stock.sector, contract.required);
  if (fields.length) {
    return noVerdictScore(contract, fields, { kind: 'inapplicable', sector: stock.sector });
  }
  return null;
}
