import { describe, expect, it, beforeEach, vi } from "vitest";

// Phase 5.1 (T57) — batch + single price routes:
// 1. EXACTLY ONE normalized entry per requested symbol; total provider
//    failure is an explicit UNAVAILABLE entry, never a silently absent symbol
//    (previously: 50 requested → 49 returned with no trace of the 50th).
// 2. UNAVAILABLE carries NO fabricated observation timestamp: lastUpdated is
//    null (there is no observation) and checkedAt is the decision time.

const fetchLivePriceMock = vi.fn();

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: (symbol: string) => fetchLivePriceMock(symbol),
  };
});

vi.mock("@/lib/nse/bulkFetch", () => ({
  fetchBulkPricesForSymbols: vi.fn(async () => ({})),
}));

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
});

describe("Phase 5.1 — /api/prices/batch honest unavailable contract", () => {
  it("Yahoo bulk miss + every per-symbol provider failing → every symbol present with UNAVAILABLE", async () => {
    fetchLivePriceMock.mockResolvedValue(null); // total upstream failure
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

  it("mixed outcome: one success + one total failure → both symbols present, correct shapes", async () => {
    fetchLivePriceMock.mockImplementation(async (sym: string) =>
      sym === "TCS"
        ? { price: 3123.45, change: 0.9, source: "nse", status: "LIVE", lastUpdated: new Date().toISOString() }
        : null,
    );
    const res = await batchPOST(batchReq(["TCS", "RELIANCE"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;

    expect(Object.keys(prices).sort()).toEqual(["RELIANCE", "TCS"]);
    expect(prices.TCS.status).toBe("LIVE");
    expect(prices.TCS.price).toBe(3123.45);
    expect(prices.TCS.lastUpdated).toBeTruthy();
    expect(prices.RELIANCE.status).toBe("UNAVAILABLE");
    expect(prices.RELIANCE.lastUpdated).toBeNull();
    expect(prices.RELIANCE.checkedAt).toBeTruthy();
  });

  it("fetchLivePrice REJECTING (not just resolving null) still yields an UNAVAILABLE entry", async () => {
    fetchLivePriceMock.mockRejectedValue(new Error("provider exploded"));
    const res = await batchPOST(batchReq(["WIPRO"]));
    const json = await res.json();
    const prices = json.prices as Record<string, Record<string, unknown>>;
    expect(Object.keys(prices)).toEqual(["WIPRO"]);
    expect(prices.WIPRO.status).toBe("UNAVAILABLE");
    expect(prices.WIPRO.lastUpdated).toBeNull();
  });
});

describe("Phase 5.1 — /api/prices single route honest unavailability", () => {
  it("total failure → UNAVAILABLE with lastUpdated null + checkedAt decision time", async () => {
    fetchLivePriceMock.mockResolvedValue(null);
    const res = await singleGET(singleReq("TCS"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("UNAVAILABLE");
    expect(body.lastUpdated).toBeNull();
    expect(typeof body.checkedAt).toBe("string");
    expect(Number.isFinite(Date.parse(body.checkedAt as string))).toBe(true);
  });

  it("a successful observation keeps its real observation timestamp", async () => {
    const observedAt = new Date(Date.now() - 60_000).toISOString();
    fetchLivePriceMock.mockResolvedValue({
      price: 100, change: 0.5, source: "exchangerate-api", status: "LIVE", lastUpdated: observedAt,
    });
    const res = await singleGET(singleReq("USD/INR"));
    const body = await res.json();
    expect(body.status).toBe("LIVE");
    expect(body.lastUpdated).toBe(observedAt);
  });
});
