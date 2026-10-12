// lib/gurus/gate.ts — the asset-side guru-card gate.
//
// Round-47 P0-5 (founder order 2026-10-11: "Build one verdict gate. It
// returns verdict or no-verdict from dataQuality, and every surface calls
// it") withheld the crypto and commodity guru verdicts over seed-quality
// inputs — score null, "No Verdict — Seed Data", no comps.
//
// FD-23 (founder order 11 Oct 2026, recorded in docs/ROADMAP.md and the
// incident log B-28) REVERSES that for the asset-side guru cards on
// reference data, words verbatim: "Crypto cards score and category back
// on reference data." The gate now emits THREE output types:
//
//   - 'verdict'            (live | delayed inputs) — the computed verdict
//     passes through untouched, plus its P0-6 category;
//   - 'heuristic-reference' (seed inputs — static reference indicators)
//     — the score and the P0-6 category are served as a SEPARATE OUTPUT
//     TYPE, never as a verdict: the card label is the founder's exact
//     "Heuristic reference — static reference inputs, not a verdict", the
//     verdict content (insight, comps) stays withheld;
//   - 'no-verdict'          (missing inputs) — nothing to compute on.
//
// The closed dataQuality vocabulary is UNCHANGED (live/delayed/seed/
// missing — no "reference" class); the heuristic is an output type, not a
// data-quality value. The STOCK side gates inside lib/scoring
// (getStockScore nulls the consensus on seed/missing quality) and is
// untouched by this reversal: stocks show no verdict on seed data.
//
// Pure and client-safe: no data imports, no clock, no network. The
// route derives the record's dataQuality (lib/dataQuality) and passes it
// here; nothing in this module can invent a verdict.

import type { DataQuality } from '../dataQuality';
import { noVerdictCategory, verdictsAllowed } from '../dataQuality';
import { actionLabel, getAction } from '../scorers/types';
import type { RishiScore } from '../types';
import { GURU_HEURISTIC_LABEL } from './heuristic';

/** The output-type vocabulary — separate from the dataQuality vocabulary
 *  (FD-23: "reference" is an output type, never a data-quality class). */
export type GuruOutputType = 'verdict' | 'heuristic-reference' | 'no-verdict';

/** The gated guru-card shape /api/gurus serves. */
export interface GatedGuruVerdict {
  id: string;
  name: string;
  outputType: GuruOutputType;
  score: number | null;
  /** The P0-6 category (actionLabel of the score, UPSIDE mode) — null
   *  exactly when the score is null. The ONE sanctioned render vocabulary
   *  (rule 14): no BUY, SELL, HOLD or AVOID can appear. */
  category: string | null;
  /** 'verdict' → the scorer's own descriptor; otherwise the honest
   *  output-type label the card renders. */
  label: string;
  insight: string;
  comps: Array<{ label: string; v: number; wt: number; detail: string }>;
}

/** The P0-6 category for a score — the one vocabulary, reused (rule 14). */
export function guruCategory(score: number): string {
  return actionLabel(getAction(score, 'UPSIDE'));
}

function categoryFor(score: number | null): string | null {
  return score === null ? null : guruCategory(score);
}

/**
 * Gate one guru card by the record's dataQuality:
 *   - live | delayed → 'verdict': the computed verdict passes through
 *     untouched, plus its P0-6 category;
 *   - seed → 'heuristic-reference' (FD-23): the score and the P0-6
 *     category are served as a heuristic-reference output — the founder's
 *     exact label, and NO verdict content (insight '', comps []);
 *   - missing → 'no-verdict': the honest nothing-to-compute-on state.
 */
export function gateAssetVerdict(
  v: RishiScore,
  dq: DataQuality,
): GatedGuruVerdict {
  if (verdictsAllowed(dq)) {
    return {
      id: v.name,
      name: v.name,
      outputType: 'verdict',
      score: v.score,
      category: categoryFor(v.score),
      label: v.label,
      insight: v.insight,
      comps: v.comps,
    };
  }
  if (dq === 'seed') {
    return {
      id: v.name,
      name: v.name,
      outputType: 'heuristic-reference',
      score: v.score,
      category: categoryFor(v.score),
      label: GURU_HEURISTIC_LABEL,
      insight: '',
      comps: [],
    };
  }
  return {
    id: v.name,
    name: v.name,
    outputType: 'no-verdict',
    score: null,
    category: null,
    label: noVerdictCategory(dq),
    insight:
      'No verdict — no usable data for this asset; nothing to compute a heuristic or a verdict on.',
    comps: [],
  };
}
