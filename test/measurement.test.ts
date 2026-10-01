import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// Phase 6.1 — measurement correctness (T59) + semantic preservation (T60.1).
//
// These tests verify the MEASUREMENT, not an optimization: the ledger must
// count exactly one entry per real upstream attempt, must separate
// application requests from upstream calls from cache/coalesce wins, must
// attribute bulk-path Yahoo traffic that health counters deliberately do
// not see, and must never fabricate missing values (T59.5 honesty gate).

import { fetchBulkPricesForSymbols } from "@/lib/nse/bulkFetch";
import { fetchLivePrice, unavailablePriceEntry } from "@/lib/livePrice";
import {
  resetProviderHealth,
  providerReuseStats,
  providerHealthSnapshot,
  coalesce,
} from "@/lib/registry/providerHealth";
import {
  measurementSnapshot,
  resetMeasurement,
  percentile,
  recordAppRequest,
  recordAppRequestDone,
} from "@/lib/health/measurement";
import { presentationState, statusLabel } from "@/lib/pricePresentation";

const REAL_FETCH = globalThis.fetch;

/** Deterministic Yahoo v8 chart response. */
function yahooChartOk(price: number, changePct: number, regularMarketTimeSec?: number) {
  return new Response(
    JSON.stringify({
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: price,
              regularMarketChangePercent: changePct,
              chartPreviousClose: price - (changePct / 100) * price,
              ...(regularMarketTimeSec !== undefined ? { regularMarketTime: regularMarketTimeSec } : {}),
            },
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function mockFetchAlways(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(impl);
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  return spy;
}

function ledgerBulkAttempts(): number {
  return measurementSnapshot().counters.upstreamTotals.bulk;
}

function ledgerBulkFailures(): number {
  return measurementSnapshot().counters.upstreamTotals.bulkFailures;
}

function lastBulkRun(): Record<string, unknown> | null {
  const events = measurementSnapshot().recentEvents.filter(e => e.kind === "bulk-run");
  return (events[events.length - 1] ?? null) as unknown as Record<string, unknown> | null;
}

function healthVolume(id: string): number {
  const out: Record<string, number> = {};
  for (const p of providerHealthSnapshot()) out[p.id] = p.volume?.total ?? 0;
  return out[id] ?? 0;
}

beforeEach(() => {
  resetProviderHealth();
  resetMeasurement();
});

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

// ── T59.2: single-path counting (health + ledger reconcile) ──────────────

describe("T59.2 — upstream attempts vs application requests vs caches", () => {
  it("provider call counted once: health volume and ledger single-path agree", async () => {
    // Real routing path: NSE fails (network) → Yahoo succeeds.
    mockFetchAlways((...args: unknown[]) => {
      const url = String((args[0] as RequestInfo) ?? "");
      if (url.includes("nseindia")) return Promise.reject(new Error("nse down"));
      return Promise.resolve(yahooChartOk(1187, 0.5, 1761900000));
    });

    const result = await fetchLivePrice("BAJFINANCE"); // unique in this file
    expect(result?.source).toBe("yahoo");

    expect(healthVolume("yahoo")).toBe(1);
    const y = measurementSnapshot().counters.upstream["yahoo"];
    expect(y?.single).toBe(1);
    expect(y?.failures).toBe(0);
    expect(measurementSnapshot().counters.upstreamTotals.single).toBeGreaterThanOrEqual(1);
    // the NSE attempt is in the ledger too: the fetcher swallows its own
    // error and returns null, so it counts as a call with NO data returned —
    // never fabricated as an observation.
    const nse = measurementSnapshot().counters.upstream["nse"];
    expect(nse?.single).toBe(1);
    const nseEvent = measurementSnapshot().recentEvents.find(
      e => e.kind === "upstream-attempt" && (e as { providerId: string }).providerId === "nse",
    ) as { ok: boolean; symbolsReturned: number } | undefined;
    expect(nseEvent?.ok).toBe(true);
    expect(nseEvent?.symbolsReturned).toBe(0);
  });

  it("coalesced calls counted correctly: N concurrent → 1 execution, N-1 wins", async () => {
    let executions = 0;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        coalesce("k:test", async () => {
          executions += 1;
          await new Promise(r => setTimeout(r, 20));
          return "value";
        }),
      ),
    );
    expect(executions).toBe(1);
    expect(results).toEqual(Array(5).fill("value"));
    expect(providerReuseStats().coalesceHits).toBe(4);
  });

  it("sequential reuse counted correctly: T60 replay causes zero extra upstream calls", async () => {
    const spy = mockFetchAlways(() => yahooChartOk(1187, 0.5, 1761900000));

    const first = await fetchLivePrice("RELIANCE");
    expect(first?.status).toBe("LIVE");
    const fetchesAfterFirst = spy.mock.calls.length;
    const singleBefore = measurementSnapshot().counters.upstream["yahoo"]?.single ?? 0;

    const second = await fetchLivePrice("RELIANCE");
    expect(second?.status).toBe("CACHED");
    expect(second?.observedAt).toBe(first?.observedAt);
    expect(spy.mock.calls.length).toBe(fetchesAfterFirst);
    expect(measurementSnapshot().counters.upstream["yahoo"]?.single ?? 0).toBe(singleBefore);
    expect(providerReuseStats().cacheHits).toBeGreaterThanOrEqual(1);
  });
});

// ── T59.1: bulk-path instrumentation ─────────────────────────────────────

describe("T59.1 — Yahoo-bulk path is measured", () => {
  it("every upstream HTTP attempt is counted; run aggregate is exact", async () => {
    const spy = mockFetchAlways(() => yahooChartOk(1500, 0.4, 1761900000));
    const symbols = ["TATASTEEL", "JSWSTEEL", "COALINDIA"]; // unique per test (module cache)

    const out = await fetchBulkPricesForSymbols(symbols);

    expect(Object.keys(out).sort()).toEqual([...symbols].sort());
    expect(spy.mock.calls.length).toBe(3); // one HTTP attempt per symbol
    expect(ledgerBulkAttempts()).toBe(3);
    expect(ledgerBulkFailures()).toBe(0);
    const run = lastBulkRun();
    expect(run).toMatchObject({
      providerId: "yahoo",
      symbolsRequested: 3,
      symbolsReturned: 3,
      bulkCacheHits: 0,
      upstreamAttempts: 3,
      chunks: 1,
      chunkSize: 20,
    });
  });

  it("suffix failover counts each attempt and records the HTTP failure class", async () => {
    mockFetchAlways((...args: unknown[]) => {
      const url = String((args[0] as RequestInfo) ?? "");
      if (url.includes(".NS")) return Promise.resolve(new Response("nope", { status: 404 }));
      return Promise.resolve(yahooChartOk(2400, 0.2, 1761900001));
    });

    const out = await fetchBulkPricesForSymbols(["HINDALCO"]);
    expect(out["HINDALCO"]?.price).toBe(2400);
    expect(ledgerBulkAttempts()).toBe(2);
    expect(ledgerBulkFailures()).toBe(1);

    const failed = measurementSnapshot().recentEvents.find(
      e => e.kind === "upstream-attempt" && !(e as { ok: boolean }).ok,
    ) as { httpFailureClass: string } | undefined;
    expect(failed?.httpFailureClass).toBe("http-4xx");
  });

  it("batch cache traffic is identified: second run inside TTL → zero upstream, cache hits recorded", async () => {
    const spy = mockFetchAlways(() => yahooChartOk(999, 0.1, 1761900002));
    const symbols = ["WIPRO", "HCLTECH"];

    await fetchBulkPricesForSymbols(symbols);
    const fetchesFirst = spy.mock.calls.length;

    const second = await fetchBulkPricesForSymbols(symbols);

    expect(spy.mock.calls.length).toBe(fetchesFirst); // no new HTTP at all
    const run = lastBulkRun();
    expect(run).toMatchObject({
      symbolsRequested: 2,
      symbolsReturned: 2,
      bulkCacheHits: 2,
      upstreamAttempts: 0,
    });
    // Provenance survives the replay byte-for-byte.
    expect(second["WIPRO"]?.observedAt).toBe("2025-10-31T08:40:02.000Z");
  });

  it("bulk traffic stays OUT of providerHealth counters (reconciliation expects this split)", async () => {
    mockFetchAlways(() => yahooChartOk(1500, 0.4, 1761900000));
    await fetchBulkPricesForSymbols(["PFC"]);

    expect(ledgerBulkAttempts()).toBe(1);
    expect(healthVolume("yahoo")).toBe(0); // bulk bypasses withProviderHealth BY DESIGN
  });
});

// ── T60.1: semantic preservation on both paths ───────────────────────────

describe("T60.1 — provenance semantics survive replay", () => {
  it("bulk entries carry the ORIGINAL observation time, never the serve time", async () => {
    mockFetchAlways(() => yahooChartOk(1500, 0.4, 1761900000));
    const out = await fetchBulkPricesForSymbols(["TATAPOWER"]);
    const entry = out["TATAPOWER"];
    expect(entry?.observedAt).toBe("2025-10-31T08:40:00.000Z");
    // observedAt must NOT be approximately "now" (the old serve-time stamp)
    const ageMs = Date.now() - Date.parse(entry?.observedAt ?? "");
    expect(ageMs).toBeGreaterThan(60_000);
  });

  it("missing regularMarketTime → observedAt null (never fabricated)", async () => {
    mockFetchAlways(() => yahooChartOk(1500, 0.4)); // no regularMarketTime field
    const out = await fetchBulkPricesForSymbols(["NTPC"]);
    expect(out["NTPC"]?.observedAt).toBeNull();
  });

  it("delayed Yahoo (yahoo-bulk) is never relabelled realtime in presentation", () => {
    const entry = { price: 1500, change: 0.4, source: "yahoo-bulk", status: "LIVE" };
    // raw state is 'live' (a fresh observation) BUT the label discloses DELAYED
    expect(presentationState(entry)).toBe("live");
    expect(statusLabel("live", "yahoo-bulk")).toBe("DELAYED · YAHOO-BULK");
    expect(statusLabel("live", "yahoo-bulk")).not.toContain("LIVE ·");

    // replay semantics are intrinsic and survive: CACHED stays CACHED,
    // STATIC stays STATIC, DERIVED stays DERIVED — never promoted to live.
    expect(presentationState({ price: 1500, source: "yahoo-bulk", status: "CACHED" })).toBe("cached");
    expect(statusLabel("cached", "yahoo-bulk")).toBe("CACHED · YAHOO-BULK");
    expect(presentationState({ price: 7.2, source: "static-yields-us", status: "STATIC" })).toBe("static");
    expect(presentationState({ price: 7.2, source: "yahoo-etf-proxy", status: "DERIVED" })).toBe("derived");
  });

  it("observedAt and checkedAt remain two different timestamps (decision ≠ observation)", () => {
    const un = unavailablePriceEntry();
    expect(un.lastUpdated).toBeNull();
    expect(typeof un.checkedAt).toBe("string");
    expect(Number.isFinite(Date.parse(un.checkedAt))).toBe(true);
  });
});

// ── T59.5: statistics honesty ────────────────────────────────────────────

describe("T59.5 — no manufactured statistics", () => {
  it("percentile returns null below the sample gate and reports the sample size", () => {
    const small = percentile([120, 80, 200], 95, 10);
    expect(small).toEqual({ value: null, sampleSize: 3 });

    const enough = percentile(Array.from({ length: 10 }, (_, i) => (i + 1) * 10), 95, 10);
    expect(enough.sampleSize).toBe(10);
    expect(enough.value).toBe(100); // ceil(0.95*10)-1 = index 9 → max
  });

  it("app-request wall time is attributed to the matching request, unknown completion is ignored", () => {
    recordAppRequest("/api/prices", { symbols: 1 });
    recordAppRequest("/api/prices/batch", { symbols: 5 });
    recordAppRequestDone("/api/prices", 42);

    const events = measurementSnapshot().recentEvents;
    const single = events.find(e => e.kind === "app-request" && (e as { endpoint: string }).endpoint === "/api/prices") as { wallMs: number | null };
    const batch = events.find(e => e.kind === "app-request" && (e as { endpoint: string }).endpoint === "/api/prices/batch") as { wallMs: number | null };
    expect(single.wallMs).toBe(42);
    expect(batch.wallMs).toBeNull(); // not yet completed — must stay null, not invented

    recordAppRequestDone("/api/prices/batch", 77);
    const batch2 = measurementSnapshot().recentEvents.filter(e => e.kind === "app-request").at(-1) as { wallMs: number | null };
    expect(batch2.wallMs).toBe(77);
  });
});
