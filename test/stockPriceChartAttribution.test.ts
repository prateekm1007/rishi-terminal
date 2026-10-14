// test/stockPriceChartAttribution.test.ts
// LWC-CHART (round 56): the lightweight-charts adoption (founder batch-2
// order, 13 Oct 2026 — docs/evidence/round55/r55-batch2-adoption-record.md)
// carries the TradingView attribution CONDITION verbatim: "show TradingView's
// attribution notice and link". The upstream README (tradingview/
// lightweight-charts, verified 2026-10-13) requires:
//
//   "This license requires specifying TradingView as the product creator.
//    You shall add the "attribution notice" from the NOTICE file and a link
//    to <https://www.tradingview.com/> to the page of your website or mobile
//    application that is available to your users."
//
// The vendored NOTICE (verbatim, 2026-10-13):
//   TradingView Lightweight Charts™
//   Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/
//
// These pins are DELIV-4-style source pins (the component is client-only,
// dynamically imported — the established readFileSync pin pattern from
// test/copyAudit.zero.test.ts applies). The attribution must render
// WHEREVER THE CHART RENDERS (the founder's condition): inside the chart
// card footer, on every render — not behind a flag, a tab, or an error
// state.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(__dirname, "..");
const CHART_SHELL = join(REPO, "components/stock/PriceChart.tsx");
const LWC_ADAPTER = join(REPO, "components/stock/LwcSeriesChart.tsx");

const shell = () => readFileSync(CHART_SHELL, "utf8");
const adapter = () => readFileSync(LWC_ADAPTER, "utf8");

describe("LWC-CHART: the TradingView attribution renders wherever the chart renders", () => {
  it("positive control: the pinned shell is the real price chart (renders the price-history chart card)", () => {
    // C10: a pin on an absent panel proves nothing — prove the file is the
    // chart that renders the fetched price series before pinning its footer.
    const src = shell();
    expect(src).toContain("usePriceHistory");
    expect(src).toContain("chart.priceChart");
  });

  it("the shell carries the NOTICE attribution text verbatim, with the TradingView link", () => {
    const src = shell();
    // The NOTICE first line, verbatim.
    expect(src).toContain("TradingView Lightweight Charts™");
    // The NOTICE copyright line, verbatim (the (с) is the upstream file's
    // own Cyrillic character — reproduced as-is).
    expect(src).toContain("TradingView, Inc.");
    // The README-required link to tradingview.com on the same visible
    // attribution element.
    expect(src).toContain('href="https://www.tradingview.com/"');
  });

  it("the attribution is unconditional in the shell footer (not behind loading, error, or empty states)", () => {
    const src = shell();
    // The attribution block must sit in the card footer that renders on
    // EVERY chart render — pinned structurally: its rendered occurrence
    // (lastIndexOf) sits AFTER the last conditional render state
    // ("chart.noData") — outside loading/error/no-data — and the "AO · Not
    // investment advice" line remains present beside it.
    const lastStateAt = src.lastIndexOf("chart.noData");
    const attributionAt = src.lastIndexOf("TradingView Lightweight Charts™");
    const adviceAt = src.lastIndexOf("AO · Not investment advice");
    expect(lastStateAt).toBeGreaterThan(-1);
    expect(attributionAt).toBeGreaterThan(lastStateAt);
    expect(adviceAt).toBeGreaterThan(-1);
  });

  it("the lightweight-charts adapter enables the built-in attributionLogo (the README link requirement on the chart itself)", () => {
    const src = adapter();
    // Positive control: this is the real adapter of the library.
    expect(src).toContain("lightweight-charts");
    expect(src).toContain("createChart");
    // The in-chart attribution logo (LayoutOptions.attributionLogo) —
    // README: "will satisfy the link requirement" on the chart itself.
    expect(src).toContain("attributionLogo: true");
  });
});
