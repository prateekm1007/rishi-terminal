/**
 * ISR60 (founder round-55 order, 13 Oct 2026) — the stock page must
 * UPDATE within 60 seconds: the warmer's minute tick refreshes a small
 * key set EVERY tick, revalidates those stock pages, and re-renders them
 * within the same tick (the self-ping), so the served HTML can never sit
 * un-regenerated the way /stock/SBIN did on 13 Oct (age 1591, observation
 * 29 minutes old in an open session — the live probe's 4 FAIL legs).
 *
 * Wire contracts pinned here:
 *   1. rotate=1: the slice is the UTC minute-of-hour modulo `of` — a
 *      minute-cadence scheduler with of=15 sweeps the whole universe
 *      every 15 minutes at the SAME upstream volume as the retired
 *      6-slices-every-15-min command, spread evenly. Deterministic.
 *   2. rotate and an explicit slice are mutually exclusive -> 400
 *      (a caller that asks for both has a broken command; refuse, do not
 *      guess which one it meant — Rule 6).
 *   3. The quick set (quotePath.quickRefreshSymbols — ONE derivation,
 *      Rule 14) is warmed on EVERY invocation, whatever the slice, so the
 *      minute tick refreshes it every 60 s.
 *   4. Every quick-set stock page is revalidated (revalidatePath) and
 *      re-rendered by a same-tick self-ping; per-page outcomes are
 *      disclosed in the response — a failed ping is reported, never
 *      swallowed and never counted as refreshed.
 *   5. The post-deploy probe's stock symbols are a SUBSET of the quick
 *      set (the probe's open-session freshness rule must hold with
 *      margin on exactly the pages it checks — the mirror discipline the
 *      probe itself uses for the NSE bounds).
 *   6. The market-closed no-op is unchanged: no quick warm, no
 *      revalidation, no ping (pages honestly go stale overnight).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

const marketStateMock = vi.fn();
const cachedQuoteBatchForEquitiesMock = vi.fn();
const serveQuoteMock = vi.fn();
const logIngestionMock = vi.fn();
const revalidatePathMock = vi.fn();
const pageFetchMock = vi.fn();

// TODAY-NIFTY: the verdicts step imports istParts (the IST calendar
// date for the candidate-set cache + refusal backoff) — the REAL pure
// function rides through (only marketState is clock-mocked).
vi.mock("@/lib/marketHours", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marketHours")>();
  return {
    ...actual,
    marketState: (...a: unknown[]) => marketStateMock(...a),
  };
});

vi.mock("@/lib/services/ingestion", () => ({
  logIngestion: (...a: unknown[]) => logIngestionMock(...a),
}));

vi.mock("@/lib/quotePath", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quotePath")>();
  return {
    ...actual,
    cachedQuoteBatchForEquities: (...a: unknown[]) => cachedQuoteBatchForEquitiesMock(...a),
    serveQuote: (...a: unknown[]) => serveQuoteMock(...a),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...a: unknown[]) => revalidatePathMock(...a),
}));

// Ten fake registry symbols — the same partitioning fixture as
// y2.quoteWarm.test.ts, so slice math is directly comparable — PLUS the
// ISR60 quick set (the route guards quick-set membership against the
// registry, so the fake registry must carry them for the warm legs to
// exercise the real path).
const FAKE_STOCKS = vi.hoisted(() =>
  Object.fromEntries(
    [
      "AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", "III", "JJJ",
      "RELIANCE", "SBIN", "BANKBARODA", "TCS", "INFY", "ITC", "HDFCBANK",
    ].map((s) => [s, { symbol: s }]),
  ),
);

vi.mock("@/data/stocks", () => ({ STOCKS: FAKE_STOCKS }));

import { POST } from "@/app/api/ingest/quotes-warm/route";
import { quickRefreshSymbols } from "@/lib/quotePath";

const SECRET = "isr60-warm-test-secret";

function warmReq(query = "", bearer: string | null = `Bearer ${SECRET}`): never {
  return {
    nextUrl: new URL(`https://terminal.test/api/ingest/quotes-warm${query}`),
    headers: { get: (k: string) => (k.toLowerCase() === "authorization" ? bearer : null) },
  } as never;
}

function openMarket() {
  return { open: true, ttlSeconds: 60, freshness: "live-delayed" as const, sessionDate: "2026-10-13" };
}
function closedMarket() {
  return { open: false, ttlSeconds: null, freshness: "close" as const, sessionDate: "2026-10-10" };
}

beforeEach(() => {
  marketStateMock.mockReset();
  cachedQuoteBatchForEquitiesMock.mockReset();
  serveQuoteMock.mockReset();
  logIngestionMock.mockReset();
  revalidatePathMock.mockReset();
  pageFetchMock.mockReset();
  process.env.QUOTES_WARM_SECRET = SECRET;
  marketStateMock.mockReturnValue(openMarket());
  cachedQuoteBatchForEquitiesMock.mockResolvedValue({ quotes: {} });
  serveQuoteMock.mockResolvedValue(null);
  pageFetchMock.mockResolvedValue({ status: 200 });
  vi.stubGlobal("fetch", pageFetchMock);
  // A fixed wall clock: 2026-10-13 09:07:30 UTC -> minute-of-hour 7.
  vi.useFakeTimers({ now: new Date("2026-10-13T09:07:30.000Z"), toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ISR60 — the quick set (one derivation, probe-covered)", () => {
  it("quickRefreshSymbols includes every post-deploy-probe stock symbol (SBIN, BANKBARODA, RELIANCE)", () => {
    // Mirror discipline (the probe is a plain .mjs that cannot be
    // imported): these three are postDeploySmoke.mjs's PAGES +
    // SEEDLEAK_SYMBOL. If the probe ever adds a symbol, this leg and the
    // probe must move together.
    for (const sym of ["RELIANCE", "SBIN", "BANKBARODA"]) {
      expect(quickRefreshSymbols()).toContain(sym);
    }
  });

  it("quickRefreshSymbols entries are real registry symbols and unique", async () => {
    // The REAL registry (not the fake): the quick set must survive the
    // route's membership guard in production, so every entry has to be a
    // genuine STOCKS key.
    const { STOCKS: REAL_STOCKS } =
      await vi.importActual<typeof import("@/data/stocks")>("@/data/stocks");
    const set = quickRefreshSymbols();
    expect(new Set(set).size).toBe(set.length);
    for (const sym of set) {
      expect(REAL_STOCKS[sym], `${sym} must be a real registry symbol`).toBeDefined();
    }
  });
});

describe("ISR60 — rotate (deterministic slice from the UTC minute)", () => {
  it("rotate=1&of=3 at minute 7 -> slice 7 % 3 = 1, disclosed in the response", async () => {
    const res = await POST(warmReq("?rotate=1&of=3"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slice).toBe(1);
    expect(body.of).toBe(3);
    expect(body.rotated).toBe(true);
    // the symbols warmed are exactly the i % 3 === 1 partition, PLUS the
    // quick set (warmed every invocation):
    const warmed: string[] = cachedQuoteBatchForEquitiesMock.mock.calls
      .map((c) => c[0] as string[])
      .flat();
    expect(warmed).toContain("BBB"); // index 1
    expect(warmed).not.toContain("AAA"); // index 0
    expect(warmed).not.toContain("CCC"); // index 2
  });

  it("rotate=1&of=15 at minute 7 -> slice 7 (the production shape: universe every 15 min)", async () => {
    const res = await POST(warmReq("?rotate=1&of=15"));
    const body = await res.json();
    expect(body.slice).toBe(7);
  });

  it("rotate=1 with an explicit slice is refused: 400, nothing warmed", async () => {
    const res = await POST(warmReq("?rotate=1&slice=2&of=3"));
    expect(res.status).toBe(400);
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(pageFetchMock).not.toHaveBeenCalled();
  });

  it("without rotate, slice=k still works exactly as before (the external scheduler path)", async () => {
    const res = await POST(warmReq("?slice=2&of=3"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slice).toBe(2);
    expect(body.rotated).toBeFalsy();
  });
});

describe("ISR60 — the quick set warms, revalidates and re-renders every tick", () => {
  it("the quick set is warmed on EVERY invocation, in addition to the slice", async () => {
    await POST(warmReq("?rotate=1&of=15"));
    const batches = cachedQuoteBatchForEquitiesMock.mock.calls.map((c) => c[0] as string[]);
    // one slice batch + one quick batch (the quick set may overlap the
    // slice; it is still claimed separately so its rows refresh every
    // tick whatever the rotation):
    const quick = quickRefreshSymbols();
    const quickBatch = batches.find((b) => b.length === quick.length && quick.every((s) => b.includes(s)));
    expect(quickBatch).toBeDefined();
  });

  it("every quick-set page is revalidated (revalidatePath) and self-pinged, outcomes disclosed", async () => {
    const res = await POST(warmReq("?rotate=1&of=15"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const quick = quickRefreshSymbols();
    for (const sym of quick) {
      expect(revalidatePathMock).toHaveBeenCalledWith(`/stock/${sym}`);
    }
    // LIVE-TODAY (round 56): the homepage joins the revalidate/ping set —
    // the Today view's movers panels ride the same 60 s contract as the
    // quick-set stock pages.
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
    for (const sym of quick) {
      const called = pageFetchMock.mock.calls.some(
        (c) => String(c[0]) === `https://terminal.test/stock/${sym}`,
      );
      expect(called, `the ping must re-render /stock/${sym}`).toBe(true);
    }
    expect(
      pageFetchMock.mock.calls.some((c) => String(c[0]) === "https://terminal.test/"),
      "the ping must re-render the homepage (movers panels)",
    ).toBe(true);
    expect(body.isr60.pages).toBeDefined();
    // The outcomes map is PATH-keyed (self-describing: "/stock/RELIANCE",
    // "/") — the contract this pin moved with in LIVE-TODAY.
    for (const sym of quick) {
      expect(body.isr60.pages[`/stock/${sym}`]).toBe(200);
    }
    expect(body.isr60.pages["/"]).toBe(200);
    expect(body.isr60.revalidated).toBe(quick.length + 1);
  });

  it("a failed ping is DISCLOSED, not swallowed and not counted as refreshed", async () => {
    pageFetchMock.mockRejectedValue(new Error("edge timeout"));
    const res = await POST(warmReq("?rotate=1&of=15"));
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const sym of quickRefreshSymbols()) {
      expect(String(body.isr60.pages[`/stock/${sym}`])).toContain("edge timeout");
    }
    expect(String(body.isr60.pages["/"])).toContain("edge timeout");
    expect(body.isr60.pagesRendered).toBe(0);
  });

  it("the ping carries no-store so the re-render reads the just-written rows", async () => {
    await POST(warmReq("?rotate=1&of=15"));
    for (const call of pageFetchMock.mock.calls) {
      const init = call[1] as { cache?: string } | undefined;
      expect(init?.cache).toBe("no-store");
    }
  });
});

describe("ISR60 — the market-closed no-op is unchanged", () => {
  it("closed market: no quick warm, no revalidation, no ping, no ingestion row", async () => {
    marketStateMock.mockReturnValue(closedMarket());
    const res = await POST(warmReq("?rotate=1&of=15"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("market closed");
    expect(cachedQuoteBatchForEquitiesMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(pageFetchMock).not.toHaveBeenCalled();
    expect(logIngestionMock).not.toHaveBeenCalled();
  });
});
