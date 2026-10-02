/** R3 + Commits M3 + N1: per-Rishi verdicts are served ONLY through the
 *  server-enforced route — and under free access (founder decisions
 *  2026-10-02 + 2026-10-03) EVERY caller, signed in or not, receives the
 *  FULL verdict set (the Portfolio Lab's Intelligence/Compare tabs upgrade
 *  their bounded slice through this route — the lab needs no sign-in).
 *  There is no tier slice, no locked teaser, and no `tier` field on any
 *  of these wires anymore. The route is per-IP rate-limited for
 *  compute/abuse control. */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionUserMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => getSessionUserMock(),
}));

// Commit N1: the verdicts route is per-IP rate-limited through the
// persistent limiter; mock it allowed (its mechanics are pinned in
// test/anonymous.access.test.ts).
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
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
import { sanitizeConsensus } from "@/lib/consensus/sanitize";
import { STOCKS } from "@/data/stocks";
import { getStockScore } from "@/lib/scoring";
import { CANONICAL_PERSONAS } from "@/lib/chat/registry";

const route = (symbol: string) =>
  GET({ headers: { get: () => null } } as never, { params: Promise.resolve({ symbol }) });

beforeEach(() => {
  getSessionUserMock.mockReset();
});

describe("R3/M3/N1 — GET /api/rishis/[symbol]", () => {
  it("serves the FULL verdict set to ANONYMOUS callers (Commit N1: Portfolio Lab needs no sign-in)", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const res = await route("RELIANCE");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalRishis).toBe(20);
    expect(data.verdicts.length).toBe(data.totalRishis);
  });

  for (const legacyTier of ["seeker", "student", "disciple"]) {
    it(`${legacyTier}-equivalent session receives the FULL verdict set`, async () => {
      getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: legacyTier, tierExpiresAt: null });
      const res = await route("RELIANCE");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tier).toBeUndefined(); // no tier on the wire
      expect(data.totalRishis).toBe(20);
      expect(data.verdicts.length).toBe(data.totalRishis);
    });
  }

  it("404 for unknown symbols", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: null });
    const res = await route("NOT_A_TICKER");
    expect(res.status).toBe(404);
  });

  it("alias symbols resolve to the canonical row (T12)", async () => {
    getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: "student", tierExpiresAt: null });
    const res = await route("UNITECH"); // legacy alias, if present in the map
    if (res.status === 200) {
      const data = await res.json();
      expect(STOCKS[data.symbol]).toBeTruthy();
    }
  });
});

describe("R3/M3 — sanitizeConsensus carries every verdict", () => {
  it("returns the FULL verdict set and trims topBull/topBear to attribution fields", () => {
    const consensus = getStockScore(STOCKS.RELIANCE);
    const sanitized = sanitizeConsensus(consensus);
    expect(sanitized.verdicts.length).toBe(consensus.scores.length);
    expect(sanitized.scoresCount).toBe(consensus.scores.length);
    for (const field of ["consensus", "category", "tension", "tensionSpread", "scoresCount", "verdicts"] as const) {
      expect(field in sanitized).toBe(true);
    }
    expect(sanitized.topBull).not.toHaveProperty("comps");
    expect(sanitized.topBull).not.toHaveProperty("insight");
    expect(sanitized.topBull).toHaveProperty("name");
    expect(sanitized.topBull).toHaveProperty("score");
  });
});

describe("R3/M3 — GET /api/chat/personas", () => {
  it("serves the full roster WITHOUT sign-in (founder 2026-10-03: no auth gate)", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);
    const res = await personasGET({} as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.personas)).toBe(true);
    expect(data.personas.length).toBeGreaterThan(0);
    expect(data.tier).toBeUndefined(); // no tier on the wire
  });

  for (const legacyTier of ["seeker", "student", "disciple"]) {
    it(`${legacyTier}-equivalent session gets EVERY canonical persona (same roster for all)`, async () => {
      getSessionUserMock.mockResolvedValueOnce({ id: "u", email: "e", tier: legacyTier, tierExpiresAt: null });
      const res = await personasGET({} as never);
      const data = await res.json();
      expect(data.tier).toBeUndefined(); // no tier on the wire
      expect(data.personas.length).toBe(CANONICAL_PERSONAS.length);
      expect(new Set(data.personas.map((p: { id: string }) => p.id))).toEqual(
        new Set(CANONICAL_PERSONAS.map(p => p.id)),
      );
    });
  }
});

describe("R3/M3 — crypto/commodity scorers stay server-side (gurus port)", () => {
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

  it("GET /api/gurus?kind=crypto serves every verdict in full (no locked teasers)", async () => {
    const res = await gurusGET(new Request("http://test.local/api/gurus?kind=crypto") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBeUndefined(); // no tier on the wire
    expect(body.gurus.length).toBeGreaterThan(0);
    for (const g of body.gurus) {
      expect(g.locked).toBeUndefined();
      expect(typeof g.insight).toBe("string");
      expect(Array.isArray(g.comps)).toBe(true);
    }
  });

  it("GET /api/gurus?kind=commodity&symbol=GOLD serves non-Energy in full too", async () => {
    const res = await gurusGET(new Request("http://test.local/api/gurus?kind=commodity&symbol=GOLD") as never);
    const body = await res.json();
    expect(body.gurus.length).toBeGreaterThan(0);
    for (const g of body.gurus) {
      expect(g.locked).toBeUndefined();
      expect(typeof g.insight).toBe("string");
      expect(Array.isArray(g.comps)).toBe(true);
    }
  });

  it("GET /api/gurus?kind=commodity list mode has no locked categories", async () => {
    const res = await gurusGET(new Request("http://test.local/api/gurus?kind=commodity") as never);
    const body = await res.json();
    expect(body.commodities.length).toBeGreaterThan(0);
    for (const c of body.commodities) {
      expect(c.locked).toBeUndefined();
      expect(c.gurus.length).toBeGreaterThan(0);
    }
  });
});
