/**
 * U2 (founder round 7): SSR initial prices + market-aware client hook.
 *
 * Pinned here:
 *   1. lib/dashboardSnapshot.toPriceData — the PURE SSR→client mapper keeps
 *      Rule 16 (nulls preserved, unusable points dropped, no zero-filling).
 *   2. lib/dashboardSnapshot.initialPriceSnapshot — the build phase fetches
 *      NOTHING (hermetic prerender); at runtime the snapshot is a CHEAP
 *      CACHE READ ONLY (X3, Round 11): NSE equities peek the shared quote
 *      cache (serveCachedQuote — no refresh claims, no upstream fetches, so
 *      the first byte never blocks on a vendor), and every non-equity
 *      class (indexes, crypto, commodities, FX) is omitted from SSR — those
 *      are not in the equity cache and the client hook fills them on
 *      mount; misses are omitted, never fabricated.
 *   3. hooks/useLivePrices.effectivePollInterval — the market-aware cadence
 *      contract: open (or unknown) → the caller's interval; NSE closed →
 *      slowed to ≥ 5 min (the batch may still carry 24/7 classes).
 *   4. Source pin: the hook must actually WIRE these contracts (hydration
 *      from initialPrices, cadence helper, market from the batch payload) —
 *      pure-function tests alone cannot see wiring regressions.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const serveCachedQuotesMock = vi.fn();
const fetchLivePriceMock = vi.fn();

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    serveCachedQuotes: (symbols: string[]) => serveCachedQuotesMock(symbols),
  };
});

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: (symbol: string) => fetchLivePriceMock(symbol),
  };
});

import {
  initialPriceSnapshot,
  toPriceData,
} from "@/lib/dashboardSnapshot";
import { effectivePollInterval } from "@/hooks/useLivePrices";
import { readFileSync } from "node:fs";
import path from "node:path";

beforeEach(() => {
  serveCachedQuotesMock.mockReset();
  fetchLivePriceMock.mockReset();
});

describe("U2 — toPriceData (SSR→client mapper, pure)", () => {
  it("preserves disclosed values and nulls verbatim — never zero-fills", () => {
    const mapped = toPriceData({
      symbol: "TCS", price: 3120.5, change: null, volume24h: null,
      source: "yahoo-bulk", status: "CACHED",
      observedAt: null, lastUpdated: null,
      marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-02",
    });
    expect(mapped).toEqual({
      price: 3120.5, change: null, changePercent24h: null, volume24h: null, lastUpdated: null,
      // Round 9: provenance fields ride through the SSR snapshot verbatim.
      status: "CACHED", source: "yahoo-bulk",
    });
  });

  it("drops unusable points (missing/nonpositive price, UNAVAILABLE) — the symbol is omitted, not zeroed", () => {
    expect(toPriceData(null)).toBeNull();
    expect(toPriceData({ status: "UNAVAILABLE", lastUpdated: null, price: undefined })).toBeNull();
    expect(toPriceData({ price: 0, change: 0, lastUpdated: null })).toBeNull();
    expect(toPriceData({ price: Number.NaN, change: null, lastUpdated: null })).toBeNull();
  });

  it("direct fetchLivePrice points map too (changePercent24h aliases change when absent)", () => {
    const mapped = toPriceData({
      price: 66000, change: 1.5, source: "coingecko", status: "LIVE",
      observedAt: "2026-10-02T04:29:00.000Z", volume24h: 900_000_000,
      lastUpdated: "2026-10-02T04:29:00.000Z",
    });
    expect(mapped).toEqual({
      price: 66000, change: 1.5, changePercent24h: 1.5, volume24h: 900_000_000,
      lastUpdated: "2026-10-02T04:29:00.000Z",
      status: "LIVE", source: "coingecko",
    });
  });
});

describe("U2 — initialPriceSnapshot (SSR surface)", () => {
  it("the BUILD phase fetches nothing — hermetic prerender", async () => {
    const buildEnv = { NEXT_PHASE: "phase-production-build" };
    const snapshot = await initialPriceSnapshot(["TCS", "BTC"], buildEnv);
    expect(snapshot).toEqual({});
    expect(serveCachedQuotesMock).not.toHaveBeenCalled();
    expect(fetchLivePriceMock).not.toHaveBeenCalled();
  });

  it("runtime (X3): equities PEEK the shared cache in ONE batch read — no refresh claims, no upstream; misses omitted honestly", async () => {
    serveCachedQuotesMock.mockImplementation(async (symbols: string[]) => {
      expect(symbols).toEqual(["TCS", "WIPRO"]); // non-equities never reach the cache
      return {
        TCS: {
          symbol: "TCS", price: 3120.5, change: 0.62, volume24h: null, source: "yahoo-bulk",
          status: "CACHED", observedAt: "2026-10-02T04:29:00.000Z", lastUpdated: "2026-10-02T04:29:00.000Z",
          marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-02",
        },
        // WIPRO miss — omitted, never fabricated
      };
    });

    const snapshot = await initialPriceSnapshot(["TCS", "WIPRO"]);
    expect(Object.keys(snapshot)).toEqual(["TCS"]);
    expect(snapshot["TCS"].lastUpdated).toBe("2026-10-02T04:29:00.000Z");
    expect(serveCachedQuotesMock).toHaveBeenCalledTimes(1); // ONE batch read
    expect(fetchLivePriceMock).not.toHaveBeenCalled();
  });

  it("runtime (X3): non-equity classes (indexes/crypto/commodities/FX) are omitted from SSR — they are not in the equity cache; the client hook fills them", async () => {
    const snapshot = await initialPriceSnapshot(["BTC", "NIFTY50", "GOLD", "USD/INR"]);
    expect(snapshot).toEqual({});
    expect(serveCachedQuotesMock).not.toHaveBeenCalled(); // no equity symbols → no cache read at all
    expect(fetchLivePriceMock).not.toHaveBeenCalled(); // SSR NEVER fetches vendors (cheap first byte)
  });
});

describe("U2 — effectivePollInterval (market-aware cadence, pure)", () => {
  it("market open (or unknown) → the caller's interval", () => {
    expect(effectivePollInterval(60_000, true)).toBe(60_000);
    expect(effectivePollInterval(60_000, undefined)).toBe(60_000);
  });

  it("NSE closed → slowed to at least 5 minutes (batch may carry 24/7 classes)", () => {
    expect(effectivePollInterval(60_000, false)).toBe(300_000);
    expect(effectivePollInterval(600_000, false)).toBe(600_000); // never faster than requested
  });
});

describe("U2 — hook wiring source pin (pure tests cannot see wiring)", () => {
  const hookSource = readFileSync(
    path.resolve(__dirname, "..", "hooks", "useLivePrices.ts"),
    "utf8",
  );

  it("the hook hydrates from initialPrices without dropping the mount revalidation", () => {
    expect(hookSource).toContain("initialPrices");
    // hydration must seed state, not replace the fetch cycle
    expect(hookSource).toContain("useState<Record<string, PriceData>>(initialPrices ?? {})");
    expect(hookSource).toMatch(/fetchPrices\s*\(/); // mount revalidation still happens
  });

  it("the hook reads the NSE market state from the batch payload and adapts cadence", () => {
    expect(hookSource).toMatch(/market/);
    expect(hookSource).toContain("effectivePollInterval");
  });
});
