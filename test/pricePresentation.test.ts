import { describe, expect, it } from "vitest";
import {
  presentationState,
  statusLabel,
  statusColor,
  isDelayedSource,
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
    expect(statusLabel(s, "yahoo")).toBe("DELAYED · YAHOO");
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
    expect(statusLabel("derived", "yahoo-etf-proxy")).toBe("DERIVED · YAHOO-ETF-PROXY");
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
