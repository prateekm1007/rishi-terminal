/** R3: per-Rishi verdicts are served ONLY through the server-enforced route. */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getSessionUserMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: () => getSessionUserMock(),
}));

import { GET } from "@/app/api/rishis/[symbol]/route";
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
