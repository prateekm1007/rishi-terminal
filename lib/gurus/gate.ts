// lib/gurus/gate.ts — the asset-side verdict gate (round-47 P0-5,
// founder order 2026-10-11: "Build one verdict gate. It returns verdict
// or no-verdict from dataQuality, and every surface calls it").
//
// The STOCK side gates inside lib/scoring (getStockScore nulls the
// consensus on seed/missing quality). This module is the same ONE gate
// for the asset-side guru verdicts (/api/gurus → the crypto and
// commodities rishis cards): a verdict computed over seed-quality inputs
// is withheld — score null, the honest category label, no pillar comps —
// identically to stocks.
//
// Pure and client-safe: no data imports, no clock, no network. The
// route derives the record's dataQuality (lib/dataQuality) and passes it
// here; nothing in this module can invent a verdict.

import type { DataQuality } from '../dataQuality';
import { noVerdictCategory, verdictsAllowed } from '../dataQuality';
import type { RishiScore } from '../types';

/** The gated verdict shape /api/gurus serves (score nulls on seed). */
export interface GatedGuruVerdict {
  id: string;
  name: string;
  score: number | null;
  label: string;
  insight: string;
  comps: Array<{ label: string; v: number; wt: number; detail: string }>;
}

/**
 * Gate one guru verdict by the record's dataQuality:
 *   - live | delayed → the computed verdict passes through untouched;
 *   - seed | missing → score null, the no-verdict category as the label,
 *     an insight that says WHY (reference inputs), and no comps —
 *     pillar bars over reference indicators are seed verdicts.
 */
export function gateAssetVerdict(
  v: RishiScore,
  dq: DataQuality,
): GatedGuruVerdict {
  if (verdictsAllowed(dq)) {
    return {
      id: v.name,
      name: v.name,
      score: v.score,
      label: v.label,
      insight: v.insight,
      comps: v.comps,
    };
  }
  return {
    id: v.name,
    name: v.name,
    score: null,
    label: noVerdictCategory(dq),
    insight:
      'No verdict — the indicator inputs for this asset are static reference data, not live observations. ' +
      'Verdicts return when live-sourced indicators land.',
    comps: [],
  };
}
