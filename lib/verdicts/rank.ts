// lib/verdicts/rank.ts — TODAY-NIFTY (founder order, 2026-10-14:
// "eventually rank 'Top Buy Signals / Short Radar' from the verdicts
// ledger as coverage grows").
//
// The LEDGER-SOURCED rankings for the dashboard's two ranked panels.
// The registry path (lib/scoring/rankings.ts — rankTopBuy /
// computeShortRadar over the seed dataset, the P0-1 gate nulling every
// seed consensus) stays what it is: its pools are honestly EMPTY on the
// current dataset, which is why the panels render the awaiting copy.
// The verdicts LEDGER now carries live-fundamentals verdicts; these
// pure functions rank TODAY'S produced rows:
//
//   - Top Buy Signals: highest consensus first;
//   - Short Radar: lowest consensus first (the weakest live-fundamentals
//     records — NOT the QVPS trigger-flag screen, which stays the
//     registry path's own semantic; the panel's basis line states
//     exactly what is ranked);
//   - deterministic tie-breaks (symbol A-Z) — rule 18 clean, pure
//     functions of the ledger face.
//
// THE COVERAGE GATE: a "top 6 of 3" is not a ranking — the panels
// populate only when the day's pool reaches
// VERDICT_RANKINGS_MIN_COVERAGE (the founder-confirmed five's size, the
// original candidate set). Below it, the awaiting copy renders with the
// live count disclosed (verdictCoverageLine) — the gate must BITE (C5,
// pinned in test/verdicts.rank.test.ts).
//
// The wording (basis + coverage lines) lives HERE — one wording owner
// (rule 14), the same FD-15 class as verdictsRowText: every figure
// carries its own provenance, and the not-advice framing every scoring
// surface carries is present on both lines.

import type { DataQuality } from "@/lib/dataQuality";
import type { VerdictsTodayFace } from "./types";

/** The panels populate once the day's pool reaches this many produced
 * verdicts (the founder-confirmed five's size — the original candidate
 * set). Below it the awaiting copy renders with the live count. */
export const VERDICT_RANKINGS_MIN_COVERAGE = 5;

/** One ranked row — the ledger's own fields, nothing re-derived.
 * dataQuality is live|delayed on every produced row by construction
 * (the P0-1 gate refuses seed/missing upstream of the ledger; the
 * store's zod enum enforces it at the read boundary) — typed as the
 * vocabulary's DataQuality to mirror the face it copies. */
export interface RankedVerdictRow {
  symbol: string;
  name: string | null;
  consensus: number;
  category: string;
  dataQuality: DataQuality;
  fundamentalsSource: string | null;
  producedAt: string;
}

/** A panel's ranking: the rows (empty when not eligible) + the
 * coverage disclosure. */
export interface VerdictRanking {
  rows: RankedVerdictRow[];
  /** Today's produced count (the pool the ranking draws from). */
  coverage: number;
  /** coverage >= VERDICT_RANKINGS_MIN_COVERAGE — the panels' gate. */
  eligible: boolean;
}

function rowsFromFace(face: VerdictsTodayFace | null): RankedVerdictRow[] {
  if (!face) return [];
  return face.today.map((v) => ({
    symbol: v.symbol,
    name: v.name,
    consensus: v.consensus,
    category: v.category,
    dataQuality: v.dataQuality,
    fundamentalsSource: v.fundamentalsSource,
    producedAt: v.producedAt,
  }));
}

function ranking(rows: RankedVerdictRow[], compare: (a: RankedVerdictRow, b: RankedVerdictRow) => number, n: number): VerdictRanking {
  const coverage = rows.length;
  const eligible = coverage >= VERDICT_RANKINGS_MIN_COVERAGE;
  if (!eligible) return { rows: [], coverage, eligible: false };
  const sorted = [...rows].sort(compare).slice(0, n);
  return { rows: sorted, coverage, eligible: true };
}

/**
 * Top Buy Signals — highest consensus among today's produced verdicts,
 * symbol A-Z on ties.
 */
export function rankVerdictTopBuy(face: VerdictsTodayFace | null, n = 6): VerdictRanking {
  return ranking(
    rowsFromFace(face),
    (a, b) => b.consensus - a.consensus || a.symbol.localeCompare(b.symbol),
    n,
  );
}

/**
 * Short Radar — the LOWEST-consensus verdicts among today's produced
 * records (the weakest live-fundamentals findings), symbol A-Z on ties.
 */
export function rankVerdictShortRadar(face: VerdictsTodayFace | null, n = 3): VerdictRanking {
  return ranking(
    rowsFromFace(face),
    (a, b) => a.consensus - b.consensus || a.symbol.localeCompare(b.symbol),
    n,
  );
}

/** The Top Buy panel's basis line — what is ranked, from where, and the
 * not-advice framing. */
export function verdictTopBuyBasis(r: VerdictRanking): string {
  return (
    `Ranked by Rishi consensus among ${r.coverage} live-fundamentals verdicts produced today ` +
    "(a heuristic score, not investment advice)"
  );
}

/** The Short Radar panel's basis line — states its own semantic (the
 * lowest-consensus live records), never the QVPS flag screen's. */
export function verdictShortRadarBasis(r: VerdictRanking): string {
  return (
    `The lowest-consensus verdicts among ${r.coverage} produced today on live fundamentals, ` +
    "lowest consensus first — a research screen, not investment advice"
  );
}

/** The awaiting panels' coverage line — the live count against the
 * gate, so the progress is visible and the empty state is explained by
 * data, not by a claim. */
export function verdictCoverageLine(coverage: number, min: number = VERDICT_RANKINGS_MIN_COVERAGE): string {
  if (coverage <= 0) {
    return `No live-fundamentals verdicts produced today yet — the ranked panels populate once the daily pool reaches ${min}.`;
  }
  return `${coverage} live-fundamentals verdict${coverage === 1 ? "" : "s"} produced today — the ranked panels populate once the daily pool reaches ${min}.`;
}
