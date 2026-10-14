// lib/movers/compute.ts — LIVE-TODAY (founder order, 2026-10-13): the
// ALWAYS-AVAILABLE movers derivation — computed from the shared quote
// cache (migration 016), the same Yahoo-fed store the ticker and stock
// pages serve from.
//
// Why this path exists: NSE's movers endpoint is an unofficial transport
// that can be blocked (Akamai 403s datacenter egress — verified from
// the development sandbox 2026-10-13) or drift schema. The quote cache
// is OUR store, always populated by the warmer's minute tick, and every
// row already carries the FD-15 provenance pair (source + observed_at).
// Ranking those observations is a pure computation on real data — no
// fabrication, and every row keeps its OWN observation stamp.
//
// Honesty contract (Rules 1/3/16):
//   - only REGISTRY symbols rank (Rule 9 — the universe is the tracked
//     NSE set; a tile row like NIFTY50 or BTC is not an equity mover);
//   - only rows whose observed_at falls on the CURRENT NSE session date
//     (IST) rank — an overnight-stale observation is not "today's"
//     move, and mixing sessions in one ranked list would be a Rule 3
//     violation. The panel discloses how many symbols were observed
//     this session (universeObserved);
//   - a row without a disclosed percent change cannot rank (a missing
//     change is not a flat day — the peek-window discipline, Z3);
//   - deterministic tie-break: percent desc, then symbol asc (Rule 18).

import { STOCKS } from "@/data/stocks";
import { istParts, marketState } from "@/lib/marketHours";
import type { LivePick, MoverRow } from "./types";

/** The quote_cache columns the computation reads (snake_case wire shape). */
export interface MoverCacheRow {
  symbol: string;
  price: number;
  change: number | null;
  volume24h?: number | null;
  source?: string | null;
  observed_at: string | null;
}

export interface ComputedMovers {
  gainers: MoverRow[];
  losers: MoverRow[];
  /** TODAY-MOVERS: the biggest absolute swings across BOTH directions,
   *  from the SAME gated pool (registry + session + usable price +
   *  disclosed change) — deterministic |pct| desc, symbol asc. */
  movers: MoverRow[];
  universeObserved: number;
  /** TODAY-FULL: the live Stock of the Day (most-traded by value), or
   *  null when no tracked symbol had a session-fresh price+volume. */
  livePick: LivePick | null;
}

/** The IST calendar date of an ISO timestamp, or null (unparsable). */
function istDateOf(iso: string | null): string | null {
  if (typeof iso !== "string" || !iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return istParts(ms).isoDate;
}

/**
 * PURE: rank the top movers from quote-cache rows.
 *
 * @param rows        the cached observations (any superset is fine —
 *                    non-registry / non-session rows are filtered out)
 * @param sessionDate the NSE session date the ranking is scoped to
 *                    (marketState().sessionDate at compute time)
 * @param limit       rows per side (the dashboard renders 5)
 */
export function computeMoversFromRows(
  rows: MoverCacheRow[],
  sessionDate: string,
  limit: number,
): ComputedMovers {
  const eligible: Array<{ row: MoverCacheRow; pct: number }> = [];
  for (const row of rows) {
    const meta = STOCKS[row.symbol];
    if (!meta) continue; // registry check (Rule 9)
    if (!(row.price > 0)) continue; // claim placeholder / degenerate
    if (row.change === null || !Number.isFinite(row.change)) continue; // cannot rank
    if (istDateOf(row.observed_at) !== sessionDate) continue; // not this session
    eligible.push({ row, pct: row.change });
  }

  // Deterministic order: percent desc, symbol asc (Rule 18).
  const sorted = [...eligible].sort((a, b) =>
    b.pct !== a.pct ? b.pct - a.pct : a.row.symbol.localeCompare(b.row.symbol),
  );

  const toMover = (e: { row: MoverCacheRow; pct: number }, kind: "gainer" | "loser" | "mover", rank: number): MoverRow => ({
    kind,
    rank,
    symbol: e.row.symbol,
    name: STOCKS[e.row.symbol]?.name ?? null,
    price: e.row.price,
    changePct: e.pct,
    volume: e.row.volume24h ?? null,
    source: e.row.source ?? null,
    observedAt: e.row.observed_at,
  });

  const gainers = sorted.slice(0, limit).map((e, i) => toMover(e, "gainer", i + 1));
  const losers = [...sorted]
    .reverse()
    .slice(0, limit)
    .map((e, i) => toMover(e, "loser", i + 1));

  // TODAY-MOVERS: the third ranking over the SAME eligible pool — the
  // biggest absolute swings, either direction; deterministic tie-break
  // (|pct| desc, then symbol asc — Rule 18).
  const movers = [...eligible]
    .sort((a, b) =>
      Math.abs(b.pct) !== Math.abs(a.pct)
        ? Math.abs(b.pct) - Math.abs(a.pct)
        : a.row.symbol.localeCompare(b.row.symbol),
    )
    .slice(0, limit)
    .map((e, i) => toMover(e, "mover", i + 1));

  return {
    gainers,
    losers,
    movers,
    universeObserved: eligible.length,
    livePick: computeLivePickFromRows(rows, sessionDate),
  };
}

/**
 * PURE (TODAY-FULL, founder order 2026-10-14: "make sure the full today
 * panel is populated"): the LIVE Stock of the Day — the session's
 * most-traded stock BY VALUE (price × volume), from the same gated
 * pool family as the movers lists.
 *
 * Honesty contract (the same Rules 1/3/16 the movers carry):
 *   - registry symbols only (Rule 9); session-fresh observations only
 *     (an overnight-stale observation is not "today's" market);
 *   - a row without BOTH a usable price and a disclosed volume cannot
 *     rank by value (missing is not 0);
 *   - the percent change is NOT required to rank (it renders as " —"
 *     when absent — a pick without a disclosed change is still the
 *     day's most-traded stock);
 *   - deterministic tie-break: turnover desc, then symbol asc
 *     (Rule 18) — same IST session, same pick, everywhere.
 */
export function computeLivePickFromRows(
  rows: MoverCacheRow[],
  sessionDate: string,
): LivePick | null {
  let best: { row: MoverCacheRow; turnover: number } | null = null;
  let universeObserved = 0;
  for (const row of rows) {
    if (!STOCKS[row.symbol]) continue; // registry check (Rule 9)
    if (!(row.price > 0)) continue; // claim placeholder / degenerate
    const volume = row.volume24h ?? null;
    if (!(volume && volume > 0)) continue; // no disclosed volume → cannot rank by value
    if (istDateOf(row.observed_at) !== sessionDate) continue; // not this session
    universeObserved++;
    const turnover = row.price * volume;
    if (
      !best ||
      turnover > best.turnover ||
      (turnover === best.turnover && row.symbol.localeCompare(best.row.symbol) < 0)
    ) {
      best = { row, turnover };
    }
  }
  if (!best) return null;
  return {
    symbol: best.row.symbol,
    name: STOCKS[best.row.symbol]?.name ?? null,
    price: best.row.price,
    changePct: best.row.change,
    volume: best.row.volume24h ?? null,
    turnover: best.turnover,
    source: best.row.source ?? null,
    observedAt: best.row.observed_at,
    universeObserved,
  };
}

/**
 * Read the shared quote cache and compute this session's movers.
 * Returns null on a cache-infrastructure failure (honest miss — the
 * caller reports "no movers data yet", never a partial guess).
 */
export async function computeMoversFromCache(
  limit: number,
  nowMs: number = Date.now(),
): Promise<ComputedMovers | null> {
  const sessionDate = marketState(nowMs).sessionDate;
  try {
    // The import lives INSIDE the try: a missing-env import failure in
    // any environment is an honest miss for THIS step, never a thrown
    // error that takes down the whole warm tick (the equity coverage
    // above is the critical path).
    const { getAdminSupabase } = await import("@/lib/services/supabaseAdmin");
    const { data, error } = await getAdminSupabase()
      .from("quote_cache")
      .select("symbol, price, change, volume24h, source, observed_at");
    if (error) throw new Error(error.message);
    const rows: MoverCacheRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
      symbol: String(r.symbol),
      price: Number(r.price),
      change: r.change == null ? null : Number(r.change),
      volume24h: r.volume24h == null ? null : Number(r.volume24h),
      source: r.source == null ? null : String(r.source),
      observed_at: r.observed_at == null ? null : String(r.observed_at),
    }));
    return computeMoversFromRows(rows, sessionDate, limit);
  } catch (e) {
    console.error("[movers/compute] quote_cache read failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
