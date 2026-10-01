/**
 * Q4 Commit D §3 — fundamentals provenance: the provider's observation time
 * or NOTHING. Never fetch/serve time.
 *
 * The defect: lib/liveFundamentals.ts stamped `lastUpdated:
 * new Date().toISOString()` on Screener and Yahoo/NSE results, and
 * lib/scoring treated that value as the provider observation time — every
 * live fundamental claimed a fresh, fabricated "as of". The static fallback
 * in /api/fundamentals did the same for SEED data (source "static").
 *
 * Contract under test:
 *   - provider disclosed an observation/capture time  → preserve it;
 *   - provider did not disclose one (our parsers capture none today) → null;
 *   - resolveStockMetrics preserves source=live with asOf=null (never the
 *     fetch time);
 *   - the evidence ID says `no-disclosed-observation-time` instead of
 *     ambiguously reusing the `seed` fragment, and no current timestamp
 *     appears anywhere in the served evidence text.
 *
 * Bite-proof: written and run BEFORE the fix; the null-contract tests
 * produced fabricated ISO timestamps pre-fix (raw output in the PR).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchFullFundamentals, type FullFundamentals as VendorFullFundamentals } from "@/lib/liveFundamentals";
import type { FullFundamentals } from "@/hooks/useFundamentals";
import { resolveStockMetrics } from "@/lib/scoring";
import { buildAiEvidencePackage } from "@/lib/ai/evidence";
import { STOCKS } from "@/data/stocks";

/** Controllable yahoo+nse upstream (the screener path uses global fetch). */
const yahooState = vi.hoisted(() => ({ result: null as unknown }));
vi.mock("@/lib/nse/fundamentals", () => ({
  fetchLiveFundamentals: async () => yahooState.result,
}));

afterEach(() => {
  yahooState.result = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Minimal Screener-shaped page: P/E + ROE + market cap present, NO D/E and
 *  NO machine-readable observation timestamp anywhere. */
const SCREENER_HTML = `
<html><head><meta name="description" content="Reliance Industries share price. Promoter holding 50.3%."></head>
<body>
<ul id="top-ratios">
<li><span class="number">1,600,000</span> Market Cap</li>
<li><span class="number">22.5</span> Stock P/E</li>
<li><span class="number">9.1</span> ROE</li>
</ul>
</body></html>`;

function stubScreener(html: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch,
  );
}

const ISO_STAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

describe("Commit D §3 — the source never manufactures an observation time", () => {
  it("BITE (must fail pre-fix): Screener result carries lastUpdated === null (no fabricated now())", async () => {
    stubScreener(SCREENER_HTML);
    const ff = await fetchFullFundamentals("RELIANCE");
    expect(ff).not.toBeNull();
    expect(ff!.source).toBe("screener");
    expect(ff!.lastUpdated).toBeNull(); // pre-fix: a fresh new Date().toISOString()
  });

  it("BITE (must fail pre-fix): Yahoo/NSE result carries lastUpdated === null (no fabricated now())", async () => {
    // Screener fails (no ratios → pe 0) → the yahoo+nse fallback answers.
    // Its parser captures no upstream timestamp either, so the honest value
    // is null.
    stubScreener("<html><body>no ratios here</body></html>");
    yahooState.result = {
      symbol: "RELIANCE", pe: 21.1, eps: 48, marketCap: 1_700_000, roe: 9.4,
      roce: 0, bookValue: 610, dividendYield: 0.4, faceValue: 10,
      lastUpdated: null,
    };
    const ff = await fetchFullFundamentals("RELIANCE");
    expect(ff).not.toBeNull();
    expect(ff!.source).toBe("yahoo+nse");
    expect(ff!.lastUpdated).toBeNull(); // pre-fix: a fresh new Date().toISOString()
  });
});

describe("Commit D §3 — resolveStockMetrics preserves asOf=null (never fetch time)", () => {
  const LIVE_NO_TIME = {
    symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18,
    roce: 21, bookValue: 990, dividendYield: 0.4, faceValue: 10,
    debtToEquity: 0.4, opm: 24, revCagr3y: 14, epsCagr: 16,
    promoterHolding: 50.3, fcf: 30000, roa: 10, lastUpdated: null,
    source: "screener", isLive: true,
  } as unknown as FullFundamentals;

  it("BITE (must fail pre-fix): live fields keep source=live with asOf=null", () => {
    const before = new Date().toISOString();
    const r = resolveStockMetrics("RELIANCE", LIVE_NO_TIME)!;
    const after = new Date().toISOString();
    expect(r.fields.roe.source).toBe("live");
    expect(r.fields.roe.value).toBe(18);
    expect(r.fields.roe.asOf).toBeNull(); // pre-fix: fetch time stood in
    expect(r.fields.roe.asOf).not.toEqual(before); // belt and braces
    expect(after >= before).toBe(true);
    expect(r.sourced.roe.source).toBe("vendor:screener");
    expect(r.sourced.roe.asOf).toBeNull();
  });

  it("a provider that DOES disclose an observation time keeps it (preserve path)", () => {
    const T = "2026-09-30T10:00:00.000Z";
    const r = resolveStockMetrics("RELIANCE", { ...LIVE_NO_TIME, lastUpdated: T })!;
    expect(r.fields.roe.source).toBe("live");
    expect(r.fields.roe.asOf).toBe(T);
  });
});

describe("Commit D §3 — the evidence ID contract disambiguates live-without-timestamp from seed", () => {
  function liveFundamentals(lastUpdated: string | null): VendorFullFundamentals {
    return {
      symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18,
      roce: 21, bookValue: 990, dividendYield: 0.4, faceValue: 10,
      debtToEquity: 0.4, opm: 24, revCagr3y: 14, epsCagr: 16,
      promoterHolding: 50.3, fcf: 30000, roa: 10, lastUpdated,
      source: "screener",
    };
  }
  const PRICE = {
    price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const,
    observedAt: "2025-10-31T08:40:00.000Z", lastUpdated: "2025-10-31T08:40:00.000Z",
  };

  it("BITE (must fail pre-fix): live + no disclosed time → id fragment no-disclosed-observation-time (never :seed)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => liveFundamentals(null),
      getPrice: async () => PRICE,
    });
    expect(pkg).not.toBeNull();
    const roe = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:roe:"));
    expect(roe!.id).toBe("fundamental:RELIANCE:roe:no-disclosed-observation-time");
    // the ambiguous fragment must not come back for a live field
    expect(roe!.id.endsWith(":seed")).toBe(false);
    // the fact stays honest: live value, but no observation time claimed
    expect(roe!.facts).toEqual([{ field: "roe", value: 18, unit: "percent", source: "live" }]);
    // the text discloses the gap instead of printing a fabricated as-of
    expect(roe!.text).toContain("no observation time");
    expect(roe!.text).not.toMatch(ISO_STAMP); // no current timestamp anywhere
  });

  it("a disclosed observation time still pins the id (deterministic ids preserved)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => liveFundamentals("2026-09-30T10:00:00.000Z"),
      getPrice: async () => PRICE,
    });
    const roe = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:roe:"));
    expect(roe!.id).toBe("fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z");
  });

  it("seed fields still end :seed (the fragments never collide)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => liveFundamentals(null),
      getPrice: async () => PRICE,
    });
    const fcf = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:fcfMargin:"));
    expect(fcf!.id).toBe(`fundamental:RELIANCE:fcfMargin:seed`);
    expect(STOCKS.RELIANCE).toBeDefined(); // registry sanity
  });
});
