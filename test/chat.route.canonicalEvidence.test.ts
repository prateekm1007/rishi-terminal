/**
 * Q4 Commit A — ROUTE-LEVEL INTEGRATION: /api/chat consumes THE canonical
 * evidence assembler.
 *
 * The founder's round-4 direction (§6/§8) requires proof at the ROUTE level:
 *   1. POST /api/chat(symbol=RELIANCE) must send the canonical evidence
 *      package (stock:/price:/fundamental:/score:/news: items with typed
 *      facts) into the AI router — NOT the superseded seed-only
 *      stockEvidence() context (whose ids start with `seed:`).
 *   2. The test FAILS if the route ever reintroduces seed-only evidence.
 *   3. The wire response carries provider/model/generatedAt/groundingMode/
 *      grounded/validated claims (T52 provenance contract).
 *   4. End-to-end fail-closed: a model reply asserting a figure the
 *      canonical package does not carry cannot become grounded.
 *
 * Auth, quota, rate limit and the live data surfaces are module-mocked (the
 * existing pattern from test/chat.quota.order.test.ts); resolveStockMetrics,
 * getStockScore, the router and the grounding validator run FOR REAL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FullFundamentals } from "@/lib/liveFundamentals";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "u1", email: "t@e.st", tier: "seeker", tierExpiresAt: null,
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

// The live surfaces are mocked so the canonical assembler runs
// deterministically; resolveStockMetrics + getStockScore stay REAL, so the
// score evidence is the actual canonical consensus for this fixture.
vi.mock("@/lib/liveFundamentals", async () => {
  const ff = async (): Promise<FullFundamentals> => ({
    symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
    bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: 0.45,
    opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
    roa: 10, lastUpdated: "2026-09-30T10:00:00.000Z", source: "screener",
  });
  return { fetchFullFundamentals: ff, fetchLiveQuarterly: async () => null, fetchLiveShareholding: async () => null };
});

vi.mock("@/lib/livePrice", () => ({
  fetchLivePrice: async () => ({
    price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const,
    observedAt: "2025-10-31T08:40:00.000Z", lastUpdated: "2025-10-31T08:40:00.000Z",
  }),
}));

import { POST } from "@/app/api/chat/route";

const REAL_FETCH = globalThis.fetch;

/** Build a POST request against the route (same shape as quota-order tests). */
function makeReq(json: unknown, ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

/** Stub fetch to capture the OUTGOING provider request (the system prompt
 *  embeds the evidence package) and reply with a canned structured answer. */
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

describe("Q4 Commit A — /api/chat sends THE canonical evidence package to the router", () => {
  it("the system prompt embeds the canonical ids (stock/price/fundamental/score/news) and the typed fact annotations", async () => {
    stubProviderReply({
      answer: "Reliance looks steady.",
      claims: [
        {
          claim: "Reliance trades at 1420.5",
          evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
          assertions: [{ field: "price", value: 1420.5, unit: "inr" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    const wire = await res.json();

    // 1. canonical ids reached the provider prompt (route → assembler → router)
    expect(capturedSystemPrompt).toContain("[stock:RELIANCE:profile]");
    expect(capturedSystemPrompt).toContain("[price:RELIANCE:2025-10-31T08:40:00.000Z]");
    expect(capturedSystemPrompt).toContain("fundamental:RELIANCE:roe:");
    expect(capturedSystemPrompt).toContain("score:RELIANCE:rishi-merit-v1");
    expect(capturedSystemPrompt).toContain("[news:RELIANCE:unavailable]"); // honest unavailability rides along
    // typed facts ride with the items (field/value/unit annotations)
    expect(capturedSystemPrompt).toContain("fact: price=1420.5 inr (live)");
    expect(capturedSystemPrompt).toContain("fact: roe=18 percent (live)");
    // the structured contract (assertions) was delivered to the model
    expect(capturedSystemPrompt).toContain("assertions");

    // 2. TRIPWIRE: seed-only evidence must never reappear in this prompt
    expect(capturedSystemPrompt).not.toContain("seed:RELIANCE:profile");
    expect(capturedSystemPrompt).not.toContain("(seed data)");

    // 3. wire provenance contract (T52)
    expect(wire.provenance.provider).toBe("chat-api");
    expect(typeof wire.provenance.model).toBe("string");
    expect(typeof wire.provenance.generatedAt).toBe("string");
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
    expect(wire.provenance.claims[0].evidenceIds).toEqual(["price:RELIANCE:2025-10-31T08:40:00.000Z"]);
    expect(wire.provenance.claims[0].assertions).toEqual([{ field: "price", value: 1420.5, unit: "inr" }]);
  });

  it("END-TO-END FAIL-CLOSED: a reply asserting a figure the canonical package does not carry is never grounded", async () => {
    stubProviderReply({
      answer: "Reliance will double tomorrow.",
      claims: [
        {
          claim: "Reliance trades at 9999",
          evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
          assertions: [{ field: "price", value: 9999, unit: "inr" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.groundingMode).toBe("evidence-context");
    expect(wire.provenance.claims).toHaveLength(0);
    // the rejection is disclosed, not swallowed
    expect(wire.provenance.groundingRejections.join(" ")).toContain("R4-02");
  });

  it("END-TO-END FAIL-CLOSED: a valid id cited for a DIFFERENT field's number is rejected (ROE=99 vs P/E=99)", async () => {
    stubProviderReply({
      answer: "Numbers copied from the wrong field.",
      claims: [
        {
          claim: "Reliance ROE is 99",
          evidenceIds: ["fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z"],
          assertions: [{ field: "roe", value: 99, unit: "multiple" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.claims).toHaveLength(0);
    expect(wire.provenance.groundingRejections.join(" ")).toContain("roe=99");
  });
});
