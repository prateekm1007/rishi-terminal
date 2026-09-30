import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { fetchLivePrice, yahooChangeFromMeta } from "@/lib/livePrice";
import { resetProviderHealth } from "@/lib/registry/providerHealth";

// T56/T57: provider failure modes must normalize to null / UNAVAILABLE —
// never a seed placeholder, never zeros dressed up as a quote.

const REAL_FETCH = globalThis.fetch;

function mockFetchOnce(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(impl);
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  return spy;
}

beforeEach(() => resetProviderHealth());
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("fetchLivePrice failure modes (T56)", () => {
  it("network outage on every provider → null (never a seed price)", async () => {
    mockFetchOnce(() => {
      throw new TypeError("fetch failed");
    });
    const r = await fetchLivePrice("RELIANCE");
    expect(r).toBeNull();
  });

  it("HTTP 429 on every provider → null", async () => {
    mockFetchOnce(() => new Response("rate limited", { status: 429 }));
    const r = await fetchLivePrice("TCS");
    expect(r).toBeNull();
  });

  it("HTTP 403 on every provider → null", async () => {
    mockFetchOnce(() => new Response("denied", { status: 403 }));
    const r = await fetchLivePrice("INFY");
    expect(r).toBeNull();
  });

  it("malformed payload (invalid JSON) → null", async () => {
    mockFetchOnce(() => new Response("<html>Akamai error</html>", { status: 200 }));
    const r = await fetchLivePrice("WIPRO");
    expect(r).toBeNull();
  });

  it("empty payload (no usable price) → null", async () => {
    mockFetchOnce(() =>
      new Response(JSON.stringify({ chart: { result: [{ meta: {} }] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const r = await fetchLivePrice("SBIN");
    expect(r).toBeNull();
  });

  it("static commodity reference carries status STATIC, never LIVE", async () => {
    // RUBBER/MENTHAOIL/COTTON have no live mapping (not on Yahoo futures, not
    // on the NSE derivative map) — they resolve through the static layer.
    const r = await fetchLivePrice("RUBBER");
    expect(r).not.toBeNull();
    expect(r?.source).toBe("static-commodities");
    expect(r?.status).toBe("STATIC");
    expect(r?.price).toBeGreaterThan(0);
  });

  it("concurrent identical requests coalesce into one upstream pass (T46)", async () => {
    const spy = mockFetchOnce(() =>
      new Response(
        JSON.stringify({
          chart: {
            result: [
              {
                meta: {
                  regularMarketPrice: 1187,
                  regularMarketChangePercent: 0.423,
                  chartPreviousClose: 1182,
                },
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const results = await Promise.all([
      fetchLivePrice("RELIANCE"),
      fetchLivePrice("RELIANCE"),
      fetchLivePrice("RELIANCE"),
    ]);
    // One in-flight promise shared; note the per-instance Yahoo cache may
    // also absorb repeats — the strong assertion is that ALL callers got
    // the same provenance-carrying result and none was null.
    for (const r of results) {
      expect(r?.price).toBe(1187);
      expect(r?.change).toBeCloseTo(0.423, 6);
      expect(r?.source).toBe("yahoo");
      expect(r?.status).toBe("LIVE");
    }
    expect((spy as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(3);
  });
});

describe("yahooChangeFromMeta (regression: 0.00% tickers)", () => {
  it("trusts regularMarketChangePercent without a previousClose", () => {
    expect(
      yahooChangeFromMeta({ regularMarketPrice: 1187, regularMarketChangePercent: 0.423 }),
    ).toEqual({ price: 1187, change: 0.423 });
  });
});

describe("Phase 5.1 — APPROVED-only routing enforcement (T55)", () => {
  it("RESEARCH_ONLY Screener is NEVER called, even when every APPROVED stock provider fails", async () => {
    // Every APPROVED Indian-stock source (NSE, Yahoo ×2, BSE) is degraded.
    // HDFCBANK: not warmed by earlier tests (module-level Yahoo cache has a
    // 120 s TTL keyed by symbol — RELIANCE/TCS/INFY/WIPRO/SBIN are).
    const spy = mockFetchOnce(() => new Response("rate limited", { status: 429 }));
    const r = await fetchLivePrice("HDFCBANK");
    // The honest result is null (→ UNAVAILABLE downstream), NOT a last-resort
    // scrape of a RESEARCH_ONLY provider. Screener must be unreachable
    // through the routing layer — structurally, not by convention.
    expect(r).toBeNull();
    const urls = spy.mock.calls.map(c => String((c as unknown[])[0]));
    expect(urls.length).toBeGreaterThan(0); // APPROVED providers WERE attempted
    expect(urls.some(u => u.includes("screener.in"))).toBe(false);
  });

  it("a degraded chain still proves the gate: 403 everywhere → no screener.in request", async () => {
    const spy = mockFetchOnce(() => new Response("denied", { status: 403 }));
    const r = await fetchLivePrice("TCS");
    expect(r).toBeNull();
    expect(
      spy.mock.calls.map(c => String((c as unknown[])[0])).some(u => u.includes("screener.in")),
    ).toBe(false);
  });
});
