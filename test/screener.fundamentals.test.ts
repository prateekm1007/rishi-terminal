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

// ---------------------------------------------------------------------
// TODAY-VERDICTS (founder order, 2026-10-14): the balance-sheet D/E
// DERIVATION. The live page (captured 14 Oct 2026, HTTP 200, 231,646
// bytes) exposes NO "Debt to equity" ratio anywhere — the top-ratios
// list and the #ratios section carry Debtor/Inventory/Payable days and
// ROCE only. The balance-sheet section carries the raw rows (labels
// wrapped in <button> for the schedule drill-downs), from which D/E is
// DERIVED: latest-column Borrowings / (Equity Capital + Reserves).
// Markup below replicates the captured shapes verbatim (whitespace,
// &nbsp;, data-date-key headers, empty-class tds).
// ---------------------------------------------------------------------

function balanceSheetHtml(cols: string[], rows: Record<string, (string | null)[]>): string {
  const header = cols.map(
    (c, i) => `<th class="" data-date-key="20${25 + i}-03-31">${c}</th>`,
  ).join("");
  const body = Object.entries(rows)
    .map(([label, cells]) => {
      const labelTd = `<button class="button-plain" onclick="Company.showSchedule('${label}', 'balance-sheet', this)">${label}&nbsp;<span class="blue-icon">+</span></button>`;
      const tds = cells
        .map((v) => `<td class="">${v === null ? "" : `\n                  ${v}\n                `}</td>`)
        .join("");
      return `<tr class="stripe"><td class="text">${labelTd}</td>${tds}</tr>`;
    })
    .join("");
  return `${BASE_HTML}<section id="balance-sheet"><table><thead><tr><th class="text"></th>${header}</tr></thead><tbody>${body}</tbody></table></section>`;
}

describe("fetchScreenerFundamentals — balance-sheet D/E derivation (TODAY-VERDICTS)", () => {
  it("MUST FAIL PRE-FIX: today's page shape (no Debt-to-Equity ratio, button-wrapped rows) derives D/E from Borrowings / (Equity Capital + Reserves), latest non-empty column", async () => {
    // Captured RELIANCE figures: Mar 2024 / Mar 2025 / Mar 2026 columns —
    // 402,962 / (13,532 + 890,498) = 0.4457 (the public ~0.45 reality).
    vi.stubGlobal(
      "fetch",
      stubFetch(
        balanceSheetHtml(
          ["Mar 2024", "Mar 2025", "Mar 2026"],
          {
            "Equity Capital": ["6,766", "13,532", "13,532"],
            Reserves: ["786,715", "829,668", "890,498"],
            Borrowings: ["319,158", "350,719", "402,962"],
          },
        ),
      ),
    );
    const f = await fetchScreenerFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).not.toBeNull();
    expect(f!.debtToEquity!).toBeCloseTo(0.4457, 3);
  });

  it("the latest non-EMPTY column wins (a blank latest cell falls back to the prior column, never to 0)", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        balanceSheetHtml(
          ["Mar 2024", "Mar 2025", "Mar 2026"],
          {
            "Equity Capital": ["6,766", "13,532", "13,532"],
            Reserves: ["786,715", "829,668", null], // blank latest cell
            Borrowings: ["319,158", "350,719", null], // blank latest cell
          },
        ),
      ),
    );
    const f = await fetchScreenerFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    // 350,719 / (13,532 + 829,668) = 0.4159 — the Mar 2025 column.
    expect(f!.debtToEquity!).toBeCloseTo(0.4159, 3);
  });

  it("a debt-free company (Borrowings 0 in the latest column) is a GENUINE zero observation, not null", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        balanceSheetHtml(
          ["Mar 2024", "Mar 2025", "Mar 2026"],
          {
            "Equity Capital": ["500", "500", "500"],
            Reserves: ["10,000", "12,000", "14,000"],
            Borrowings: ["10", "5", "0"],
          },
        ),
      ),
    );
    const f = await fetchScreenerFundamentals("TEST");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBe(0);
  });

  it("negative or zero equity (accumulated losses) makes the ratio meaningless → null, never a fabricated number", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        balanceSheetHtml(
          ["Mar 2024", "Mar 2025", "Mar 2026"],
          {
            "Equity Capital": ["100", "100", "100"],
            Reserves: ["-90", "-120", "-150"], // equity goes negative
            Borrowings: ["50", "60", "70"],
          },
        ),
      ),
    );
    const f = await fetchScreenerFundamentals("TEST");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBeNull();
  });

  it("a balance sheet without the Borrowings row → null (T11: unparseable is null; the seed baseline survives)", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        balanceSheetHtml(["Mar 2024", "Mar 2025", "Mar 2026"], {
          "Equity Capital": ["6,766", "13,532", "13,532"],
          Reserves: ["786,715", "829,668", "890,498"],
        }),
      ),
    );
    const f = await fetchScreenerFundamentals("RELIANCE");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBeNull();
  });

  it("an explicit 'Debt to Equity' text ratio on the page still wins verbatim (the H4 path, unchanged)", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        `${balanceSheetHtml(
          ["Mar 2024", "Mar 2025", "Mar 2026"],
          {
            "Equity Capital": ["6,766", "13,532", "13,532"],
            Reserves: ["786,715", "829,668", "890,498"],
            Borrowings: ["319,158", "350,719", "402,962"],
          },
        )}<p>Debt to Equity 0.83</p>`,
      ),
    );
    const f = await fetchScreenerFundamentals("TCS");
    expect(f).not.toBeNull();
    expect(f!.debtToEquity).toBeCloseTo(0.83, 5);
  });
});

