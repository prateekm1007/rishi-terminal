import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { coinGeckoEntryFromPayload, fetchLivePrice } from "@/lib/livePrice";
import { resetProviderHealth } from "@/lib/registry/providerHealth";

/**
 * Coder Directions §8 (2026-10-02 round 3) — the CoinGecko transport is the
 * last Rule-16 zero-coercion leak:
 *
 *   price:  Number(data[id].usd) || 0
 *   change: Number(data[id].usd_24h_change) || 0
 *
 * A missing change must stay null (a 0% day is a REAL observation, "not
 * reported" is unavailability); a genuine numeric zero change must stay 0;
 * and a missing/invalid PRICE must not become a fake "LIVE 0" observation —
 * the provider attempt yields no observation at all (null downstream), the
 * same contract the Yahoo paths already satisfy.
 */

const REAL_FETCH = globalThis.fetch;

beforeEach(() => resetProviderHealth());
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("coinGeckoEntryFromPayload — Rule-16 classification (pure)", () => {
  it("MUST FAIL PRE-FIX: missing usd_24h_change → change null, never 0", () => {
    const e = coinGeckoEntryFromPayload({ usd: 67000.12, usd_24h_vol: 1234.5 });
    expect(e.price).toBe(67000.12);
    expect(e.change).toBeNull();
    expect(e.volume24h).toBe(1234.5);
  });

  it("MUST FAIL PRE-FIX: missing usd → price null, never a fake zero observation", () => {
    const e = coinGeckoEntryFromPayload({ usd_24h_change: -1.25, usd_24h_vol: 5 });
    expect(e.price).toBeNull();
    expect(e.change).toBe(-1.25);
  });

  it("a GENUINE numeric zero change stays 0 (a flat day is real data)", () => {
    const e = coinGeckoEntryFromPayload({ usd: 1.0, usd_24h_change: 0, usd_24h_vol: 9 });
    expect(e.change).toBe(0);
  });

  it("garbage fields → null (never NaN, never coerced zeros)", () => {
    const e = coinGeckoEntryFromPayload({ usd: "abc", usd_24h_change: null, usd_24h_vol: undefined });
    expect(e).toEqual({ price: null, change: null, volume24h: null });
  });

  it("a zero or negative price is not an observation (price null)", () => {
    expect(coinGeckoEntryFromPayload({ usd: 0 }).price).toBeNull();
    expect(coinGeckoEntryFromPayload({ usd: -3 }).price).toBeNull();
  });

  it("absent volume → null, never 0 (0 would claim zero trading)", () => {
    const e = coinGeckoEntryFromPayload({ usd: 2.5, usd_24h_change: 0.1 });
    expect(e.volume24h).toBeNull();
  });

  it("a fully present entry keeps every real number", () => {
    const e = coinGeckoEntryFromPayload({ usd: 3000.5, usd_24h_change: -2.75, usd_24h_vol: 8_000_000 });
    expect(e).toEqual({ price: 3000.5, change: -2.75, volume24h: 8_000_000 });
  });
});

describe("transport: a price-less CoinGecko payload is NO observation", () => {
  it("MUST FAIL PRE-FIX: fetchLivePrice(BTC) → null when the batch entry has no usable usd price", async () => {
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () =>
      new Response(JSON.stringify({ bitcoin: { usd_24h_change: 0.5, usd_24h_vol: 42 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const r = await fetchLivePrice("BTC");
    // Before the fix the transport served { price: 0, change: 0.5, status:
    // "LIVE" } — a fabricated flat-at-zero crypto quote. The honest contract
    // is no observation at all.
    expect(r).toBeNull();
  });
});
