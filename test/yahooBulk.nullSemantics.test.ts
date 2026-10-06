/**
 * Commit O (Coder Directions #9/#10) — the Yahoo BULK path obeys the same
 * unified change semantics as the single-symbol path.
 *
 * Pre-O defects (Rule 16): the bulk parser carried the THIRD competing
 * interpretation of a Yahoo chart payload —
 *   `prevClose = Number(meta.previousClose) || Number(meta.chartPreviousClose) || price`
 * — which fabricated a live "change = 0 percent" for every symbol whose
 * payload disclosed no change data, and `volume || 0` fabricated trading
 * volume out of a missing field. Production wire evidence (2026-10-02):
 * /api/prices/batch returned RELIANCE change=0 changePercent24h=0 with
 * source=yahoo-bulk while Yahoo disclosed none.
 *
 * Post-O: the bulk path consumes the ONE parser (yahooChangeFromMeta) —
 * unestablishable change is null, absent volume is null. Fail-first rows
 * below failed on the pre-fix tree.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/registry/providerHealth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/registry/providerHealth")>();
  return {
    ...actual,
    // Keep coalescing semantics but execute immediately in tests.
    coalesce: async (_key: string, fn: () => Promise<unknown>) => fn(),
  };
});

import { fetchBulkPricesForSymbols } from "@/lib/nse/bulkFetch";

const REAL_FETCH = globalThis.fetch;

function yahooChartResponse(meta: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ chart: { result: [{ meta }] } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// LP2: the bulk transport is spark-first — the stub is URL-aware so the
// same meta fixtures flow through BOTH transports: spark URLs receive a
// spark-shaped envelope; per-symbol chart fallbacks receive the chart
// shape. Metas carry currency:"INR" — the LP2 currency gate (fail-closed)
// rejects an absent/USD currency, so the fixtures name the instrument
// they claim to be.
function stubMeta(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { currency: "INR", ...overrides };
}

beforeEach(() => {
  (globalThis as { fetch: unknown }).fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/v7/finance/spark")) {
      const requested = new URL(url).searchParams.get("symbols") ?? "";
      const results = requested
        .split(",")
        .filter(Boolean)
        .map((s) => ({
          symbol: s,
          response: [{ meta: stubMeta({ regularMarketPrice: 1167.7, regularMarketTime: 1727784000 }) }],
        }));
      return new Response(JSON.stringify({ spark: { result: results } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return yahooChartResponse(stubMeta({ regularMarketPrice: 1167.7, regularMarketTime: 1727784000 }));
  });
});

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("MUST FAIL PRE-O: the bulk path never fabricates change/volume", () => {
  it("a price-only meta yields change null (was: fabricated 0 via previousClose || price)", async () => {
    const out = await fetchBulkPricesForSymbols(["RELIANCE"]);
    expect(out.RELIANCE).toBeDefined();
    expect(out.RELIANCE.price).toBe(1167.7);
    expect(out.RELIANCE.change).toBeNull();
  });

  it("a missing volume field yields null, never 0", async () => {
    const out = await fetchBulkPricesForSymbols(["TCS"]);
    expect(out.TCS).toBeDefined();
    expect(out.TCS.volume).toBeNull();
  });

  it("a genuine disclosed change still flows through", async () => {
    (globalThis as { fetch: unknown }).fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/v7/finance/spark")) {
        const requested = new URL(url).searchParams.get("symbols") ?? "";
        const results = requested
          .split(",")
          .filter(Boolean)
          .map((s) => ({
            symbol: s,
            response: [
              {
                meta: stubMeta({
                  regularMarketPrice: 1167.7,
                  regularMarketChangePercent: 0.42,
                  regularMarketVolume: 16667234,
                  regularMarketTime: 1727784000,
                }),
              },
            ],
          }));
        return new Response(JSON.stringify({ spark: { result: results } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return yahooChartResponse(
        stubMeta({
          regularMarketPrice: 1167.7,
          regularMarketChangePercent: 0.42,
          regularMarketVolume: 16667234,
          regularMarketTime: 1727784000,
        }),
      );
    });
    const out = await fetchBulkPricesForSymbols(["INFY"]);
    expect(out.INFY.change).toBe(0.42);
    expect(out.INFY.volume).toBe(16667234);
  });
});
