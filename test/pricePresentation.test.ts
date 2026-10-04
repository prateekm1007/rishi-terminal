import { describe, expect, it } from "vitest";
import {
  presentationState,
  statusLabel,
  statusColor,
  isDelayedSource,
  absChangeFromPercent,
} from "@/lib/pricePresentation";

// Phase 5.1 (T47/T48): presentation state derives from the SERVER's provenance
// status — a numeric value must never collapse into "LIVE" on its own, a
// STATIC reference is labelled static, and Yahoo-transported quotes are
// labelled DELAYED (matrix: "delayed snapshot; never labelled realtime").

describe("presentationState — server status drives the tile", () => {
  it("LIVE with a usable price → live", () => {
    expect(presentationState({ price: 123.45, status: "LIVE", source: "nse" })).toBe("live");
  });

  it("STATIC with a valid price → static (never live)", () => {
    // The exact reviewer scenario: $123.45 must not render "LIVE · STATIC-COMMODITIES".
    expect(presentationState({ price: 123.45, status: "STATIC", source: "static-commodities" })).toBe("static");
  });

  it("CACHED with a valid price → cached (never live)", () => {
    expect(presentationState({ price: 88.5, status: "CACHED", source: "fred-csv" })).toBe("cached");
  });

  it("DERIVED with a valid price → derived (never live)", () => {
    expect(presentationState({ price: 7.1, status: "DERIVED", source: "yahoo-etf-proxy" })).toBe("derived");
  });

  it("UNAVAILABLE → unavailable regardless of any stray numeric fields", () => {
    expect(presentationState({ status: "UNAVAILABLE", lastUpdated: null } as never)).toBe("unavailable");
  });

  it("LIVE with a zero/invalid/missing price → unavailable (fail-closed)", () => {
    expect(presentationState({ price: 0, status: "LIVE", source: "nse" })).toBe("unavailable");
    expect(presentationState({ price: Number.NaN, status: "LIVE", source: "nse" })).toBe("unavailable");
    expect(presentationState({ status: "LIVE", source: "nse" })).toBe("unavailable");
  });

  it("missing status → unavailable (never live by default)", () => {
    expect(presentationState({ price: 42 })).toBe("unavailable");
  });

  it("missing/null entry → unavailable", () => {
    expect(presentationState(null)).toBe("unavailable");
    expect(presentationState(undefined)).toBe("unavailable");
    expect(presentationState({})).toBe("unavailable");
  });
});

describe("statusLabel — honest freshness wording", () => {
  it("yahoo-sourced LIVE observations are DELAYED, not LIVE", () => {
    const s = presentationState({ price: 100, status: "LIVE", source: "yahoo" });
    // Y3 (Round 12): plain-language transport label replaces the jargon form.
    expect(statusLabel(s, "yahoo")).toBe("Delayed · Yahoo Finance (unofficial)");
  });

  it("yahoo-bulk is also a delayed transport", () => {
    expect(isDelayedSource("yahoo-bulk")).toBe(true);
    expect(isDelayedSource("yahoo")).toBe(true);
    expect(isDelayedSource("YAHOO_V7")).toBe(true);
  });

  it("non-delayed LIVE sources keep the LIVE label", () => {
    expect(isDelayedSource("exchangerate-api")).toBe(false);
    expect(isDelayedSource("coingecko")).toBe(false);
    expect(statusLabel("live", "exchangerate-api")).toBe("LIVE · EXCHANGERATE-API");
  });

  it("each state carries its own label", () => {
    expect(statusLabel("cached", "fred-csv")).toBe("CACHED · FRED-CSV");
    expect(statusLabel("derived", "yahoo-etf-proxy")).toBe("Derived · Yahoo Finance (unofficial)");
    expect(statusLabel("static", "static-commodities")).toBe("STATIC · STATIC-COMMODITIES");
    expect(statusLabel("unavailable", undefined)).toBe("UNAVAILABLE");
    expect(statusLabel("loading", undefined)).toBe("LOADING…");
  });

  it("labels are mutually exclusive: a static value never renders LIVE", () => {
    const label = statusLabel(presentationState({ price: 5000, status: "STATIC", source: "static-commodities" }), "static-commodities");
    expect(label.startsWith("STATIC")).toBe(true);
    expect(label.includes("LIVE")).toBe(false);
  });
});

describe("statusColor — non-realtime states are visually distinct", () => {
  it("live is green; cached/derived/static/unavailable are not", () => {
    expect(statusColor("live")).toBe("#22C55E");
    expect(statusColor("cached")).not.toBe(statusColor("live"));
    expect(statusColor("static")).not.toBe(statusColor("live"));
    expect(statusColor("unavailable")).not.toBe(statusColor("live"));
  });
});

// H2 (audit 2026-10-01): the prices API transports ONLY a percent change —
// lib/livePrice.ts reads regularMarketChangePercent / pChange, so `change`
// and `changePercent24h` are the same number. The absolute move is derived
// exactly from the same observation's price + percent; a live price is
// never mixed with the seed baseline price (that rendered
// "−1.63% (−1332.30)" on /stock/RELIANCE, whose true move was ≈ −19.30).
describe("absChangeFromPercent — H2 absolute change derivation", () => {
  it("derives the exact absolute move from the observation's price + percent", () => {
    const price = 1167.70;
    const pct = -1.6259477674810408; // live RELIANCE observation (audit evidence)
    const abs = absChangeFromPercent(price, pct);
    expect(abs).not.toBeNull();
    expect(abs!).toBeCloseTo(price - price / (1 + pct / 100), 10);
    expect(abs!).toBeCloseTo(-19.30, 1);
  });

  it("round-trips: the percent is recoverable from (price, abs)", () => {
    const price = 2075; // live TCS observation
    const pct = 1.1898956403004044;
    const abs = absChangeFromPercent(price, pct)!;
    expect((abs / (price - abs)) * 100).toBeCloseTo(pct, 10);
  });

  it("zero percent is an exact zero move, not a fabricated value", () => {
    expect(absChangeFromPercent(1234.5, 0)).toBe(0);
  });

  it("fails closed to null on degenerate inputs (renders —, never a guess)", () => {
    expect(absChangeFromPercent(1167.70, -100)).toBeNull(); // implied prev close ≤ 0
    expect(absChangeFromPercent(1167.70, -150)).toBeNull();
    expect(absChangeFromPercent(Number.NaN, 1)).toBeNull();
    expect(absChangeFromPercent(1167.70, Number.POSITIVE_INFINITY)).toBeNull();
    expect(absChangeFromPercent(0, 1)).toBeNull();
    expect(absChangeFromPercent(-5, 1)).toBeNull();
  });
});
