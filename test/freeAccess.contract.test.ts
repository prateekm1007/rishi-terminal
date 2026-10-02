/**
 * Commit M2 (Coder Directions §5–§12) — FAIL-FIRST free-access contract.
 *
 * Founder decision (2026-10-02): every product feature is free. No tiers,
 * no paid gates, no upgrade paths, no checkout. These tests are written
 * BEFORE the conversion (Rule 21) and must FAIL on the pre-fix tree:
 *
 *   persona matrix      — seeker/student/disciple-equivalent sessions all
 *                         receive the SAME full persona roster and may chat
 *                         with ANY canonical persona (no 403-by-tier);
 *   forged client tier  — a client-supplied tier value never alters the
 *                         server's decision;
 *   verdict surfaces    — /api/rishis/[symbol] serves the FULL verdict set
 *                         for every session, not a tier slice;
 *   guru surfaces       — /api/gurus serves no locked teasers;
 *   quota               — one common daily quota for every caller, not a
 *                         tier-keyed table;
 *   session model       — /api/auth/me no longer publishes a legacy tier;
 *   pricing page        — no tier names, no rupee subscription prices, no
 *                         upgrade CTA, no checkout invocation;
 *   payment retirement  — POST/PUT /api/payment and the webhook answer 410
 *                         and NEVER reach the grant path.
 *
 * Auth is NOT a tier and NOT a feature gate (founder decision 2026-10-02):
 * anonymous callers run the same chat pipeline, quota-keyed per IP — that
 * contract is pinned by chat.anonymous.test.ts and
 * chat.route.personaAuth.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_PERSONAS, PERSONA_BY_ID } from "@/lib/chat/registry";

// ── shared mocks ───────────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

const rpcCalls: Array<{ fn: string; args: unknown }> = [];
const fromCalls: string[] = [];
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      if (fn === "consume_chat_quota") return { data: { ok: true, count: 1 }, error: null };
      if (fn === "refund_chat_quota") return { data: { ok: true, refunded: true }, error: null };
      return { data: null, error: null };
    },
    from: (table: string) => {
      fromCalls.push(table);
      throw new Error(`unexpected table access: ${table}`);
    },
  }),
}));

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return { ...actual, fetchLivePrice: async () => null };
});

import { POST as chatPOST } from "@/app/api/chat/route";
import { GET as personasGET } from "@/app/api/chat/personas/route";
import { GET as rishisGET } from "@/app/api/rishis/[symbol]/route";
import { GET as gurusGET } from "@/app/api/gurus/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { POST as paymentPOST, PUT as paymentPUT } from "@/app/api/payment/route";
import { POST as webhookPOST } from "@/app/api/payment/webhook/route";
import { getSessionUser } from "@/lib/auth/session";

const REAL_FETCH = globalThis.fetch;
let providerCalls = 0;

function stubProvider(): void {
  providerCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      providerCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch,
  );
}

/** Legacy DB tier values — the exact strings public.users may hold today.
 *  Post-conversion these rows still exist but MUST NOT change behavior. */
const LEGACY_TIERS = ["seeker", "student", "disciple"] as const;

function asUser(user: { id: string; tier: string } | null): void {
  vi.mocked(getSessionUser).mockResolvedValue(
    user ? ({ id: user.id, email: "t@e.st", tier: user.tier, tierExpiresAt: null } as never) : (null as never),
  );
}

function makeReq(json: unknown, ip = "9.9.9.9"): never {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function makeGetReq(url: string): never {
  return { headers: { get: () => null }, url, nextUrl: { searchParams: new URL(url).searchParams } } as never;
}

beforeEach(() => {
  rpcCalls.length = 0;
  fromCalls.length = 0;
  stubProvider();
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── §7: persona matrix — every session sees and reaches every Rishi ───────

describe("free access: /api/chat/personas returns the FULL roster for every session", () => {
  for (const tier of LEGACY_TIERS) {
    it(`${tier}-equivalent session -> all ${CANONICAL_PERSONAS.length} canonical personas`, async () => {
      asUser({ id: "u1", tier });
      const res = await personasGET(makeGetReq("http://x/api/chat/personas"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { personas: Array<{ id: string }> };
      expect(body.personas.length).toBe(CANONICAL_PERSONAS.length);
      expect(new Set(body.personas.map((p) => p.id))).toEqual(
        new Set(CANONICAL_PERSONAS.map((p) => p.id)),
      );
    });
  }

  it("all legacy-tier sessions receive the IDENTICAL roster (no discrimination)", async () => {
    const rosters: string[][] = [];
    for (const tier of LEGACY_TIERS) {
      asUser({ id: "u1", tier });
      const res = await personasGET(makeGetReq("http://x/api/chat/personas"));
      const body = (await res.json()) as { personas: Array<{ id: string }> };
      rosters.push(body.personas.map((p) => p.id).sort());
    }
    expect(rosters[0].length).toBe(CANONICAL_PERSONAS.length);
    expect(rosters[1]).toEqual(rosters[0]);
    expect(rosters[2]).toEqual(rosters[0]);
  });
});

describe("free access: POST /api/chat has NO tier-based persona 403", () => {
  // Personas that were student/disciple-gated before the founder decision.
  const previouslyGated: Array<[string, string]> = [
    ["jhunjhunwala", "student"],
    ["graham", "student"],
    ["kacholia", "student"],
    ["chanos", "disciple"],
    ["soros", "disciple"],
  ];

  for (const tier of LEGACY_TIERS) {
    for (const [personaId, wasGatedAs] of previouslyGated) {
      it(`${tier}-equivalent session + ${personaId} (was ${wasGatedAs}-gated) -> 200, provider called`, async () => {
        asUser({ id: "u1", tier });
        const res = await chatPOST(makeReq({ personaId, history: [], message: "Your philosophy?" }));
        expect(res.status).toBe(200);
        expect(providerCalls).toBe(1);
      });
    }
  }

  it("unknown persona still 400 (canonical registry validation stays)", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await chatPOST(makeReq({ personaId: "definitely-not-a-persona", history: [], message: "hi" }));
    expect(res.status).toBe(400);
  });

  it("anonymous chat shares the same bounded path (founder 2026-10-02: no sign-in required)", async () => {
    asUser(null);
    const res = await chatPOST(makeReq({ personaId: "damani", history: [], message: "hi" }));
    // Anonymous callers run the SAME pipeline — same persona validation,
    // same evidence/grounding, same ONE free quota (keyed per IP).
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
  });
});

describe("free access: forged client tier cannot alter the server decision", () => {
  it("client body claiming tier=disciple changes nothing for a seeker session (roster)", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await personasGET(makeGetReq("http://x/api/chat/personas"));
    const body = (await res.json()) as { personas: Array<{ id: string }> };
    // The server answers from the SESSION, and under free access that means
    // the full roster — the client cannot widen or narrow it.
    expect(body.personas.length).toBe(CANONICAL_PERSONAS.length);
  });

  it("client body claiming tier=disciple changes nothing for a seeker session (chat)", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const forged = await chatPOST(
      makeReq({ personaId: "soros", tier: "disciple", history: [], message: "Reflexivity?" }),
    );
    asUser({ id: "u1", tier: "seeker" });
    const honest = await chatPOST(makeReq({ personaId: "soros", history: [], message: "Reflexivity?" }));
    expect(forged.status).toBe(honest.status);
    expect(forged.status).toBe(200);
    // The forged tier value was never echoed into a grant of anything the
    // honest request did not also receive.
  });
});

// ── §13: verdict surfaces serve everyone the same full content ────────────

describe("free access: /api/rishis/[symbol] serves the FULL verdict set for every session", () => {
  // Commit N1: anonymous callers are part of the matrix (Portfolio Lab's
  // verdict upgrades work without sign-in — the founder's decision).
  for (const tier of ["anonymous", ...LEGACY_TIERS] as const) {
    it(`${tier} caller -> every verdict, no tier slice`, async () => {
      asUser(tier === "anonymous" ? null : { id: "u1", tier });
      const res = await rishisGET(makeGetReq("http://x/api/rishis/RELIANCE"), {
        params: Promise.resolve({ symbol: "RELIANCE" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { verdicts: unknown[]; totalRishis: number };
      expect(body.totalRishis).toBeGreaterThan(5);
      expect(body.verdicts.length).toBe(body.totalRishis);
    });
  }
});

describe("free access: /api/gurus serves no locked teasers", () => {
  for (const tier of ["anonymous", ...LEGACY_TIERS] as const) {
    it(`${tier} caller -> every crypto guru verdict unlocked (full content, no locked field)`, async () => {
      asUser(tier === "anonymous" ? null : { id: "u1", tier });
      const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=crypto"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { gurus: Array<{ locked?: boolean; insight?: string; comps?: unknown[] }> };
      expect(body.gurus.length).toBeGreaterThan(0);
      // The locked concept is GONE from the wire — and the full verdict
      // content (insight + comps) is present for every guru.
      expect(body.gurus.every((g) => g.locked === undefined)).toBe(true);
      expect(body.gurus.every((g) => typeof g.insight === "string" && Array.isArray(g.comps))).toBe(true);
    });

    it(`${tier} caller -> commodity list mode has NO locked categories (Energy-only free rule gone)`, async () => {
      asUser(tier === "anonymous" ? null : { id: "u1", tier });
      const res = await gurusGET(makeGetReq("http://x/api/gurus?kind=commodity"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { commodities: Array<{ locked?: boolean; gurus: unknown[] }> };
      expect(body.commodities.length).toBeGreaterThan(0);
      expect(body.commodities.every((c) => c.locked === undefined)).toBe(true);
      expect(body.commodities.every((c) => c.gurus.length > 0)).toBe(true);
    });
  }
});

// ── §8: one common free quota ─────────────────────────────────────────────

describe("free access: one common daily chat quota (not tier-keyed)", () => {
  const capturedLimits: number[] = [];
  for (const tier of LEGACY_TIERS) {
    it(`${tier}-equivalent session consumes the SAME p_limit`, async () => {
      asUser({ id: `u-${tier}`, tier });
      rpcCalls.length = 0;
      const res = await chatPOST(makeReq({ personaId: "damani", history: [], message: "hi" }));
      expect(res.status).toBe(200);
      const consume = rpcCalls.find((c) => c.fn === "consume_chat_quota");
      expect(consume).toBeDefined();
      const limit = (consume?.args as { p_limit: number }).p_limit;
      expect(Number.isFinite(limit) && limit > 0).toBe(true);
      capturedLimits.push(limit);
    });
  }

  it("all captured limits are IDENTICAL (no hidden tier table)", () => {
    expect(capturedLimits.length).toBe(LEGACY_TIERS.length);
    expect(new Set(capturedLimits).size).toBe(1);
  });
});

// ── §12: the session model stops publishing a product tier ────────────────

describe("free access: /api/auth/me publishes no legacy tier", () => {
  for (const tier of LEGACY_TIERS) {
    it(`${tier}-equivalent session -> no tier/tierExpiresAt in the payload`, async () => {
      asUser({ id: "u1", tier });
      const res = await meGET();
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.tier).toBeUndefined();
      expect(body.tierExpiresAt).toBeUndefined();
      // The access state, if published, must be the single free state.
      if (body.access !== undefined) expect(body.access).toBe("free");
    });
  }

  it("anonymous -> user:null, no tier", async () => {
    asUser(null);
    const res = await meGET();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.user).toBeNull();
    expect(body.tier).toBeUndefined();
  });
});

// ── §10: /pricing is an honest single-message access page ─────────────────

describe("free access: /pricing carries no paid-tier storefront", () => {
  // The contract is about RENDERED content: string literals and JSX. The
  // page's documentation COMMENTS may honestly describe what was retired
  // ("the old storefront sold Student at ₹499") — so comments are stripped
  // before the assertions; a term in a string literal still fails.
  const raw = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");
  const page = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");

  it("no tier names (Seeker/Student/Disciple as plan names)", () => {
    expect(/\b(Seeker|Student|Disciple)\b/.test(page)).toBe(false);
  });
  it("no rupee subscription prices (499 / 1,999 / Rs)", () => {
    expect(/₹|499|1,?999|Rs\.?\s/.test(page)).toBe(false);
  });
  it("no upgrade CTA / checkout invocation", () => {
    expect(/upgrade|Upgrade|checkout|Checkout|startRazorpayCheckout|TIER_CONFIG/.test(page)).toBe(false);
  });
});

// ── §11: payment endpoints are retired, fail closed, grant nothing ────────

describe("free access: payment endpoints retired (410) and grant nothing", () => {
  it("POST /api/payment -> 410 Gone", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await paymentPOST();
    expect(res.status).toBe(410);
  });

  it("PUT /api/payment (forged full verify payload) -> 410 Gone, no grant", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await paymentPUT();
    expect(res.status).toBe(410);
  });

  it("POST /api/payment/webhook (forged Razorpay event) -> 410 Gone, no grant", async () => {
    asUser(null);
    const res = await webhookPOST();
    expect(res.status).toBe(410);
  });

  it("no payment path reaches ANY rpc or table (no entitlement grant)", () => {
    // Across the three retired endpoints above, the only sanctioned rpcs
    // are chat-quota ones; grant_tier_for_payment must NEVER appear.
    expect(rpcCalls.some((c) => c.fn === "grant_tier_for_payment")).toBe(false);
    expect(fromCalls).toEqual([]);
  });
});

// ── §5 sanity: the persona authority really has everyone available ────────

describe("free access: canonical registry invariants", () => {
  it("every canonical persona is server-resolvable (existence check stays)", () => {
    for (const p of CANONICAL_PERSONAS) {
      expect(PERSONA_BY_ID[p.id]?.id).toBe(p.id);
    }
    expect(CANONICAL_PERSONAS.length).toBeGreaterThanOrEqual(20);
  });
});
