/**
 * /api/chat POST persona validation — Commit M3 (free access).
 *
 * History: audit 2026-10-02 (P0) found the route resolved personas with NO
 * check at all; the fix added a tier-entitlement 403 (seeker could not
 * reach student/disciple personas). The founder decision of 2026-10-02
 * (every feature free, no tiers) SUPERSEDES that entitlement: the contract
 * is now EXISTENCE + canonical registry validation — every authenticated
 * caller may converse with every canonical persona, and there is no 403
 * path left on this route.
 *
 * Required contract (founder decision 2026-10-02: chat requires NO
 * authentication — anonymous callers are quota-keyed per IP; every other
 * validation mechanism unchanged):
 *   anonymous session + any canonical persona         -> proceeds (200)
 *   signed-in session + any canonical persona         -> proceeds (200)
 *   unknown persona                                   -> 400
 *   a forged client tier value in the body            -> no effect
 *
 * The persona-equality matrix across legacy tier values and the
 * forged-client-tier cases live in test/freeAccess.contract.test.ts;
 * this file pins the route-level validation mechanics.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

let quotaCalls: string[] = [];
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      quotaCalls.push(fn);
      if (fn === "consume_chat_quota") return { data: { ok: true, count: 1 }, error: null };
      if (fn === "refund_chat_quota") return { data: { ok: true, refunded: true }, error: null };
      // W3 closure: global spend caps (reserve/settle) — allowed by default here.
      if (fn === "reserve_rate_limit") return { data: { allowed: true, count: 0 }, error: null };
      if (fn === "settle_rate_limit") return { data: { ok: true, count: 0 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";
import { getSessionUser } from "@/lib/auth/session";
import { CANONICAL_PERSONAS } from "@/lib/chat/registry";

const REAL_FETCH = globalThis.fetch;
let providerCalls = 0;

function stubProvider(): void {
  providerCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      providerCalls += 1;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "ok", claims: [], uncertainties: [] }) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch,
  );
}

function makeReq(json: unknown, ip = "9.9.9.9"): never {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function asUser(user: { id: string; tier: string } | null): void {
  vi.mocked(getSessionUser).mockResolvedValue(
    user ? ({ id: user.id, email: "t@e.st", tier: user.tier, tierExpiresAt: null } as never) : (null as never),
  );
}

beforeEach(() => {
  quotaCalls = [];
  stubProvider();
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
  // W3: anonymous cases need the HMAC pepper (fail-closed identity).
  vi.stubEnv("ANON_ID_PEPPER", "test-pepper-suite");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("M3 /api/chat persona validation (existence + canonical registry, no tier)", () => {
  it("anonymous + canonical persona -> 200 (founder 2026-10-02: no sign-in required)", async () => {
    asUser(null);
    const res = await POST(makeReq({ personaId: "damani", history: [], message: "hi" }));
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("unknown persona -> 400, no quota, no provider call", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "definitely-not-a-persona", history: [], message: "hi" }));
    expect(res.status).toBe(400);
    expect(quotaCalls).not.toContain("consume_chat_quota");
    expect(providerCalls).toBe(0);
  });

  it("EVERY canonical persona proceeds for a seeker-equivalent session (was the gated tier)", async () => {
    asUser({ id: "u1", tier: "seeker" });
    // The full roster, one request each — every single one must reach the
    // provider (existence + canonical validation replaces entitlement).
    // Unique IPs keep the burst limiter out of the picture (its rpc is not
    // mocked here; this test is about persona validation, not bursts).
    let i = 0;
    for (const p of CANONICAL_PERSONAS) {
      i += 1;
      providerCalls = 0;
      const res = await POST(makeReq({ personaId: p.id, history: [], message: "hi" }, `10.0.0.${i}`));
      expect(res.status, `persona ${p.id}`).toBe(200);
      expect(providerCalls, `persona ${p.id}`).toBe(1);
    }
  });

  it("persona by DISPLAY NAME resolves canonically and proceeds (no 403 for 'Jim Chanos')", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "Jim Chanos", history: [], message: "Short ideas?" }));
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("a 400 consumes NO quota and calls NO provider (unchanged ugly-path contract)", async () => {
    asUser({ id: "u1", tier: "disciple" });
    const res = await POST(makeReq({ personaId: "nope", history: [], message: "hi" }));
    expect(res.status).toBe(400);
    // The burst limiter's hit_rate_limit rpc may run (fail-open path) — the
    // CONTRACT is that no chat-quota unit is consumed or refunded.
    expect(quotaCalls).not.toContain("consume_chat_quota");
    expect(quotaCalls).not.toContain("refund_chat_quota");
    expect(providerCalls).toBe(0);
  });
});
