import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { resolveStockMetrics } from "@/lib/scoring";
import { fetchYahooFundamentals } from "@/lib/nse/fundamentals";
import { fetchScreenerFundamentals } from "@/lib/scrapers/screener";

/**
 * Coder Directions §9 (2026-10-02) — the fundamentals null-semantics
 * boundary. The transports (screener.in scraper, NSE/Yahoo fundamentals)
 * used to emit sentinel 0 for fields they did not parse ("roe: 0",
 * "opm: 0", "r["ROE"] ?? 0"). The resolver's G5 admissibility table treats
 * a genuine 0 ROE/OPM/CAGR/BVPS as a REAL observation (loss-making years,
 * debt-free sheets), so the fabricated 0 was ADMITTED as live data and
 * overrode the seed baseline with an invented value — to the UI and into
 * the AI's getFinancials evidence facts.
 *
 * The contract now: unreported → null; null → the seed baseline survives
 * (pick()); genuine zero/negative observations still override (Rule 16's
 * "zero is real data" half).
 */

const REAL_FETCH = globalThis.fetch;

beforeEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe("resolver: null live fundamentals keep the seed; genuine zeros override", () => {
  it("MUST FAIL PRE-FIX: a live roe of 0 (transport-fabricated) no longer overrides the seed via a missing field — null keeps the seed", () => {
    const live = {
      isLive: true,
      symbol: "RELIANCE",
      pe: 24.5,
      eps: 100,
      marketCap: 1600000,
      roe: null, // the old transports served 0 here when Yahoo did not report
      roce: null,
      bookValue: null,
      dividendYield: null,
      faceValue: 10,
      debtToEquity: null,
      opm: null, // the old yahoo+nse fallback hard-served 0
      revCagr3y: null,
      epsCagr: null,
      promoterHolding: null,
      fcf: null,
      roa: null,
      lastUpdated: null,
      source: "yahoo+nse" as const,
    };
    const r = resolveStockMetrics("RELIANCE", live);
    expect(r).not.toBeNull();
    // Null live values must NOT be admitted as observations.
    expect(r!.fields.roe.source).toBe("seed");
    expect(r!.fields.opm.source).toBe("seed");
    expect(r!.fields.roce.source).toBe("seed");
    expect(r!.fields.promo.source).toBe("seed");
    // A reported live field still overrides.
    expect(r!.fields.pe.source).toBe("live");
    expect(r!.fields.pe.value).toBe(24.5);
  });

  it("a GENUINE negative/zero live observation still overrides the seed (Rule 16 both halves)", () => {
    const live = {
      isLive: true,
      symbol: "RELIANCE",
      pe: 24.5,
      eps: 100,
      marketCap: 1600000,
      roe: -5.2, // a loss-making observation is REAL data
      roce: 0, // genuine zero ROCE is real data
      bookValue: 500,
      dividendYield: null,
      faceValue: 10,
      debtToEquity: 0, // debt-free is a real observation
      opm: 18,
      revCagr3y: null,
      epsCagr: null,
      promoterHolding: 50.4,
      fcf: null,
      roa: null,
      lastUpdated: null,
      source: "screener" as const,
    };
    const r = resolveStockMetrics("RELIANCE", live);
    expect(r!.fields.roe).toMatchObject({ source: "live", value: -5.2 });
    expect(r!.fields.roce).toMatchObject({ source: "live", value: 0 });
    expect(r!.fields.de).toMatchObject({ source: "live", value: 0 });
  });
});

describe("transport: missing fields parse to null, never sentinel 0", () => {
  it("MUST FAIL PRE-FIX: Yahoo payload without ROE/dividendYield → null (negative ROE survives)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({
        quoteSummary: { result: [{
          defaultKeyStatistics: { trailingPE: { raw: 22.4 }, trailingEps: { raw: 90.1 }, marketCap: { raw: 1600000000000 }, bookValue: { raw: 620 } },
          financialData: { returnOnEquity: { raw: -0.052 } }, // -5.2% — real, must survive
          summaryDetail: {}, // no dividendYield module
        }] },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const f = await fetchYahooFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    expect(f!.pe).toBe(22.4);
    expect(f!.roe).toBe(-5.2); // genuine negative survives
    expect(f!.dividendYield).toBeNull(); // absent → null, never 0
    expect(f!.roce).toBeNull(); // not disclosed by these modules
  });

  it("MUST FAIL PRE-FIX: screener page missing the ratio rows → nulls, never 0", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        `<html><body><ul id="top-ratios"><li>Market Cap <span class="number">1,600,000</span></li></ul>
         <section id="profit-loss"></section></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html" } },
      ),
    );
    const f = await fetchScreenerFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    expect(f!.pe).toBeNull(); // no "Stock P/E" row → null, never 0
    expect(f!.roe).toBeNull();
    expect(f!.roce).toBeNull();
    expect(f!.opm).toBeNull(); // empty profit-loss section → null
    expect(f!.revCagr3y).toBeNull();
    expect(f!.epsCagr).toBeNull();
    expect(f!.promoterHolding).toBeNull(); // no meta description → null
    expect(f!.marketCap).toBe(1600000);
  });
});
