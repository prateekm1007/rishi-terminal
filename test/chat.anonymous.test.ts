/**
 * Founder decision 2026-10-03: chatting with the Rishis requires NO
 * authentication. The chat route must accept anonymous callers with the
 * SAME bounded pipeline as signed-in callers:
 *
 *   - ONE common free daily quota (no auth != unbounded spend, R12):
 *     anonymous callers are quota-keyed to a DETERMINISTIC per-IP UUID
 *     (uuidv5 of the client IP — the raw IP is never stored), so the
 *     atomic Supabase counter + refund keep working unchanged.
 *   - the persistent per-IP burst limiter still applies.
 *   - persona validation, evidence, grounding, provenance: identical.
 *
 * Contract pinned here (each row failed on the pre-change tree, which
 * returned 401 for every anonymous request):
 *   anonymous + canonical persona            -> 200 (provider called)
 *   same IP twice                            -> same quota identity
 *   different IP                             -> different quota identity
 *   anonymous quota exhausted                -> 429 (fail closed)
 *   signed-in caller                         -> account id stays the identity
 *   GET /api/chat/personas anonymous         -> 200 full roster
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => null),
}));

// ── RPC-backed fakes: record the quota identity the route derives ──
const consumeCalls: Array<Record<string, unknown>> = [];
let quotaRpcMode: "ok" | "exhausted" | "error" = "ok";
const rateHits: Record<string, number> = {};
const BURST_LIMIT = 12; // matches BURST_MAX_REQUESTS in the route

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn === "consume_chat_quota") {
        consumeCalls.push(params);
        if (quotaRpcMode === "error") return { data: null, error: { message: "connection refused" } };
        if (quotaRpcMode === "exhausted") return { data: { ok: false }, error: null };
        return { data: { ok: true, count: consumeCalls.length }, error: null };
      }
      if (fn === "refund_chat_quota") return { data: { ok: true, refunded: true }, error: null };
      if (fn === "hit_rate_limit") {
        const key = params.p_key as string;
        rateHits[key] = (rateHits[key] ?? 0) + 1;
        return { data: { allowed: rateHits[key] <= BURST_LIMIT, count: rateHits[key] }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";
import { GET as personasGET } from "@/app/api/chat/personas/route";
import { getSessionUser } from "@/lib/auth/session";
import { anonQuotaId } from "@/lib/auth/anonIdentity";
import { CANONICAL_PERSONAS } from "@/lib/chat/registry";

const REAL_FETCH = globalThis.fetch;

function makeReq(json: unknown, ip = "10.0.0.5"): never {
  return {
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function makeGetReq(url: string): never {
  return { headers: { get: () => null }, url, nextUrl: { searchParams: new URL(url).searchParams } } as never;
}

const UUID_V5_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  consumeCalls.length = 0;
  quotaRpcMode = "ok";
  for (const k of Object.keys(rateHits)) delete rateHits[k];
  (globalThis as { fetch: unknown }).fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: "OK" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  ) as unknown as typeof fetch;
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
});

afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("anonymous chat (founder 2026-10-03: no sign-in required)", () => {
  it("anonymous caller converses with a canonical persona -> 200", async () => {
    const res = await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }));
    expect(res.status).toBe(200);
  });

  it("same IP twice -> ONE deterministic quota identity (a uuidv5, never the raw IP)", async () => {
    await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.0.0.5"));
    await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.0.0.5"));
    expect(consumeCalls.length).toBe(2);
    const a = consumeCalls[0].p_user_id as string;
    const b = consumeCalls[1].p_user_id as string;
    expect(a).toBe(b);
    expect(a).toMatch(UUID_V5_RE);
    expect(a).not.toBe("10.0.0.5");
    expect(a).not.toContain("10.0.0.5");
  });

  it("different IP -> different quota identity", async () => {
    await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.0.0.5"));
    await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.0.0.6"));
    expect(consumeCalls.length).toBe(2);
    expect(consumeCalls[0].p_user_id).not.toBe(consumeCalls[1].p_user_id);
  });

  it("anonymous daily quota is enforced per IP (fail closed, never unbounded spend)", async () => {
    quotaRpcMode = "exhausted";
    const res = await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.1.1.1"));
    expect(res.status).toBe(429);
  });

  it("anonymous quota infra failure still fails closed (429)", async () => {
    quotaRpcMode = "error";
    const res = await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.1.1.2"));
    expect(res.status).toBe(429);
  });

  it("signed-in caller keeps the ACCOUNT id as the quota identity (not the IP uuid)", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({
      id: "11111111-1111-1111-1111-111111111111",
      email: "t@e.st",
      access: "free",
    } as never);
    await POST(makeReq({ personaId: "buffett", history: [], message: "hi" }, "10.0.0.5"));
    expect(consumeCalls.length).toBe(1);
    expect(consumeCalls[0].p_user_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("GET /api/chat/personas serves the FULL roster without sign-in", async () => {
    const res = await personasGET(makeGetReq("http://x/api/chat/personas"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { personas: Array<{ id: string }> };
    expect(body.personas.length).toBe(CANONICAL_PERSONAS.length);
    expect(new Set(body.personas.map(p => p.id))).toEqual(
      new Set(CANONICAL_PERSONAS.map(p => p.id)),
    );
  });

  it("anonQuotaId is a pure deterministic uuidv5 of the ip string", () => {
    expect(anonQuotaId("203.0.113.9")).toBe(anonQuotaId("203.0.113.9"));
    expect(anonQuotaId("203.0.113.9")).not.toBe(anonQuotaId("203.0.113.10"));
    expect(anonQuotaId("203.0.113.9")).toMatch(UUID_V5_RE);
  });
});
