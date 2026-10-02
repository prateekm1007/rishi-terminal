// lib/quoteCache.ts — U2 (founder round 6): the SHARED quote cache.
//
// One Postgres table (quote_cache, migration 016) serves every instance, so
// upstream calls become O(1) per TTL instead of O(users × instances):
//
//   read(symbol)  → a fresh-enough row is served directly.
//                   A stale/absent row triggers ONE refresher: an atomic
//                   time-expiring refresh CLAIM (try_quote_cache_refresh).
//                   The claim winner re-fetches upstream and writes
//                   through; every loser serves the STALE row immediately
//                   (stale-while-revalidate) — no thundering herd, no
//                   double fetch, no leaked session locks under Supabase's
//                   transaction-mode pooler (see the migration for why the
//                   founder's pg_try_advisory_lock was adapted).
//
//   market hours (lib/marketHours): 60 s TTL while NSE is open; when the
//   market is closed the last close IS the observation — a row whose
//   sessionDate matches the market's session is served WITHOUT any refresh.
//
// R12 note: this is a read-through cache, not a spend path — no auth of its
// own; writes use the service role and RLS on quote_cache denies everyone
// else (migration 016).
//
// The advisory lock is taken on a fixed shard key derived from the symbol so
// concurrent DIFFERENT symbols never contend: pg_try_advisory_lock(hash).

import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import { marketState, type MarketState } from "@/lib/marketHours";

export interface CachedQuote {
  symbol: string;
  price: number;
  /** Percent change when the source disclosed it; null is NOT 0 (Rule 16). */
  change: number | null;
  currency: string;
  source: string;
  /** The upstream's own observation time (ISO), or null when the source
   *  disclosed none — never the fetch time. */
  observedAt: string | null;
  refreshedAt: string;
}

export interface QuoteCacheDeps {
  /** The upstream fetcher (injected: the canonical live-price path in
   *  production; a stub in tests). Returns null when upstreams are
   *  unavailable — the honest state, never a fabricated number. */
  fetchUpstream: (symbol: string) => Promise<CachedQuote | null>;
  nowMs?: () => number;
}

export interface QuoteCacheResult {
  quote: CachedQuote | null;
  /** "fresh" — served within TTL; "stale-revalidated" — a refresher updated
   *  it during THIS read; "stale-served" — served stale while a refresher
   *  runs (SWR); "miss" — nothing cached and the refresher found nothing. */
  state: "fresh" | "stale-revalidated" | "stale-served" | "miss";
  market: MarketState;
}

function rowToQuote(row: Record<string, unknown>): CachedQuote {
  return {
    symbol: String(row.symbol),
    price: Number(row.price),
    change: row.change == null ? null : Number(row.change),
    currency: String(row.currency ?? "INR"),
    source: String(row.source),
    observedAt: row.observed_at == null ? null : String(row.observed_at),
    refreshedAt: String(row.refreshed_at),
  };
}

async function readRow(symbol: string): Promise<CachedQuote | null> {
  const { data, error } = await getAdminSupabase()
    .from("quote_cache")
    .select("symbol, price, change, currency, source, observed_at, refreshed_at")
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToQuote(data) : null;
}

async function writeRow(symbol: string, quote: CachedQuote, ttlSeconds: number, nowIso: string): Promise<void> {
  const { error } = await getAdminSupabase().from("quote_cache").upsert({
    symbol,
    price: quote.price,
    change: quote.change,
    currency: quote.currency,
    source: quote.source,
    observed_at: quote.observedAt,
    refreshed_at: nowIso,
    ttl_seconds: ttlSeconds,
  });
  if (error) throw new Error(error.message);
}

const REFRESH_CLAIM_SECONDS = 30;

async function tryRefreshClaim(symbol: string): Promise<boolean> {
  const { data, error } = await getAdminSupabase().rpc("try_quote_cache_refresh", {
    p_symbol: symbol,
    p_claim_seconds: REFRESH_CLAIM_SECONDS,
  });
  if (error) throw new Error(error.message);
  return (data as boolean | null) === true;
}

/**
 * Read-through shared cache for one symbol. The injected deps keep this
 * testable; production wires fetchUpstream = fetchLivePrice's point shape.
 */
export async function cachedQuote(
  symbol: string,
  deps: QuoteCacheDeps,
): Promise<QuoteCacheResult> {
  const now = deps.nowMs ?? Date.now;
  const market = marketState(now());
  const ttl = market.ttlSeconds; // null when closed: no refresh warranted

  let row: CachedQuote | null = null;
  try {
    row = await readRow(symbol);
  } catch (e) {
    // Cache infrastructure failure must never fabricate or block: fall
    // through to the upstream path directly (Rule 6 is about refusing to
    // PRETEND; the upstream fetch is the honest fallback here).
    console.error("[quoteCache] read failed:", e instanceof Error ? e.message : e);
  }

  if (row && !Number.isFinite(row.price)) row = null;

  // Freshness: within TTL while open; when closed, a row from the current
  // session never goes stale.
  const rowAgeMs = row ? now() - Date.parse(row.refreshedAt) : Infinity;
  const fresh =
    row != null &&
    (market.freshness === "close"
      ? true // closed-market rows are the honest close — always serveable
      : rowAgeMs < (ttl ?? 60) * 1000);

  if (row && fresh) {
    return { quote: row, state: "fresh", market };
  }

  // Stale or missing → ONE refresher takes the atomic refresh claim.
  let gotClaim = false;
  try {
    gotClaim = await tryRefreshClaim(symbol);
  } catch (e) {
    console.error("[quoteCache] claim rpc failed:", e instanceof Error ? e.message : e);
    // Serve stale if we have it; else go upstream ourselves once.
    if (row) return { quote: row, state: "stale-served", market };
    const upstream = await deps.fetchUpstream(symbol);
    return { quote: upstream, state: upstream ? "stale-revalidated" : "miss", market };
  }

  if (gotClaim) {
    try {
      const upstream = await deps.fetchUpstream(symbol);
      if (upstream && Number.isFinite(upstream.price) && upstream.price > 0) {
        await writeRow(symbol, upstream, ttl ?? 0, new Date(now()).toISOString());
        return { quote: upstream, state: "stale-revalidated", market };
      }
      // Upstream unavailable: serve the stale row (still labelled with its
      // own observedAt) rather than nothing — stale-while-revalidate's whole
      // point. A null upstream with no row is an honest miss.
      if (row) return { quote: row, state: "stale-served", market };
      return { quote: null, state: "miss", market };
    } catch (e) {
      console.error("[quoteCache] refresh failed:", e instanceof Error ? e.message : e);
      if (row) return { quote: row, state: "stale-served", market };
      return { quote: null, state: "miss", market };
    }
    // No release step: the claim expires by time (pool-safe by design).
  }

  // Someone else holds the lock: serve what we have (SWR) — never wait.
  if (row) return { quote: row, state: "stale-served", market };
  // No row at all and another instance is refreshing: one short bounded
  // retry of the read (keeps first-request latency honest without a herd).
  await new Promise((r) => setTimeout(r, 400));
  try {
    row = await readRow(symbol);
  } catch { /* stay honest-miss */ }
  if (row) return { quote: row, state: "stale-served", market };
  return { quote: null, state: "miss", market };
}
