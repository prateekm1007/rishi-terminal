/**
 * Audit 2026-10-02 (P0) — /api/chat POST persona authorization.
 *
 * The route resolved CHAT_PERSONAS[personaId] and called the AI with NO
 * entitlement check: an authenticated SEEKER could submit a premium
 * persona id (student/legend/disciple) and receive its persona answer,
 * while /api/chat/personas correctly served only the tier's roster. The
 * route's own comment even claimed it "re-enforces the same allow-list"
 * (rule 1 violation — comment said more than the code did).
 *
 * Required contract (audit directive):
 *   seeker + student/legend persona         -> 403
 *   student + disciple-only persona         -> 403
 *   authorized persona                      -> continues normally
 *   unknown persona                         -> 400
 *   anonymous                               -> 401
 *   a 403 must consume NO quota and call NO provider.
 *
 * Rule 21: on the pre-fix tree the forged-persona cases return 200 (the
 * mocked provider answers) — raw output in the PR description.
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
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";
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
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("P0 /api/chat persona authorization (direct POST, forged ids)", () => {
  it("anonymous -> 401", async () => {
    asUser(null);
    const res = await POST(makeReq({ personaId: "damani", history: [], message: "hi" }));
    expect(res.status).toBe(401);
  });

  it("unknown persona -> 400", async () => {
    asUser({ id: "u1", tier: "disciple" });
    const res = await POST(makeReq({ personaId: "definitely-not-a-persona", history: [], message: "hi" }));
    expect(res.status).toBe(400);
  });

  it("MUST FAIL PRE-FIX: seeker + student persona (jhunjhunwala) -> 403, no quota, no provider call", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "jhunjhunwala", history: [], message: "View on markets?" }));
    expect(res.status).toBe(403);
    expect(quotaCalls).not.toContain("consume_chat_quota");
    expect(providerCalls).toBe(0);
  });

  it("MUST FAIL PRE-FIX: seeker + legend persona (graham) -> 403", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "graham", history: [], message: "Margin of safety?" }));
    expect(res.status).toBe(403);
    expect(providerCalls).toBe(0);
  });

  it("MUST FAIL PRE-FIX: seeker forges a disciple persona by DISPLAY NAME ('Jim Chanos') -> 403", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "Jim Chanos", history: [], message: "Short ideas?" }));
    expect(res.status).toBe(403);
    expect(providerCalls).toBe(0);
  });

  it("MUST FAIL PRE-FIX: student + disciple-only persona (chanos) -> 403", async () => {
    asUser({ id: "u1", tier: "student" });
    const res = await POST(makeReq({ personaId: "chanos", history: [], message: "Forensic view?" }));
    expect(res.status).toBe(403);
    expect(providerCalls).toBe(0);
  });

  it("seeker + free persona (damani) -> proceeds to the provider normally", async () => {
    asUser({ id: "u1", tier: "seeker" });
    const res = await POST(makeReq({ personaId: "damani", history: [], message: "Your philosophy?" }));
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
    expect(quotaCalls).toContain("consume_chat_quota");
  });

  it("student + student persona (kacholia, previously ungated Master) -> proceeds", async () => {
    asUser({ id: "u1", tier: "student" });
    const res = await POST(makeReq({ personaId: "kacholia", history: [], message: "Small caps?" }));
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
  });

  it("disciple + disciple persona (soros) -> proceeds", async () => {
    asUser({ id: "u1", tier: "disciple" });
    const res = await POST(makeReq({ personaId: "soros", history: [], message: "Reflexivity?" }));
    expect(res.status).toBe(200);
    expect(providerCalls).toBe(1);
  });
});
