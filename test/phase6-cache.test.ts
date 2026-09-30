import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchLivePrice, isPersistableSource, REFERENCE_SYMBOLS } from "@/lib/livePrice";
import { resetProviderHealth, providerReuseStats } from "@/lib/registry/providerHealth";
import { captureReferenceObservations } from "@/lib/services/observations";

// Top-level mock (vitest hoists it before any import).
const { upsert } = vi.hoisted(() => ({
  upsert: vi.fn(
    async (row: Record<string, unknown>) => {
      void row; // typed param (mock.calls[i][0]) — intentionally unused
      return { error: null } as { error: { message: string } | null };
    },
  ),
}));

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({ from: () => ({ upsert }) }),
}));

// Phase 6: T60 snapshot reuse, T62 storage-rights gate + persistent-cache
// fallback posture, T61 observation capture eligibility.

const REAL_FETCH = globalThis.fetch;

function mockFetchAlways(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(impl);
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  return spy;
}

function yahooQuoteOk(price: number, changePct: number) {
  return () =>
    new Response(
      JSON.stringify({
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: price,
                regularMarketChangePercent: changePct,
                chartPreviousClose: price - changePct / 100 * price,
              },
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
}

beforeEach(() => resetProviderHealth());
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("T60 fetchLivePrice snapshot reuse", () => {
  it("second sequential call within the window replays CACHED with the original observation time and zero extra upstream calls", async () => {
    const spy = mockFetchAlways(yahooQuoteOk(1187, 0.423));

    const first = await fetchLivePrice("RELIANCE");
    expect(first).not.toBeNull();
    expect(first?.status).toBe("LIVE");
    expect(first?.source).toBe("yahoo");
    const firstObserved = first?.observedAt;
    const fetchesAfterFirst = (spy as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fetchesAfterFirst).toBeGreaterThanOrEqual(1);

    const second = await fetchLivePrice("RELIANCE");
    expect(second).not.toBeNull();
    expect(second?.price).toBe(1187);
    // Honest replay: CACHED + original observation timestamp.
    expect(second?.status).toBe("CACHED");
    expect(second?.observedAt).toBe(firstObserved);
    expect(second?.lastUpdated).toBe(firstObserved);

    // No additional upstream traffic for the replay.
    expect((spy as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchesAfterFirst);
    expect(providerReuseStats().cacheHits).toBeGreaterThanOrEqual(1);
  });

  it("static commodity replays keep their STATIC semantics (never relabelled)", async () => {
    mockFetchAlways(() => { throw new TypeError("fetch failed"); });
    const first = await fetchLivePrice("RUBBER");
    expect(first?.status).toBe("STATIC");
    const second = await fetchLivePrice("RUBBER");
    expect(second?.status).toBe("STATIC");
    expect(second?.source).toBe("static-commodities");
  });
});

describe("T62 storage-rights gate", () => {
  it("only storage-entitled sources may be persisted", () => {
    expect(isPersistableSource("fred-csv")).toBe(true);
    expect(isPersistableSource("exchangerate-api")).toBe(true);
    expect(isPersistableSource("ecb-fx")).toBe(true);
    // Scraped / terms-unverified / derived sources: never persisted.
    expect(isPersistableSource("yahoo")).toBe(false);
    expect(isPersistableSource("nse")).toBe(false);
    expect(isPersistableSource("bse")).toBe(false);
    expect(isPersistableSource("coingecko")).toBe(false);
    expect(isPersistableSource("screener")).toBe(false);
    expect(isPersistableSource("yahoo-etf-proxy")).toBe(false);
    expect(isPersistableSource(undefined)).toBe(false);
    expect(isPersistableSource("static-yields-us")).toBe(false);
  });

  it("persistent-cache fallback stays inert when Supabase is not configured", async () => {
    // In vitest no Supabase env exists. Outage on a storage-entitled-class
    // symbol (US10Y): FRED fails, the honest STATIC reference remains (Phase
    // 5 behaviour) — crucially NOT a fabricated CACHED copy (unconfigured
    // store cannot have served one). Outage on a scraped-source symbol:
    // honest null (UNAVAILABLE at the route).
    mockFetchAlways(() => new Response("denied", { status: 403 }));
    const us = await fetchLivePrice("US10Y");
    expect(us?.status).toBe("STATIC");
    expect(us?.source).toBe("static-yields-us");
    // INFY: no earlier in-file cache entry — the whole scraped-source chain
    // fails and the unconfigured persistent store has nothing to offer.
    const eq = await fetchLivePrice("INFY");
    expect(eq).toBeNull();
  });

  it("reference observation set is bonds + FX only (no equity/crypto)", () => {
    expect(REFERENCE_SYMBOLS).toContain("US10Y");
    expect(REFERENCE_SYMBOLS).toContain("US3MTB");
    expect(REFERENCE_SYMBOLS).toContain("USD/INR");
    expect(REFERENCE_SYMBOLS).toContain("EUR/INR");
    expect(REFERENCE_SYMBOLS.some(s => s === "RELIANCE" || s === "BTC")).toBe(false);
  });

  it("forex served by Yahoo is labelled yahoo — never the chain id (provenance regression)", async () => {
    // Yahoo quote shape satisfies fetchYahooQuote; without the explicit
    // source label, attempt() stamped 'exchangerate-api' on Yahoo data,
    // which would also (wrongly) qualify it for DB persistence.
    mockFetchAlways(yahooQuoteOk(83.9, -0.156));
    const r = await fetchLivePrice("USD/INR");
    expect(r).not.toBeNull();
    expect(r?.source).toBe("yahoo");
    expect(isPersistableSource(r?.source)).toBe(false);
  });
});

describe("T61 captureReferenceObservations", () => {
  it("persists only storage-entitled observations; skips others honestly", async () => {
    upsert.mockClear();
    const rows: Record<string, { price: number; change: number; source: string; observedAt: string } | null> = {
      "US10Y":   { price: 4.42, change: 0.02, source: "fred-csv", observedAt: "2026-10-01T10:00:00.000Z" },
      "USD/INR": { price: 83.9, change: 0, source: "exchangerate-api", observedAt: "2026-10-01T10:00:01.000Z" },
      "EUR/INR": { price: 90.5, change: 0, source: "yahoo", observedAt: "2026-10-01T10:00:02.000Z" },
      "US2Y":    null,
    };
    const fetcher = vi.fn(async (symbol: string) => rows[symbol] ?? null);

    const result = await captureReferenceObservations(fetcher as never);

    expect(result.eligible).toBe(REFERENCE_SYMBOLS.length);
    expect(result.persisted).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0]).toMatchObject({
      symbol: "US10Y",
      source: "fred-csv",
      price: 4.42,
      observed_at: "2026-10-01T10:00:00.000Z",
    });
    // No fabricated rows for unavailable or non-entitled symbols.
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(REFERENCE_SYMBOLS.length - 2);
  });

  it("DB errors are counted, never thrown", async () => {
    upsert.mockClear();
    upsert.mockResolvedValueOnce({ error: { message: "42501" } });
    const fetcher = vi.fn(async () => ({
      price: 4.28, change: 0.01, source: "fred-csv", observedAt: "2026-10-01T10:00:00.000Z",
    }));
    const result = await captureReferenceObservations(fetcher as never);
    expect(result.errors).toBe(1);
    expect(result.persisted).toBe(REFERENCE_SYMBOLS.length - 1);
  });
});
