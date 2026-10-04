// lib/dashboardSnapshot.ts — U2 (founder round 7), reworked X3, Y1, Y2
// (Round 12): the SSR initial-price snapshot for the dashboard.
//
// The homepage is ISR (revalidate 60 s, Y1). The W5 defect was the
// hourly-ISR bake serving an EMPTY build-time price snapshot as "fresh"
// for up to an hour after every deploy; X3 made every render dynamic and
// Y1 restores ISR with the honest labels that were missing in W5. On
// every REGENERATION (build excluded — see the build-phase guard below)
// this takes ONE cheap batch read of the shared quote cache for the
// symbols the page renders. The client hook (useLivePrices)
// hydrates from this snapshot and revalidates on mount, so any symbol
// the cache already holds reaches the first byte.
//
// Honesty contract (Rules 1/3/16):
//   - every mapped value keeps its ORIGINAL upstream observation time
//     (lastUpdated) — a cached quote may be minutes old and the label
//     travels with the value;
//   - a symbol with no cached observation is OMITTED — the page renders
//     the honest "price unavailable" state and the client hook's fetch
//     fills it (and warms the cache) — never a zero, never a placeholder;
//   - the build phase fetches NOTHING: prerender stays hermetic (CI has
//     no upstream network or database guarantees);
//   - SSR NEVER fetches vendors: the snapshot is a READ of the shared
//     quote cache and nothing else. Y2 widened WHAT that cache may hold —
//     the warmer keeps index/crypto/gold tile rows in it beside the NSE
//     equities — so tile symbols ride the same ONE batch read and reach
//     the first byte with their own observation labels. A tile the warmer
//     has not written yet is a plain miss: omitted, client fills.

import {
  serveCachedQuotes,
} from "@/lib/quotePath";

/** The wire shape hooks/useLivePrices already normalizes into PriceData. */
export interface InitialPriceEntry {
  price: number | null;
  change: number | null;
  changePercent24h: number | null;
  volume24h: number | null;
  lastUpdated: string | null;
  /** Round 9: the SSR snapshot carries the same provenance fields the
   *  client contract now transports — status/source verbatim from the
   * served observation, null when the source did not disclose one. */
  status: string | null;
  source: string | null;
}

/** Structural input for the PURE mapper: everything the two price paths
 *  (ServedQuote, PricePoint) and the UNAVAILABLE entry may carry. */
export interface PriceDataLike {
  price?: unknown;
  change?: unknown;
  changePercent24h?: unknown;
  volume24h?: unknown;
  lastUpdated?: unknown;
  status?: unknown;
  symbol?: unknown;
  source?: unknown;
  observedAt?: unknown;
  marketOpen?: unknown;
  marketFreshness?: unknown;
  sessionDate?: unknown;
}

/** PURE mapper: a served observation → the client PriceData contract.
 *  Nulls are preserved verbatim — a field the source did not disclose stays
 *  null (Rule 16); an UNAVAILABLE/unusable point maps to null so the caller
 *  omits the symbol entirely. */
export function toPriceData(point: PriceDataLike | null | undefined): InitialPriceEntry | null {
  if (!point) return null;
  if (point.status === "UNAVAILABLE") return null;
  const price = typeof point.price === "number" && Number.isFinite(point.price) ? point.price : null;
  if (price === null || price <= 0) return null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    price,
    change: num(point.change),
    changePercent24h: point.changePercent24h !== undefined ? num(point.changePercent24h) : num(point.change),
    volume24h: num(point.volume24h),
    lastUpdated: typeof point.lastUpdated === "string" && point.lastUpdated ? point.lastUpdated : null,
    // Round 9: provenance rides through the SSR snapshot too — verbatim
    // when disclosed, null otherwise (never guessed, Rule 16).
    status: typeof point.status === "string" && point.status ? point.status : null,
    source: typeof point.source === "string" && point.source ? point.source : null,
  };
}

/** True while `next build` prerenders — no upstream network in the build. */
export function isBuildPhase(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PHASE === "phase-production-build";
}

/**
 * One snapshot for the dashboard's symbol list (X3: a cheap cache read;
 * Y2: the read is class-agnostic — equities AND the warmer-kept tiles).
 * ONE batch peek of the shared quote cache; every symbol without a usable
 * cached row is omitted (the client hook fills them and its /api/prices
 * call is what warms the cache for classes the warmer does not sweep).
 */
export async function initialPriceSnapshot(
  symbols: string[],
  env: Record<string, string | undefined> = process.env,
): Promise<Record<string, InitialPriceEntry>> {
  if (symbols.length === 0 || isBuildPhase(env)) return {};

  const served = await serveCachedQuotes(symbols);
  const snapshot: Record<string, InitialPriceEntry> = {};
  for (const [symbol, quote] of Object.entries(served)) {
    const mapped = toPriceData(quote);
    if (mapped) snapshot[symbol] = mapped;
  }
  return snapshot;
}
