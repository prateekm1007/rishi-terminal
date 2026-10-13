// lib/movers/types.ts — LIVE-TODAY (founder order, 2026-10-13) +
// NSEPERM/TODAY-FULL (founder order, 2026-10-14: "finish and tune it
// to world class now that we have permission … make sure the full today
// panel is populated on dashboard"): the Top Winners / Top Losers /
// Top Movers snapshot contract — now carrying the live Stock-of-the-Day
// pick — for the dashboard's Today view.
//
// Provenance contract (FD-15 class, Rules 1/3/16): every figure is
// nullable where its producer may not disclose it. A row's `source` is
// the transport id ("nse-movers", "yahoo-bulk", …) and `observedAt` is
// the UPSTREAM's own observation time — never the fetch time. The UI
// renders "Source · IST stamp" per row, or "— · no source yet" when the
// source is missing (the honest state, never a guessed attribution).

export type MoverKind = "gainer" | "loser" | "mover";

export interface MoverRow {
  kind: MoverKind;
  /** 1-based rank within the kind, in the producer's own order. */
  rank: number;
  /** NSE ticker, sanitized (uppercase, restricted charset). */
  symbol: string;
  /** Registry name when the symbol is tracked, else null. */
  name: string | null;
  /** Last traded price, INR. */
  price: number;
  /** Percent change when disclosed — null is NOT 0 (Rule 16). */
  changePct: number | null;
  /** Traded volume when disclosed — null is NOT 0. */
  volume: number | null;
  /** Transport id, or null when no source backs the row. */
  source: string | null;
  /** The upstream's own observation time (ISO), or null when it
   *  disclosed none — never the fetch time. */
  observedAt: string | null;
}

/** How the snapshot was produced — disclosed on the panel (Rule 3). */
export type MoversDerivation = "nse" | "computed";

/** TODAY-FULL (founder order, 2026-10-14): the LIVE Stock of the Day —
 *  the session's most-traded stock BY VALUE (price × volume), a raw
 *  market fact, NOT a verdict: no score, no rishi commentary, no
 *  advice (P0-1/P0-8 clean — the same raw-display class as the movers
 *  rows). Computed from the same gated quote-cache pool in the warm
 *  tick; every figure keeps its own provenance pair. */
export interface LivePick {
  symbol: string;
  /** Registry name when the symbol is tracked, else null. */
  name: string | null;
  /** Last traded price, INR. */
  price: number;
  /** Percent change when disclosed — null is NOT 0 (Rule 16). */
  changePct: number | null;
  /** Traded volume when disclosed — null is NOT 0. */
  volume: number | null;
  /** price × volume — the ranking key (the day's traded value). */
  turnover: number;
  /** Transport id, or null when no source backs the pick. */
  source: string | null;
  /** The upstream's own observation time (ISO), or null. */
  observedAt: string | null;
  /** How many tracked symbols were eligible for the pick (the
   *  disclosure: the pick is the top of a real, counted pool). */
  universeObserved: number;
}

export interface MoversSnapshot {
  gainers: MoverRow[];
  losers: MoverRow[];
  /** TODAY-MOVERS (founder order, 2026-10-13): the third panel — the
   *  biggest absolute swings across BOTH directions. ALWAYS computed
   *  from the shared quote cache over the tracked universe: NSE's
   *  movers endpoint ranks only its own gainers/losers, so a movers
   *  list built from those rows would be a lie by omission. */
  movers: MoverRow[];
  /** The movers list's own derivation — always "computed" when the
   *  cache read returned something, null when it returned nothing
   *  (the honest empty state, never a fabricated list). */
  moversDerivation: "computed" | null;
  /** Computed-movers path: the tracked symbols observed this session
   *  (the movers list's own coverage disclosure). */
  moversUniverseObserved: number | null;
  /** The production path that won (NSE endpoint vs quote-cache
   *  computation) — rendered as the panel's derivation line. */
  derivation: MoversDerivation;
  /** NSE path only: the universe that served ("ALL" | "NIFTY") — the
   *  derivation line's scope disclosure. Null on the computed path. */
  nseUniverse: string | null;
  /** TODAY-FULL: the live Stock of the Day (the session's most-traded
   *  by value), or null when the pool had nothing rankable — the
   *  honest empty state, never a fabricated pick. */
  pick: LivePick | null;
  /** Computed path: how many tracked symbols had a session-fresh
   *  observation to rank from. NSE path: null (NSE ranks its own
   *  universe and does not disclose the count). */
  universeObserved: number | null;
  /** When the warmer wrote this snapshot (ISO) — bookkeeping, NOT an
   *  observation time; each row carries its own observedAt. */
  writtenAt: string;
}
