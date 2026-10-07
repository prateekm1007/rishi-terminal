/**
 * Round 9 (Coder Directions 2026-10-02, directive 14) — UI provenance.
 *
 * The market UI must render honest per-surface data states:
 *   - missing change              → "—" (never "0.00%" / "+0.00")
 *   - observation time            → the server's upstream observation
 *                                   timestamp (never the browser fetch time)
 *   - page-level badge state      → DERIVED from the actual entry statuses
 *                                   (LIVE/CACHED/STATIC/DERIVED/UNAVAILABLE),
 *                                   never from "a fetch happened"
 *
 * All new logic is PURE and lives in lib/pricePresentation.ts (Rule 14 —
 * the single presentation-contract ownership point; no page-local
 * interpretations). These tests were written FIRST and watched FAIL
 * (Rule 21): the helpers did not exist and normalizeBatchEntry dropped
 * the wire's status field.
 */
import { describe, expect, it } from "vitest";
import {
  aggregatePresentationState,
  aggregateMarketLabel,
  formatChangePair,
  latestObservedAt,
  observationDateFromEntry,
} from "@/lib/pricePresentation";
import { normalizeBatchEntry, type BatchPriceEntry } from "@/hooks/useLivePrices";

describe("R9 — aggregatePresentationState (page-level badge semantics)", () => {
  it("no entries / no usable entries → unavailable (a fetch alone is not a state)", () => {
    expect(aggregatePresentationState([])).toBe("unavailable");
    expect(
      aggregatePresentationState([
        { price: 0, status: "LIVE" },
        { price: undefined, status: "CACHED" },
      ]),
    ).toBe("unavailable");
  });

  it("conservative aggregation: any usable STATIC among LIVE entries → static", () => {
    expect(
      aggregatePresentationState([
        { price: 100, status: "LIVE" },
        { price: 6.8, status: "STATIC" },
      ]),
    ).toBe("static");
  });

  it("conservative aggregation: CACHED wins over LIVE, DERIVED over LIVE", () => {
    expect(
      aggregatePresentationState([
        { price: 100, status: "LIVE" },
        { price: 100, status: "CACHED" },
      ]),
    ).toBe("cached");
    expect(
      aggregatePresentationState([
        { price: 100, status: "LIVE" },
        { price: 100, status: "DERIVED" },
      ]),
    ).toBe("derived");
  });

  it("all usable entries LIVE → live", () => {
    expect(
      aggregatePresentationState([
        { price: 100, status: "LIVE" },
        { price: 200, status: "LIVE" },
      ]),
    ).toBe("live");
  });

  it("an entry with a usable price but NO status never claims live", () => {
    expect(aggregatePresentationState([{ price: 100 }])).toBe("unavailable");
    expect(
      aggregatePresentationState([
        { price: 100, status: "LIVE" },
        { price: 50, status: undefined },
      ]),
    ).toBe("unavailable");
  });
});

describe("R9 — latestObservedAt (server observation time, not fetch time)", () => {
  it("returns the LATEST disclosed observation across entries", () => {
    expect(
      latestObservedAt([
        { observedAt: "2026-10-01T09:45:00.000Z" },
        { observedAt: "2026-10-01T10:15:00.000Z" },
        { observedAt: null },
      ]),
    ).toBe("2026-10-01T10:15:00.000Z");
  });

  it("no disclosed observation → null (never fabricated)", () => {
    expect(latestObservedAt([])).toBeNull();
    expect(latestObservedAt([{ observedAt: null }, {}])).toBeNull();
  });

  it("an invalid/non-string value is ignored, not coerced", () => {
    expect(latestObservedAt([{ observedAt: "not-a-date" }, { observedAt: "2026-10-01T09:45:00.000Z" }])).toBe(
      "2026-10-01T09:45:00.000Z",
    );
    expect(latestObservedAt([{ observedAt: 12345 } as unknown as { observedAt: string | null }])).toBeNull();
  });
});

describe("R9 — aggregateMarketLabel (dashboard/alerts badge text)", () => {
  it("an aggregate of LIVE entries with a delayed transport says DELAYED, not LIVE", () => {
    expect(
      aggregateMarketLabel([
        { price: 100, status: "LIVE", source: "yahoo-bulk" },
        { price: 50_000, status: "LIVE", source: "coingecko" },
      ]),
    ).toBe("DELAYED MARKET DATA");
  });

  it("all-LIVE with no delayed transport → LIVE MARKET DATA", () => {
    expect(
      aggregateMarketLabel([
        { price: 50_000, status: "LIVE", source: "coingecko" },
        { price: 85, status: "LIVE", source: "exchangerate-api" },
      ]),
    ).toBe("LIVE MARKET DATA");
  });

  it("any weaker state downgrades the badge word (conservative)", () => {
    expect(
      aggregateMarketLabel([
        { price: 100, status: "LIVE", source: "coingecko" },
        { price: 6.8, status: "STATIC", source: "static-yields-in" },
      ]),
    ).toBe("STATIC MARKET DATA");
    expect(
      aggregateMarketLabel([{ price: 100, status: "CACHED", source: "yahoo" }]),
    ).toBe("LAST OBSERVED MARKET DATA");
  });

  it("no usable entries → UNAVAILABLE MARKET DATA (never LIVE)", () => {
    expect(aggregateMarketLabel([])).toBe("UNAVAILABLE MARKET DATA");
    expect(aggregateMarketLabel([{ price: 0, status: "LIVE" }])).toBe("UNAVAILABLE MARKET DATA");
  });
});

describe("R9 — formatChangePair (missing change renders an em dash)", () => {
  it("missing percent → both parts em dash, direction null (no arrow, no color claim)", () => {
    expect(formatChangePair(null, null)).toEqual({
      pctText: "—",
      absText: "—",
      positive: null,
    });
  });

  it("percent present but absolute not derivable → percent renders, absolute is an em dash", () => {
    expect(formatChangePair(-1.63, null)).toEqual({
      pctText: "▼ -1.63%",
      absText: "—",
      positive: false,
    });
  });

  it("both present → the widget's exact visual format", () => {
    expect(formatChangePair(1.63, 19.3)).toEqual({
      pctText: "▲ +1.63%",
      absText: "(+19.30)",
      positive: true,
    });
    expect(formatChangePair(-1.63, -19.3)).toEqual({
      pctText: "▼ -1.63%",
      absText: "(-19.30)",
      positive: false,
    });
  });

  it("a GENUINE zero change stays a real observation (0.00% with an arrow)", () => {
    expect(formatChangePair(0, 0)).toEqual({
      pctText: "▲ +0.00%",
      absText: "(+0.00)",
      positive: true,
    });
  });
});

describe("R9 — observationDateFromEntry (widget observation-time source)", () => {
  it("uses the entry's observedAt, then lastUpdated, else null — never now()", () => {
    expect(observationDateFromEntry({ observedAt: "2026-10-01T09:45:00.000Z" })?.toISOString()).toBe(
      "2026-10-01T09:45:00.000Z",
    );
    expect(
      observationDateFromEntry({ lastUpdated: "2026-10-01T09:45:00.000Z", observedAt: undefined })?.toISOString(),
    ).toBe("2026-10-01T09:45:00.000Z");
    expect(observationDateFromEntry({})).toBeNull();
    expect(observationDateFromEntry({ observedAt: "garbage" })).toBeNull();
  });
});

describe("R9 — normalizeBatchEntry transports the wire's provenance status", () => {
  it("a usable entry carries its status verbatim; a missing status stays null", () => {
    const out = normalizeBatchEntry({ price: 100, status: "LIVE" } as BatchPriceEntry);
    expect(out!.status).toBe("LIVE");
    const noStatus = normalizeBatchEntry({ price: 100 } as BatchPriceEntry);
    expect(noStatus!.status).toBeNull();
  });

  it("UNAVAILABLE stays untransported (null entry, no state claim)", () => {
    expect(normalizeBatchEntry({ status: "UNAVAILABLE" } as BatchPriceEntry)).toBeNull();
  });
});
