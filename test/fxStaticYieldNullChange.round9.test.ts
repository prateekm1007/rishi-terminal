/**
 * Round 9 (Coder Directions 2026-10-02, directive 16) — FX / static-yield
 * change semantics.
 *
 * ExchangeRate-API discloses a RATE OBSERVATION but no 24h comparison, and a
 * static reference yield discloses no change at all. Both currently hardcode
 * `change: 0` — which the UI renders as a real "0.00%" market observation
 * (Rule 16: null → 0 fabrication). The contract:
 *
 *   rate   = observed (real number)
 *   change = null (unless a 24h comparison was actually disclosed — e.g. the
 *                   Yahoo forex path, which MUST keep its real change)
 *
 * Rule 21: written first, watched FAIL on main (change === 0 from all three
 * ExchangeRate return sites and the static-yields-us fallback).
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { fetchLivePrice } from "@/lib/livePrice";
import { resetProviderHealth } from "@/lib/registry/providerHealth";

const REAL_FETCH = globalThis.fetch;

beforeEach(() => resetProviderHealth());
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

/** The ExchangeRate-API table the mock serves (rates relative to USD). */
const ER_API_TABLE = JSON.stringify({
  result: "success",
  time_last_update_unix: 1759310400,
  rates: { SGD: 1.29, EUR: 0.85, GBP: 0.75, USD: 1 },
});

function mockFetchWith(handler: (url: string) => Response) {
  const spy = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  );
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  return spy;
}

describe("R9 §16 — ExchangeRate-API fallback: rate observed, change null", () => {
  it("USD/SGD (base=USD): change is null, never a fabricated 0%", async () => {
    mockFetchWith(() => new Response(ER_API_TABLE, { status: 200 }));
    const r = await fetchLivePrice("USD/SGD");
    expect(r).not.toBeNull();
    expect(r?.price).toBeCloseTo(1.29, 4);
    expect(r?.change).toBeNull(); // RED on main: 0
    expect(r?.status).toBe("LIVE");
    expect(r?.source).toBe("exchangerate-api");
    expect(r?.observedAt).toBe(new Date(1759310400 * 1000).toISOString());
  });

  it("SGD/USD (quote=USD, inverse): change is null", async () => {
    mockFetchWith(() => new Response(ER_API_TABLE, { status: 200 }));
    const r = await fetchLivePrice("SGD/USD");
    expect(r).not.toBeNull();
    expect(r?.price).toBeCloseTo(1 / 1.29, 4);
    expect(r?.change).toBeNull(); // RED on main: 0
  });

  it("EUR/GBP (cross rate): change is null", async () => {
    mockFetchWith(() => new Response(ER_API_TABLE, { status: 200 }));
    const r = await fetchLivePrice("EUR/GBP");
    expect(r).not.toBeNull();
    expect(r?.price).toBeCloseTo(0.75 / 0.85, 4);
    expect(r?.change).toBeNull(); // RED on main: 0
  });
});

describe("R9 §16 — static US reference yields carry no change observation", () => {
  it("US2Y with FRED unavailable → STATIC with change null, never 0", async () => {
    // FRED's CSV parse fails against this JSON body → the static reference
    // serves, honestly labelled STATIC — and with NO change observation.
    mockFetchWith(() => new Response(ER_API_TABLE, { status: 200 }));
    const r = await fetchLivePrice("US2Y");
    expect(r).not.toBeNull();
    expect(r?.source).toBe("static-yields-us");
    expect(r?.status).toBe("STATIC");
    expect(r?.price).toBeGreaterThan(0);
    expect(r?.change).toBeNull(); // RED on main: 0
  });
});

describe("R9 §16 — the Yahoo forex path KEEPS its disclosed 24h change", () => {
  it("EUR/USD via Yahoo: change is the disclosed percent, not null", async () => {
    mockFetchWith(() =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                meta: {
                  regularMarketPrice: 1.0842,
                  regularMarketChangePercent: -0.21,
                  chartPreviousClose: 1.0865,
                  regularMarketTime: 1759310400,
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const r = await fetchLivePrice("EUR/USD");
    expect(r).not.toBeNull();
    expect(r?.price).toBeCloseTo(1.0842, 4);
    expect(r?.change).not.toBeNull();
    expect(r?.change).toBeCloseTo(-0.21, 6);
    expect(r?.source).toBe("yahoo");
  });
});
