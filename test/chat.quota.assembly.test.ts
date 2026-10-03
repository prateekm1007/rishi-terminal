/**
 * Commit L3 (§8) — evidence-assembly quota refund.
 *
 * The defect: quota was consumed BEFORE buildAiEvidencePackage(symbol), and
 * the refund-protected block covered only the provider call. If assembly
 * unexpectedly throws, the request burned a quota unit without ever
 * reaching the provider.
 *
 * Required behavior: consume quota → assembly throws → generic 502 error →
 * quota restored. Quota semantics are NOT weakened (a successful request
 * still consumes exactly one unit).
 *
 * Rule 21: MUST FAIL PRE-FIX — on the pre-L3 tree the assembly throw
 * propagated as an unhandled 500 with NO refund (quotaCount 1,
 * refundCalls 0).
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
      if (fn === "hit_rate_limit") {
        return { data: { allowed: true, count: 1 }, error: null };
      }
      // W3 closure: the guarded reservation + settlement (migration 020) —
      // admitted by default here; the cap-contract itself is pinned in
      // test/chat.globalSpend.test.ts and on the Postgres harness.
      if (fn === "reserve_chat_global_spend")
        return { data: { ok: true, tokens: 0, requests: 1 }, error: null };
      if (fn === "settle_chat_global_tokens")
        return { data: { ok: true, settled: true }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

let assemblyShouldThrow = false;
vi.mock("@/lib/ai/evidence", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@/lib/ai/evidence");
  return {
    ...actual,
    buildAiEvidencePackage: (symbol: string, deps?: Parameters<typeof actual.buildAiEvidencePackage>[1]) => {
      if (assemblyShouldThrow) throw new Error("simulated registry corruption");
      return actual.buildAiEvidencePackage(symbol, deps);
    },
  };
});

import { POST } from "@/app/api/chat/route";

beforeEach(() => {
  quotaCount = 0;
  refundCalls = 0;
  assemblyShouldThrow = false;
  vi.stubGlobal("fetch", vi.fn(async () =>
    // Gemini-shaped reply: the vitest env has GEMINI_API_KEY configured (the
    // same provider chain chat.quota.order.test.ts exercises).
    new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch);
});

afterEach(() => vi.restoreAllMocks());

function makeReq(json: unknown, ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

describe("L3 — evidence assembly is failure-safe around quota (§8)", () => {
  it("MUST FAIL PRE-FIX: consume quota → assembly throws → generic 502 → quota restored", async () => {
    assemblyShouldThrow = true;
    const res = await POST(makeReq({ personaId: "buffett", message: "hi", symbol: "RELIANCE" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Chat service error"); // generic outward (rule 10)
    expect(JSON.stringify(body)).not.toContain("corruption"); // no detail leak
    expect(quotaCount).toBe(1); // consumed first...
    expect(refundCalls).toBe(1); // ...and restored
  });

  it("a normal request still consumes exactly one unit and refunds nothing (semantics not weakened)", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "hi", symbol: "RELIANCE" }));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
    expect(refundCalls).toBe(0);
  });

  it("a request WITHOUT a symbol (general chat) skips assembly and consumes normally", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "hello" }));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
    expect(refundCalls).toBe(0);
  });
});
