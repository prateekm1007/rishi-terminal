// lib/dashboardSnapshot.ts — U2 (founder round 7): the SSR initial-price
// snapshot for the dashboard.
//
// The homepage is a server component on hourly ISR. At revalidation time it
// fetches ONE snapshot of the dashboard's symbols through the SAME price
// path the client endpoints use (serveQuote for NSE equities — the shared
// quote cache; fetchLivePrice for the other classes) and passes it down as
// RSC props. The client hook (useLivePrices) hydrates from this snapshot and
// revalidates immediately on mount, so the first paint carries prices
// without a fetch flash.
//
// Honesty contract (Rules 1/3/16):
//   - every mapped value keeps its ORIGINAL upstream observation time
//     (lastUpdated) — the ISR snapshot may be up to one revalidation window
//     old, and the label travels with the value;
//   - a symbol with no observation is OMITTED (the client hook's normal
//     fetch fills it) — never a zero, never a placeholder;
//   - the build phase fetches NOTHING: prerender must stay hermetic (CI has
//     no upstream network guarantees). Runtime ISR revalidations populate
//     the snapshot normally.

import {
  isEquitySymbol,
  serveQuote,
} from "@/lib/quotePath";
import { fetchLivePrice } from "@/lib/livePrice";

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
 * One snapshot for the dashboard's symbol list. Equities ride the shared
 * quote cache (serveQuote); everything else rides the direct multi-source
 * path — the SAME split the /api/prices routes use, so SSR and client
 * fetches can never disagree about where a number comes from.
 */
export async function initialPriceSnapshot(
  symbols: string[],
  env: Record<string, string | undefined> = process.env,
): Promise<Record<string, InitialPriceEntry>> {
  if (symbols.length === 0 || isBuildPhase(env)) return {};

  const results = await Promise.allSettled(
    symbols.map(s => (isEquitySymbol(s) ? serveQuote(s) : fetchLivePrice(s))),
  );

  const snapshot: Record<string, InitialPriceEntry> = {};
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return; // rejected → omitted (honest gap)
    const mapped = toPriceData(r.value);
    if (mapped) snapshot[symbols[i]] = mapped;
  });
  return snapshot;
}
