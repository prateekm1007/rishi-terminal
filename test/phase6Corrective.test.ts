import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchLivePrice } from "@/lib/livePrice";
import { persistentCacheGet, persistentCacheSet } from "@/lib/cache/persistentCache";
import { captureReferenceObservations, type ObservationFetcher } from "@/lib/services/observations";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { REFERENCE_SYMBOLS } from "@/lib/livePrice";

// Phase 6 corrective gate (deep-audit findings 3/4/5) — provenance and
// entitlement correctness:
//   3. observedAt is string|null: an upstream that discloses no observation
//      time yields null — current time is NEVER passed off as observation
//      time, on first observation, on replay, or in storage.
//   4. persistentCacheGet independently re-validates provider entitlement
//      on the READ path (a malformed/historical/manually inserted row can
//      never become an entitlement bypass).
//   5. T62 last-known fallback precedence is documented by test: the
//      in-chain STATIC reference wins before lastKnownObservation is ever
//      reached for bond symbols (measured design gap, no priority change).

// Keyed in-memory provider_cache store backing the supabaseAdmin mock.
const store = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, unknown>[]> }));
const providerCacheUpsert = vi.hoisted(() =>
  vi.fn(async (row: Record<string, unknown>) => {
    void row;
    return { error: null } as { error: { message: string } | null };
  }),
);
const observedPricesUpsert = vi.hoisted(() =>
  vi.fn(async (row: Record<string, unknown>) => {
    void row;
    return { error: null } as { error: { message: string } | null };
  }),
);

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (table: string) => {
      if (table === "provider_cache") {
        return {
          select: () => ({
            eq: (_col: string, key: string) => ({
              limit: async () => ({
                data: store.rows[key] ?? [],
                error: null,
              }),
            }),
          }),
          upsert: providerCacheUpsert,
        };
      }
      return { upsert: observedPricesUpsert };
    },
  }),
}));

function putCacheRow(
  key: string,
  providerId: string,
  observedAtIso: string,
  payload: { price: number; change: number },
): void {
  store.rows[key] = [
    {
      payload,
      observed_at: observedAtIso,
      provider_id: providerId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

const REAL_FETCH = globalThis.fetch;

function mockFetchAlways(impl: (...args: unknown[]) => Promise<Response> | Response) {
  const spy = vi.fn(impl);
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  return spy;
}

/** Yahoo v8 chart response; regularMarketTime omitted when not given. */
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

/** FRED CSV with an explicit observation DATE column (what FRED discloses). */
function fredCsv(rows: Array<[string, string]>) {
  const body = ["DATE,VALUE", ...rows.map(([d, v]) => `${d},${v}`)].join("\n");
  return new Response(body, { status: 200, headers: { "Content-Type": "text/csv" } });
}

/** open.er-api.com response with no upstream update timestamp. */
function erApiOk(rates: Record<string, number>) {
  return new Response(
    JSON.stringify({ result: "success", rates }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Rates every er-api test needs — forexCacheData is shared across the
 *  module's 5-minute TTL, so the first fetch feeds every later pair.
 *  Deliberately excludes NOK and CHF: those pairs must resolve to null so
 *  the lastKnownObservation fallback tests reach the persistent store. */
const ER_RATES = { ZAR: 18.2, SEK: 10.5 };

beforeEach(() => {
  resetProviderHealth();
  store.rows = {};
  providerCacheUpsert.mockClear();
  observedPricesUpsert.mockClear();
  // Test-only values so persistentCache's configured() gate opens and the
  // code paths under test actually execute (the DB client itself is the
  // mock above — nothing leaves the process). Without this, every cache
  // test would pass for the wrong reason: the layer silently inert.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-fixture-key";
});

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  vi.restoreAllMocks();
});

// ── Corrective 3: no fabricated observation timestamps ───────────────────

describe("corrective — observedAt is null when the upstream discloses no observation time", () => {
  it("single-path Yahoo observation without regularMarketTime → observedAt null, lastUpdated null (never 'now')", async () => {
    mockFetchAlways(() => yahooChartOk(24150, 0.6)); // no regularMarketTime field
    const r = await fetchLivePrice("NIFTY50");

    expect(r?.status).toBe("LIVE");
    expect(r?.observedAt).toBeNull();
    expect(r?.lastUpdated).toBeNull(); // serve time must NOT be synthesized into lastUpdated
  });

  it("replay of an observation that had no observation time stays null (never becomes 'now')", async () => {
    mockFetchAlways(() => yahooChartOk(24150, 0.6));
    await fetchLivePrice("SENSEX");
    const second = await fetchLivePrice("SENSEX"); // T60 reuse window replay

    expect(second?.status).toBe("CACHED");
    expect(second?.observedAt).toBeNull();
    expect(second?.lastUpdated).toBeNull();
  });

  it("single-path Yahoo observation WITH regularMarketTime carries the original timestamp; replay preserves it byte-exactly", async () => {
    mockFetchAlways(() => yahooChartOk(79400, 0.4, 1761900000));
    const first = await fetchLivePrice("BANK_NIFTY");
    expect(first?.observedAt).toBe("2025-10-31T08:40:00.000Z");

    const second = await fetchLivePrice("BANK_NIFTY");
    expect(second?.status).toBe("CACHED");
    expect(second?.observedAt).toBe(first?.observedAt);
    expect(second?.lastUpdated).toBe(first?.observedAt);
  });

  it("FRED bond observation carries FRED's own DATE (not fetch time); in-chain cache replay preserves it", async () => {
    mockFetchAlways((...args: unknown[]) => {
      const url = String((args[0] as RequestInfo) ?? "");
      if (url.includes("fred.stlouisfed.org")) {
        return Promise.resolve(fredCsv([["2026-09-29", "4.20"], ["2026-09-30", "4.25"]]));
      }
      return Promise.reject(new TypeError("unexpected upstream"));
    });

    const first = await fetchLivePrice("US5Y");
    expect(first?.status).toBe("LIVE");
    expect(first?.source).toBe("fred-csv");
    expect(first?.price).toBe(4.25);
    expect(first?.observedAt).toBe("2026-09-30"); // date-only, exactly as FRED discloses it

    // Fresh request (T60 reuse cleared) hits the 5-minute bond cache —
    // the ORIGINAL observation date must survive, not the cache-fill time.
    resetProviderHealth();
    const second = await fetchLivePrice("US5Y");
    expect(second?.status).toBe("CACHED");
    expect(second?.observedAt).toBe("2026-09-30");
  });

  it("forex via ExchangeRate-API without an update timestamp → observedAt null (never fetch time)", async () => {
    // USD/ZAR is not in the Yahoo forex map → ExchangeRate-API path.
    mockFetchAlways(() => erApiOk(ER_RATES)); // no disclosed update time
    const first = await fetchLivePrice("USD/ZAR");
    expect(first?.source).toBe("exchangerate-api");
    expect(first?.price).toBe(18.2);
    expect(first?.observedAt).toBeNull();
    expect(first?.lastUpdated).toBeNull();
  });
});

// ── Corrective 3: storage never writes fabricated observation times ──────

describe("corrective — persistent storage refuses entries without a disclosed observation time", () => {
  it("storage-entitled observation with null observedAt is NOT persisted (schema demands observed_at NOT NULL; we never fabricate)", async () => {
    // er-api discloses no time for USD/SEK → observedAt null → no row.
    mockFetchAlways(() => erApiOk(ER_RATES));
    await fetchLivePrice("USD/SEK");
    expect(providerCacheUpsert).not.toHaveBeenCalled();
  });

  it("storage-entitled observation WITH a disclosed time is persisted with exactly that time (positive control)", async () => {
    // FRED discloses the observation DATE — the persisted row must carry
    // FRED's own date, not the serve time (old code stamped now here).
    mockFetchAlways((...args: unknown[]) => {
      const url = String((args[0] as RequestInfo) ?? "");
      if (url.includes("fred.stlouisfed.org")) {
        return Promise.resolve(fredCsv([["2026-09-29", "4.60"], ["2026-09-30", "4.68"]]));
      }
      return Promise.reject(new TypeError("unexpected upstream"));
    });
    await fetchLivePrice("US30Y");
    expect(providerCacheUpsert).toHaveBeenCalledTimes(1);
    const row = providerCacheUpsert.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(row).toMatchObject({
      key: "quote:US30Y",
      provider_id: "fred-csv",
      observed_at: "2026-09-30",
    });
  });

  it("persistentCacheSet rejects a null observation timestamp at the boundary", async () => {
    const ok = await persistentCacheSet("quote:UNIT-TEST", "fred-csv", { price: 1 }, 60_000, null as unknown as string);
    expect(ok).toBe(false);
    expect(providerCacheUpsert).not.toHaveBeenCalled();
  });

  it("T61 reference capture skips an entitled observation that carries no observation time (no fabricated row)", async () => {
    const fetcher: ObservationFetcher = async (symbol: string) => {
      if (symbol === "US10Y") {
        return { price: 4.42, change: 0.01, source: "fred-csv", observedAt: null };
      }
      return null;
    };
    const result = await captureReferenceObservations(fetcher);
    expect(result.persisted).toBe(0);
    expect(observedPricesUpsert).not.toHaveBeenCalled();
    expect(result.errors).toBe(0);
    expect(result.skipped).toBe(REFERENCE_SYMBOLS.length);
  });
});

// ── Corrective 4: read-side entitlement guard ────────────────────────────

describe("corrective — persistentCacheGet re-validates storage rights on the read path", () => {
  it("a non-entitled provider row is never served, even though the DB row exists and is unexpired", async () => {
    putCacheRow("quote:GUARD-A", "yahoo", "2026-10-01T00:00:00.000Z", { price: 999, change: 1 });
    const entry = await persistentCacheGet<{ price: number; change: number }>("quote:GUARD-A");
    expect(entry).toBeNull(); // write-path allow-list is not the only gate
  });

  it("an entitled provider row is served with its provenance intact", async () => {
    putCacheRow("quote:GUARD-B", "fred-csv", "2026-10-01T00:00:00.000Z", { price: 4.42, change: 0.01 });
    const entry = await persistentCacheGet<{ price: number; change: number }>("quote:GUARD-B");
    expect(entry).not.toBeNull();
    expect(entry?.providerId).toBe("fred-csv");
    expect(entry?.observedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(entry?.payload).toEqual({ price: 4.42, change: 0.01 });
  });

  it("lastKnownObservation refuses a non-entitled row end-to-end (total upstream failure → null, not the stored copy)", async () => {
    putCacheRow("quote:NOK/USD", "yahoo", "2026-10-01T00:00:00.000Z", { price: 11, change: 0.1 });
    mockFetchAlways(() => Promise.reject(new TypeError("everything down")));
    const r = await fetchLivePrice("NOK/USD");
    expect(r).toBeNull(); // honest UNAVAILABLE downstream — never the stored yahoo copy
  });
});

// ── Corrective 5: T62 last-known fallback precedence (documented, not changed) ──

describe("corrective — T62 last-known precedence: STATIC reference wins before lastKnownObservation", () => {
  it("US bond: FRED fails + a valid persisted fred-csv observation exists → STATIC is served, T62 last-known is NOT consulted", async () => {
    // The persistent store HOLDS a legitimate, entitled, fresh observation —
    // and the result is still STATIC because the in-chain static reference
    // resolves first. This is the measured design gap: lastKnownObservation
    // is unreachable for bond symbols that have a static entry.
    putCacheRow("quote:US10Y", "fred-csv", new Date(Date.now() - 3600_000).toISOString(), { price: 4.55, change: 0.03 });
    mockFetchAlways(() => new Response("denied", { status: 403 }));

    const r = await fetchLivePrice("US10Y");
    expect(r).not.toBeNull();
    expect(r?.status).toBe("STATIC");
    expect(r?.source).toBe("static-yields-us");
    expect(r?.price).toBe(4.42); // the static reference, not the stored 4.55
    expect(r?.status).not.toBe("CACHED");
  });

  it("FX pair with no static entry: upstream total failure + valid persisted observation → T62 last-known IS served as CACHED with original provenance", async () => {
    putCacheRow("quote:CHF/USD", "exchangerate-api", new Date(Date.now() - 1800_000).toISOString(), { price: 0.88, change: 0.1 });
    mockFetchAlways(() => Promise.reject(new TypeError("everything down")));

    const r = await fetchLivePrice("CHF/USD");
    expect(r).not.toBeNull();
    expect(r?.status).toBe("CACHED");
    expect(r?.source).toBe("exchangerate-api");
    expect(r?.price).toBe(0.88);
    expect(r?.observedAt).toBe(store.rows["quote:CHF/USD"][0].observed_at); // original observation time survives
  });
});
