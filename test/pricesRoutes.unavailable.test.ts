/**
 * Phase 5.1 (T57) + U2 (founder round 7) — batch + single price routes:
 * 1. EXACTLY ONE normalized entry per requested symbol; total provider
 *    failure is an explicit UNAVAILABLE entry, never a silently absent symbol
 *    (previously: 50 requested → 49 returned with no trace of the 50th).
 * 2. UNAVAILABLE carries NO fabricated observation timestamp: lastUpdated is
 *    null (there is no observation) and checkedAt is the decision time.
 * 3. U2: NSE-equity symbols serve from the SHARED quote cache
 *    (lib/quotePath → lib/quoteCache); the cache layer is mocked here — its
 *    own contracts are pinned in test/quotePath.test.ts. Non-equity classes
 *    keep the direct fetchLivePrice path.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const fetchLivePriceMock = vi.fn();
const cachedQuoteBatchForEquitiesMock = vi.fn();
const serveQuoteMock = vi.fn();

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: (symbol: string) => fetchLivePriceMock(symbol),
  };
});

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    serveQuote: (symbol: string) => serveQuoteMock(symbol),
    cachedQuoteBatchForEquities: (symbols: string[]) =>
      cachedQuoteBatchForEquitiesMock(symbols),
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

function cacheMiss(market = { open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-02" }) {
  return { quotes: {}, market };
}

function cacheHit(symbol: string, state: "stale-revalidated" | "fresh", market = { open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-02" }) {
  return {
    quotes: {
      [symbol]: {
        state,
        market,
        quote: {
          symbol, price: 3123.45, change: 1.2, currency: "INR", source: "yahoo-bulk",
          observedAt: "2026-10-02T04:29:00.000Z", refreshedAt: "2026-10-02T04:30:00.000Z",
          volume24h: 1_000,
        },
      },
    },
    market,
  };
}

beforeEach(() => {
  fetchLivePriceMock.mockReset();
  cachedQuoteBatchForEquitiesMock.mockReset();
  serveQuoteMock.mockReset();
});

describe("Phase 5.1 — /api/prices/batch honest unavailable contract", () => {
  it("shared-cache miss for every equity → every symbol present with UNAVAILABLE", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue(cacheMiss());
    const res = await batchPOST(batchReq(["TCS", "RELIANCE", "INFY"]));
    expect(res.status).toBe(200);
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;

    // exactly one entry per requested symbol — none silently missing
    expect(Object.keys(prices).sort()).toEqual(["INFY", "RELIANCE", "TCS"]);

    for (const sym of ["TCS", "RELIANCE", "INFY"]) {
      expect(prices[sym].status).toBe("UNAVAILABLE");
      // no fake freshness: there is NO observation, so NO observation time
      expect(prices[sym].lastUpdated).toBeNull();
      expect(prices[sym]).not.toHaveProperty("price");
      const checkedAt = prices[sym].checkedAt as string;
      expect(typeof checkedAt).toBe("string");
      expect(Number.isFinite(Date.parse(checkedAt))).toBe(true);
    }
  });

  it("mixed outcome: one cache observation + one miss → both symbols present, correct shapes", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue(cacheHit("TCS", "stale-revalidated"));
    const res = await batchPOST(batchReq(["TCS", "RELIANCE"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;

    expect(Object.keys(prices).sort()).toEqual(["RELIANCE", "TCS"]);
    expect(prices.TCS.status).toBe("LIVE");
    expect(prices.TCS.price).toBe(3123.45);
    expect(prices.TCS.lastUpdated).toBeTruthy();
    expect(prices.TCS.observedAt).toBe("2026-10-02T04:29:00.000Z");
    expect(prices.RELIANCE.status).toBe("UNAVAILABLE");
  });

  it("the batch payload carries the NSE market state top-level (U2 client-hook cadence)", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue(cacheMiss());
    const res = await batchPOST(batchReq(["TCS"]));
    const json = await res.json();
    expect(json.market).toEqual({
      open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-02",
    });
  });

  it("non-equity symbols keep the direct path: success keeps its real observation timestamp", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue(cacheMiss());
    fetchLivePriceMock.mockResolvedValue({
      price: 66000, change: 1.5, source: "coingecko", status: "LIVE",
      observedAt: "2026-10-02T04:29:00.000Z", lastUpdated: "2026-10-02T04:29:00.000Z",
    });
    const res = await batchPOST(batchReq(["BTC"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;
    expect(prices.BTC.status).toBe("LIVE");
    expect(prices.BTC.lastUpdated).toBe("2026-10-02T04:29:00.000Z");
    expect(fetchLivePriceMock).toHaveBeenCalledWith("BTC");
  });

  it("non-equity symbol failing → UNAVAILABLE with no fabricated timestamp", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue(cacheMiss());
    fetchLivePriceMock.mockResolvedValue(null);
    const res = await batchPOST(batchReq(["BTC"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;
    expect(prices.BTC.status).toBe("UNAVAILABLE");
    expect(prices.BTC.lastUpdated).toBeNull();
  });
});

describe("Phase 5.1 — /api/prices single route keeps the honest contract", () => {
  it("equity success via serveQuote passes provenance through unchanged", async () => {
    serveQuoteMock.mockResolvedValue({
      symbol: "TCS", price: 3123.45, change: 1.2, volume24h: null, source: "yahoo-bulk",
      status: "CACHED", observedAt: "2026-10-02T04:29:00.000Z",
      lastUpdated: "2026-10-02T04:29:00.000Z",
      marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-02",
    });
    const res = await singleGET(singleReq("TCS"));
    const json = await res.json();
    expect(json.status).toBe("CACHED");
    expect(json.price).toBe(3123.45);
    expect(json.lastUpdated).toBe("2026-10-02T04:29:00.000Z");
  });

  it("a successful non-equity observation keeps its real observation timestamp", async () => {
    fetchLivePriceMock.mockResolvedValue({
      price: 88.4, change: null, source: "exchangerate-api", status: "LIVE",
      observedAt: null, lastUpdated: null,
    });
    const res = await singleGET(singleReq("USD/INR"));
    const json = await res.json();
    expect(json.status).toBe("LIVE");
    expect(json.lastUpdated).toBeNull();
  });

  it("total failure → UNAVAILABLE with lastUpdated null + checkedAt decision time", async () => {
    serveQuoteMock.mockResolvedValue(null);
    const res = await singleGET(singleReq("TCS"));
    const json = await res.json();
    expect(json.status).toBe("UNAVAILABLE");
    expect(json.lastUpdated).toBeNull();
    expect(Number.isFinite(Date.parse(json.checkedAt))).toBe(true);
  });
});
