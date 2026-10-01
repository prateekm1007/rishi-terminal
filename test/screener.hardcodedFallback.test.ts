/**
 * Q4 Commit D §4 — no hardcoded market number may enter the canonical
 * fundamentals surface (Constitution rules 4 and 15).
 *
 * The defect: lib/scrapers/screener.ts `extractBalanceSheetDE` returned the
 * literal `0.45` whenever the D/E regex did not match. A made-up market
 * value then flowed through fetchFullFundamentals as `source: "screener"`
 * and reached the AI evidence package as though it had been observed live.
 *
 * Contract under test:
 *   - D/E unavailable from the provider → the zero sentinel ("unavailable");
 *   - the resolver treats the sentinel as "not observed" and falls back to
 *     SEED data (labelled), never to an invented value;
 *   - the AI evidence chain therefore can never emit a live D/E that the
 *     provider did not disclose;
 *   - tripwire: the screener module must contain no decimal-literal return
 *     that could act as a market-value fallback.
 *
 * Bite-proof: written and run BEFORE the fix — the screener path returned
 * 0.45 for D/E-less pages (raw output in the PR).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchScreenerFundamentals } from "@/lib/scrapers/screener";
import { fetchFullFundamentals } from "@/lib/liveFundamentals";
import { resolveStockMetrics } from "@/lib/scoring";
import { buildAiEvidencePackage } from "@/lib/ai/evidence";
import { STOCKS } from "@/data/stocks";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Screener page WITHOUT any "Debt … Equity" text and without D/E ratios —
 *  the exact shape that used to mint D/E = 0.45. */
const HTML_NO_DE = `
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

describe("Commit D §4 — missing D/E never becomes an invented market number", () => {
  it("BITE (must fail pre-fix): extractBalanceSheetDE's unavailable sentinel is 0, never 0.45", async () => {
    stubScreener(HTML_NO_DE);
    const sf = await fetchScreenerFundamentals("RELIANCE");
    expect(sf).not.toBeNull();
    expect(sf!.debtToEquity).not.toBe(0.45); // the fabricated market value
    expect(sf!.debtToEquity).toBe(0); // the unavailable sentinel
  });

  it("BITE (must fail pre-fix): the full fundamentals path cannot produce live D/E 0.45 from a D/E-less page", async () => {
    stubScreener(HTML_NO_DE);
    const ff = await fetchFullFundamentals("RELIANCE");
    expect(ff).not.toBeNull();
    expect(ff!.debtToEquity).toBe(0); // sentinel — pre-fix: 0.45
    expect(ff!.source).toBe("screener");
  });

  it("the resolver maps the sentinel to SEED provenance (value + source pinned)", () => {
    const seedDe = STOCKS.RELIANCE.de;
    const ff = {
      symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 9.1,
      roce: 0, bookValue: 990, dividendYield: 0, faceValue: 10,
      debtToEquity: 0, opm: 0, revCagr3y: 0, epsCagr: 0,
      promoterHolding: 50.3, fcf: 0, roa: 0, lastUpdated: null,
      source: "screener", isLive: true,
    } as never;
    const r = resolveStockMetrics("RELIANCE", ff)!;
    expect(r.fields.de.source).toBe("seed"); // fallback, honestly labelled
    expect(r.fields.de.value).toBe(seedDe); // the SEED value, not 0.45, not 0-as-live
  });

  it("the AI evidence chain carries the SEED-sourced D/E (never a live 0.45)", async () => {
    const seedDe = STOCKS.RELIANCE.de;
    const pkg = await buildAiEvidencePackage("RELIANCE", {
      getFundamentals: async () => ({
        symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 9.1,
        roce: 0, bookValue: 990, dividendYield: 0, faceValue: 10,
        debtToEquity: 0, opm: 0, revCagr3y: 0, epsCagr: 0,
        promoterHolding: 50.3, fcf: 0, roa: 0, lastUpdated: null,
        source: "screener",
      }),
      getPrice: async () => null,
    });
    expect(pkg).not.toBeNull();
    const de = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:de:"));
    expect(de).toBeDefined();
    expect(de!.facts![0].source).toBe("seed");
    expect(de!.facts![0].value).toBe(seedDe);
    expect(de!.text).toContain("SEED DATA");
  });

  it("TRIPWIRE (rule 24): the screener module contains no decimal-literal return fallback", () => {
    const src = readFileSync(
      fileURLToPath(new URL("../lib/scrapers/screener.ts", import.meta.url)),
      "utf8",
    );
    const violations = [...src.matchAll(/return\s+0\.\d+/g)].map(m => m[0]);
    expect(violations, `hardcoded decimal fallback(s) reintroduced: ${violations.join(", ")}`).toEqual([]);
  });
});
