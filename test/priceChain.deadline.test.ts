/**
 * Commit O (Coder Directions #13) — the Indian-stock price chain gains a
 * request-level strategy: the two genuinely independent first-choice sources
 * (NSE, Yahoo v8) race in parallel instead of the NSE result being awaited
 * before Yahoo is even tried, and the tail providers (Yahoo v7, BSE) run
 * only within the request deadline. Provenance and observation timestamps
 * are preserved exactly (the winner's own source rides the result).
 *
 * Fail-first (Rule 21): pre-O, a hung NSE upstream serialized the whole
 * chain — Yahoo's healthy answer was only reachable after NSE's own 8 s
 * abort. The row below fails on the pre-fix tree (wall > 5 s, timeout).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const REAL_FETCH = globalThis.fetch;

function yahooChartResponse(meta: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ chart: { result: [{ meta }] } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function hangForever(): Promise<Response> {
  return new Promise(() => {});
}

describe("MUST FAIL PRE-O: a hung first-choice source cannot serialize the chain", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("nseindia.com")) return hangForever(); // NSE upstream hung
      if (url.includes("query1.finance.yahoo.com")) {
        return yahooChartResponse({
          regularMarketPrice: 1167.7,
          regularMarketChangePercent: 0.42,
          regularMarketTime: 1727784000,
          chartPreviousClose: 1162.8,
        });
      }
      throw new Error(`unexpected upstream in test: ${url}`);
    });
  });

  afterEach(() => {
    (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
    vi.restoreAllMocks();
  });

  it("Yahoo answers within 5 s wall while NSE hangs — provenance preserved (source=yahoo, live)", async () => {
    const { fetchLivePrice } = await import("@/lib/livePrice");
    const t0 = Date.now();
    const point = await fetchLivePrice("TCS");
    const wall = Date.now() - t0;
    expect(point).not.toBeNull();
    expect(point!.price).toBe(1167.7);
    expect(point!.source).toBe("yahoo"); // the winner's own provenance
    expect(point!.status).toBe("LIVE");
    expect(point!.change).toBe(0.42);
    // Yahoo's own observation time, never the fetch time.
    expect(point!.observedAt).toBe(new Date(1727784000 * 1000).toISOString());
    expect(wall).toBeLessThan(5_000); // pre-O this waited for NSE's 8 s abort first
  }, 20_000);
});
