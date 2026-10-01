import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchScreenerFundamentals } from "@/lib/scrapers/screener";

// H4 (audit 2026-10-01): extractBalanceSheetDE ended with `return 0.45;` —
// every stock got the same fabricated D/E, served over the API as
// source:"screener" live data (live evidence: RELIANCE, ADANIGREEN,
// ADANIPOWER and TCS all returned exactly 0.45). T11 convention: a metric
// that cannot be parsed is null — never a constant, never 0.

const BASE_HTML = `
<html><body>
<ul id="top-ratios">
  <li><span class="name">Market Cap</span><span class="number">15,77,229</span></li>
  <li><span class="name">Stock P/E</span><span class="number">21.1</span></li>
  <li><span class="name">ROE</span><span class="number">8.91</span></li>
</ul>
<section id="profit-loss"><table>
  <tr><td>OPM %</td><td>16</td></tr>
</table></section>
</body></html>`;

function stubFetch(html: string) {
  // A fresh Response per call — bodies are one-shot.
  return vi.fn(async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchScreenerFundamentals — D/E is parsed or null, never fabricated (H4)", () => {
  it("no D/E on the page → debtToEquity is null, not the 0.45 constant", async () => {
    vi.stubGlobal("fetch", stubFetch(BASE_HTML));
    const f = await fetchScreenerFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBeNull();
    // The regression this pins: the old fallback returned exactly 0.45.
    expect(f!.debtToEquity).not.toBe(0.45);
    // The rest of the extraction still works on the same fixture.
    expect(f!.pe).toBeCloseTo(21.1, 5);
    expect(f!.roe).toBeCloseTo(8.91, 5);
    expect(f!.marketCap).toBeCloseTo(1577229, 0);
    expect(f!.opm).toBeCloseTo(16, 5);
  });

  it("a parseable Debt…Equity ratio is used verbatim", async () => {
    vi.stubGlobal("fetch", stubFetch(`${BASE_HTML}<p>Debt to Equity 0.83</p>`));
    const f = await fetchScreenerFundamentals("TCS");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBeCloseTo(0.83, 5);
  });

  it("upstream failure → null (the caller falls back, never fabricates)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await fetchScreenerFundamentals("BOGUS")).toBeNull();
  });
});
