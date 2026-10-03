/**
 * R10-09 (Coder Directions 2026-10-03, directives 9 + 10): the explicit
 * `symbol` parameter in POST /api/chat must resolve through the ONE
 * canonical symbol registry (lib/registry/validateInput) — not a duplicate
 * stock-only whitelist.
 *
 * Defect (Rule 14, two registries): the AI tool path serves the full
 * canonical price registry (WTI / BTC / USD/INR / bonds — production-proven
 * on 6798f62), while the outer chat contract rejected the same tickers with
 * 400 "Unknown symbol" (STOCKS[] lookup + a local shape regex that also
 * banned the slashed FX spelling). A client could not open an instrument
 * chat even though the loop answers instrument asks fine.
 *
 * Evidence semantics preserved (the audit's second half):
 *   - a STOCK symbol keeps the canonical stock evidence package AND the
 *     persona's stockPrompt (unchanged contract);
 *   - a non-stock instrument enters the loop with NO initial stock
 *     evidence (buildAiEvidencePackage is a stock surface by design —
 *     resolve() nulls on non-stocks) and the GENERAL persona prompt: the
 *     stockPrompt text ("You are analyzing a stock…") would misdescribe
 *     the context — a Rule-1 lie — so it must not be used there.
 *
 * Auth, quota, rate limit and the live data surfaces are module-mocked
 * (the established pattern from test/chat.route.canonicalEvidence.test.ts);
 * the router and grounding validator run FOR REAL.
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
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

// The live surfaces are mocked so stock-context requests assemble
// deterministically; resolveStockMetrics + getStockScore stay REAL.
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

/** Capture the OUTGOING provider request (system prompt rides in
 * messages[0]) and reply with a canned structured answer. */
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

const GROUNDED_RELIANCE_REPLY = {
  answer: "Reliance looks steady.",
  claims: [
    {
      claim: "Reliance trades at 1420.5",
      evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
      assertions: [{ field: "price", value: 1420.5, unit: "inr" }],
    },
  ],
  uncertainties: [],
};

beforeEach(() => {
  quotaCount = 0;
  capturedSystemPrompt = "";
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
});
afterEach(() => {
  (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("R10-09 — the outer chat symbol contract resolves through the ONE canonical registry", () => {
  it("accepts a canonical price-registry commodity (WTI) — the tool path's own surface", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "WTI", history: [], message: "Hello there." }));
    expect(res.status).toBe(200);
  });

  it("accepts the slashed FX spelling (USD/INR) the price layer itself consumes", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "USD/INR", history: [], message: "Hello there." }));
    expect(res.status).toBe(200);
  });

  it("accepts the unslashed FX spelling and canonicalises it (USDINR)", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "USDINR", history: [], message: "Hello there." }));
    expect(res.status).toBe(200);
  });

  it("an instrument context never receives the stock evidence package or the stockPrompt (Rule 1)", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "WTI", history: [], message: "Hello there." }));
    expect(res.status).toBe(200);
    // no stock evidence ids: the stock assembler is a stock surface
    expect(capturedSystemPrompt).not.toContain("[stock:WTI:profile]");
    expect(capturedSystemPrompt).not.toContain("[price:WTI:");
    expect(capturedSystemPrompt).not.toContain("[score:WTI:");
    // no stock-flavoured prompt for a non-stock context
    expect(capturedSystemPrompt).not.toContain("You are analyzing a stock");
    expect(capturedSystemPrompt).not.toContain("Keep response concise (2-3 sentences max for stock page chat)");
  });

  it("GUARD: a stock symbol keeps the canonical evidence package and the stockPrompt", async () => {
    stubProviderReply(GROUNDED_RELIANCE_REPLY);
    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    expect(capturedSystemPrompt).toContain("[stock:RELIANCE:profile]");
    expect(capturedSystemPrompt).toContain("[price:RELIANCE:2025-10-31T08:40:00.000Z]");
    // stock context keeps the persona's stock-scoped prompt
    expect(capturedSystemPrompt).toContain("You are Warren Buffett, the Oracle of Omaha. Look for moats");
  });

  it("GUARD: a symbol outside every registry is still rejected 400", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const res = await POST(makeReq({ personaId: "buffett", symbol: "NOTAREALSYMBOL", history: [], message: "Hello there." }));
    expect(res.status).toBe(400);
  });

  it("GUARD: malformed symbol values are still rejected 400", async () => {
    stubProviderReply({ answer: "Greetings.", claims: [], uncertainties: [] });
    const weird = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE; DROP TABLE", history: [], message: "Hello there." }));
    expect(weird.status).toBe(400);
    const empty = await POST(makeReq({ personaId: "buffett", symbol: "   ", history: [], message: "Hello there." }));
    expect(empty.status).toBe(400);
  });
});
