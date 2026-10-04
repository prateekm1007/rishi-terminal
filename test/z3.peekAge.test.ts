// Z3 (Round 13): the first-byte peek serves the last cached observation
// up to 7 days old — never UNAVAILABLE when a usable observation exists,
// never a stale-beyond-7-days price presented as servable.
//
// Founder defect 2/3 (Round 13): /stock/AXISBANK's first byte carried
// "price unavailable" tooltips while the DB held real rows. Root cause
// reading: the peek itself serves ANY row; the empty cells were symbols
// the cache had never seen (nothing warmed the cache — Z2). Z3 pins the
// peek's age CONTRACT so the behavior is defined and tested: serve
// observations anchored within the last 7 days; drop anything older (the
// honest state is then "price unavailable", not an ancient price).
//
// Written to FAIL FIRST against the pre-Z3 peek (Rule 21/24): the 7-day
// cap does not exist yet, so the too-old contract fails.

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── in-memory emulation of the quote_cache read path (readRows uses
// .select().in("symbol", symbols)) ──
interface Row {
  symbol: string;
  price: number;
  change: number | null;
  currency: string;
  source: string;
  observed_at: string | null;
  refreshed_at: string;
  ttl_seconds: number;
  volume24h: number | null;
}
let table: Record<string, Row> = {};
// Sunday 2026-10-04, 08:00 IST (closed market) — the founder's weekend
// fetch moment.
let nowMs = Date.UTC(2026, 9, 4, 2, 30);

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (name: string) => {
      if (name !== "quote_cache") throw new Error(`unexpected table ${name}`);
      return {
        select: () => ({
          in: (_c: string, symbols: string[]) => ({
            // readRows awaits the builder directly (thenable shape).
            then: (resolve: (v: { data: Row[]; error: null }) => void) =>
              resolve({ data: symbols.map((s) => table[s]).filter(Boolean), error: null }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/marketHours", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marketHours")>();
  return {
    ...actual,
    marketState: (ms?: number) => actual.marketState(ms ?? nowMs),
  };
});

import { peekCachedQuotes } from "@/lib/quoteCache";

function row(symbol: string, observedIso: string, price = 1217.1): Row {
  return {
    symbol,
    price,
    change: -0.726,
    currency: "INR",
    source: "yahoo-bulk",
    observed_at: observedIso,
    refreshed_at: observedIso, // capture == observation for the fixtures
    ttl_seconds: 0,
    volume24h: null,
  };
}

beforeEach(() => {
  table = {};
  nowMs = Date.UTC(2026, 9, 4, 2, 30);
});

describe("Z3 — the peek serves the last observation within 7 days", () => {
  it("weekend + a quote from Friday's session → SERVED with its own observation time", async () => {
    table["AXISBANK"] = row("AXISBANK", "2026-10-02T09:44:00+00:00"); // Fri, ~1 day old
    const out = await peekCachedQuotes(["AXISBANK"], () => nowMs);
    expect(out["AXISBANK"]?.quote.price).toBe(1217.1);
    expect(out["AXISBANK"]?.quote.observedAt).toBe("2026-10-02T09:44:00+00:00");
  });

  it("a 3-day-old quote → SERVED (the tile labels it stale via Y3, never blanks it)", async () => {
    table["SBIN"] = row("SBIN", "2026-10-01T09:45:00+00:00"); // ~3 days old
    const out = await peekCachedQuotes(["SBIN"], () => nowMs);
    expect(out["SBIN"]?.quote.price).toBe(1217.1);
  });

  it("a quote at the 7-day boundary → SERVED; older than 7 days → NOT served (honest unavailable)", async () => {
    // exactly 7 days old (boundary inclusive)
    table["AAA"] = row("AAA", "2026-09-27T02:30:00+00:00");
    const ok = await peekCachedQuotes(["AAA"], () => nowMs);
    expect(ok["AAA"]?.quote.price).toBe(1217.1);
    // 8 days old
    table["BBB"] = row("BBB", "2026-09-26T02:29:00+00:00");
    const stale = await peekCachedQuotes(["BBB"], () => nowMs);
    expect(stale["BBB"]).toBeUndefined();
  });

  it("weekday (market open) with an in-window row → SERVED; the cap is age-based, not session-based", async () => {
    nowMs = Date.UTC(2026, 9, 5, 4, 30); // Monday 10:00 IST, open
    table["CCC"] = row("CCC", "2026-10-01T09:45:00+00:00"); // ~4 days old
    const out = await peekCachedQuotes(["CCC"], () => nowMs);
    expect(out["CCC"]?.quote.price).toBe(1217.1);
  });

  it("NSE-holiday-style closed day: the last real session's quote is served (closed market serves, never blanks)", async () => {
    // nowMs stays Sunday; the last trading day (Friday) row is the close.
    table["HDFCBANK"] = row("HDFCBANK", "2026-10-02T09:59:00+00:00");
    const out = await peekCachedQuotes(["HDFCBANK"], () => nowMs);
    expect(out["HDFCBANK"]?.market.open).toBe(false);
    expect(out["HDFCBANK"]?.quote.observedAt).toBe("2026-10-02T09:59:00+00:00");
  });

  it("no observation time at all → NOT served (no honest anchor for the age claim, Rule 3)", async () => {
    table["DDD"] = { ...row("DDD", "2026-10-02T09:44:00+00:00"), observed_at: null };
    const out = await peekCachedQuotes(["DDD"], () => nowMs);
    expect(out["DDD"]).toBeUndefined();
  });
});
