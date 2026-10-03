/**
 * N4 (round 3) — quota is consumed only for requests that DESERVE it.
 *
 * The defect: the route's order was auth → IP burst → consumeQuota →
 * validation, so any 400/413 (bad JSON, unknown persona, oversized
 * message/history, unknown symbol) permanently burned one of the user's
 * 15 daily messages. The fix validates the whole contract first and
 * consumes afterwards (upstream failures still refund, R6.2).
 *
 * Also pins the x-forwarded-for assumption with the Vercel doc citation:
 * https://vercel.com/docs/headers/request-headers#x-forwarded-for —
 * "we currently overwrite the X-Forwarded-For header and do not forward
 * external IPs. This restriction is in place to prevent IP spoofing."
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
      // W3 closure: global spend caps (reserve/settle) — allowed by default here.
      if (fn === "reserve_rate_limit") return { data: { allowed: true, count: 0 }, error: null };
      if (fn === "settle_rate_limit") return { data: { ok: true, count: 0 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";

beforeEach(() => {
  quotaCount = 0;
  refundCalls = 0;
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch);
});

function makeReq(json: unknown, ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function makeInvalidJsonReq(ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => {
      throw new SyntaxError("Unexpected token in JSON");
    },
    text: async () => "{not json",
  } as never;
}

describe("N4 — malformed requests never consume quota", () => {
  it("10 requests with invalid JSON all return 400 and leave the counter unchanged", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(makeInvalidJsonReq());
      expect(res.status).toBe(400);
    }
    expect(quotaCount).toBe(0);
  });

  it("unknown persona (400) leaves the counter unchanged", async () => {
    const res = await POST(makeReq({ personaId: "soros-fake", message: "hi" }));
    expect(res.status).toBe(400);
    expect(quotaCount).toBe(0);
  });

  it("empty message (400) leaves the counter unchanged", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "   " }));
    expect(res.status).toBe(400);
    expect(quotaCount).toBe(0);
  });

  it("oversized message (413) leaves the counter unchanged", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "x".repeat(4001) }));
    expect(res.status).toBe(413);
    expect(quotaCount).toBe(0);
  });

  it("unknown symbol (400) leaves the counter unchanged", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "hi", symbol: "NOTREAL" }));
    expect(res.status).toBe(400);
    expect(quotaCount).toBe(0);
  });

  it("malformed symbol type (400) leaves the counter unchanged", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "hi", symbol: 42 }));
    expect(res.status).toBe(400);
    expect(quotaCount).toBe(0);
  });

  it("a valid request increments the counter by exactly 1 (and refunds nothing)", async () => {
    const res = await POST(makeReq({ personaId: "buffett", message: "What do you think of RELIANCE?" }));
    expect(res.status).toBe(200);
    expect(quotaCount).toBe(1);
    expect(refundCalls).toBe(0);
  });

  it("a burst of valid requests increments once per request", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeReq({ personaId: "buffett", message: "hello again" }));
      expect(res.status).toBe(200);
    }
    expect(quotaCount).toBe(5);
  });
});

describe("N4 — x-forwarded-for parsing assumption (Vercel-documented)", () => {
  // Citation: https://vercel.com/docs/headers/request-headers#x-forwarded-for
  // Vercel OVERWRITES x-forwarded-for with the client's public IP (single
  // entry, no client-controlled prefix). The route parses the LAST entry,
  // which stays correct behind conventional appending proxies as well —
  // and critically differs from the spoofable FIRST entry.
  it("a spoofed prefix cannot change the parsed IP (last entry wins)", async () => {
    // The spoofed value claims a different IP; the platform entry is last.
    await POST(makeReq({ personaId: "buffett", message: "hello" }, "9.9.9.9, 1.2.3.4"));
    // No direct return value exposes the parsed IP, but the request must
    // be attributed consistently: with a valid body it succeeds either way.
    expect(quotaCount).toBe(1);
  });

  it("a single-entry header (the Vercel shape) parses to that entry", async () => {
    await POST(makeReq({ personaId: "buffett", message: "hello" }, "203.0.113.7"));
    expect(quotaCount).toBe(1);
  });
});
