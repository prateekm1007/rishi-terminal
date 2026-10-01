// TICKER_REGISTRY_V2
//
// N1 (round 3): this module is PURE — it no longer imports the seed
// dataset. It sits on the client-reachable path (portfolio/watchlist/
// alerts localStorage migrations), and the seed must never enter the
// client bundle.
//
// - `resolveTickerAlias` resolves pure alias chains (renames + the known
//   mangled forms recorded in tickerAliases.json) without any universe
//   knowledge — safe for client code.
// - `resolveTickerSymbolAgainst` performs the FULL resolution (validity +
//   mangled-ampersand identity matching) against a symbol universe the
//   CALLER provides. Server callers pass Object.keys(STOCKS).
//
// The registry audit helpers that need full seed records live in
// lib/registry/registryAudit.ts (server/scripts only).

import { normalizeSector } from "./sectors";
import aliasMapRaw from "./tickerAliases.json";

/**
 * oldSymbol -> canonicalSymbol (remediation T12). Built from per-group
 * decisions against the currently trading NSE symbols; see the remediation
 * PR table for the evidence per group.
 */
export const TICKER_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(aliasMapRaw).filter(([k]) => !k.startsWith("$")),
);

/** Normalize a ticker key the way the seed data does for identity checks. */
export function normalizeTicker(symbol: string): string {
  return symbol
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Alias-chain resolution without a symbol universe (client-safe).
 * Follows recorded renames/mangled forms; returns the input unchanged
 * when no alias applies. Server paths should prefer
 * `resolveTickerSymbolAgainst` for full validation.
 */
export function resolveTickerAlias(symbol: string): string {
  if (!symbol || typeof symbol !== "string") return symbol;
  let sym = symbol.trim().toUpperCase();
  if (!sym) return symbol;
  const seen = new Set<string>([sym]);
  while (TICKER_ALIASES[sym] && !seen.has(TICKER_ALIASES[sym])) {
    sym = TICKER_ALIASES[sym];
    seen.add(sym);
  }
  return sym;
}

/**
 * Resolve any ticker (current, renamed or mangled legacy symbol) to a
 * canonical symbol IN the provided universe. Returns null for unknown
 * symbols. Handles chained aliases and mangled-ampersand identity
 * (e.g. MANDM for M&M); safe for arbitrary user input.
 */
export function resolveTickerSymbolAgainst(
  universe: readonly string[],
  symbol: string,
): string | null {
  if (!symbol || typeof symbol !== "string") return null;
  const known = new Set(universe);
  let sym = symbol.trim().toUpperCase();
  if (!sym) return null;
  if (known.has(sym)) return sym;

  // Direct alias hops
  const seen = new Set<string>([sym]);
  while (TICKER_ALIASES[sym] && !seen.has(TICKER_ALIASES[sym])) {
    sym = TICKER_ALIASES[sym];
    seen.add(sym);
    if (known.has(sym)) return sym;
  }
  // Mangled-ampersand forms (e.g. MANDM for M&M) via normalized identity
  const target = normalizeTicker(sym);
  for (const candidate of universe) {
    if (normalizeTicker(candidate) === target) return candidate;
  }
  return null;
}
