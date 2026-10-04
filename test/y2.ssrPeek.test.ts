/**
 * Y2 (Round 12) — the SSR price PEEK extension: peers and home tiles.
 *
 * The founder's Y2 defect list: the quote cache only ever held symbols a
 * visitor had already viewed, so the FIRST byte of a stock page rendered
 * peer prices as "—" and the homepage tiles as unavailable until the
 * client hook fetched them. With the warmer keeping the whole universe +
 * tile set fresh, the regen-time peek can cover them at the same fixed
 * cost (ONE batch cache read — still no vendor fetch at render time).
 *
 * Pinned here:
 *   1. Stock page: ONE serveCachedQuotes batch peeks the symbol AND its
 *      peers; the mapped entries ride the RSC payload as
 *      initialPeerPrices (build phase still peeks NOTHING — hermetic).
 *   2. PeerComparison hydrates useLivePrices from those entries — peer
 *      prices exist in the first byte, with their own observation labels.
 *   3. Home tiles: initialPriceSnapshot no longer filters non-equities
 *      out of the peek — warmer-written tile rows (indexes, crypto, gold)
 *      reach the first byte through the same ONE batch read, with their
 *      own observation times; misses stay omitted, never fabricated, and
 *      SSR still never fetches a vendor.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

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

import { initialPriceSnapshot, toPriceData } from "@/lib/dashboardSnapshot";

const STOCK_PAGE = path.resolve(__dirname, "..", "app", "stock", "[symbol]", "page.tsx");
const STOCK_PAGE_CLIENT = path.resolve(
  __dirname,
  "..",
  "components",
  "stock",
  "StockPageClient.tsx",
);
const PEER_COMPARISON = path.resolve(
  __dirname,
  "..",
  "components",
  "stock",
  "PeerComparison.tsx",
);

beforeEach(() => {
  serveCachedQuotesMock.mockReset();
  fetchLivePriceMock.mockReset();
});

describe("Y2 — stock page peers at the first byte (source pins)", () => {
  const page = readFileSync(STOCK_PAGE, "utf8");

  it("peeks the symbol AND its peers in ONE serveCachedQuotes batch at regen", () => {
    expect(page).toContain("serveCachedQuotes");
    expect(page).not.toContain("serveCachedQuote("); // the single-symbol peek is gone
    // the batch is [key, ...peerSymbols]
    expect(page).toMatch(/serveCachedQuotes\(\[key,\s*\.\.\.peerSymbols\]/);
  });

  it("keeps the hermetic build-phase guard (builds peek nothing)", () => {
    expect(page).toMatch(/isBuildPhase\(\)\s*\?\s*\{\}/);
  });

  it("forwards the mapped peer entries into the RSC payload as initialPeerPrices", () => {
    expect(page).toContain("initialPeerPrices");
  });

  it("StockPageClient receives and forwards initialPeerPrices to PeerComparison", () => {
    const client = readFileSync(STOCK_PAGE_CLIENT, "utf8");
    expect(client).toContain("initialPeerPrices");
    expect(client).toMatch(/<PeerComparison[^>]*initialPrices=/);
  });

  it("PeerComparison hydrates useLivePrices from the peeked entries", () => {
    const peer = readFileSync(PEER_COMPARISON, "utf8");
    expect(peer).toMatch(/useLivePrices\(\s*symbols,\s*[^,]+,\s*initialPrices/);
  });
});

describe("Y2 — home tiles at the first byte (initialPriceSnapshot)", () => {
  it("peeks non-equity tile symbols in the SAME batch read — warmer-written rows ride the first byte", async () => {
    serveCachedQuotesMock.mockImplementation(async (symbols: string[]) => {
      expect(symbols).toEqual(["TCS", "BTC", "NIFTY50", "GOLD"]);
      return {
        TCS: {
          symbol: "TCS", price: 3120.5, change: 0.62, volume24h: null, source: "yahoo-bulk",
          status: "CACHED", observedAt: "2026-10-05T04:30:00.000Z", lastUpdated: "2026-10-05T04:30:00.000Z",
          marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-05",
        },
        BTC: {
          symbol: "BTC", price: 66000, change: 1.5, volume24h: 900_000_000, source: "coingecko",
          status: "CACHED", observedAt: "2026-10-05T04:29:00.000Z", lastUpdated: "2026-10-05T04:29:00.000Z",
          marketOpen: true, marketFreshness: "live-delayed", sessionDate: "2026-10-05",
        },
        // NIFTY50 + GOLD: cache misses — omitted, never fabricated
      };
    });

    const snapshot = await initialPriceSnapshot(["TCS", "BTC", "NIFTY50", "GOLD"]);
    expect(Object.keys(snapshot).sort()).toEqual(["BTC", "TCS"]);
    expect(snapshot["BTC"].lastUpdated).toBe("2026-10-05T04:29:00.000Z"); // own observation time
    expect(snapshot["BTC"].source).toBe("coingecko");
    expect(serveCachedQuotesMock).toHaveBeenCalledTimes(1); // ONE batch read
    expect(fetchLivePriceMock).not.toHaveBeenCalled(); // still never a vendor fetch
  });

  it("a pure-tile list still peeks (the warmer may hold rows) — no equity filter remains", async () => {
    serveCachedQuotesMock.mockResolvedValue({});
    const snapshot = await initialPriceSnapshot(["BTC", "NIFTY50", "GOLD", "USD/INR"]);
    expect(snapshot).toEqual({});
    expect(serveCachedQuotesMock).toHaveBeenCalledTimes(1);
    expect(serveCachedQuotesMock.mock.calls[0][0]).toEqual(["BTC", "NIFTY50", "GOLD", "USD/INR"]);
    expect(fetchLivePriceMock).not.toHaveBeenCalled();
  });

  it("the BUILD phase still fetches nothing — hermetic prerender unchanged", async () => {
    const snapshot = await initialPriceSnapshot(["TCS", "BTC"], {
      NEXT_PHASE: "phase-production-build",
    });
    expect(snapshot).toEqual({});
    expect(serveCachedQuotesMock).not.toHaveBeenCalled();
    expect(fetchLivePriceMock).not.toHaveBeenCalled();
  });

  it("toPriceData keeps tile honesty: unusable tile points are dropped, not zeroed", () => {
    expect(toPriceData({ status: "UNAVAILABLE", price: undefined, lastUpdated: null })).toBeNull();
    expect(toPriceData({ price: 0, change: null, lastUpdated: null })).toBeNull();
  });
});
