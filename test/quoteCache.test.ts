/**
 * Commit O / U2 (founder round 6): the shared quote cache.
 *
 * The founder's acceptance, tested here against an in-memory Postgres
 * emulation of the migration-016 semantics (atomic refresh claim + row):
 *
 *   "50 concurrent requests cause at most one upstream fetch per TTL"
 *
 * plus the market-hours behavior (closed market → the last close is served,
 * no refresh) and honest states (upstream down → stale-served / miss, never
 * a fabricated number).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// ── in-memory emulation of quote_cache + try_quote_cache_refresh ──
interface Row {
  symbol: string; price: number; change: number | null; currency: string;
  source: string; observed_at: string | null; refreshed_at: string; ttl_seconds: number;
  refresh_claim: string | null;
}
let table: Record<string, Row> = {};
let upstreamCalls = 0;
let nowMs = Date.UTC(2026, 9, 2, 4, 30); // 10:00 IST Friday — market open

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (name: string) => {
      if (name !== "quote_cache") throw new Error(`unexpected table ${name}`);
      return {
        select: () => ({
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({ data: table[v] ?? null, error: null }),
          }),
        }),
        upsert: async (row: Row) => {
          table[row.symbol] = { ...row };
          return { error: null };
        },
      };
    },
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn !== "try_quote_cache_refresh") throw new Error(`unexpected rpc ${fn}`);
      const sym = String(params.p_symbol);
      const claimSecs = Number(params.p_claim_seconds ?? 30);
      const row = table[sym];
      const claimable =
        !row || row.refresh_claim == null ||
        nowMs - Date.parse(row.refresh_claim) > claimSecs * 1000;
      if (claimable) {
        // Atomic: set the claim on the SAME read-modify cycle (single-threaded
        // emulation; Postgres does it with one UPDATE — same guarantee).
        if (!row) {
          table[sym] = {
            symbol: sym, price: 0, change: null, currency: "INR", source: "claim",
            observed_at: null, refreshed_at: new Date(nowMs).toISOString(),
            ttl_seconds: 60, refresh_claim: new Date(nowMs).toISOString(),
          };
        } else {
          row.refresh_claim = new Date(nowMs).toISOString();
        }
        return { data: true, error: null };
      }
      return { data: false, error: null };
    },
  }),
}));

import { cachedQuote, type QuoteCacheDeps } from "@/lib/quoteCache";

function makeDeps(): QuoteCacheDeps {
  return {
    fetchUpstream: async () => {
      upstreamCalls += 1;
      return {
        symbol: "RELIANCE", price: 1167.7, change: 0.42, currency: "INR",
        source: "test-vendor", observedAt: "2026-10-01T09:45:00.000Z",
        refreshedAt: new Date(nowMs).toISOString(),
      };
    },
    nowMs: () => nowMs,
  };
}

beforeEach(() => {
  table = {};
  upstreamCalls = 0;
  nowMs = Date.UTC(2026, 9, 2, 4, 30); // 10:00 IST Friday — open
});
afterEach(() => vi.restoreAllMocks());

describe("MUST FAIL PRE-U2: the shared cache bounds upstream calls", () => {
  it("50 concurrent requests → exactly ONE upstream fetch per TTL", async () => {
    const deps = makeDeps();
    const results = await Promise.all(Array.from({ length: 50 }, () => cachedQuote("RELIANCE", deps)));
    expect(upstreamCalls).toBe(1);
    const served = results.filter((r) => r.quote !== null);
    expect(served).toHaveLength(50); // nobody gets nothing while a refresh runs
    // The claim winner revalidated; the other 49 were served the row (SWR).
    const states = new Set(results.map((r) => r.state));
    expect(states.has("stale-revalidated")).toBe(true);
    expect(results.every((r) => r.market.open)).toBe(true);
  });

  it("a fresh row is served without any upstream call", async () => {
    const deps = makeDeps();
    await cachedQuote("RELIANCE", deps); // seeds
    const before = upstreamCalls;
    const r = await cachedQuote("RELIANCE", deps);
    expect(upstreamCalls).toBe(before);
    expect(r.state).toBe("fresh");
    expect(r.quote?.price).toBe(1167.7);
  });

  it("closed market: a row from this session never goes stale — zero refreshes", async () => {
    nowMs = Date.UTC(2026, 9, 2, 11, 0); // 16:30 IST Friday — closed
    const deps = makeDeps();
    await cachedQuote("RELIANCE", deps); // seeds (first read refreshes)
    const before = upstreamCalls;
    const r = await cachedQuote("RELIANCE", deps);
    expect(upstreamCalls).toBe(before); // closed market: no re-fetch
    expect(r.state).toBe("fresh");
    expect(r.market.freshness).toBe("close");
  });

  it("upstream down with a stale row → stale-served with its ORIGINAL observation, never fabricated", async () => {
    const deps = makeDeps();
    await cachedQuote("RELIANCE", deps); // seed
    nowMs += 10 * 60_000; // 10 minutes later — stale while open
    const failing: QuoteCacheDeps = { ...deps, fetchUpstream: async () => null };
    const r = await cachedQuote("RELIANCE", failing);
    expect(r.state).toBe("stale-served");
    expect(r.quote?.observedAt).toBe("2026-10-01T09:45:00.000Z"); // original, not now
  });

  it("upstream down with NO row → honest miss (null), no fabricated quote", async () => {
    const failing: QuoteCacheDeps = { ...makeDeps(), fetchUpstream: async () => null };
    const r = await cachedQuote("TCS", failing);
    expect(r.quote).toBeNull();
    expect(r.state).toBe("miss");
  });
});
