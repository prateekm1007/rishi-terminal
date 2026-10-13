// lib/movers/types.ts — LIVE-TODAY (founder order, 2026-10-13): the
// Top Winners / Top Losers snapshot contract for the dashboard's Today
// view.
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
  /** Computed path: how many tracked symbols had a session-fresh
   *  observation to rank from. NSE path: null (NSE ranks its own
   *  universe and does not disclose the count). */
  universeObserved: number | null;
  /** When the warmer wrote this snapshot (ISO) — bookkeeping, NOT an
   *  observation time; each row carries its own observedAt. */
  writtenAt: string;
}
