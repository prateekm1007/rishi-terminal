/**
 * Round 9 (Coder Directions 2026-10-02, directive 20) — the single-price
 * provenance wire gap.
 *
 * Production evidence (probe on dbc4c7b): /api/prices?symbol=BTC returned
 * `observedAt: null` while /api/prices/batch transports it. Root cause: the
 * CoinGecko fetcher never REQUESTS the upstream observation time
 * (include_last_updated_at) and never carries it through the cache — so the
 * client cannot show an observation clock for crypto at all. The single and
 * batch APIs must expose the SAME observation/provenance contract; the
 * client must never reconstruct the timestamp.
 *
 * Rule 21: written first and watched FAIL on main (observedAt absent from
 * the parser's output and both routes' BTC entries).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { coinGeckoEntryFromPayload, fetchLivePrice } from "@/lib/livePrice";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { GET as singleGET } from "@/app/api/prices/route";
import { POST as batchPOST } from "@/app/api/prices/batch/route";

vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }));

const REAL_FETCH = globalThis.fetch;

beforeEach(() => {
  resetProviderHealth();
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

const CG_TIME = 1759310400;
const CG_TIME_ISO = new Date(CG_TIME * 1000).toISOString();

describe("R9 §20 — the CoinGecko parser captures the disclosed observation time", () => {
  it("last_updated_at (unix seconds) parses to ISO; absent → null (never fabricated)", () => {
    const parsed = coinGeckoEntryFromPayload({
      usd: 85272,
      usd_24h_change: 1.4,
      usd_24h_vol: 42_468_332_261,
      last_updated_at: CG_TIME,
    });
    expect(parsed.price).toBe(85272);
    // RED on main: the parser had no observedAt field at all.
    expect(parsed.observedAt).toBe(CG_TIME_ISO);

    const noTime = coinGeckoEntryFromPayload({ usd: 85272 });
    expect(noTime.observedAt).toBeNull();

    const badTime = coinGeckoEntryFromPayload({ usd: 85272, last_updated_at: "not-a-number" });
    expect(badTime.observedAt).toBeNull();
  });
});

describe("R9 §20 — single and batch prices expose the SAME provenance contract", () => {
  /** Mock the CoinGecko simple/price endpoint with a disclosed time. */
  function mockCoinGecko() {
    const spy = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("api.coingecko.com")) {
        // RED on main: the fetcher never requested include_last_updated_at.
        expect(url).toContain("include_last_updated_at=true");
        return new Response(
          JSON.stringify({
            bitcoin: {
              usd: 85272,
              usd_24h_change: 1.4015,
              usd_24h_vol: 42_468_332_261,
              last_updated_at: CG_TIME,
            },
            ethereum: {
              usd: 2100.5,
              usd_24h_change: -0.32,
              usd_24h_vol: 12_000_000_000,
              last_updated_at: CG_TIME,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new TypeError("unexpected fetch " + url);
    });
    (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
    return spy;
  }

  it("fetchLivePrice(BTC) transports observedAt from CoinGecko's disclosure", async () => {
    mockCoinGecko();
    const r = await fetchLivePrice("BTC");
    expect(r).not.toBeNull();
    expect(r?.source).toBe("coingecko");
    // RED on main: observedAt === null.
    expect(r?.observedAt).toBe(CG_TIME_ISO);
    expect(r?.lastUpdated).toBe(CG_TIME_ISO);
  });

  it("the SINGLE route serves the observation time (was: observedAt null in production)", async () => {
    mockCoinGecko();
    const req = {
      url: "https://terminal.test/api/prices?symbol=BTC",
      headers: { get: () => null },
    } as never;
    const res = await singleGET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe("coingecko");
    expect(body.status).toBe("LIVE");
    // RED on main: observedAt null.
    expect(body.observedAt).toBe(CG_TIME_ISO);
    expect(body.lastUpdated).toBe(CG_TIME_ISO);
  });

  it("the BATCH route serves the same observation time — one contract, both APIs", async () => {
    mockCoinGecko();
    const req = {
      headers: { get: () => null },
      json: async () => ({ symbols: ["ETH"] }),
    } as never;
    const res = await batchPOST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    const entry = body.prices.ETH;
    expect(entry.source).toBe("coingecko");
    expect(entry.observedAt).toBe(CG_TIME_ISO);
    expect(entry.lastUpdated).toBe(CG_TIME_ISO);
  });
});
