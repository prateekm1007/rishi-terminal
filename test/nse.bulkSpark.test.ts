/**
 * LP2 (founder directives 6-9, 2026-10-06) — the bulk transport is
 * spark-first, the ADR gate is the payload's currency, and the shared-cache
 * batch write is ONE upsert.
 *
 * The measured defect this pins (production, 2026-10-06): a stale 50-symbol
 * chunk cost ~10 s server-side — the "bulk" sweep was 3 lanes x 17
 * SEQUENTIAL per-symbol v8/chart calls (5-10 s upstream wall) plus ~50
 * SERIAL quote_cache upserts (1.5-3 s). /stocks showed 17.4 s to first
 * price and ~503/916 rows at t=103 s. The sub-₹20 gate defect: the old
 * `price < 20` ADR rejection rejected EVERY legitimate sub-₹20 NSE stock
 * (IDEA/YESBANK-class names could never be priced — a structural hole in
 * the 916-universe freshness).
 *
 * Fail-first rows below fail on the pre-fix tree: spark never called,
 * ₹9.5 INR rejected as an "ADR", 50 upserts for 50 winners.
 */
import { describe, expect, it, afterEach, vi } from "vitest";

vi.mock("@/lib/registry/providerHealth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/registry/providerHealth")>();
  return {
    ...actual,
    coalesce: async (_key: string, fn: () => Promise<unknown>) => fn(),
  };
});

import { fetchBulkPricesForSymbols } from "@/lib/nse/bulkFetch";

const REAL_FETCH = globalThis.fetch;

type FetchMock = (input: RequestInfo | URL) => Promise<Response>;

function sparkEnvelope(entries: Array<{ yahooSymbol: string; meta: Record<string, unknown> }>): Response {
  return new Response(
    JSON.stringify({
      spark: { result: entries.map((e) => ({ symbol: e.yahooSymbol, response: [{ meta: e.meta }] })) },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function yahooChartResponse(meta: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ chart: { result: [{ meta }] } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function inrMeta(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { currency: "INR", ...overrides };
}

/** Installs a mock that records every URL and answers spark/chart. */
function installFetch(answer: (url: URL) => Response): { urls: URL[]; restore: () => void } {
  const urls: URL[] = [];
  const mock: FetchMock = async (input) => {
    const u = new URL(String(input));
    urls.push(u);
    return answer(u);
  };
  (globalThis as { fetch: unknown }).fetch = vi.fn(mock);
  return {
    urls,
    restore: () => {
      (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
      vi.restoreAllMocks();
    },
  };
}

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("MUST FAIL PRE-FIX: the bulk sweep is spark-first (ceil(N/20) calls, not N)", () => {
  it("50 symbols cost 3 spark calls and ZERO per-symbol chart calls when spark resolves all", async () => {
    const symbols = Array.from({ length: 50 }, (_, i) => `SYM${i}`);
    const { urls, restore } = installFetch((u) => {
      if (!u.pathname.includes("/v7/finance/spark")) {
        throw new Error("pre-fix transport leaked a per-symbol chart call: " + u.pathname);
      }
      const requested = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
      return sparkEnvelope(
        requested.map((s) => ({
          yahooSymbol: s,
          // price derived from the symbol's own index (SYM{i} → 100+i) so
          // group-local fixtures stay globally consistent
          meta: inrMeta({
            regularMarketPrice: 100 + Number(s.replace("SYM", "").replace(/\.(NS|BO)$/, "")),
            regularMarketTime: 1727784000,
          }),
        })),
      );
    });
    try {
      const out = await fetchBulkPricesForSymbols(symbols);
      const sparkCalls = urls.filter((u) => u.pathname.includes("/v7/finance/spark"));
      expect(sparkCalls.length).toBe(3); // ceil(50/20) — the pre-fix tree made 50 calls
      for (const u of sparkCalls) {
        expect((u.searchParams.get("symbols") ?? "").split(",").length).toBeLessThanOrEqual(20);
      }
      expect(Object.keys(out).length).toBe(50);
      expect(out.SYM0.price).toBe(100);
      expect(out.SYM49.price).toBe(149);
    } finally {
      restore();
    }
  });

  it("spark misses fall back to the per-symbol chart path (bounded, .BO semantics preserved)", async () => {
    const { urls, restore } = installFetch((u) => {
      if (u.pathname.includes("/v7/finance/spark")) {
        // spark resolves only the first requested symbol
        const requested = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
        return sparkEnvelope([
          {
            yahooSymbol: requested[0],
            meta: inrMeta({ regularMarketPrice: 2500, regularMarketTime: 1727784000 }),
          },
        ]);
      }
      // chart fallback answers everything the spark pass missed
      const m = u.pathname.match(/\/v8\/finance\/chart\/([^.]+)\.(NS|BO)$/);
      return yahooChartResponse(
        inrMeta({ regularMarketPrice: m?.[2] === "BO" ? 2400 : 2500, regularMarketTime: 1727784000 }),
      );
    });
    try {
      const out = await fetchBulkPricesForSymbols(["RELIANCE", "TCS", "INFY"]);
      expect(out.RELIANCE.price).toBe(2500); // spark-served
      // TCS/INFY fell back to chart (.NS first — the mock answers .NS)
      expect(out.TCS.price).toBe(2500);
      expect(out.INFY.price).toBe(2500);
      const chartCalls = urls.filter((u) => u.pathname.includes("/v8/finance/chart"));
      expect(chartCalls.length).toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });
});

describe("MUST FAIL PRE-FIX: the instrument gate is currency, not a ₹20 price floor", () => {
  it("a legitimate sub-₹20 INR stock is accepted (was: rejected as an ADR)", async () => {
    const { restore } = installFetch((u) => {
      if (!u.pathname.includes("/v7/finance/spark")) throw new Error("unexpected chart call");
      const requested = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
      return sparkEnvelope(
        requested.map((s) => ({
          yahooSymbol: s,
          meta: inrMeta({
            regularMarketPrice: s === "IDEA.NS" ? 9.5 : 17.8,
            previousClose: s === "IDEA.NS" ? 9.1 : 17.2,
            regularMarketVolume: 1000000,
            regularMarketTime: 1727784000,
          }),
        })),
      );
    });
    try {
      const out = await fetchBulkPricesForSymbols(["IDEA", "YESBANK"]);
      expect(out.IDEA).toBeDefined();
      expect(out.IDEA.price).toBe(9.5);
      expect(out.YESBANK.price).toBe(17.8);
      // change flows through the ONE unified parser (previousClose disclosed)
      expect(out.IDEA.change).not.toBeNull();
    } finally {
      restore();
    }
  });

  it("a USD masquerade is rejected and the symbol stays honestly absent (fail closed)", async () => {
    const { restore } = installFetch((u) => {
      if (u.pathname.includes("/v7/finance/spark")) {
        const requested = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
        return sparkEnvelope(
          requested.map((s) => ({
            yahooSymbol: s,
            meta: { currency: "USD", regularMarketPrice: 12.4, regularMarketTime: 1727784000 },
          })),
        );
      }
      // fallback also returns the USD line — the honest outcome is a miss
      return yahooChartResponse({ currency: "USD", regularMarketPrice: 12.4, regularMarketTime: 1727784000 });
    });
    try {
      const out = await fetchBulkPricesForSymbols(["DEADTICKER"]);
      expect(out.DEADTICKER).toBeUndefined(); // honest absence — never a USD price
    } finally {
      restore();
    }
  });

  it("an absent currency is rejected (fail closed — C2)", async () => {
    const { restore } = installFetch((u) => {
      if (u.pathname.includes("/v7/finance/spark")) {
        const requested = (u.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
        return sparkEnvelope(
          requested.map((s) => ({
            yahooSymbol: s,
            meta: { regularMarketPrice: 500, regularMarketTime: 1727784000 }, // no currency
          })),
        );
      }
      return yahooChartResponse({ regularMarketPrice: 500, regularMarketTime: 1727784000 });
    });
    try {
      const out = await fetchBulkPricesForSymbols(["NOCURRENCY"]);
      expect(out.NOCURRENCY).toBeUndefined();
    } finally {
      restore();
    }
  });
});

describe("MUST FAIL PRE-FIX: the shared-cache batch write is ONE upsert", () => {
  it("50 claimed winners are persisted in a single upsert statement", async () => {
    vi.resetModules();
    const upsertCalls: unknown[][] = [];
    vi.doMock("@/lib/services/supabaseAdmin", () => ({
      getAdminSupabase: () => ({
        from: () => ({
          select: () => ({ in: async () => ({ data: [], error: null }) }),
          upsert: async (rows: unknown[]) => {
            upsertCalls.push(rows);
            return { error: null };
          },
        }),
        rpc: async () => ({ data: true, error: null }),
      }),
    }));
    const { cachedQuoteBatch } = await import("@/lib/quoteCache");
    const symbols = Array.from({ length: 50 }, (_, i) => `SYM${i}`);
    const result = await cachedQuoteBatch(symbols, {
      fetchUpstreamBatch: async (syms) =>
        Object.fromEntries(
          syms.map((s) => [
            s,
            {
              symbol: s,
              price: 100,
              change: null,
              currency: "INR",
              source: "yahoo-bulk",
              observedAt: "2026-10-06T09:00:00Z",
              refreshedAt: "2026-10-06T09:00:00Z",
              volume24h: null,
            },
          ]),
        ),
    });
    expect(Object.keys(result.quotes).length).toBe(50);
    expect(upsertCalls.length).toBe(1); // pre-fix: 50 sequential upserts
    expect(upsertCalls[0].length).toBe(50);
    vi.doUnmock("@/lib/services/supabaseAdmin");
  });
});
