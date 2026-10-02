/**
 * U2 (founder round 7): /api/prices + /api/prices/batch serve NSE-equity
 * symbols through the SHARED quote cache (lib/quoteCache via lib/quotePath).
 *
 * Wire contracts pinned here:
 *   - exactly one normalized entry per requested symbol (T57, preserved);
 *   - state→status honesty: cache-fresh/stale-served = CACHED,
 *     stale-revalidated = LIVE, miss = explicit UNAVAILABLE entry with NO
 *     fabricated observation time (lastUpdated null; checkedAt = decision
 *     time) — Rule 16 / Phase 5.1 semantics survive the integration;
 *   - the batch payload carries the NSE market state top-level so the client
 *     hook can adapt its polling cadence (U2 client hook contract);
 *   - non-equity classes (crypto/forex/bonds/commodities/indices) keep the
 *     direct fetchLivePrice path — the shared cache is NSE-session scoped.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const fetchLivePriceMock = vi.fn();

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: (symbol: string) => fetchLivePriceMock(symbol),
  };
});

const cachedQuoteBatchMock = vi.fn();
const serveQuoteMock = vi.fn();

vi.mock("@/lib/quoteCache", () => ({
  cachedQuote: () => undefined, // single route goes through quotePath
  cachedQuoteBatch: (...a: unknown[]) => cachedQuoteBatchMock(...a),
}));

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    serveQuote: (symbol: string) => serveQuoteMock(symbol),
  };
});

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

import { POST as batchPOST } from "@/app/api/prices/batch/route";
import { GET as singleGET } from "@/app/api/prices/route";

function batchReq(symbols: string[]): never {
  return {
    headers: { get: () => null },
    json: async () => ({ symbols }),
  } as never;
}

function singleReq(symbol: string): never {
  return {
    url: `https://terminal.test/api/prices?symbol=${symbol}`,
    headers: { get: () => null },
  } as never;
}

beforeEach(() => {
  fetchLivePriceMock.mockReset();
  cachedQuoteBatchMock.mockReset();
  serveQuoteMock.mockReset();
});

const MARKET_OPEN = {
  open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-02",
};

describe("U2 — /api/prices/batch serves equities from the shared quote cache", () => {
  it("equity entries carry the cache's provenance; status maps state honestly; market rides top-level", async () => {
    cachedQuoteBatchMock.mockResolvedValue({
      market: MARKET_OPEN,
      quotes: {
        TCS: {
          state: "stale-revalidated",
          market: MARKET_OPEN,
          quote: { symbol: "TCS", price: 3120.5, change: 0.62, currency: "INR", source: "yahoo-bulk", observedAt: "2026-10-02T04:29:00.000Z", refreshedAt: "2026-10-02T04:30:00.000Z", volume24h: 4_210_000 },
        },
        RELIANCE: {
          state: "fresh",
          market: MARKET_OPEN,
          quote: { symbol: "RELIANCE", price: 1420, change: null, currency: "INR", source: "yahoo-bulk", observedAt: null, refreshedAt: "2026-10-02T04:29:30.000Z", volume24h: null },
        },
        WIPRO: { state: "miss", market: MARKET_OPEN, quote: null },
      },
    });

    const res = await batchPOST(batchReq(["TCS", "RELIANCE", "WIPRO", "BTC"]));
    expect(res.status).toBe(200);
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;

    // exactly one entry per requested symbol
    expect(Object.keys(prices).sort()).toEqual(["BTC", "RELIANCE", "TCS", "WIPRO"]);

    // stale-revalidated → LIVE with full provenance
    expect(prices["TCS"].status).toBe("LIVE");
    expect(prices["TCS"].price).toBe(3120.5);
    expect(prices["TCS"].changePercent24h).toBe(0.62);
    expect(prices["TCS"].volume24h).toBe(4_210_000);
    expect(prices["TCS"].lastUpdated).toBe("2026-10-02T04:29:00.000Z");

    // fresh → CACHED (served from the shared cache, honestly labelled)
    expect(prices["RELIANCE"].status).toBe("CACHED");
    expect(prices["RELIANCE"].lastUpdated).toBeNull(); // upstream disclosed none

    // miss → explicit UNAVAILABLE, no fabricated observation time
    expect(prices["WIPRO"].status).toBe("UNAVAILABLE");
    expect(prices["WIPRO"].lastUpdated).toBeNull();
    expect(prices["WIPRO"]).not.toHaveProperty("price");

    // the NSE market state rides top-level for the client hook cadence.
    // The VALUES come from the real clock (marketState()) — those belong to
    // the pure marketHours tests; here we pin the CONTRACT: the state
    // object rides with its full shape, at any time of day.
    const m = json.market as Record<string, unknown>;
    expect(Object.keys(m).sort()).toEqual(["freshness", "open", "sessionDate", "ttlSeconds"]);
    expect(typeof m.open).toBe("boolean");
    expect(["live-delayed", "close"]).toContain(m.freshness);
    expect(String(m.sessionDate)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("non-equity symbols keep the direct fetchLivePrice path (crypto etc.)", async () => {
    cachedQuoteBatchMock.mockResolvedValue({
      market: MARKET_OPEN,
      quotes: {}, // no equities requested
    });
    fetchLivePriceMock.mockResolvedValue({
      price: 66000, change: 1.5, source: "coingecko", status: "LIVE",
      observedAt: "2026-10-02T04:29:00.000Z", volume24h: 900_000_000,
      lastUpdated: "2026-10-02T04:29:00.000Z",
    });

    const res = await batchPOST(batchReq(["BTC"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;
    expect(cachedQuoteBatchMock).toHaveBeenCalledTimes(1);
    expect(cachedQuoteBatchMock.mock.calls[0][0]).toEqual([]); // no equity symbols
    expect(fetchLivePriceMock).toHaveBeenCalledWith("BTC");
    expect(prices["BTC"].status).toBe("LIVE");
  });
});

describe("U2 — /api/prices single-symbol route", () => {
  it("equity symbol: served via serveQuote, market fields ride additively", async () => {
    serveQuoteMock.mockResolvedValue({
      symbol: "TCS", price: 3120.5, change: 0.62, volume24h: null,
      source: "yahoo-bulk", status: "CACHED",
      observedAt: "2026-10-02T04:29:00.000Z", lastUpdated: "2026-10-02T04:29:00.000Z",
      marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-02",
    });
    const res = await singleGET(singleReq("TCS"));
    const json = await res.json();
    expect(json.status).toBe("CACHED");
    expect(json.price).toBe(3120.5);
    expect(json.marketOpen).toBe(true);
    expect(json.marketFreshness).toBe("live-delayed");
    expect(json.sessionDate).toBe("2026-10-02");
  });

  it("non-equity symbol: unchanged fetchLivePrice shape (no market fields invented)", async () => {
    fetchLivePriceMock.mockResolvedValue({
      price: 88.41, change: 0.05, source: "exchangerate-api", status: "LIVE",
      observedAt: null, lastUpdated: null,
    });
    const res = await singleGET(singleReq("USD/INR"));
    const json = await res.json();
    expect(json.status).toBe("LIVE");
    expect(json.price).toBe(88.41);
    expect(json).not.toHaveProperty("marketOpen");
  });

  it("equity miss (serveQuote null) → explicit UNAVAILABLE entry", async () => {
    serveQuoteMock.mockResolvedValue(null);
    // TCS is a registry equity — the route's 400 gate passes it through to
    // serveQuote, which reports the honest miss.
    const res = await singleGET(singleReq("TCS"));
    const json = await res.json();
    expect(json.status).toBe("UNAVAILABLE");
    expect(json.lastUpdated).toBeNull();
    expect(Number.isFinite(Date.parse(json.checkedAt))).toBe(true);
  });
});
