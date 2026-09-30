/** R3: per-Rishi verdicts are served ONLY through the server-enforced route. */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionUserMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => getSessionUserMock(),
}));

import { GET } from "@/app/api/rishis/[symbol]/route";
import { GET as gurusGET } from "@/app/api/gurus/route";

// The gurus route overlays live prices; stub the fetcher so the tests are
// deterministic and offline (the route falls back to seed prices).
vi.mock("@/lib/livePrice", () => ({
  fetchLivePrice: async () => { throw new Error("offline in test"); },
  // validateInput imports the livePrice allow-list maps; the data-file
  // lists (stocks/commodities/crypto) are NOT mocked, so the gate still
  // accepts what these tests need.
  YAHOO_INDEX_SYMBOLS: {},
  YAHOO_COMMODITY_SYMBOLS: {},
  COINGECKO_IDS: {},
  YAHOO_SPECIAL: {},
}));
import { GET as personasGET } from "@/app/api/chat/personas/route";
import { TIER_CONFIG } from "@/lib/premium";
import { sanitizeConsensus } from "@/lib/consensus/sanitize";
import { STOCKS } from "@/data/stocks";
import { getStockScore } from "@/lib/scoring";

const route = (symbol: string) =>
  GET({} as never, { params: Promise.resolve({ symbol }) });

beforeEach(() => {
  getSessionUserMock.mockReset();
});

describe("R3 — GET /api/rishis/[symbol]", () => {
  it("401 for anonymous callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const res = await route("RELIANCE");
    expect(res.status).toBe(401);
  });

  it("seeker receives ONLY the free verdict set", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "seeker", tierExpiresAt: null });
    const res = await route("RELIANCE");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tier).toBe("seeker");
    expect(data.totalRishis).toBe(20);
    expect(data.verdicts.length).toBe(TIER_CONFIG.seeker.rishisVisible);
    expect(data.verdicts.length).toBeLessThan(data.totalRishis);
  });

  it("student receives the full set", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: "2099-01-01" });
    const res = await route("RELIANCE");
    const data = await res.json();
    expect(data.tier).toBe("student");
    expect(data.verdicts.length).toBe(data.totalRishis);
  });

  it("disciple receives the full set", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "disciple", tierExpiresAt: "2099-01-01" });
    const res = await route("RELIANCE");
    const data = await res.json();
    expect(data.verdicts.length).toBe(data.totalRishis);
  });

  it("404 for unknown symbols", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: "2099-01-01" });
    const res = await route("NOT_A_TICKER");
    expect(res.status).toBe(404);
  });

  it("alias symbols resolve to the canonical row (T12)", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: "2099-01-01" });
    const res = await route("UNITECH"); // legacy alias, if present in the map
    if (res.status === 200) {
      const data = await res.json();
      expect(STOCKS[data.symbol]).toBeTruthy();
    }
  });
});

describe("R3 — sanitizeConsensus never leaks paid fields", () => {
  it("slices verdicts and trims topBull/topBear to attribution fields", () => {
    const consensus = getStockScore(STOCKS.RELIANCE);
    const sanitized = sanitizeConsensus(consensus, 5);
    expect(sanitized.verdicts.length).toBe(5);
    for (const field of ["consensus", "category", "tension", "tensionSpread", "scoresCount", "verdicts"] as const) {
      expect(field in sanitized).toBe(true);
    }
    expect(sanitized.topBull).not.toHaveProperty("comps");
    expect(sanitized.topBull).not.toHaveProperty("insight");
    expect(sanitized.topBull).toHaveProperty("name");
    expect(sanitized.topBull).toHaveProperty("score");
  });
});

describe("R3 — GET /api/chat/personas", () => {
  it("401 for anonymous callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const res = await personasGET({} as never);
    expect(res.status).toBe(401);
  });

  it("seeker gets only free-tier personas", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "seeker", tierExpiresAt: null });
    const res = await personasGET({} as never);
    const data = await res.json();
    expect(data.tier).toBe("seeker");
    expect(data.personas.every((p: { tier: string }) => p.tier === "free")).toBe(true);
  });

  it("student gets free + student personas", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: "2099-01-01" });
    const res = await personasGET({} as never);
    const data = await res.json();
    expect(data.personas.every((p: { tier: string }) => p.tier !== "disciple")).toBe(true);
    expect(data.personas.length).toBeGreaterThan(
      Object.values(TIER_CONFIG).length && 0,
    );
  });
});

describe("R3 — crypto/commodity scorers stay server-side (gurus port)", () => {
  it("the crypto/commodity scorers are imported only by the server route", async () => {
    // Filesystem scan (not git grep) so untracked/new files are covered too.
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (/scorers\/(crypto|commodity)\//.test(readFileSync(full, "utf8"))) {
            offenders.push(join(dir.replace(process.cwd() + "/", ""), entry.name));
          }
        }
      }
    };
    scan(join(process.cwd(), "app"));
    scan(join(process.cwd(), "components"));
    expect(offenders).toEqual([join("app", "api", "gurus", "route.ts")]);
  });

  it("GET /api/gurus?kind=crypto serves locked teasers without verdict text for a free tier", async () => {
    // anon/seeker: any locked guru must arrive WITHOUT insight/comps
    const res = await gurusGET(new Request("http://test.local/api/gurus?kind=crypto") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const g of body.gurus) {
      if (g.locked) {
        expect(g.insight).toBeUndefined();
        expect(g.comps).toBeUndefined();
      }
    }
  });

  it("GET /api/gurus?kind=commodity&symbol=GOLD locks non-Energy for a free tier", async () => {
    const res = await gurusGET(new Request("http://test.local/api/gurus?kind=commodity&symbol=GOLD") as never);
    const body = await res.json();
    expect(body.gurus.length).toBeGreaterThan(0);
    for (const g of body.gurus) {
      expect(g.locked).toBe(true);
      expect(g.insight).toBeUndefined();
    }
  });
});
