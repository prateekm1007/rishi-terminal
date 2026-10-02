/**
 * Round 9 (Coder Directions 2026-10-02, directive 17) — pulse null semantics.
 *
 * The round-8 classification deliberately deferred these; they are not
 * optional once the goal is "fix all errors":
 *
 *   breadth: a missing index percentChange must NOT be classified as
 *            "unchanged" via `?? 0` — a missing observation is not a flat
 *            one. Indices without a disclosed percentChange are counted
 *            separately (`unknown`), and the advance/decline ratio is null
 *            when declines = 0 (a count is not a ratio).
 *   blocks:  missing quantity/price/change/pchange are null — never 0; a
 *            missing pchange manufactures NO BUY/SELL side; the response
 *            timestamp is the provider's own disclosure or null — never
 *            `new Date()` dressed up as the deals' observation time.
 *
 * Rule 21: written first and watched FAIL on main.
 */
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

const REAL_FETCH = globalThis.fetch;

beforeEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

function nseIndexRow(overrides: Record<string, unknown>) {
  return {
    indexSymbol: "X",
    last: 100,
    variation: 1,
    percentChange: 1,
    high: 101,
    low: 99,
    open: 100,
    previousClose: 99,
    yearHigh: 120,
    yearLow: 80,
    ...overrides,
  };
}

describe("/api/pulse/breadth — missing percentChange is not 'unchanged'", () => {
  it("indices without a disclosed percentChange are excluded from advances/declines/unchanged and counted as unknown", async () => {
    const { GET } = await import("@/app/api/pulse/breadth/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [
            nseIndexRow({ indexSymbol: "NIFTY 50", percentChange: 1.2 }),
            nseIndexRow({ indexSymbol: "NIFTY BANK", percentChange: -0.8 }),
            nseIndexRow({ indexSymbol: "NIFTY MIDCAP 100", percentChange: 0 }), // genuine flat
            nseIndexRow({ indexSymbol: "NIFTY SMALLCAP 100", percentChange: undefined }), // MISSING
            nseIndexRow({ indexSymbol: "NIFTY IT", percentChange: 0.5 }),
            nseIndexRow({ indexSymbol: "NIFTY PHARMA", percentChange: undefined }), // MISSING
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    // RED on main: the two missing entries were counted as unchanged (3).
    expect(body.breadth.advances).toBe(2);
    expect(body.breadth.declines).toBe(1);
    expect(body.breadth.unchanged).toBe(1);
    // RED on main: no unknown count existed.
    expect(body.breadth.unknown).toBe(2);
    expect(body.breadth.total).toBe(6);
  });

  it("the advance/decline ratio is null when declines = 0 — a count is not a ratio", async () => {
    const { GET } = await import("@/app/api/pulse/breadth/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [
            nseIndexRow({ indexSymbol: "NIFTY 50", percentChange: 1.2 }),
            nseIndexRow({ indexSymbol: "NIFTY BANK", percentChange: 0.9 }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await GET();
    const body = await res.json();
    expect(body.breadth.advances).toBe(2);
    expect(body.breadth.declines).toBe(0);
    // RED on main: ratio === advances (2) — a count posing as a ratio.
    expect(body.breadth.advanceDeclineRatio).toBeNull();
  });

  it("a sector's missing percentChange transports as null (JSON), not 0", async () => {
    const { GET } = await import("@/app/api/pulse/breadth/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [
            nseIndexRow({ indexSymbol: "NIFTY 50", percentChange: 1.2 }),
            nseIndexRow({ indexSymbol: "NIFTY IT", percentChange: undefined }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await GET();
    const body = await res.json();
    const it = body.sectors.find((s: { sector: string }) => s.sector === "IT");
    // RED on main: undefined was serialized as absent... with ?? 0 the
    // classification lied; the SECTOR ROW must still carry null explicitly
    // so the UI cannot coerce it back into "+0.00%".
    expect(it).toBeDefined();
    expect(it.changePct).toBeNull();
  });
});

describe("/api/pulse/blocks — no fabricated zeros, sides, or timestamps", () => {
  function blockDeal(overrides: Record<string, unknown>) {
    return {
      symbol: "TESTCO",
      series: "EQ",
      totalTradedVolume: "100000",
      lastPrice: "250.5",
      pchange: "1.25",
      change: "3.1",
      lastUpdateTime: "02-Oct-2026 14:35:10",
      ...overrides,
    };
  }

  it("missing pchange manufactures no BUY/SELL side; missing change/change stay null", async () => {
    const { GET } = await import("@/app/api/pulse/blocks/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [
            blockDeal({ symbol: "NOSIDE", pchange: undefined, change: undefined }),
            blockDeal({ symbol: "UPSIDE", pchange: "1.25", change: "3.1" }),
            blockDeal({ symbol: "DOWNSIDE", pchange: "-0.75", change: "-1.9" }),
          ],
          timestamp: "02-Oct-2026 16:00:00",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    const bySymbol = Object.fromEntries(
      (body.deals as Array<Record<string, unknown>>).map(d => [d.symbol, d]),
    );
    // RED on main: side === 'BUY' manufactured from a missing pchange.
    expect(bySymbol.NOSIDE.side).toBeNull();
    // RED on main: change ?? 0.
    expect(bySymbol.NOSIDE.change).toBeNull();
    expect(bySymbol.NOSIDE.changePct).toBeNull();
    // The heuristic still works when the observation exists.
    expect(bySymbol.UPSIDE.side).toBe("BUY");
    expect(bySymbol.DOWNSIDE.side).toBe("SELL");
    expect(bySymbol.UPSIDE.change).toBeCloseTo(3.1, 6);
  });

  it("the response timestamp is the provider's disclosure or null — never new Date()", async () => {
    const { GET } = await import("@/app/api/pulse/blocks/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({ data: [blockDeal({ symbol: "A" })] }), // NO timestamp
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const before = new Date().toISOString();
    const res = await GET();
    const body = await res.json();
    // RED on main: timestamp === new Date().toISOString() (fabricated).
    expect(body.timestamp).toBeNull();
    expect(before).toBeDefined();
  });

  it("a deal missing quantity/price is excluded (it cannot be valued), not zero-valued", async () => {
    const { GET } = await import("@/app/api/pulse/blocks/route");
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [
            blockDeal({ symbol: "NOQTY", totalTradedVolume: undefined }),
            blockDeal({ symbol: "NOPX", lastPrice: undefined }),
            blockDeal({ symbol: "GOOD" }),
          ],
          timestamp: "02-Oct-2026 16:00:00",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await GET();
    const body = await res.json();
    const symbols = (body.deals as Array<Record<string, unknown>>).map(d => d.symbol);
    // RED on main: NOQTY/NOPX were zero-valued then dropped by value>0 —
    // but their rows carried qty 0/price 0 if value passed. The honest
    // contract: unvaluable deals are excluded; no zero quantity/price row.
    expect(symbols).toEqual(["GOOD"]);
    const good = body.deals[0];
    expect(good.quantity).toBeCloseTo(100000, 6);
    expect(good.price).toBeCloseTo(250.5, 6);
    // The route rounds deal value to 2dp by design (Cr units): 2.505 → 2.5.
    expect(good.value).toBe(2.5);
  });
});
