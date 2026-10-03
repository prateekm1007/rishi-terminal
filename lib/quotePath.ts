// lib/quotePath.ts — U2 (founder round 7): the shared-cache PRICE PATH.
//
// ONE classification + ONE serving surface for the shared quote cache
// (lib/quoteCache, migration 016/017):
//
//   classifyPriceSymbols() — which symbols belong to the shared NSE-equity
//   cache path. It reads livePrice's OWN routing sets (YAHOO_INDEX_SYMBOLS,
//   COINGECKO_IDS, the commodity tables, isBondSymbol) instead of a second
//   hand-written exclusion list — any symbol fetchLivePrice would route to a
//   non-equity branch stays on the direct path; everything else is an NSE
//   equity and serves from the shared cache. The batch route's previous
//   inline lists were the SAME classification maintained twice (Rule 14).
//
//   serveQuote() — the single-symbol surface: cachedQuote with the canonical
//   live-price path as the refresher, state mapped to wire status honestly:
//     stale-revalidated → LIVE (a fresh upstream observation just landed)
//     fresh | stale-served → CACHED (served from the shared cache)
//     miss → null (the caller renders explicit UNAVAILABLE)
//   The NSE market state (open / freshness / session date) rides on every
//   result so the client hook can adapt its polling cadence.
//
//   bulkRefreshQuotes() — the batch refresher wired into cachedQuoteBatch:
//   the Yahoo-bulk transport becomes the ONE upstream sweep for exactly the
//   symbols this request claimed (its 60 s instance cache + measurement
//   ledger keep working unchanged).

import { cachedQuote, cachedQuoteBatch, peekCachedQuote, peekCachedQuotes, type CachedQuote, type QuoteCacheBatchResult } from "@/lib/quoteCache";
import type { MarketState } from "@/lib/marketHours";
import {
  fetchLivePrice,
  isBondSymbol,
  COINGECKO_IDS,
  YAHOO_INDEX_SYMBOLS,
  YAHOO_COMMODITY_SYMBOLS,
  COMMODITY_NSE_SYMBOLS,
  COMMODITY_STATIC_USD,
  STOCK_ALIASES,
} from "@/lib/livePrice";

/** NSE-equity predicate: everything fetchLivePrice would NOT route to a
 *  non-equity branch. Do not add symbol lists here — add them to the
 *  corresponding livePrice routing set so both stay one source of truth. */
export function isEquitySymbol(symbol: string): boolean {
  return (
    !symbol.includes("/") &&
    !YAHOO_INDEX_SYMBOLS[symbol] &&
    !COINGECKO_IDS[symbol] &&
    !YAHOO_COMMODITY_SYMBOLS[symbol] &&
    !COMMODITY_NSE_SYMBOLS[symbol] &&
    !COMMODITY_STATIC_USD[symbol] &&
    !isBondSymbol(symbol)
  );
}

export function classifyPriceSymbols(symbols: string[]): {
  equities: string[];
  others: string[];
} {
  const equities: string[] = [];
  const others: string[] = [];
  for (const s of symbols) {
    (isEquitySymbol(s) ? equities : others).push(s);
  }
  return { equities, others };
}

export interface ServedQuote {
  symbol: string;
  price: number;
  /** Percent change when the source disclosed it; null is NOT 0 (Rule 16). */
  change: number | null;
  /** 24h volume when the upstream disclosed one, else null — NOT 0. */
  volume24h: number | null;
  source: string;
  status: "LIVE" | "CACHED";
  /** The upstream's own observation time, or null when it disclosed none —
   *  never the fetch/serve time. */
  observedAt: string | null;
  lastUpdated: string | null;
  /** NSE session state at serve time — lets the client hook stop/slow
   *  polling honestly (server decides, Rule 7). */
  marketOpen: boolean;
  marketFreshness: "live-delayed" | "close";
  sessionDate: string;
}

export interface ServeQuoteDeps {
  /** Overrides the canonical live-price refresher (tests inject stubs). */
  fetchUpstream?: (symbol: string) => Promise<CachedQuote | null>;
  nowMs?: () => number;
}

/** The canonical per-symbol refresher: fetchLivePrice's observation mapped
 *  into the cache row shape. Only genuine observations are written through
 *  (LIVE/CACHED statuses carry real upstream provenance; a STATIC/DERIVED
 *  value must never enter the shared cache — it would masquerade as a
 *  market observation for a full TTL window). */
async function fetchLivePriceAsCached(symbol: string): Promise<CachedQuote | null> {
  const p = await fetchLivePrice(symbol);
  if (!p || !Number.isFinite(p.price) || p.price <= 0) return null;
  if (p.status === "STATIC" || p.status === "DERIVED") return null;
  return {
    symbol,
    price: p.price,
    change: p.change ?? null,
    currency: "INR",
    source: p.source,
    observedAt: p.observedAt ?? null,
    refreshedAt: new Date().toISOString(), // cache metadata, NOT the observation time
    volume24h: p.volume24h ?? null,
  };
}

/** Shared row→wire mapping for the serving surfaces (serveQuote and the
 *  X3 peek below). The status is the CALLER's honest claim about how this
 *  value was produced. */
function toServedQuote(
  symbol: string,
  q: CachedQuote,
  market: MarketState,
  status: "LIVE" | "CACHED",
): ServedQuote {
  return {
    symbol,
    price: q.price,
    change: q.change,
    volume24h: q.volume24h,
    source: q.source,
    status,
    observedAt: q.observedAt,
    lastUpdated: q.observedAt,
    marketOpen: market.open,
    marketFreshness: market.freshness,
    sessionDate: market.sessionDate,
  };
}

export async function serveQuote(
  rawSymbol: string,
  deps: ServeQuoteDeps = {},
): Promise<ServedQuote | null> {
  // The alias must resolve BEFORE the cache key is chosen so one instrument
  // can never hold two cache rows (mirrors fetchLivePrice's own aliasing).
  const symbol = STOCK_ALIASES[rawSymbol] ?? rawSymbol;
  const r = await cachedQuote(symbol, {
    fetchUpstream: deps.fetchUpstream ?? fetchLivePriceAsCached,
    ...(deps.nowMs ? { nowMs: deps.nowMs } : {}),
  });
  if (!r.quote) return null;
  return toServedQuote(symbol, r.quote, r.market, r.state === "stale-revalidated" ? "LIVE" : "CACHED");
}

/**
 * X3 (Round 11): the SSR PEEK — the last cached quote, read-only.
 * No refresh claim, no upstream fetch, no write: the first byte renders
 * whatever the shared cache already holds (with its own observation time)
 * or nothing at all. The client hook's /api/prices call (the full
 * serveQuote path) is what warms the cache.
 */
export async function serveCachedQuote(rawSymbol: string): Promise<ServedQuote | null> {
  const symbol = STOCK_ALIASES[rawSymbol] ?? rawSymbol;
  const r = await peekCachedQuote(symbol);
  if (!r) return null;
  return toServedQuote(symbol, r.quote, r.market, "CACHED");
}

/** Batch peek (X3): ONE cache read for the whole SSR symbol list. Only
 *  symbols with a usable cached row are present in the result. */
export async function serveCachedQuotes(rawSymbols: string[]): Promise<Record<string, ServedQuote>> {
  const resolved = rawSymbols.map(s => STOCK_ALIASES[s] ?? s);
  const rows = await peekCachedQuotes(resolved);
  const out: Record<string, ServedQuote> = {};
  for (const [symbol, r] of Object.entries(rows)) {
    out[symbol] = toServedQuote(symbol, r.quote, r.market, "CACHED");
  }
  return out;
}

/** Batch refresher wired into cachedQuoteBatch (production wiring): the
 *  Yahoo-bulk transport sweeps exactly the claimed symbols in one pass.
 *  A symbol the upstream had nothing for maps to null — honest miss. */
export async function bulkRefreshQuotes(
  symbols: string[],
): Promise<Record<string, CachedQuote | null>> {
  const { fetchBulkPricesForSymbols } = await import("@/lib/nse/bulkFetch");
  const bulk = symbols.length > 0 ? await fetchBulkPricesForSymbols(symbols) : {};
  const out: Record<string, CachedQuote | null> = {};
  for (const symbol of symbols) {
    const b = bulk[symbol];
    out[symbol] =
      b && Number.isFinite(b.price) && b.price > 0
        ? {
            symbol,
            price: b.price,
            change: b.change ?? null,
            currency: "INR",
            source: "yahoo-bulk",
            observedAt: b.observedAt ?? null,
            refreshedAt: new Date().toISOString(),
            volume24h: b.volume ?? null,
          }
        : null;
  }
  return out;
}

export function cachedQuoteBatchForEquities(
  symbols: string[],
  nowMs?: () => number,
): Promise<QuoteCacheBatchResult> {
  return cachedQuoteBatch(symbols, {
    fetchUpstreamBatch: bulkRefreshQuotes,
    ...(nowMs ? { nowMs } : {}),
  });
}
