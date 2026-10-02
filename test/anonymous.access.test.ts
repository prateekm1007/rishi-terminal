/**
 * Commit N1 (founder decision 2026-10-02: Portfolio Lab works without
 * sign-in) — the LAB-DATA anonymous surface.
 *
 * The parallel session (PR #46) opened chat + the personas roster + the
 * /lab page redirect; its quota mechanics are pinned by
 * test/chat.anonymous.test.ts. What remained walled — verified live on
 * production 2026-10-02 (docs/evidence/commit-n/production-baseline-pre-n.txt,
 * GET /api/rishis/RELIANCE -> 401) — was the verdict route the lab's
 * Intelligence and Compare tabs upgrade through. Without it, a signed-out
 * visitor's lab silently degraded to the bounded summary slice.
 *
 * This file pins that surface (each case failed on the pre-N1 tree):
 *   GET /api/rishis/[symbol], anonymous
 *     - 200 with the FULL verdict set + knowledge graph;
 *     - unknown symbol stays 404 (validation unchanged);
 *     - per-IP rate-limited (public compute, defense in depth);
 *     - the route no longer reads the session at all — the caller's
 *       identity cannot change the content.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  // Still mocked so a regression to a session read fails loudly below
  // (the "no session read" case asserts the mock is never called).
  getSessionUser: vi.fn(),
}));

// ── in-memory persistent limiter with forcible outcomes ────────────────────
const limiter: Map<string, number> = new Map();
const forced: Array<{ match: RegExp; result: "allowed" | "exhausted" }> = [];
const rpcLog: Array<{ fn: string; args: Record<string, unknown> }> = [];

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcLog.push({ fn, args: { ...args } });
      if (fn === "hit_rate_limit") {
        const key = String(args.p_key ?? "");
        const limit = Number(args.p_limit ?? 0);
        const force = forced.find((f) => f.match.test(key));
        if (force?.result === "exhausted") return { data: { allowed: false, count: limit + 1 }, error: null };
        const c = (limiter.get(key) ?? 0) + 1;
        limiter.set(key, c);
        return { data: { allowed: c <= limit, count: c }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return { ...actual, fetchLivePrice: async () => null };
});

import { GET as rishisGET } from "@/app/api/rishis/[symbol]/route";
import { getSessionUser } from "@/lib/auth/session";

function makeGetReq(ip?: string): never {
  const h: Record<string, string> = {};
  if (ip) h["x-forwarded-for"] = ip;
  return { headers: { get: (k: string) => h[k.toLowerCase()] ?? null } } as never;
}

beforeEach(() => {
  limiter.clear();
  forced.length = 0;
  rpcLog.length = 0;
  vi.mocked(getSessionUser).mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("N1 anonymous Portfolio-Lab data: GET /api/rishis/[symbol]", () => {
  it("MUST FAIL PRE-N1: anonymous -> 200 with the FULL verdict set + knowledge graph", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null as never);
    const res = await rishisGET(makeGetReq(), { params: Promise.resolve({ symbol: "RELIANCE" }) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      verdicts: unknown[];
      totalRishis: number;
      knowledgeGraph?: unknown;
    };
    expect(body.totalRishis).toBeGreaterThan(5);
    expect(body.verdicts.length).toBe(body.totalRishis);
    expect(body.knowledgeGraph).toBeDefined();
  });

  it("the route never reads the session — the caller's identity cannot change the content", async () => {
    await rishisGET(makeGetReq(), { params: Promise.resolve({ symbol: "TCS" }) });
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it("anonymous unknown symbol -> 404 (validation unchanged)", async () => {
    const res = await rishisGET(makeGetReq(), { params: Promise.resolve({ symbol: "ZZZZNOPE" }) });
    expect(res.status).toBe(404);
  });

  it("the route is per-IP rate-limited (public compute, defense in depth)", async () => {
    await rishisGET(makeGetReq("7.7.7.7"), { params: Promise.resolve({ symbol: "TCS" }) });
    const key = rpcLog.find(
      (c) => c.fn === "hit_rate_limit" && String(c.args.p_key).startsWith("rishis:verdicts:"),
    );
    expect(key).toBeDefined();

    // Forcing the limiter's verdict to "exhausted" must produce 429 — the
    // route honors the limiter, it does not just log it.
    forced.push({ match: /^rishis:verdicts:/, result: "exhausted" });
    const res = await rishisGET(makeGetReq("7.7.7.7"), { params: Promise.resolve({ symbol: "TCS" }) });
    expect(res.status).toBe(429);
  });
});
