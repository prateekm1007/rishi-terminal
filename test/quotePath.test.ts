/**
 * U2 (founder round 7): request-path integration of the shared quote cache.
 *
 * Layers under test:
 *   1. lib/quotePath.classifyPriceSymbols — ONE classification source for
 *      which symbols belong to the shared NSE-equity cache path (the batch
 *      route's hand-written exclusion lists and livePrice's routing sets
 *      must agree — any symbol whose class would differ is a defect).
 *   2. serveQuote — the single-symbol shared-cache serving surface
 *      (state→status honesty: stale-revalidated is LIVE, fresh/stale-served
 *      is CACHED, miss is null; market state rides on the result).
 *   3. cachedQuoteBatch — the batch serving surface with a BULK refresher
 *      (one upstream pass for exactly the claimed symbols; the founder's
 *      acceptance extended to the batch surface: concurrent requests cause
 *      at most ONE upstream refresh per TTL).
 *   4. Cold-cache population on REAL Postgres semantics: migration 016's
 *      try_quote_cache_refresh was UPDATE-only — an absent row updated zero
 *      rows and returned false, so a cold cache could never populate. The
 *      emulation here mirrors migration 017 (claim row is UPSERTED); the
 *      real-SQL proof lives in scripts/ci/quote_cache_invariants.sql (CI
 *      migrations job, real Postgres).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

// ── in-memory emulation of quote_cache + try_quote_cache_refresh (017) ──
interface Row {
  symbol: string; price: number; change: number | null; currency: string;
  source: string; observed_at: string | null; refreshed_at: string;
  ttl_seconds: number; volume24h: number | null; refresh_claim: string | null;
}
let table: Record<string, Row> = {};
let upstreamCalls = 0;
let upstreamBatchCalls = 0;
let nowMs = Date.UTC(2026, 9, 2, 4, 30); // 10:00 IST Friday — market open

function claimEmulation(sym: string, claimSecs: number): boolean {
  const row = table[sym];
  const claimable =
    !row || row.refresh_claim == null ||
    nowMs - Date.parse(row.refresh_claim) > claimSecs * 1000;
  if (!claimable) return false;
  if (!row) {
    table[sym] = {
      symbol: sym, price: 0, change: null, currency: "INR", source: "claim",
      observed_at: null, refreshed_at: new Date(nowMs).toISOString(),
      ttl_seconds: 0, volume24h: null, refresh_claim: new Date(nowMs).toISOString(),
    };
  } else {
    row.refresh_claim = new Date(nowMs).toISOString();
  }
  return true;
}

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (name: string) => {
      if (name !== "quote_cache") throw new Error(`unexpected table ${name}`);
      return {
        select: () => ({
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({ data: table[v] ?? null, error: null }),
          }),
          in: (_c: string, vs: string[]) => ({
            // order not contractual for the batch read
            data: vs.map(s => table[s]).filter(Boolean),
            error: null,
          }),
        }),
        upsert: async (row: Row) => {
          table[row.symbol] = { ...table[row.symbol], ...row };
          return { error: null };
        },
      };
    },
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn !== "try_quote_cache_refresh") throw new Error(`unexpected rpc ${fn}`);
      return {
        data: claimEmulation(
          String(params.p_symbol),
          Number(params.p_claim_seconds ?? 30),
        ),
        error: null,
      };
    },
  }),
}));

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: (symbol: string) => {
      upstreamCalls += 1;
      const v = upstreamFixture[symbol];
      return Promise.resolve(v ?? null);
    },
  };
});

const upstreamFixture: Record<string, {
  price: number; change: number | null; source: string; status?: string;
  observedAt: string | null; volume24h?: number | null;
}> = {};

import { cachedQuote, cachedQuoteBatch, type CachedQuote } from "@/lib/quoteCache";
import { classifyPriceSymbols, serveQuote } from "@/lib/quotePath";

beforeEach(() => {
  table = {};
  upstreamCalls = 0;
  upstreamBatchCalls = 0;
  nowMs = Date.UTC(2026, 9, 2, 4, 30);
  for (const k of Object.keys(upstreamFixture)) delete upstreamFixture[k];
});

const NOW = () => nowMs;

function bulkRefresher(
  results: Record<string, CachedQuote | null>,
): (symbols: string[]) => Promise<Record<string, CachedQuote | null>> {
  return async (symbols: string[]) => {
    upstreamBatchCalls += 1;
    const out: Record<string, CachedQuote | null> = {};
    for (const s of symbols) out[s] = results[s] ?? null;
    return out;
  };
}

describe("U2 — classifyPriceSymbols (one classification source)", () => {
  it("routes equities to the shared cache and everything else to the direct path", () => {
    const { equities, others } = classifyPriceSymbols([
      "TCS", "RELIANCE", "M&MFIN",
      "NIFTY50", "SENSEX", "SPX", "DJI", "IXIC", "DAX", "FTSE", "HSI", "N225", "VIX",
      "BTC", "ETH", "BNB", "SOL", "ADA", "AVAX", "DOT", "POL", "LINK", "UNI", "AAVE",
      "SKY", "XRP", "DOGE", "SHIB",
      "GOLD", "SILVER", "PLATINUM", "CRUDEOIL", "WTI", "BRENT", "NATURALGAS",
      "COPPER", "ALUMINIUM", "ZINC", "NICKEL", "LEAD", "BRENTCRUDE", "PALLADIUM",
      "COTTON", "RUBBER", "MENTHAOIL", "CARDAMOM",
      "IN2YS", "IN6YS", "IN10YS", "IN15YS", "IN91DTB", "IN182DTB",
      "USD/INR", "EUR/INR", "GBP/INR",
    ]);
    expect(equities.sort()).toEqual(["M&MFIN", "RELIANCE", "TCS"]);
    expect(others).toContain("BTC");
    expect(others).toContain("NIFTY50");
    expect(others).toContain("GOLD");
    expect(others).toContain("IN2YS");
    expect(others).toContain("USD/INR");
  });
});

describe("U2 — serveQuote (single-symbol shared-cache surface)", () => {
  it("cold symbol: claims, fetches upstream once, writes through, reports LIVE with provenance", async () => {
    upstreamFixture["TCS"] = {
      price: 3120.5, change: 0.62, source: "yahoo", observedAt: "2026-10-02T04:29:00.000Z", volume24h: null,
    };
    const r = await serveQuote("TCS", { nowMs: NOW });
    expect(r).not.toBeNull();
    expect(r!.status).toBe("LIVE");
    expect(r!.price).toBe(3120.5);
    expect(r!.change).toBe(0.62);
    expect(r!.observedAt).toBe("2026-10-02T04:29:00.000Z");
    expect(r!.lastUpdated).toBe("2026-10-02T04:29:00.000Z");
    expect(r!.marketOpen).toBe(true);
    expect(r!.marketFreshness).toBe("live-delayed");
    expect(r!.sessionDate).toBe("2026-10-02");
    expect(upstreamCalls).toBe(1);
    // written through to the shared table with upstream provenance intact
    expect(table["TCS"].price).toBe(3120.5);
    expect(table["TCS"].observed_at).toBe("2026-10-02T04:29:00.000Z");
  });

  it("fresh row serves CACHED with no upstream call (the O(1)-per-TTL contract)", async () => {
    table["RELIANCE"] = {
      symbol: "RELIANCE", price: 1420, change: 1.1, currency: "INR", source: "yahoo",
      observed_at: "2026-10-02T04:28:00.000Z", refreshed_at: new Date(nowMs - 5_000).toISOString(),
      ttl_seconds: 60, volume24h: 1_234_567, refresh_claim: null,
    };
    const r = await serveQuote("RELIANCE", { nowMs: NOW });
    expect(r!.status).toBe("CACHED");
    expect(r!.price).toBe(1420);
    expect(r!.volume24h).toBe(1_234_567);
    expect(upstreamCalls).toBe(0);
  });

  it("closed market: the last close serves with no refresh — marketFreshness 'close'", async () => {
    nowMs = Date.UTC(2026, 9, 2, 10, 30); // 16:00 IST Friday — closed
    table["INFY"] = {
      symbol: "INFY", price: 1580, change: -0.4, currency: "INR", source: "yahoo",
      observed_at: "2026-10-02T09:55:00.000Z", refreshed_at: new Date(nowMs - 3 * 3600_000).toISOString(),
      ttl_seconds: 60, volume24h: null, refresh_claim: null,
    };
    const r = await serveQuote("INFY", { nowMs: NOW });
    expect(r!.status).toBe("CACHED");
    expect(r!.marketOpen).toBe(false);
    expect(r!.marketFreshness).toBe("close");
    expect(upstreamCalls).toBe(0);
  });

  it("upstream unavailable with no row → null (honest miss, the caller renders UNAVAILABLE)", async () => {
    const r = await serveQuote("WIPRO", { nowMs: NOW });
    expect(r).toBeNull();
    expect(upstreamCalls).toBe(1);
  });

  it("another instance holds the claim → stale row serves CACHED, no upstream", async () => {
    table["TCS"] = {
      symbol: "TCS", price: 3110, change: null, currency: "INR", source: "yahoo",
      observed_at: null, refreshed_at: new Date(nowMs - 120_000).toISOString(),
      ttl_seconds: 60, volume24h: null, refresh_claim: new Date(nowMs + 10_000).toISOString(),
    };
    const r = await serveQuote("TCS", { nowMs: NOW });
    expect(r!.status).toBe("CACHED");
    expect(upstreamCalls).toBe(0);
  });

  it("claim row (price 0 placeholder from the 017 claim insert) is never served as a quote", async () => {
    // A crashed refresher leaves the claim row behind; readers must treat it
    // as absent, never as a ₹0 price (Rule 16 — null is a real value). The
    // claim has expired, so THIS reader re-claims and refreshes.
    table["SBIN"] = {
      symbol: "SBIN", price: 0, change: null, currency: "INR", source: "claim",
      observed_at: null, refreshed_at: new Date(nowMs - 60_000).toISOString(),
      ttl_seconds: 60, volume24h: null, refresh_claim: new Date(nowMs - 31_000).toISOString(),
    };
    upstreamFixture["SBIN"] = { price: 812.4, change: 0.3, source: "yahoo", observedAt: null };
    const r = await serveQuote("SBIN", { nowMs: NOW });
    // stale/absent → claim → upstream → honest write
    expect(r!.status).toBe("LIVE");
    expect(r!.price).toBe(812.4);
    expect(upstreamCalls).toBe(1);
    // a HELD claim on a claim-row serves an honest miss, never the placeholder
    table["SBIN"].refresh_claim = new Date(nowMs + 10_000).toISOString();
    table["SBIN"].price = 0;
    const r2 = await serveQuote("SBIN", { nowMs: NOW });
    expect(r2).toBeNull();
  });
});

describe("U2 — cachedQuoteBatch (batch surface, bulk refresher)", () => {
  it("fresh rows serve without upstream; only stale/missing symbols reach the bulk refresher", async () => {
    table["TCS"] = {
      symbol: "TCS", price: 3120, change: 0.6, currency: "INR", source: "yahoo",
      observed_at: "2026-10-02T04:28:00.000Z", refreshed_at: new Date(nowMs - 5_000).toISOString(),
      ttl_seconds: 60, volume24h: null, refresh_claim: null,
    };
    const got = await cachedQuoteBatch(["TCS", "RELIANCE", "INFY"], {
      fetchUpstreamBatch: bulkRefresher({
        RELIANCE: { symbol: "RELIANCE", price: 1420, change: null, currency: "INR", source: "yahoo-bulk", observedAt: null, refreshedAt: "", volume24h: 5_000_000 },
        INFY: null,
      }),
      nowMs: NOW,
    });
    expect(upstreamBatchCalls).toBe(1);
    expect(got.quotes["TCS"].state).toBe("fresh");
    expect(got.quotes["RELIANCE"].state).toBe("stale-revalidated");
    expect(got.quotes["RELIANCE"].quote!.volume24h).toBe(5_000_000);
    expect(got.quotes["INFY"].state).toBe("miss");
    expect(got.quotes["INFY"].quote).toBeNull();
    expect(got.market.open).toBe(true);
  });

  it("50 concurrent batch requests → at most ONE upstream batch refresh per TTL (founder acceptance, batch)", async () => {
    let fetches = 0;
    const deps = {
      fetchUpstreamBatch: async (symbols: string[]) => {
        fetches += 1;
        const out: Record<string, CachedQuote | null> = {};
        for (const s of symbols) {
          out[s] = { symbol: s, price: 100, change: 1, currency: "INR", source: "yahoo-bulk", observedAt: null, refreshedAt: "", volume24h: null };
        }
        return out;
      },
      nowMs: NOW,
    };
    const results = await Promise.all(
      Array.from({ length: 50 }, () => cachedQuoteBatch(["TCS", "RELIANCE"], deps)),
    );
    expect(fetches).toBe(1);
    for (const r of results) {
      expect(r.quotes["TCS"].quote!.price).toBe(100);
      expect(r.quotes["RELIANCE"].quote!.price).toBe(100);
    }
  });

  it("closed market: existing rows serve as the close with no refresh; a MISSING row still populates (honest cold fetch of the close)", async () => {
    nowMs = Date.UTC(2026, 9, 2, 10, 30); // 16:00 IST — closed
    table["TCS"] = {
      symbol: "TCS", price: 3100, change: 0.2, currency: "INR", source: "yahoo",
      observed_at: "2026-10-02T09:55:00.000Z", refreshed_at: new Date(nowMs - 5 * 3600_000).toISOString(),
      ttl_seconds: 60, volume24h: null, refresh_claim: null,
    };
    const got = await cachedQuoteBatch(["TCS", "WIPRO"], {
      fetchUpstreamBatch: bulkRefresher({}),
      nowMs: NOW,
    });
    // TCS's row is the honest close — served with zero upstream work.
    expect(got.quotes["TCS"].state).toBe("fresh");
    expect(got.market.freshness).toBe("close");
    // WIPRO has no row at all: the cold fetch of the last close is correct,
    // and the empty upstream answer stays an honest miss.
    expect(upstreamBatchCalls).toBe(1);
    expect(got.quotes["WIPRO"].quote).toBeNull();
    expect(got.quotes["WIPRO"].state).toBe("miss");
  });

  it("cache infrastructure read failure falls back to one upstream batch pass (never fabricated)", async () => {
    const original = table;
    table = undefined as unknown as typeof table; // force read failure
    const got = await cachedQuoteBatch(["TCS"], {
      fetchUpstreamBatch: bulkRefresher({
        TCS: { symbol: "TCS", price: 3111, change: null, currency: "INR", source: "yahoo-bulk", observedAt: null, refreshedAt: "", volume24h: null },
      }),
      nowMs: NOW,
    });
    table = original;
    expect(upstreamBatchCalls).toBe(1);
    expect(got.quotes["TCS"].quote!.price).toBe(3111);
  });
});

describe("U2 — cachedQuote single surface keeps the cold-populate contract (017 SQL semantics)", () => {
  it("cold symbol populates the shared table (claim emulation mirrors the 017 upsert)", async () => {
    upstreamFixture["TCS"] = { price: 3121, change: 0.4, source: "yahoo", observedAt: null };
    const r = await cachedQuote("TCS", { fetchUpstream: async (s) => {
      upstreamCalls += 1;
      const v = upstreamFixture[s];
      return v ? { symbol: s, price: v.price, change: v.change, currency: "INR", source: v.source, observedAt: v.observedAt, refreshedAt: "", volume24h: null } : null;
    }, nowMs: NOW });
    expect(r.state).toBe("stale-revalidated");
    expect(r.quote!.price).toBe(3121);
    expect(upstreamCalls).toBe(1);
    expect(table["TCS"].price).toBe(3121);
  });
});
