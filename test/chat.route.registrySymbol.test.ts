/**
 * R11 (directive 9) — the /api/chat explicit `symbol` parameter must use
 * the ONE canonical registry, not a second stock-master-only boundary.
 *
 * Until this fix the route validated `symbol` against STOCKS alone while
 * getPrices served the full canonical price registry (the R9-12 fix): WTI
 * worked through the AI tool path but was rejected 400 "Unknown symbol" by
 * the outer chat contract — a Rule-14 duplicate-registry defect.
 *
 * Expected behavior after the fix:
 *   - symbol=WTI -> 200, and the system prompt embeds the canonical price
 *     observation item (same builder the getPrices tool uses) plus an
 *     explicit non-equity note; NO fundamentals/score items (they require
 *     an equity security-master record — null is a real value).
 *   - symbol=USDINR -> canonicalised to USD/INR (the slashed spelling the
 *     price layer consumes) before evidence assembly.
 *   - symbol=RELIANCE -> unchanged stock path (regression guard).
 *   - symbol=<genuinely unknown> -> 400 Unknown symbol (fail closed).
 *   - the concise stockPrompt variant is used for EQUITY symbols only —
 *     non-equity instruments get the full persona prompt (documented
 *     stock-only decision, directive 10).
 *
 * Auth, quota, rate limit and the live surfaces are module-mocked (the
 * pattern from test/chat.route.canonicalEvidence.test.ts); the evidence
 * assembler, router and grounding validator run FOR REAL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "u1", email: "t@e.st", access: "free",
  })),
}));

let quotaCount = 0;
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "consume_chat_quota") {
        quotaCount += 1;
        return { data: { ok: true, count: quotaCount }, error: null };
      }
      if (fn === "refund_chat_quota") return { data: { ok: true, refunded: true }, error: null };
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

// Live fundamentals stay real-but-unmocked: for non-equity symbols the
// canonical resolver returns null, which is exactly the state under test.
vi.mock("@/lib/liveFundamentals", async () => ({
  fetchFullFundamentals: async () => null,
  fetchLiveQuarterly: async () => null,
  fetchLiveShareholding: async () => null,
}));

// The price observation is mocked per-symbol so the canonical assembler
// runs deterministically with a LIVE observation carrying a disclosed
// observation time (the honest-state contract).
vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: async (symbol: string) => {
      if (symbol.toUpperCase() === "WTI") {
        return {
          price: 61.23, change: -0.42, source: "yahoo", status: "LIVE" as const,
          observedAt: "2026-10-03T03:00:00.000Z", lastUpdated: "2026-10-03T03:00:00.000Z",
        };
      }
      if (symbol.toUpperCase() === "USD/INR") {
        return {
          price: 96.3, change: -0.01, source: "yahoo", status: "LIVE" as const,
          observedAt: "2026-10-03T03:05:00.000Z", lastUpdated: "2026-10-03T03:05:00.000Z",
        };
      }
      return null;
    },
  };
});

import { POST } from "@/app/api/chat/route";

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

let capturedSystemPrompt = "";
function stubProviderReply(modelReply: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init!.body!) as { messages: Array<{ role: string; content: string }> };
      capturedSystemPrompt = body.messages.find(m => m.role === "system")!.content;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelReply) } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  );
}

beforeEach(() => {
  quotaCount = 0;
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("R11 (directive 9) — the chat symbol parameter uses the canonical registry", () => {
  it("symbol=WTI is ACCEPTED and seeds the canonical price observation + non-equity note", async () => {
    stubProviderReply({
      answer: "WTI trades at 61.23.",
      claims: [
        {
          claim: "WTI trades at 61.23",
          evidenceIds: ["price:WTI:2026-10-03T03:00:00.000Z"],
          assertions: [{ field: "price", value: 61.23, unit: "usd" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "WTI", history: [], message: "View on WTI?" }));
    expect(res.status).toBe(200);
    const wire = await res.json();

    // the canonical price item (same id contract as the getPrices tool)
    expect(capturedSystemPrompt).toContain("[price:WTI:2026-10-03T03:00:00.000Z]");
    expect(capturedSystemPrompt).toContain("fact: price=61.23 usd (live)");
    // the explicit non-equity note rides along
    expect(capturedSystemPrompt).toContain("[instrument:WTI:non-equity]");
    // no fabricated equity context for a commodity
    expect(capturedSystemPrompt).not.toContain("stock:WTI:profile");
    expect(capturedSystemPrompt).not.toContain("score:WTI:");
    // grounding works end-to-end on the price fact
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
  });

  it("symbol=USDINR is canonicalised to the slashed USD/INR spelling before evidence assembly", async () => {
    stubProviderReply({
      answer: "USD/INR is at 96.3.",
      claims: [
        {
          claim: "USD/INR is at 96.3",
          evidenceIds: ["price:USD/INR:2026-10-03T03:05:00.000Z"],
          assertions: [{ field: "price", value: 96.3, unit: "inr" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "USDINR", history: [], message: "View on the rupee?" }));
    expect(res.status).toBe(200);
    const wire = await res.json();

    expect(capturedSystemPrompt).toContain("[price:USD/INR:2026-10-03T03:05:00.000Z]");
    expect(capturedSystemPrompt).toContain("[instrument:USD/INR:non-equity]");
    expect(wire.provenance.grounded).toBe(true);
  });

  it("a slashed symbol spelling is accepted (USD/INR)", async () => {
    stubProviderReply({ answer: "ok", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "USD/INR", history: [], message: "View on the rupee?" }));
    expect(res.status).toBe(200);
    expect(capturedSystemPrompt).toContain("[price:USD/INR:2026-10-03T03:05:00.000Z]");
  });

  it("symbol=RELIANCE keeps the full stock path (regression guard)", async () => {
    stubProviderReply({ answer: "ok", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    // equity context still rides the prompt (stock profile + fundamentals + score)
    expect(capturedSystemPrompt).toContain("stock:RELIANCE:profile");
    expect(capturedSystemPrompt).toContain("score:RELIANCE:");
  });

  it("a genuinely unknown symbol still fails closed with 400 Unknown symbol", async () => {
    const res = await POST(makeReq({ personaId: "buffett", symbol: "ZZZZNOPE", history: [], message: "View?" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Unknown symbol");
  });

  it("a malformed symbol still fails closed with 400 Invalid symbol", async () => {
    const res = await POST(makeReq({ personaId: "buffett", symbol: "bad symbol!", history: [], message: "View?" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid symbol");
  });
});
