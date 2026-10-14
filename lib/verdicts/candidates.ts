// lib/verdicts/candidates.ts — TODAY-NIFTY (founder order, 2026-10-14:
// "expand the candidate set toward the licensed Nifty 50 (the pipeline
// needs only a list change)").
//
// The candidate set's ONE derivation (rule 14): NSE's own Nifty-50
// constituent list (the licensed source — the same permission letter
// that covers the movers endpoint covers the index-constituents family)
// filtered to the REGISTRY (rule 9 — the tracked universe; the verdict
// producer refuses unknowns anyway, so an untracked constituent is
// skipped here once and DISCLOSED via the counts rather than refused
// per-tick as noise).
//
// The founder-confirmed five (VERDICT_CANDIDATES, #418) remain the
// FLOOR: any honest miss on the NSE source — the development egress's
// Akamai 403, a schema drift, a truncated payload — serves the five,
// disclosed as the source it is. Nothing expands silently and nothing
// shrinks silently (a truncated parse below MIN_NIFTY_CONSTITUENTS is
// rejected as the schema-drift class it is).
//
// PURE: no clock, no transport — the NSE fetch lives in
// lib/movers/nse.ts (the transport owner), the once-per-day caching in
// lib/verdicts/warm.ts.

import { STOCKS } from "@/data/stocks";
import { VERDICT_CANDIDATES } from "./produce";

/** Where the candidate set came from — the disclosure's backbone. */
export type CandidateSetSource = "nifty50-nse" | "founder-five";

export interface CandidateSet {
  /** The candidate symbols: registry-tracked, deduped, sorted A-Z
   * (deterministic — the order a run processes them). */
  symbols: string[];
  source: CandidateSetSource;
  /** NSE's own constituent count BEFORE the registry filter (the
   * disclosure: "Nifty 50 per NSE — 50 constituents, N tracked"), or
   * null on the founder-five floor. */
  universeSize: number | null;
}

/**
 * A real Nifty-50 payload carries ~50 constituents (the index row is
 * dropped by the symbol sanitizer). A parse that survives zod but yields
 * fewer than this is a truncated/edge payload — the schema-drift class —
 * and MUST NOT replace the founder-confirmed five: a shrunken candidate
 * set would silently reduce coverage (C9: the expansion may not trade
 * away the coverage it exists to grow).
 */
export const MIN_NIFTY_CONSTITUENTS = 30;

/**
 * The REGISTRY KEY for an NSE constituent symbol, or null when the
 * registry does not track it. NSE spells some tickers with hyphens
 * (BAJAJ-AUTO) while the registry's own convention omits them
 * (BAJAJAUTO) — the hyphen-stripped variant is tried second, and the
 * REGISTRY key is what returns (the producer looks candidates up by
 * it). A genuinely untracked constituent (e.g. a recent index entrant
 * the registry has not onboarded) is null — skipped once, disclosed
 * via the universe-vs-tracked counts, never a per-tick refusal.
 */
export function registryKeyForNseSymbol(raw: string): string | null {
  const sym = raw.trim().toUpperCase();
  if (!sym) return null;
  if (sym in STOCKS) return sym;
  const stripped = sym.replace(/-/g, "");
  if (stripped !== sym && stripped in STOCKS) return stripped;
  return null;
}

/**
 * Derive the candidate set from the NSE constituent list (or the honest
 * floor). PURE and total: every input maps to a set.
 */
export function candidateSetFromNifty(
  nifty: { symbols: string[]; observedAt: string | null } | null,
): CandidateSet {
  if (!nifty || nifty.symbols.length < MIN_NIFTY_CONSTITUENTS) {
    return {
      symbols: [...VERDICT_CANDIDATES],
      source: "founder-five",
      universeSize: null,
    };
  }
  const universeSize = nifty.symbols.length;
  const tracked = new Set<string>();
  for (const raw of nifty.symbols) {
    const key = registryKeyForNseSymbol(raw);
    if (key) tracked.add(key);
  }
  if (tracked.size === 0) {
    // A registry-empty intersection is pathological (the Nifty 50 is
    // core large caps) — the floor serves rather than an empty set
    // (an empty candidate set would silently stop all production).
    return {
      symbols: [...VERDICT_CANDIDATES],
      source: "founder-five",
      universeSize: null,
    };
  }
  return {
    symbols: [...tracked].sort(),
    source: "nifty50-nse",
    universeSize,
  };
}
