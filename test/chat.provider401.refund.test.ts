/**
 * R10-10 (Coder Directions 2026-10-03, directive 24): provider-401 quota /
 * refund accounting — the Agnes production incident class.
 *
 * The incident: the primary provider began returning persistent
 * `401 Invalid token` while the system correctly kept failing closed.
 * Directive 24 requires proof that:
 *   1. a provider 401 is treated EXACTLY like any other provider failure
 *      (same throw → failover → 502 path; nothing 401-specific);
 *   2. repeated provider failures NEVER consume user quota — every failed
 *      request refunds its consumed unit (net 0), so an unusable provider
 *      cannot silently drain the daily allowance;
 *   3. the outward error body stays GENERIC (Rule 10 — no upstream status
 *      text, no provider details);
 *   4. the provider-health circuit opens after consecutive failures, so
 *      later requests bypass the dead provider without an upstream call
 *      (open-circuit bypass) and STILL refund correctly.
 *
 * The route harness mocks auth/quota/burst (established pattern); the
 * router, provider health and failover chain run FOR REAL. Provider
 * health state is process-global — this file owns its lifecycle and runs
 * the sequence in one ordered test so circuit timing is deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "u1", email: "t@e.st", access: "free",
  })),
}));

let quotaCount = 0;
let refundCalls = 0;
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "consume_chat_quota") {
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === "refund_chat_quota") {
        refundCalls += 1;
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";
import { resetProviderHealth, providerHealthSnapshot } from "@/lib/registry/providerHealth";

const REAL_FETCH = globalThis.fetch;

function makeReq(json: unknown, ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

let upstreamCalls = 0;
function stubUpstreamAlways401(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown) => {
      upstreamCalls += 1;
      return new Response(JSON.stringify({ error: { code: "invalid_token", message: "Invalid token" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  );
}

const body = { personaId: "buffett", history: [], message: "Hello there." };

beforeEach(() => {
  quotaCount = 0;
  refundCalls = 0;
  upstreamCalls = 0;
  resetProviderHealth();
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
  vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("R10-10 — provider 401 is a plain provider failure: fail closed, refund, stay generic", () => {
  it("401 from every candidate -> 502, quota refunded (net 0), generic body", async () => {
    stubUpstreamAlways401();
    const res = await POST(makeReq(body));
    expect(res.status).toBe(502);
    // net quota: the unit was consumed and refunded — the provider outage
    // must not drain the user's daily allowance (directive 24).
    expect(quotaCount - refundCalls).toBe(0);
    const wire = await res.json();
    const flat = JSON.stringify(wire);
    // Rule 10: generic outward — no upstream status codes or provider text.
    expect(flat).not.toContain("401");
    expect(flat).not.toContain("Invalid token");
    expect(flat).not.toContain("invalid_token");
    expect(wire.error).toBe("Chat service error");
  });

  it("repeated 401s: every request fails closed with net-0 quota and the circuit opens, bypassing the dead provider", async () => {
    stubUpstreamAlways401();
    // COOLDOWN_THRESHOLD (3) consecutive failures per provider close the circuit.
    for (let i = 0; i < 3; i++) {
      const res = await POST(makeReq(body, "10.0.40.1"));
      expect(res.status).toBe(502);
      expect(quotaCount - refundCalls).toBe(0);
    }
    // both candidates (chat-api + gemini fallback) have open circuits now
    const snap = providerHealthSnapshot();
    const open = snap.filter((p) => p.consecutiveFailures >= 3 || p.cooldownUntil > Date.now());
    expect(open.length).toBeGreaterThanOrEqual(1);

    // the NEXT request bypasses BOTH dead providers: zero upstream calls,
    // immediate fail-closed 502, and STILL a correct refund.
    upstreamCalls = 0;
    const res = await POST(makeReq(body, "10.0.40.2"));
    expect(res.status).toBe(502);
    expect(upstreamCalls).toBe(0); // open-circuit bypass (no provider attempt)
    expect(quotaCount - refundCalls).toBe(0);
  });
});
