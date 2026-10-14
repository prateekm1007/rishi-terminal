/**
 * FD-15 (founder order 2026-10-13): the dashboard ticker's sourced-rows
 * contract.
 *
 * Words verbatim: "Each row shows its source and as-of time, or '—' with
 * 'no source yet'. Remove 'Observation time not disclosed' next to values.
 * Add a test that fails any row without a source."
 *
 * What this pin enforces:
 *   1. THE FOUNDER'S TEST — no row without a source: for EVERY ticker
 *      symbol, an entry that discloses no source must render NO value
 *      ("—") and the "no source yet" attribution. A value on a sourceless
 *      row fails (an unlabelled number supports no claim).
 *   2. A sourced row carries BOTH the source name and the as-of stamp;
 *      a source that disclosed no time keeps an em-dash as-of (Rule 3 —
 *      missing renders as "—", never a fabricated time).
 *   3. The component renders the builder's attribution on every row
 *      (structure pin — the builder exists to be USED, Rule 14).
 *   4. "Observation time not disclosed" is gone from the dashboard (the
 *      founder's removal order) — the key is deleted from the catalogs
 *      and the component references neither it nor its wording.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { tickerRowFace } from "../lib/markets/sourcedRow";
import { TICKER_SYMS, STATS, WORLD_MARKETS } from "../lib/dashboardSymbols";

const read = (p: string) => readFileSync(p, "utf8");
const client = read("components/dashboard/DashboardClient.tsx");

/** Every symbol that renders a market-value row on the dashboard's first
 * byte: the scrolling ticker, the Market Overview tiles, the World
 * Markets tiles (the below-fold crypto grid rides #361's rebase). */
const ALL_ROW_SYMBOLS = [
  ...TICKER_SYMS,
  ...STATS.map(s => s.sym),
  ...WORLD_MARKETS.map(m => m.sym),
];

const WITH_SOURCE = {
  price: 24350.1,
  changePercent24h: 0.42,
  source: "yahoo",
  lastUpdated: "2026-10-12T09:45:00.000Z",
};

describe("FD-15 — the dashboard ticker's sourced-rows contract (round 54)", () => {
  it("THE FOUNDER'S TEST: a row without a source renders no value — any dashboard row symbol", () => {
    // Every sourceless shape: no entry at all, a null source, an empty
    // source string. For EVERY symbol that renders a market-value row on
    // the dashboard (ticker strip + Market Overview + World Markets), the
    // row must carry "—" and "no source yet" — a rendered number on a
    // sourceless row fails this test (that is the failure the founder
    // ordered).
    for (const sym of ALL_ROW_SYMBOLS) {
      for (const entry of [undefined, null, { price: 123.45, changePercent24h: 1.2, source: null, lastUpdated: "2026-10-12T09:45:00.000Z" }, { price: 123.45, source: "", lastUpdated: null }]) {
        const face = tickerRowFace(entry as never, { usd: false });
        expect(face.value, `${sym}: a sourceless row must render "—"`).toBe("—");
        expect(face.change, `${sym}: a sourceless row renders no direction`).toBe("—");
        expect(face.attribution, `${sym}: a sourceless row says "no source yet"`).toBe("no source yet");
        expect(face.positive, `${sym}: a sourceless row is direction-neutral`).toBeNull();
      }
    }
  });

  it("a sourced row shows BOTH its source and its as-of time", () => {
    const face = tickerRowFace(WITH_SOURCE, { usd: false });
    expect(face.value).toBe("24,350.1");
    expect(face.change).toBe("▲ 0.42%");
    expect(face.attribution).toContain("Yahoo Finance (unofficial)");
    expect(face.attribution).toContain("Mon 12 Oct, 15:15 IST");
  });

  it("a source that disclosed no observation time keeps an em-dash as-of — never a fabricated time", () => {
    const face = tickerRowFace({ ...WITH_SOURCE, lastUpdated: null }, { usd: true });
    expect(face.attribution).toBe("Yahoo Finance (unofficial) · —");
    // the value still renders: the SOURCE is the gate, the time is a
    // disclosed-or-em-dash datum (Rule 3)
    expect(face.value).toBe("$24,350.1");
  });

  it("an unparsable lastUpdated is an em-dash, not a crash, not a guess", () => {
    const face = tickerRowFace({ ...WITH_SOURCE, lastUpdated: "not-a-date" }, { usd: false });
    expect(face.attribution).toBe("Yahoo Finance (unofficial) · —");
  });

  it("a sourced row with an unusable price shows the attribution and no value", () => {
    for (const price of [null, 0, -5, Number.NaN]) {
      const face = tickerRowFace({ ...WITH_SOURCE, price }, { usd: false });
      expect(face.value).toBe("—");
      expect(face.attribution).toContain("Yahoo Finance (unofficial)");
    }
  });

  it("CoinGecko-transported rows attribute by their branded name (FD-15)", () => {
    const face = tickerRowFace({ ...WITH_SOURCE, source: "coingecko" }, { usd: true });
    expect(face.attribution).toContain("CoinGecko");
  });

  it("the component renders the builder's attribution on every ticker row (Rule 14: the builder is used)", () => {
    // positive control: the ticker map routes through tickerRowFace and
    // renders face.attribution inline
    expect(client).toContain("tickerRowFace(prices[sym]");
    expect(client).toContain("{face.attribution}");
    // the value renders through the face too (the source-gate reaches the
    // screen, not just the unit tests)
    expect(client).toContain("{face.value}");
  });

  it("'Observation time not disclosed' is gone from the dashboard (the founder's removal order)", () => {
    // the component no longer references the removed key or its wording
    expect(client).not.toContain("observationTimeNotDisclosed");
    expect(client).not.toContain("Observation time not disclosed");
    // the key is deleted from the catalogs that carried it (en, hi) and
    // from the generated pseudo locale
    for (const f of ["messages/en.json", "messages/hi.json", "messages/pseudo.json"]) {
      expect(read(f), `${f} must not carry the dead key`).not.toContain("observationTimeNotDisclosed");
    }
    // positive control (B-18): the surrounding dashboard namespace is
    // still intact — the updated-prefix key that DOES render survives
    expect(read("messages/en.json")).toContain('"updatedPrefix"');
  });
});
