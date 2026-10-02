import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Coder Directions 2026-10-02 §14 — /api/gurus null semantics (dedicated
 * defect). Rule 21: written and run BEFORE the fix (raw RED output in the
 * PR description).
 *
 * The defect: an upstream live price that discloses NO change observation
 * was converted to a fabricated 0% move — the verdicts were then computed
 * (and their insight strings rendered) on a no-move market the upstream
 * never reported. Rule 16: unavailable is null; the scorer input must fall
 * back to the SEED's recorded change (a real, honestly-stale observation),
 * exactly as price already does.
 *
 * fetchLivePrice is mocked AT THE MODULE BOUNDARY: the transport-level
 * `Number(x) || 0` fabrications (lib/livePrice.ts CoinGecko/Yahoo parsing)
 * are the §12/§13 defect family — this test pins the ROUTE's contract so
 * the route is already honest when that round lands.
 */

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: vi.fn(),
  };
});

// The session read is telemetry-only under free access (the route's own
// contract) — stubbed so the route handler runs outside a Next request
// store, exactly like test/freeAccess.contract.test.ts does.
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => null),
}));

import { fetchLivePrice } from "@/lib/livePrice";
import { GET as gurusGET } from "@/app/api/gurus/route";
import type { PricePoint } from "@/lib/livePrice";

const mockedFetchLivePrice = vi.mocked(fetchLivePrice);

function makeGetReq(url: string): never {
  return { headers: { get: () => null }, url } as never;
}

function point(overrides: Partial<PricePoint & { lastUpdated: string | null }>): PricePoint & { lastUpdated: string | null } {
  return {
    price: 99000,
    change: NaN, // the honest "no change disclosed" transport shape (§13 will thread null)
    source: "coingecko",
    status: "LIVE",
    observedAt: "2026-10-02T07:00:00.000Z",
    volume24h: null,
    lastUpdated: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockedFetchLivePrice.mockReset();
});

describe("§14 /api/gurus — unavailable change is NEVER a fabricated 0%", () => {
  it("crypto: a live price with no disclosed change falls back to the SEED change, not 0 (RED: rendered '+0.00%')", async () => {
    // BTC live price present, change NOT disclosed (NaN — what an honest
    // transport passes through for a missing datum).
    mockedFetchLivePrice.mockImplementation(async (symbol: string) =>
      symbol === "BTC" ? point({ price: 99000, change: NaN }) : symbol === "ETH" ? point({ price: 3900, change: NaN }) : null,
    );

    const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=crypto"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      gurus: Array<{ id: string; insight: string; comps: Array<{ detail: string }> }>;
    };

    // No verdict anywhere claims a 0.00% move (the fabricated no-move).
    const allText = body.gurus.map((g) => [g.insight, ...g.comps.map((c) => c.detail)].join(" | ")).join(" || ");
    expect(allText).not.toContain("0.00%");

    // The BTC gurus used the SEED's recorded 24h change (BTC seed: 2.45%).
    const satoshi = body.gurus.find((g) => g.id === "satoshi");
    expect(satoshi?.insight).toContain("2.45%");
  });

  it("crypto: a DISCLOSED live change is used as-is (no regression)", async () => {
    mockedFetchLivePrice.mockImplementation(async (symbol: string) =>
      symbol === "BTC" ? point({ price: 99000, change: -1.25 }) : symbol === "ETH" ? point({ price: 3900, change: 0.5 }) : null,
    );
    const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=crypto"));
    const body = (await res.json()) as { gurus: Array<{ id: string; insight: string }> };
    const satoshi = body.gurus.find((g) => g.id === "satoshi");
    expect(satoshi?.insight).toContain("-1.25%");
  });

  it("commodity detail: a live price with no disclosed change falls back to the SEED changePct, never 0", async () => {
    // GOLD live price present, change not disclosed. The seed's recorded
    // changePct must drive the momentum wording — not a flat 0.
    mockedFetchLivePrice.mockImplementation(async () => point({ price: 2650, change: NaN }));

    const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=commodity&symbol=GOLD"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      gurus: Array<{ id: string; comps: Array<{ label: string; detail: string }> }>;
    };
    const allDetails = body.gurus.flatMap((g) => g.comps.map((c) => c.detail)).join(" | ");
    // The fabricated flat move:
    expect(allDetails).not.toMatch(/\+0\.00% move/);
  });

  it("commodity list: averages stay null-safe (no fabricated 0 scores from missing change)", async () => {
    mockedFetchLivePrice.mockImplementation(async () => point({ price: 2650, change: NaN }));
    const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=commodity"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      commodities: Array<{ symbol: string; avg: number | null; gurus: Array<{ score: number | null }> }>;
    };
    expect(body.commodities.length).toBeGreaterThan(0);
    // T11 contract preserved: insufficient data is null, never 0.
    for (const c of body.commodities) {
      if (c.avg === null) continue;
      expect(c.avg).toBeGreaterThan(0);
    }
  });
});
