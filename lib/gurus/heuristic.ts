// lib/gurus/heuristic.ts — the heuristic-reference output contract for
// the asset-side guru cards (FD-23, founder order 11 Oct 2026, recorded
// in docs/ROADMAP.md and the incident log B-28).
//
// Founder's words, verbatim: "Crypto cards score and category back on
// reference data."
//
// P0-5 (round 47) withheld the crypto and commodity guru verdicts entirely
// when the record's inputs are static reference data ("No Verdict — Seed
// Data"). FD-23 REVERSES that for the asset-side guru cards: the score and
// the P0-6 category are served again — as a SEPARATE OUTPUT TYPE, never as
// a verdict:
//
//   - every card is labelled "Heuristic reference — static reference
//     inputs, not a verdict";
//   - the card carries the source of those inputs, its attribution and an
//     as-of time;
//   - the verdict content (insight, pillar comps) stays withheld;
//   - the closed dataQuality vocabulary (live/delayed/seed/missing) is
//     UNCHANGED — "reference" is an output type here, not a data-quality
//     class (the founder's explicit instruction);
//   - stock verdicts stay gated on seed data (the stock-side P0-5 rule is
//     untouched).
//
// CLIENT-SAFE (no 'server-only', no data imports): the card components
// import the label + provenance to render, mirroring lib/licensing.ts and
// lib/dataQuality.ts. Pure constants and one pure string builder.

/** The exact card label the founder specified (do not paraphrase). */
export const GURU_HEURISTIC_LABEL =
  'Heuristic reference — static reference inputs, not a verdict';

/**
 * The provenance of the static reference inputs the heuristic reads.
 *
 * R1 (never stamp a date on data that has none): the crypto indicators
 * (RSI, 200D MA, ATH distance) and the commodity indicators (52-week
 * range, contango, inventory days, supercycle phase) are compile-time
 * reference values with NO provable capture date — exactly like the stock
 * seed dataset (data/stocks/seedMeta.ts: SEED_CAPTURED_AT = null). The
 * as-of field therefore renders the honest "no provable capture date",
 * never a fabricated date.
 */
export const GURU_HEURISTIC_META = {
  source: 'Rishi Terminal static reference dataset',
  attribution:
    'Rishi Terminal — compile-time reference inputs, not a market-data provider feed',
  asOf: null as string | null,
  asOfNote: 'no provable capture date for the static reference inputs',
} as const;

/** The one-line provenance string every guru card renders. */
export function guruHeuristicProvenanceLine(): string {
  const asOf = GURU_HEURISTIC_META.asOf ?? `— ${GURU_HEURISTIC_META.asOfNote}`;
  return `Source: ${GURU_HEURISTIC_META.source} · Attribution: ${GURU_HEURISTIC_META.attribution} · As of: ${asOf}`;
}

/**
 * FD-25 (founder order 11 Oct 2026): "Keep Michael Saylor and Vitalik as
 * persona labels." — every asset-side guru card carries the
 * simulated-persona label. The P0-7 rules still apply: no quotations and
 * no first-person speech as the real person (the quote fields are deleted
 * from the guru metadata; nothing attributed to a real person renders).
 */
export const SIMULATED_PERSONA_LABEL = 'Simulated Persona';
