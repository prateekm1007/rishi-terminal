// test/screener.promoter.test.ts — TODAY-NIFTY (founder order, 2026-10-14:
// "add the ITC promoter-shareholding fallback"): the promoter extraction's
// SHAREHOLDING-TABLE FALLBACK.
//
// The live ITC page (captured 14 Oct 2026, HTTP 200, 211,215 bytes, this
// sandbox's egress) discloses NO promoter holding ANYWHERE the old parser
// reads: the meta description carries Mkt Cap/Revenue/Profit/growth prose
// only, and the quarterly shareholding table carries NO "Promoters" row —
// the holder categories are FIIs, DIIs, Government, Public (Sep 2026:
// 33.22 + 49.81 + 0.04 + 16.93 = 100.00 exactly). ITC is a WIDELY-HELD
// company: the promoter category is genuinely NIL, the same class as a
// debt-free company's D/E = 0 (G5/admissibility: "a promoter stake can
// genuinely be 0" — promo: inRange(0, 100)).
//
// The fallback (this round): when the meta description carries no promoter
// figure, DERIVE it from the quarterly shareholding table —
//   1. a "Promoters" row present → its latest percent cell (the classic
//      promoter company);
//   2. NO Promoters row AND the other holder rows' latest columns sum to
//      ~100% → promoter = 0 (the page's own published pattern accounts
//      for the whole register without a promoter category — a nil
//      promoter, disclosed as derived);
//   3. an unexplained residual (> 0.5) → null (cannot derive, never a
//      guess).
//
// Fail-first (C5): leg 1 below was written BEFORE the fallback and run
// against the pre-fix screener.ts — the real ITC bytes returned
// promoterHolding null (the RED), which is exactly the live refusal
// round 58 disclosed ("ITC + HDFCBANK honestly refused (no promoter
// row…)"). The GREEN requires the fallback.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchScreenerFundamentals } from "@/lib/scrapers/screener";

const BASE_HTML = `
<html><head><meta name="description" content="ITC &middot; Mkt Cap: 3,28,112 Crore (down -34.2% in 1 year) &middot; Revenue: 76,488 Cr &middot; Profit: 20,184 Cr"></head><body>
<ul id="top-ratios">
  <li><span class="name">Market Cap</span><span class="number">3,28,112</span></li>
  <li><span class="name">Stock P/E</span><span class="number">24.1</span></li>
  <li><span class="name">ROE</span><span class="number">36.5</span></li>
</ul>
<section id="profit-loss"><table>
  <tr><td>OPM %</td><td>35</td></tr>
</table></section>
</body></html>`;

/// The REAL captured ITC quarterly shareholding table (verbatim shapes:
/// button-wrapped labels, &nbsp;, whitespace-heavy cells, the Sep 2026
/// latest column summing to exactly 100.00 without a Promoters row).
const ITC_QUARTERLY_SHP = `
<div id="quarterly-shp">


  <div class="responsive-holder fill-card-width">
    <table class="data-table">
      <thead>
        <tr>
          <th class="text"></th>
          <th>Dec 2023</th><th>Mar 2024</th><th>Jun 2024</th><th>Sep 2024</th><th>Dec 2024</th><th>Mar 2025</th><th>Jun 2025</th><th>Sep 2025</th><th>Dec 2025</th><th>Mar 2026</th><th>Jun 2026</th><th>Sep 2026</th>
        </tr>
      </thead>
      <tbody>

          <tr class="stripe">
            <td class="text">
              <button class="button-plain" onclick="Company.showShareholders('foreign_institutions', 'quarterly', this)">
                FIIs&nbsp;<span class="blue-icon">+</span>
              </button>
            </td>

              <td>43.26%</td>

              <td>40.95%</td>

              <td>40.47%</td>

              <td>40.53%</td>

              <td>40.17%</td>

              <td>39.87%</td>

              <td>37.98%</td>

              <td>37.39%</td>

              <td>36.11%</td>

              <td>34.83%</td>

              <td>34.23%</td>

              <td>33.22%</td>

          </tr>

          <tr class="">
            <td class="text">
              <button class="button-plain" onclick="Company.showShareholders('domestic_institutions', 'quarterly', this)">
                DIIs&nbsp;<span class="blue-icon">+</span>
              </button>
            </td>

              <td>41.98%</td>

              <td>43.76%</td>

              <td>44.02%</td>

              <td>44.59%</td>

              <td>44.91%</td>

              <td>45.19%</td>

              <td>46.91%</td>

              <td>47.41%</td>

              <td>48.90%</td>

              <td>49.15%</td>

              <td>49.13%</td>

              <td>49.81%</td>

          </tr>

          <tr class="stripe">
            <td class="text">
              <button class="button-plain" onclick="Company.showShareholders('government', 'quarterly', this)">
                Government&nbsp;<span class="blue-icon">+</span>
              </button>
            </td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

              <td>0.04%</td>

          </tr>

          <tr class="">
            <td class="text">
              <button class="button-plain" onclick="Company.showShareholders('public', 'quarterly', this)">
                Public&nbsp;<span class="blue-icon">+</span>
              </button>
            </td>

              <td>14.71%</td>

              <td>15.23%</td>

              <td>15.47%</td>

              <td>14.83%</td>

              <td>14.88%</td>

              <td>14.90%</td>

              <td>15.07%</td>

              <td>15.16%</td>

              <td>14.95%</td>

              <td>15.96%</td>

              <td>16.61%</td>

              <td>16.93%</td>

          </tr>

        <tr class="sub">
          <td class="text">No. of Shareholders</td>
          <td>33,35,815</td><td>36,48,537</td><td>37,56,541</td><td>35,68,560</td><td>37,10,169</td><td>36,47,886</td><td>36,48,989</td><td>36,66,407</td><td>36,08,157</td><td>40,41,653</td><td>41,52,430</td><td>42,18,619</td>
        </tr>
      </tbody>
    </table>
  </div>`;

function stubFetch(html: string) {
  // A fresh Response per call — bodies are one-shot.
  return vi.fn(async () => new Response(html, { status: 200, headers: { "Content-Type": "text/html" } }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TODAY-NIFTY — the promoter-shareholding fallback (the ITC class)", () => {
  it("THE GATE PIN — the REAL captured ITC shape (no promoter in the meta, no Promoters row, non-promoter holders sum to 100.00) derives promoterHolding = 0 — the widely-held company's own published pattern, never null, never a guess", async () => {
    vi.stubGlobal("fetch", stubFetch(`${BASE_HTML}<section id="shareholding">${ITC_QUARTERLY_SHP}</section>`));
    const f = await fetchScreenerFundamentals("ITC");
    expect(f).not.toBeNull();
    // Pre-fix RED: this was null (the live refusal round 58 disclosed).
    expect(f!.promoterHolding).toBe(0);
    // The rest of the extraction still works on the same fixture.
    expect(f!.pe).toBeCloseTo(24.1, 5);
    expect(f!.roe).toBeCloseTo(36.5, 5);
  });

  it("a classic promoter company — the Promoters row present → its LATEST percent cell wins over the meta-description fallback chain", async () => {
    const promoterRow = `
          <tr class="stripe">
            <td class="text">
              <button class="button-plain" onclick="Company.showShareholders('promoters', 'quarterly', this)">
                Promoters&nbsp;<span class="blue-icon">+</span>
              </button>
            </td>
              <td>50.10%</td>
              <td>50.30%</td>
              <td>50.49%</td>
          </tr>`;
    vi.stubGlobal(
      "fetch",
      stubFetch(
        `<html><head><meta name="description" content="Some Co &middot; Mkt Cap: 1,000 Cr"></head><body>` +
          `<section id="shareholding"><div id="quarterly-shp"><table><thead><tr><th class="text"></th><th>Mar 2026</th><th>Jun 2026</th><th>Sep 2026</th></tr></thead>` +
          `<tbody>${promoterRow}<tr class=""><td class="text">Public&nbsp;<span class="blue-icon">+</span></td><td>20%</td><td>20%</td><td>20%</td></tr>` +
          `<tr class="sub"><td class="text">No. of Shareholders</td><td>1</td><td>2</td><td>3</td></tr></tbody></table></div></section></body></html>`,
      ),
    );
    const f = await fetchScreenerFundamentals("SOMECO");
    expect(f).not.toBeNull();
    // The LATEST column (Sep 2026), not an older one.
    expect(f!.promoterHolding).toBeCloseTo(50.49, 5);
  });

  it("an unexplained residual — non-promoter holders sum to ~85% with no Promoters row → null (cannot derive, never a guess)", async () => {
    const rows = `
          <tr class="stripe"><td class="text">FIIs&nbsp;<span class="blue-icon">+</span></td><td>45%</td></tr>
          <tr class=""><td class="text">DIIs&nbsp;<span class="blue-icon">+</span></td><td>40%</td></tr>
          <tr class="sub"><td class="text">No. of Shareholders</td><td>1,234</td></tr>`;
    vi.stubGlobal(
      "fetch",
      stubFetch(
        `<html><head><meta name="description" content="Residual Co &middot; Mkt Cap: 500 Cr"></head><body>` +
          `<section id="shareholding"><div id="quarterly-shp"><table><thead><tr><th class="text"></th><th>Sep 2026</th></tr></thead>` +
          `<tbody>${rows}</tbody></table></div></section></body></html>`,
      ),
    );
    const f = await fetchScreenerFundamentals("RESIDCO");
    expect(f).not.toBeNull();
    expect(f!.promoterHolding).toBeNull();
  });

  it("no shareholding section at all and no meta promoter → null (unchanged honest miss)", async () => {
    vi.stubGlobal("fetch", stubFetch(BASE_HTML));
    const f = await fetchScreenerFundamentals("NOSECTION");
    expect(f).not.toBeNull();
    expect(f!.promoterHolding).toBeNull();
  });

  it("the meta description still wins verbatim when it carries the figure (the existing primary path, unchanged)", async () => {
    vi.stubGlobal(
      "fetch",
      stubFetch(
        `<html><head><meta name="description" content="Promoter holding 62.1%"></head><body>` +
          `<section id="shareholding">${ITC_QUARTERLY_SHP}</section></body></html>`,
      ),
    );
    const f = await fetchScreenerFundamentals("METAWINS");
    expect(f).not.toBeNull();
    expect(f!.promoterHolding).toBeCloseTo(62.1, 5);
  });
});
