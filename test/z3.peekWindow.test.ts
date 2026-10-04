/**
 * Z3 (Round 13) — never show UNAVAILABLE when a quote exists.
 *
 * The founder's rule: when the market is closed, the first-byte peek
 * serves the LAST cached observation up to 7 days old, labelled with its
 * date and the Y3 market-state wording. Only a symbol with no observation
 * at all (or one older than the 7-day window) shows "price unavailable".
 *
 * Cases (fail-first, Rule 21/24): the 8-day-old case FAILED against the
 * pre-Z3 peek — it served arbitrarily old rows with no bound at all.
 * The weekday / weekend / NSE-holiday / 3-day-old cases pin the serving
 * behavior the founder's acceptance names ("a weekend fetch of a symbol
 * with a stored Friday quote shows the price").
 *
 * The market state is MOCKED (weekday-open / weekend / holiday) — the NSE
 * calendar itself stays unsourced in unit tests per Rule 4 (same approach
 * as test/y3.observationLabel.test.ts).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

// Hermetic market states — the peek only CARRIES this through; the bound
// itself is a pure age calculation on observed_at.
const marketStateMock = vi.fn();
vi.mock("@/lib/marketHours", () => ({
  marketState: (now: number) => marketStateMock(now),
}));

// In-memory quote_cache emulation (single + batch reads).
interface Row {
  symbol: string; price: number; change: number | null; currency: string;
  source: string; observed_at: string | null; refreshed_at: string; ttl_seconds: number;
  refresh_claim: string | null;
}
let table: Record<string, Row> = {};

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (name: string) => {
      if (name !== "quote_cache") throw new Error(`unexpected table ${name}`);
      return {
        select: () => ({
          eq: (_c: string, v: string) => ({
            maybeSingle: async () => ({ data: table[v] ?? null, error: null }),
          }),
          in: (_c: string, vals: string[]) => ({
            data: vals.map((v) => table[v]).filter(Boolean),
          }),
        }),
      };
    },
  }),
}));

import { peekCachedQuote, peekCachedQuotes } from "@/lib/quoteCache";

const NOW = Date.UTC(2026, 9, 4, 6, 0); // Sunday 2026-10-04 11:30 IST
const DAY = 24 * 3600 * 1000;

function seed(symbol: string, observedDaysAgo: number | null, price = 1000): void {
  table[symbol] = {
    symbol,
    price,
    change: 1,
    currency: "INR",
    source: "yahoo-bulk",
    observed_at: observedDaysAgo === null ? null : new Date(NOW - observedDaysAgo * DAY).toISOString(),
    refreshed_at: new Date(NOW).toISOString(),
    ttl_seconds: 60,
    refresh_claim: null,
  };
}

beforeEach(() => {
  table = {};
  marketStateMock.mockReset();
  marketStateMock.mockReturnValue({ open: false, ttlSeconds: null, freshness: "close", sessionDate: "2026-10-02" });
});

describe("Z3 — the 7-day peek window (never UNAVAILABLE when a quote exists)", () => {
  it("WEEKEND: a symbol with a stored Friday quote (2 days old) SERVES on a Sunday fetch", async () => {
    seed("SBIN", 2);
    const r = await peekCachedQuote("SBIN", () => NOW);
    expect(r).not.toBeNull();
    expect(r!.quote.price).toBe(1000);
    expect(r!.market.open).toBe(false);
  });

  it("WEEKDAY: a fresh quote from the current session serves (market open)", async () => {
    marketStateMock.mockReturnValue({ open: true, ttlSeconds: 60, freshness: "live-delayed", sessionDate: "2026-10-05" });
    seed("TCS", 0.01);
    const r = await peekCachedQuote("TCS", () => NOW);
    expect(r).not.toBeNull();
    expect(r!.quote.price).toBe(1000);
  });

  it("NSE HOLIDAY (market closed on a weekday): the last pre-holiday quote serves with the closed state", async () => {
    // Diwali-style closure: marketState says closed on a Monday.
    marketStateMock.mockReturnValue({ open: false, ttlSeconds: null, freshness: "close", sessionDate: "2026-10-02" });
    seed("RELIANCE", 3); // the last observation predates the holiday
    const r = await peekCachedQuote("RELIANCE", () => NOW);
    expect(r).not.toBeNull();
    expect(r!.quote.price).toBe(1000);
    expect(r!.market.open).toBe(false);
  });

  it("a 3-DAY-OLD quote serves (well inside the 7-day window)", async () => {
    seed("AXISBANK", 3, 1217.1);
    const r = await peekCachedQuote("AXISBANK", () => NOW);
    expect(r).not.toBeNull();
    expect(r!.quote.price).toBe(1217.1);
  });

  it("an 8-DAY-OLD quote does NOT serve (the 7-day bound) — unavailable is honest there", async () => {
    seed("OLDCO", 8);
    const r = await peekCachedQuote("OLDCO", () => NOW);
    expect(r).toBeNull();
  });

  it("a 7-day-boundary quote (exactly 7 days) still serves — the window is inclusive", async () => {
    seed("EDGE7", 7);
    const r = await peekCachedQuote("EDGE7", () => NOW);
    expect(r).not.toBeNull();
  });

  it("a real-price row with a NULL observed_at serves (the price is real; the Y3 label omits the time line — fail-closed labeling)", async () => {
    seed("NOTIME", null);
    const r = await peekCachedQuote("NOTIME", () => NOW);
    expect(r).not.toBeNull();
    expect(r!.quote.observedAt).toBeNull();
  });

  it("the 017 claim placeholder (price 0) never serves — unchanged", async () => {
    seed("CLAIMED", 1, 0);
    const r = await peekCachedQuote("CLAIMED", () => NOW);
    expect(r).toBeNull();
  });
});

describe("Z3 — the batch peek (peers ride the same window)", () => {
  it("serves the 2-day and 3-day peers, excludes the 8-day one and the placeholder", async () => {
    seed("SBIN", 2, 954.1);
    seed("AXISBANK", 3, 1217.1);
    seed("OLDCO", 8, 500);
    seed("CLAIMED", 1, 0);
    const out = await peekCachedQuotes(["SBIN", "AXISBANK", "OLDCO", "CLAIMED", "MISSING"], () => NOW);
    expect(Object.keys(out).sort()).toEqual(["AXISBANK", "SBIN"]);
    expect(out["SBIN"].quote.price).toBe(954.1);
    expect(out["AXISBANK"].quote.price).toBe(1217.1);
  });

  it("carries the same market state for every served row (the label reads it)", async () => {
    seed("A", 1);
    seed("B", 2);
    const out = await peekCachedQuotes(["A", "B"], () => NOW);
    expect(out["A"].market).toEqual(out["B"].market);
    expect(out["A"].market.sessionDate).toBe("2026-10-02");
  });
});
