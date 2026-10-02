import 'server-only';

import type { ConsensusResult, RishiScore } from './types';

/**
 * Remediation R3 + Commit M3: server-side sanitization of per-Rishi
 * verdicts before they cross any network/RSC boundary.
 *
 * The FULL ConsensusResult (every Rishi's score, score components and
 * narrative insight) is computed server-side and sanitized here — the
 * client receives RESULTS, never the engine (N1). Under the free-access
 * product (founder decision 2026-10-02) there is NO visibility slice:
 * every caller receives every verdict. The historical tier-slice parameter
 * was removed; if a surface needs a bounded LIST summary for payload
 * budget, it slices its own display rows (lib/scoring/slimIndex.ts) and
 * says so — that is a transport decision, never an entitlement.
 *
 * This module is server-only: importing it from client code is a build
 * error, which keeps the sanitization decision physically on the server.
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
  /** How many Rishi verdicts exist in total. */
  scoresCount: number;
  topBull: TrimmedVerdict;
  topBear: TrimmedVerdict;
  /** Per-Rishi verdicts — ALL of them (free access: no visibility slice). */
  verdicts: RishiScore[];
}

const trim = (r: RishiScore): TrimmedVerdict => ({
  name: r.name,
  full: r.full,
  label: r.label,
  score: r.score,
});

export function sanitizeConsensus(consensus: ConsensusResult): SanitizedConsensus {
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
    // Free access: every verdict crosses — there is no hidden remainder.
    verdicts: consensus.scores,
  };
}
