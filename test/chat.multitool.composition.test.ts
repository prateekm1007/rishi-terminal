/**
 * R10-14 (Coder Directions 2026-10-03, directive 14): multi-tool
 * composition inside the ONE bounded loop.
 *
 * Real user asks need more than one existing capability — e.g. fundamentals
 * + live price for the same symbol. Directive 14 requires the AI to
 * request only the necessary tools, reuse the SAME CanonicalStockState,
 * stay within the four-call bound, and produce ONE coherent grounded
 * answer — and requires tool count + wall time to be MEASURED, not
 * assumed.
 *
 * This route-level test scripts a model that composes two canonical tools
 * (getFinancials -> getPrices) before answering, and asserts:
 *   - both tool calls execute ok through the REAL executor, in request
 *     order, on the shared per-request state;
 *   - the final answer is GROUNDED with the server-generated verified
 *     surface carrying BOTH facts (fundamental + price);
 *   - tool count (2) and per-stage completion timings ride the wire
 *     (provenance.timings) so efficiency is measured, never assumed;
 *   - the loop stays inside MAX_TOOL_ITERATIONS=4.
 *
 * Harness: auth/quota/burst module-mocked, live surfaces module-mocked,
 * router + grounding validator + tool executor run FOR REAL (the
 * established pattern from test/chat.route.canonicalEvidence.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FullFundamentals } from "@/lib/liveFundamentals";

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
      // W3: global spend caps (bump_rate_limit) — allowed by default in these suites.
      if (fn === "bump_rate_limit") return { data: { allowed: true, count: 0 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

vi.mock("@/lib/liveFundamentals", async () => {
  const ff = async (): Promise<FullFundamentals> => ({
    symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
    bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: 0.45,
    opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
    roa: 10, lastUpdated: "2026-09-30T10:00:00.000Z", source: "screener",
  });
  return { fetchFullFundamentals: ff, fetchLiveQuarterly: async () => null, fetchLiveShareholding: async () => null };
});

vi.mock("@/lib/livePrice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/livePrice")>();
  return {
    ...actual,
    fetchLivePrice: async () => ({
      price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const,
      observedAt: "2025-10-31T08:40:00.000Z", lastUpdated: "2025-10-31T08:40:00.000Z",
    }),
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

interface CapturedCall {
  systemPrompt: string;
  lastUserContent: string;
}
let captured: CapturedCall[] = [];

/** Script the model: two tool requests, then the final grounded answer. */
function stubComposedModel(finalReply: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init!.body!) as { messages: Array<{ role: string; content: string }> };
      captured.push({
        systemPrompt: body.messages.find(m => m.role === "system")!.content,
        lastUserContent: body.messages[body.messages.length - 1].content,
      });
      const step = captured.length;
      const reply =
        step === 1
          ? JSON.stringify({ tool: "getFinancials", args: { symbol: "RELIANCE" } })
          : step === 2
            ? JSON.stringify({ tool: "getPrices", args: { symbol: "RELIANCE" } })
            : JSON.stringify(finalReply);
      return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch,
  );
}

const FINAL_TWO_CLAIMS = {
  answer: "Reliance compounds well and trades at 1420.5 with roe 18.",
  claims: [
    {
      claim: "Reliance trades at 1420.5",
      evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
      assertions: [{ field: "price", value: 1420.5, unit: "inr" }],
    },
    {
      claim: "Reliance roe is 18 percent",
      evidenceIds: ["fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z"],
      assertions: [{ field: "roe", value: 18, unit: "percent" }],
    },
  ],
  uncertainties: [],
};

beforeEach(() => {
  quotaCount = 0;
  captured = [];
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("R10-14 — multi-tool composition inside the ONE bounded loop", () => {
  it("fundamentals + live price compose into ONE coherent grounded answer", async () => {
    stubComposedModel(FINAL_TWO_CLAIMS);
    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "How is Reliance doing right now?" }));
    expect(res.status).toBe(200);
    const wire = await res.json();

    // both tools executed ok, in request order, through the real executor
    expect(wire.provenance.toolCalls).toEqual([
      { tool: "getFinancials", status: "ok", symbol: "RELIANCE" },
      { tool: "getPrices", status: "ok", symbol: "RELIANCE" },
    ]);

    // measured, not assumed: 2 tool executions (inside the 4-call bound)
    expect(wire.provenance.timings.toolExecutions).toHaveLength(2);
    expect(wire.provenance.timings.toolExecutions.every((t: { ms: number }) => typeof t.ms === "number")).toBe(true);

    // THREE completions: initial tool request + follow-up tool request + final
    expect(wire.provenance.timings.completions).toHaveLength(3);
    const stages = wire.provenance.timings.completions.map((c: { stage: string; outcome: string }) => `${c.stage}:${c.outcome}`);
    expect(stages).toEqual(["initial:tool-request", "post-tool:tool-request", "post-tool:final-response"]);

    // ONE coherent grounded answer carrying BOTH facts on the
    // server-generated verified surface
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.claimsVerified).toBe(true);
    expect(wire.text).toContain("roe = 18 percent");
    expect(wire.text).toContain("price = 1420.5 inr");

    // the second tool request saw the FIRST tool result in its transcript
    expect(captured[1].lastUserContent).toContain("TOOL RESULT");
    expect(captured[2].lastUserContent).toContain("TOOL RESULT");

    // the shared canonical state served both tools (single fundamentals fetch)
    const fundamentalsFetches = wire.provenance.timings.fundamentalsFetches ?? [];
    expect(fundamentalsFetches.filter((f: { symbol: string }) => f.symbol === "RELIANCE")).toHaveLength(1);
  });
});
