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
              currency: "INR",
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

/** LP2: deterministic spark (multi-symbol) response — the bulk transport's
 *  first-choice wire. One HTTP attempt per ≤20-symbol GROUP; the ledger
 *  records it with symbolsRequested=group, symbolsReturned=returned. */
function yahooSparkOk(entries: Array<{ sym: string; price: number; changePct: number; ts?: number }>) {
  return new Response(
    JSON.stringify({
      spark: {
        result: entries.map((e) => ({
          symbol: `${e.sym}.NS`,
          response: [
            {
              meta: {
                currency: "INR",
                regularMarketPrice: e.price,
                regularMarketChangePercent: e.changePct,
                chartPreviousClose: e.price - (e.changePct / 100) * e.price,
                ...(e.ts !== undefined ? { regularMarketTime: e.ts } : {}),
              },
            },
          ],
        })),
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Answers a spark URL with one INR entry per requested symbol (uniform
 *  price/change/ts); non-spark URLs fall through to `chart`. */
function mockSparkThenChart(
  spark: (u: URL, syms: string[]) => Promise<Response> | Response,
  chart: (url: string) => Promise<Response> | Response,
) {
  return mockFetchAlways((...args: unknown[]) => {
    const url = String((args[0] as RequestInfo) ?? "");
    const u = new URL(url);
    if (u.pathname.includes("/v7/finance/spark")) {
      const syms = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean)
        .map((s) => s.replace(/\.(NS|BO)$/, ""));
      return Promise.resolve(spark(u, syms));
    }
    return Promise.resolve(chart(url));
  });
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
  it("every upstream HTTP attempt is counted; run aggregate is exact (one attempt per spark GROUP)", async () => {
    const spy = mockSparkThenChart(
      (_u, syms) => yahooSparkOk(syms.map((s) => ({ sym: s, price: 1500, changePct: 0.4, ts: 1761900000 }))),
      () => yahooChartOk(1500, 0.4, 1761900000),
    );
    const symbols = ["TATASTEEL", "JSWSTEEL", "COALINDIA"]; // unique per test (module cache)

    const out = await fetchBulkPricesForSymbols(symbols);

    expect(Object.keys(out).sort()).toEqual([...symbols].sort());
    expect(spy.mock.calls.length).toBe(1); // ONE spark call for the whole ≤20-symbol group
    expect(ledgerBulkAttempts()).toBe(1);
    expect(ledgerBulkFailures()).toBe(0);
    const run = lastBulkRun();
    expect(run).toMatchObject({
      providerId: "yahoo",
      symbolsRequested: 3,
      symbolsReturned: 3,
      bulkCacheHits: 0,
      upstreamAttempts: 1,
      chunks: 1,
      chunkSize: 20,
    });
  });

  it("spark→chart failover counts each attempt and records the HTTP failure class", async () => {
    mockSparkThenChart(
      () => new Response("nope", { status: 404 }), // spark refused
      (url) =>
        url.includes(".NS")
          ? Promise.resolve(new Response("nope", { status: 404 })) // .NS refused
          : Promise.resolve(yahooChartOk(2400, 0.2, 1761900001)), // .BO serves
    );

    const out = await fetchBulkPricesForSymbols(["HINDALCO"]);
    expect(out["HINDALCO"]?.price).toBe(2400);
    // three REAL HTTP attempts: spark 404, chart .NS 404, chart .BO 200
    expect(ledgerBulkAttempts()).toBe(3);
    expect(ledgerBulkFailures()).toBe(2);

    const failed = measurementSnapshot().recentEvents.find(
      e => e.kind === "upstream-attempt" && !(e as { ok: boolean }).ok,
    ) as { httpFailureClass: string } | undefined;
    expect(failed?.httpFailureClass).toBe("http-4xx");
  });

  it("batch cache traffic is identified: second run inside TTL → zero upstream, cache hits recorded", async () => {
    const spy = mockSparkThenChart(
      (_u, syms) => yahooSparkOk(syms.map((s) => ({ sym: s, price: 999, changePct: 0.1, ts: 1761900002 }))),
      () => yahooChartOk(999, 0.1, 1761900002),
    );
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
    mockSparkThenChart(
      (_u, syms) => yahooSparkOk(syms.map((s) => ({ sym: s, price: 1500, changePct: 0.4, ts: 1761900000 }))),
      () => yahooChartOk(1500, 0.4, 1761900000),
    );
    await fetchBulkPricesForSymbols(["PFC"]);

    expect(ledgerBulkAttempts()).toBe(1);
    expect(healthVolume("yahoo")).toBe(0); // bulk bypasses withProviderHealth BY DESIGN
  });
});

// ── T60.1: semantic preservation on both paths ───────────────────────────

describe("T60.1 — provenance semantics survive replay", () => {
  it("bulk entries carry the ORIGINAL observation time, never the serve time", async () => {
    mockSparkThenChart(
      (_u, syms) => yahooSparkOk(syms.map((s) => ({ sym: s, price: 1500, changePct: 0.4, ts: 1761900000 }))),
      () => yahooChartOk(1500, 0.4, 1761900000),
    );
    const out = await fetchBulkPricesForSymbols(["TATAPOWER"]);
    const entry = out["TATAPOWER"];
    expect(entry?.observedAt).toBe("2025-10-31T08:40:00.000Z");
    // observedAt must NOT be approximately "now" (the old serve-time stamp)
    const ageMs = Date.now() - Date.parse(entry?.observedAt ?? "");
    expect(ageMs).toBeGreaterThan(60_000);
  });

  it("missing regularMarketTime → observedAt null (never fabricated)", async () => {
    mockSparkThenChart(
      (_u, syms) => yahooSparkOk(syms.map((s) => ({ sym: s, price: 1500, changePct: 0.4 }))),
      () => yahooChartOk(1500, 0.4), // no regularMarketTime field
    );
    const out = await fetchBulkPricesForSymbols(["NTPC"]);
    expect(out["NTPC"]?.observedAt).toBeNull();
  });

  it("delayed Yahoo (yahoo-bulk) is never relabelled realtime in presentation", () => {
    const entry = { price: 1500, change: 0.4, source: "yahoo-bulk", status: "LIVE" };
    // raw state is 'live' (a fresh observation) BUT the label discloses DELAYED
    expect(presentationState(entry)).toBe("live");
    // Y3 (Round 12): the jargon chip became the plain transport label.
    expect(statusLabel("live", "yahoo-bulk")).toBe("Delayed · Yahoo Finance (unofficial)");
    expect(statusLabel("live", "yahoo-bulk")).not.toContain("LIVE ·");

    // replay semantics are intrinsic and survive: CACHED stays CACHED,
    // STATIC stays STATIC, DERIVED stays DERIVED — never promoted to live.
    expect(presentationState({ price: 1500, source: "yahoo-bulk", status: "CACHED" })).toBe("cached");
    expect(statusLabel("cached", "yahoo-bulk")).toBe("Delayed · Yahoo Finance (unofficial)");
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

  it("uncompleted requests keep wallMs null — never invented", () => {
    recordAppRequest("/api/prices", { symbols: 1 });
    const events = measurementSnapshot().recentEvents.filter(e => e.kind === "app-request") as Array<{ wallMs: number | null }>;
    expect(events).toHaveLength(1);
    expect(events[0].wallMs).toBeNull();
  });
});

// ── Deep-audit corrective gate 1: request-ID attribution ────────────────
// recordAppRequestDone used to scan backwards for the most recent
// incomplete event on the endpoint — under concurrent requests a
// completion could attach its wall time to the WRONG request. Completion
// must target exactly the event ID its caller received.

describe("corrective — app-request wall time is attributed by request ID", () => {
  it("out-of-order completions attach wallMs to their OWN event (not the last incomplete one)", () => {
    const ids = Array.from({ length: 6 }, (_, i) =>
      recordAppRequest("/api/prices", { symbols: i + 1 }),
    );
    expect(new Set(ids).size).toBe(6); // IDs are unique per request
    const walls = [50, 10, 40, 20, 60, 30];
    const completionOrder = [1, 4, 0, 5, 2, 3]; // deliberately ≠ registration order
    for (const i of completionOrder) recordAppRequestDone(ids[i], walls[i]);

    const events = measurementSnapshot().recentEvents.filter(
      e => e.kind === "app-request",
    ) as Array<{ id: string; wallMs: number | null; symbols: number | null }>;
    ids.forEach((id, i) => {
      const ev = events.find(e => e.id === id);
      expect(ev).toBeDefined();
      expect(ev?.wallMs).toBe(walls[i]); // exact attribution, no cross-attachment
      expect(ev?.symbols).toBe(i + 1);
    });
  });

  it("concurrent same-endpoint requests with different delays each record their own wall time", async () => {
    const delays = [30, 5, 45, 15, 25];
    const ids = await Promise.all(
      delays.map(async d => {
        const id = recordAppRequest("/api/prices/batch", { symbols: 1 });
        await new Promise(r => setTimeout(r, d));
        recordAppRequestDone(id, d);
        return id;
      }),
    );

    const events = measurementSnapshot().recentEvents.filter(
      e => e.kind === "app-request",
    ) as Array<{ id: string; wallMs: number | null }>;
    ids.forEach((id, i) => {
      const ev = events.find(e => e.id === id);
      expect(ev?.wallMs).toBe(delays[i]);
    });
  });

  it("double completion and unknown IDs cannot hijack another event's wall time", () => {
    const a = recordAppRequest("/api/prices", { symbols: 1 });
    const b = recordAppRequest("/api/prices", { symbols: 1 });
    recordAppRequestDone(a, 11);      // correct completion
    recordAppRequestDone(a, 99);      // double completion: first wins
    recordAppRequestDone("req-never-issued", 77); // unknown ID: silent no-op
    recordAppRequestDone(b, 22);      // b unaffected by all of the above

    const events = measurementSnapshot().recentEvents.filter(
      e => e.kind === "app-request",
    ) as Array<{ id: string; wallMs: number | null }>;
    expect(events.find(e => e.id === a)?.wallMs).toBe(11);
    expect(events.find(e => e.id === b)?.wallMs).toBe(22);
  });
});

// ── Deep-audit corrective gate 2: bulk-run local attribution ─────────────
// fetchBulkPricesForSymbols used to derive its per-run upstream counts from
// global ledger deltas (before → concurrent work → after). Overlapping
// batch requests absorbed each other's attempts. Each run must own its
// accounting.

describe("corrective — overlapping bulk runs cannot charge each other's attempts", () => {
  it("two concurrent bulk runs each report exactly their own upstream attempts and failures", async () => {
    // Run 1: symbols TESTA/TESTB — spark serves both, but slowly (keeps the
    // run's window open across run 2's entire lifetime).
    // Run 2: symbols TESTC/TESTD — spark 404s, then chart .NS 404s, .BO serves.
    const spy = mockSparkThenChart(
      (_u, syms) => {
        if (syms.includes("TESTA")) {
          return new Promise<Response>((resolve) =>
            setTimeout(() => resolve(yahooSparkOk(syms.map((s) => ({ sym: s, price: 100, changePct: 0.1, ts: 1761900004 })))), 40),
          );
        }
        return new Promise<Response>((resolve) =>
          setTimeout(() => resolve(new Response("no", { status: 404 })), 5),
        );
      },
      (url) => {
        if (url.includes(".BO")) {
          return new Promise<Response>((resolve) =>
            setTimeout(() => resolve(yahooChartOk(200, 0.2, 1761900005)), 60),
          );
        }
        return new Promise<Response>((resolve) =>
          setTimeout(() => resolve(new Response("no", { status: 404 })), 5),
        );
      },
    );

    // Start run 1, let it enter its fetch window, then start run 2 inside
    // that window — the contamination scenario the old delta method got wrong.
    const run1 = fetchBulkPricesForSymbols(["TESTA", "TESTB"]);
    await new Promise(r => setTimeout(r, 10));
    const run2 = fetchBulkPricesForSymbols(["TESTC", "TESTD"]);
    const [out1, out2] = await Promise.all([run1, run2]);

    expect(Object.keys(out1).sort()).toEqual(["TESTA", "TESTB"]);
    expect(Object.keys(out2).sort()).toEqual(["TESTC", "TESTD"]);
    // Real upstream HTTP: 1 spark (run 1) + 1 spark + 2×(.NS+.BO) chart (run 2) = 6.
    expect(spy.mock.calls.length).toBe(6);

    const runs = measurementSnapshot().recentEvents.filter(
      e => e.kind === "bulk-run",
    ) as unknown as Array<Record<string, number | string>>;
    expect(runs).toHaveLength(2);
    const run1Event = runs.find(r => r.upstreamAttempts === 1);
    const run2Event = runs.find(r => r.upstreamAttempts === 5);
    expect(run1Event, "run 1 must own exactly its 1 spark attempt").toBeDefined();
    expect(run2Event, "run 2 must own exactly its spark+4 chart attempts").toBeDefined();
    expect(run1Event).toMatchObject({
      symbolsRequested: 2, symbolsReturned: 2, bulkCacheHits: 0, upstreamFailures: 0,
    });
    expect(run2Event).toMatchObject({
      symbolsRequested: 2, symbolsReturned: 2, bulkCacheHits: 0, upstreamFailures: 3,
    });
    // The global ledger still saw every attempt (reconciliation stream intact).
    expect(ledgerBulkAttempts()).toBe(6);
    expect(ledgerBulkFailures()).toBe(3);
  });
});
