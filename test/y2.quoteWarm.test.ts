/**
 * Y2 (Round 12) — the quote-cache warmer endpoint contract.
 *
 * Wire contracts pinned here (the warmer is infra: it must be honest about
 * what it did, refuse unauthenticated calls, and never run the universe
 * sweep outside the NSE session unless explicitly forced):
 *   1. Auth fail-closed: no CRON_SECRET configured -> 500; missing/wrong
 *      Bearer -> 401 (the requireCronAuth wiring, at the route level).
 *   2. Market-hours gate: outside Mon-Fri 09:15-15:30 IST the endpoint
 *      NO-OPS honestly (200 + skipped: "market closed" + the market state
 *      it acted on). force=1 with the SAME secret overrides for
 *      off-hours verification (disclosed in the response: forced: true).
 *   3. Slice partitioning: slice/of partition the universe deterministically
 *      (STOCKS key order, i % of === slice) so the workflow's sequential
 *      slices cover every symbol exactly once, and each stays far inside
 *      the function timeout (chunked through the batch claim path — never
 *      a naked fetch).
 *   4. Tile warming rides slice 0 only, through the canonical single-symbol
 *      path (serveQuote), using the ONE tile-set derivation
 *      (quotePath.nonEquityTileSymbols — the same set the health coverage
 *      denominator uses; Rule 14).
 *   5. Honesty: symbols the upstream had nothing for are counted as
 *      misses in the response, never as warmed.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";

const marketStateMock = vi.fn();
const cachedQuoteBatchForEquitiesMock = vi.fn();
const serveQuoteMock = vi.fn();

vi.mock("@/lib/marketHours", () => ({
  marketState: (...a: unknown[]) => marketStateMock(...a),
}));

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    cachedQuoteBatchForEquities: (...a: unknown[]) => cachedQuoteBatchForEquitiesMock(...a),
    serveQuote: (...a: unknown[]) => serveQuoteMock(...a),
  };
});

// Ten fake registry symbols — small enough to reason about partitioning.
// vi.hoisted: the mock factory is hoisted above every const, so the fake
// registry must be hoisted with it.
const FAKE_STOCKS = vi.hoisted(() =>
  Object.fromEntries(
    ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", "III", "JJJ"].map((s) => [
      s,
      { symbol: s },
    ]),
  ),
);

vi.mock("@/data/stocks", () => ({ STOCKS: FAKE_STOCKS }));

import { POST } from "@/app/api/ingest/quotes-warm/route";
import { nonEquityTileSymbols } from "@/lib/quotePath";

const SECRET = "y2-warm-test-secret";
const CRON = "cron-secret-that-must-not-open-the-warmer"; // deliberately different (Z2)

function warmReq(query = "", bearer: string | null = `Bearer ${SECRET}`): never {
  return {
    nextUrl: new URL(`https://terminal.test/api/ingest/quotes-warm${query}`),
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? bearer : null) },
  } as never;
}

function openMarket() {
  return { open: true, ttlSeconds: 60, freshness: "live-delayed" as const, sessionDate: "2026-10-05" };
}
function closedMarket() {
  return { open: false, ttlSeconds: null, freshness: "close" as const, sessionDate: "2026-10-02" };
}

beforeEach(() => {
  marketStateMock.mockReset();
  cachedQuoteBatchForEquitiesMock.mockReset();
  serveQuoteMock.mockReset();
  process.env.QUOTES_WARM_SECRET = SECRET;
  process.env.CRON_SECRET = CRON; // present on purpose: the warm endpoint must IGNORE it (Z2)
  marketStateMock.mockReturnValue(openMarket());
  cachedQuoteBatchForEquitiesMock.mockResolvedValue({ quotes: {} });
  serveQuoteMock.mockResolvedValue(null);
});

describe("Y2 — warmer auth (fail closed at the route level)", () => {
  it("missing QUOTES_WARM_SECRET env -> 500, never an open endpoint", async () => {
    const saved = process.env.QUOTES_WARM_SECRET;
    delete process.env.QUOTES_WARM_SECRET;
    try {
      const res = await POST(warmReq("", "Bearer anything"));
      expect(res.status).toBe(500);
    } finally {
      process.env.QUOTES_WARM_SECRET = saved;
    }
  });

  it("Z2: a valid CRON_SECRET is NOT accepted — the warm endpoint takes ONLY its dedicated secret", async () => {
    // CRON_SECRET guards the Vercel-cron ingest routes; the warmer is a
    // GitHub Actions caller with its own QUOTES_WARM_SECRET. Presenting
    // the cron secret here must fail exactly like any wrong secret.
    const res = await POST(warmReq("", `Bearer ${CRON}`));
    expect(res.status).toBe(401);
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(serveQuoteMock).not.toHaveBeenCalled();
  });

  it("missing or wrong Bearer -> 401 and NOTHING warmed", async () => {
    for (const bearer of [null, "Bearer wrong-secret", "Basic y2-warm-test-secret"]) {
      const res = await POST(warmReq("", bearer));
      expect(res.status).toBe(401);
    }
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(serveQuoteMock).not.toHaveBeenCalled();
  });
});

describe("Y2 — market-hours gate (endpoint gates precisely)", () => {
  it("market closed -> honest no-op: 200, skipped, zero work", async () => {
    marketStateMock.mockReturnValue(closedMarket());
    const res = await POST(warmReq(""));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("market closed");
    expect(body.warmed).toBe(0);
    expect(body.market).toEqual(closedMarket());
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(serveQuoteMock).not.toHaveBeenCalled();
  });

  it("force=1 (same secret) overrides the closed market and DISCLOSES the override", async () => {
    marketStateMock.mockReturnValue(closedMarket());
    cachedQuoteBatchForEquitiesMock.mockResolvedValue({
      quotes: Object.fromEntries(Object.keys(FAKE_STOCKS).map((s) => [s, { quote: { price: 1 } }])),
    });
    const res = await POST(warmReq("?force=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBeUndefined();
    expect(body.forced).toBe(true);
    expect(body.equities.served).toBe(10);
    expect(cachedQuoteBatchForEquitiesMock).toHaveBeenCalled();
  });

  it("market open -> no force flag needed, forced stays false", async () => {
    const res = await POST(warmReq(""));
    const body = await res.json();
    expect(body.skipped).toBeUndefined();
    expect(body.forced).toBe(false);
  });
});

describe("Y2 — slice partitioning (deterministic, exhaustive, exclusive)", () => {
  it("of=3 partitions the 10-symbol universe into disjoint slices covering every symbol", async () => {
    const seen: string[] = [];
    cachedQuoteBatchForEquitiesMock.mockImplementation(async (symbols: string[]) => {
      seen.push(...symbols);
      return { quotes: {} };
    });
    for (let k = 0; k < 3; k += 1) {
      const res = await POST(warmReq(`?slice=${k}&of=3`));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.of).toBe(3);
      expect(body.slice).toBe(k);
    }
    expect(seen.sort()).toEqual(Object.keys(FAKE_STOCKS).sort());
    // exactly once per symbol across the sweep
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("slice 1 of 3 receives exactly the i % 3 === 1 symbols (STOCKS key order)", async () => {
    let got: string[] = [];
    cachedQuoteBatchForEquitiesMock.mockImplementation(async (symbols: string[]) => {
      got = symbols;
      return { quotes: {} };
    });
    const res = await POST(warmReq("?slice=1&of=3"));
    const body = await res.json();
    expect(body.inSlice).toBe(3);
    expect(got).toEqual(["BBB", "EEE", "HHH"]);
    // non-zero slices never warm tiles
    expect(body.tiles).toEqual({ skipped: "non-zero slice" });
    expect(serveQuoteMock).not.toHaveBeenCalled();
  });

  it("defaults to the whole universe in one request (slice=0&of=1)", async () => {
    let got: string[] = [];
    cachedQuoteBatchForEquitiesMock.mockImplementation(async (symbols: string[]) => {
      got = symbols;
      return { quotes: {} };
    });
    const res = await POST(warmReq(""));
    const body = await res.json();
    expect(body.inSlice).toBe(10);
    expect(got).toHaveLength(10);
  });

  it("bogus slice/of clamp honestly (of=0 -> 1, slice beyond of-1 clamps)", async () => {
    const res = await POST(warmReq("?slice=99&of=0"));
    const body = await res.json();
    expect(body.of).toBe(1);
    expect(body.slice).toBe(0);
  });
});

describe("Y2 — honesty of the warm report", () => {
  it("upstream misses are counted as misses, never as warmed", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue({
      quotes: { AAA: { quote: { price: 10 }, state: "stale-revalidated" }, BBB: { quote: null, state: "miss" } },
    });
    const res = await POST(warmReq("?slice=0&of=2"));
    const body = await res.json();
    // slice 0 of 2 = AAA, CCC, EEE, GGG, III; only AAA had a quote
    expect(body.equities.upstreamWrites).toBe(1);
    expect(body.equities.served).toBe(1);
    expect(body.equities.misses).toBe(4);
  });

  // Rule 2 (names describe behavior): "refreshed" used to count every
  // served quote, including closed-market cache serves that made NO
  // upstream call. The report must distinguish an upstream WRITE from a
  // cache SERVE or the intraday coverage evidence is uninterpretable.
  it("closed-market serves are `served`, never counted as upstream writes (follow-up contract, written to fail first)", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue({
      quotes: Object.fromEntries(
        Object.keys(FAKE_STOCKS).map((s) => [s, { quote: { price: 1 }, state: "stale-served" }]),
      ),
    });
    const res = await POST(warmReq("?force=1"));
    const body = await res.json();
    expect(body.equities.upstreamWrites).toBe(0); // zero upstream calls happened
    expect(body.equities.served).toBe(10);
  });

  it("stale-revalidated rows (an upstream fetch + write this run) count as upstream writes", async () => {
    cachedQuoteBatchForEquitiesMock.mockResolvedValue({
      quotes: Object.fromEntries(
        Object.keys(FAKE_STOCKS).map((s, i) => [
          s,
          { quote: { price: 1 }, state: i === 0 ? "stale-revalidated" : "fresh" },
        ]),
      ),
    });
    const res = await POST(warmReq("?force=1"));
    const body = await res.json();
    expect(body.equities.upstreamWrites).toBe(1);
    expect(body.equities.served).toBe(10);
  });

  it("tiles ride slice 0 only, through serveQuote, with the canonical tile set", async () => {
    serveQuoteMock.mockResolvedValue({ price: 1, status: "CACHED" });
    await POST(warmReq("?slice=0&of=2"));
    const warmed = serveQuoteMock.mock.calls.map((c) => c[0]);
    expect(warmed.sort()).toEqual([...nonEquityTileSymbols()].sort());
    // determinism: same derivation every call (one source of truth, Rule 14)
    expect(nonEquityTileSymbols()).toEqual(nonEquityTileSymbols());
    const res2 = await POST(warmReq("?slice=1&of=2"));
    const body2 = await res2.json();
    expect(body2.tiles).toEqual({ skipped: "non-zero slice" });
  });

  it("tile misses are reported, not fabricated", async () => {
    serveQuoteMock.mockResolvedValue(null);
    const res = await POST(warmReq("?slice=0&of=2"));
    const body = await res.json();
    expect(body.tiles.upstreamWrites).toBe(0);
    expect(body.tiles.served).toBe(0);
    expect(body.tiles.misses).toBe(nonEquityTileSymbols().length);
  });

  it("tile serves count as upstream writes only when the row was revalidated (status LIVE)", async () => {
    const tiles = nonEquityTileSymbols();
    const firstTile = tiles[0];
    serveQuoteMock.mockImplementation(async (sym: string) =>
      sym === firstTile ? { price: 1, status: "LIVE" } : { price: 2, status: "CACHED" },
    );
    const res = await POST(warmReq("?slice=0&of=1")); // whole universe in slice 0; tiles ride slice 0
    const body = await res.json();
    expect(body.tiles.upstreamWrites).toBe(1);
    expect(body.tiles.served).toBe(tiles.length);
  });
});

describe("Y2 — the canonical tile-set derivation (quotePath.nonEquityTileSymbols)", () => {
  it("is exactly WORLD_MARKETS + TOP_CRYPTO + YAHOO_INDEX_SYMBOLS keys + GOLD", async () => {
    const { WORLD_MARKETS, TOP_CRYPTO } = await import("@/lib/dashboardSymbols");
    const { YAHOO_INDEX_SYMBOLS } = await import("@/lib/livePrice");
    const expected = new Set<string>([
      ...WORLD_MARKETS.map((m) => m.sym),
      ...TOP_CRYPTO.map((c) => c.symbol),
      ...Object.keys(YAHOO_INDEX_SYMBOLS),
      "GOLD",
    ]);
    expect(new Set(nonEquityTileSymbols())).toEqual(expected);
  });

  it("contains no NSE equity (it must not partition into the equity sweep)", () => {
    const tiles = nonEquityTileSymbols();
    for (const t of tiles) {
      expect(FAKE_STOCKS[t]).toBeUndefined();
    }
    expect(tiles).toContain("GOLD");
    expect(tiles).toContain("BTC");
    expect(tiles).toContain("NIFTY50");
  });
});
