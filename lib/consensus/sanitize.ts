import 'server-only';

import type { ConsensusResult, RishiScore } from './types';

/**
 * Remediation R3: server-side tier gating for per-Rishi verdicts.
 *
 * The FULL ConsensusResult (every Rishi's score, score components and
 * narrative insight) is PAID content beyond the tier's free set. It must be
 * computed server-side and sanitized here BEFORE it crosses any
 * network/RSC boundary — the client never receives paid verdicts for a
 * lower tier, and UI hiding is UX only, never the control.
 *
 * This module is server-only: importing it from client code is a build
 * error, which keeps the gating decision physically on the server.
 */

/** Verdict attribution safe to show as part of the free consensus view. */
export interface TrimmedVerdict {
  name: string;
  full: string;
  label: string;
  /** null = insufficient data (T11) — rendered as an em dash. */
  score: number | null;
}

export interface SanitizedConsensus {
  /** THE free consensus number. */
  consensus: number | null;
  category: string;
  dataQuality: 'OK' | 'INCOMPLETE';
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  /** How many Rishi verdicts exist in total (for locked-count UI). */
  scoresCount: number;
  topBull: TrimmedVerdict;
  topBear: TrimmedVerdict;
  /** Per-Rishi verdicts, LIMITED to the caller's tier visibility. */
  verdicts: RishiScore[];
}

const trim = (r: RishiScore): TrimmedVerdict => ({
  name: r.name,
  full: r.full,
  label: r.label,
  score: r.score,
});

export function sanitizeConsensus(
  consensus: ConsensusResult,
  visibleCount: number,
): SanitizedConsensus {
  return {
    consensus: consensus.consensus,
    category: consensus.category,
    dataQuality: consensus.dataQuality,
    tension: consensus.tension,
    tensionSpread: consensus.tensionSpread,
    weightedBy: consensus.weightedBy,
    scoresCount: consensus.scores.length,
    topBull: trim(consensus.topBull),
    topBear: trim(consensus.topBear),
    // Server-side tier slice: a seeker never receives verdict 6..20, so no
    // client code can reveal them.
    verdicts: consensus.scores.slice(0, Math.max(0, visibleCount)),
  };
}
