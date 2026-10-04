import 'server-only';

// N1 (round 3): the consensus engine is server-only. RISHI_WEIGHT_CONFIG
// (public methodology metadata rendered by client RishiGrid components)
// moved to lib/gurus/weights.ts; this module keeps the engine-side
// consumers of it and must never be imported from a client component.
import { RishiScore } from "./types";
import { RISHI_WEIGHT_CONFIG } from "../gurus/weights";

export { RISHI_WEIGHT_CONFIG };

const WEIGHT_MAP: Record<string, number> = Object.fromEntries(
  RISHI_WEIGHT_CONFIG.map(r => [r.name, r.weight])
);

/**
 * X6 (Round 13): fail-closed weight lookup (Rule 6). The historical
 * `?? 1.0` fallback silently re-badged any mis-named scorer as a
 * Specialist — and it actually happened: 'HowardMarks'/'SethKlarman'/
 * 'PhilipFisher'/'Templeton'/'Schloss' in RISHI_WEIGHT_CONFIG never
 * matched the engine's scorer names ('Howard Marks' etc.), so two Masters
 * (configured weight 2.0) were weighted 1.0 in every consensus ever
 * computed while the stock page badged them Specialists. An unconfigured
 * scorer is a config defect, not a Specialist: it throws, and
 * test/x6.consensusGates.test.ts pins that every registry scorer is
 * explicitly configured so the throw cannot fire in production.
 */
export function getWeight(name: string): number {
  const w = WEIGHT_MAP[name];
  if (w === undefined) {
    throw new Error(
      `consensus weight lookup failed: scorer "${name}" has no RISHI_WEIGHT_CONFIG entry — add one (lib/gurus/weights.ts) instead of falling back to 1.0`,
    );
  }
  return w;
}

/**
 * Minimum number of valid (finite, non-null) scorer results required to
 * produce a consensus (remediation T11). Chosen as 12 of 20: a majority of
 * the panel. Quorum composition guarantee (X6, computed not asserted):
 * only 10 non-Specialists exist, so ANY 12 valid scorers include at least
 * 2 Specialists — a consensus always carries Specialist voices. Legend and
 * Master presence is NOT guaranteed by the quorum alone (a 10-Specialist +
 * 2-Master quorum is possible and is still a panel majority); their
 * influence is carried by weight, not by quorum mechanics. Below 12 the
 * consensus is `null` — "Insufficient Data" — displayed as "—" and sorted
 * last, never coerced to 0.
 */
export const MIN_VALID_SCORERS = 12;

export function weightedAverage(scores: RishiScore[]): number | null {
  const valid = scores.filter(s => s.score !== null && Number.isFinite(s.score));
  if (valid.length < MIN_VALID_SCORERS) return null;
  let totalWeighted = 0;
  let totalWeight   = 0;
  for (const s of valid) {
    const w = getWeight(s.name);
    totalWeighted += (s.score as number) * w;
    totalWeight   += w;
  }
  return Math.round(totalWeighted / totalWeight);
}
