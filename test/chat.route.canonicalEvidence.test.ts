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
// Commit D §6: the fixture is MUTABLE so route-level negatives can exercise
// the no-disclosed-timestamp path and the D/E-unavailable path end to end.
const ffState = vi.hoisted(() => ({
  lastUpdated: "2026-09-30T10:00:00.000Z" as string | null,
  debtToEquity: 0.45 as number, // the vendor DISCLOSES this value in the default fixture
}));

vi.mock("@/lib/liveFundamentals", async () => {
  const ff = async (): Promise<FullFundamentals> => ({
    symbol: "RELIANCE", pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
    bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: ffState.debtToEquity,
    opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
    roa: 10, lastUpdated: ffState.lastUpdated, source: "screener",
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
  ffState.lastUpdated = "2026-09-30T10:00:00.000Z";
  ffState.debtToEquity = 0.45;
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

describe("Q4 Commit D §6 — route-level negatives over the full AI loop", () => {
  it("a valid claim whose text carries an incidental date is rejected end to end (2026 case)", async () => {
    stubProviderReply({
      answer: "The ROE is 18%.",
      claims: [
        {
          claim: "As of 2026-09-30 the ROE is 18%",
          evidenceIds: ["fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z"],
          assertions: [{ field: "roe", value: 18, unit: "percent" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.groundingRejections.join(" ")).toContain("2026");
  });

  it("a wrong-unit prose marker ('18x') is rejected end to end", async () => {
    stubProviderReply({
      answer: "The ROE is 18x.",
      claims: [
        {
          claim: "ROE is 18x",
          evidenceIds: ["fundamental:RELIANCE:roe:2026-09-30T10:00:00.000Z"],
          assertions: [{ field: "roe", value: 18, unit: "percent" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.groundingRejections.join(" ")).toContain("multiple");
  });

  it("mixed valid + invalid claims: one fabricated metric rejects the WHOLE reply end to end", async () => {
    stubProviderReply({
      answer: "Mostly honest, one invention.",
      claims: [
        {
          claim: "Reliance trades at 1420.5",
          evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
          assertions: [{ field: "price", value: 1420.5, unit: "inr" }],
        },
        {
          claim: "Dividend yield is 3%",
          evidenceIds: ["price:RELIANCE:2025-10-31T08:40:00.000Z"],
          assertions: [{ field: "dividendyield", value: 3, unit: "percent" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.claims).toHaveLength(0);
    expect(wire.provenance.groundingRejections.join(" ")).toContain("dividendyield");
  });

  it("grounded wire carries the SERVER-GENERATED canonical claim, not the model's sentence", async () => {
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
    const wire = await res.json();
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.claims[0].claim).toContain("price = 1420.5 inr");
    expect(wire.provenance.claims[0].claim).toContain("verified against price:RELIANCE:2025-10-31T08:40:00.000Z");
    expect(wire.provenance.claims[0].claim).not.toBe("Reliance trades at 1420.5");
  });

  it("unknown/missing provider timestamp: fundamentals with no disclosed time keep live values but claim no as-of anywhere in the prompt", async () => {
    ffState.lastUpdated = null; // the vendor disclosed no observation time
    stubProviderReply({
      answer: "Reliance looks steady.",
      claims: [
        {
          claim: "ROE is 18%",
          evidenceIds: ["fundamental:RELIANCE:roe:no-disclosed-observation-time"],
          assertions: [{ field: "roe", value: 18, unit: "percent" }],
        },
      ],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    const wire = await res.json();
    // the no-time id is citable and the claim verifies against it
    expect(wire.provenance.grounded).toBe(true);
    expect(capturedSystemPrompt).toContain("fundamental:RELIANCE:roe:no-disclosed-observation-time");
    // the ambiguous :seed fragment never appears for a live field…
    expect(capturedSystemPrompt).not.toContain("fundamental:RELIANCE:roe:seed");
    // …and no CURRENT timestamp was manufactured for the fundamentals
    // (the only 2026-09-30 occurrences ride the fixture's disclosed price path)
    expect(capturedSystemPrompt).toContain("no observation time disclosed");
  });

  it("hardcoded D/E fallback: an upstream that discloses no D/E yields the SEED-sourced D/E fact — never a live 0.45", async () => {
    ffState.debtToEquity = 0; // provider did not disclose D/E
    stubProviderReply({
      answer: "Balance sheet looks normal.",
      claims: [],
      uncertainties: [],
    });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    // the SEED value (coincidentally also 0.45) with SEED provenance — the
    // fabricated fallback would have arrived as de=0.45 ratio (live)
    expect(capturedSystemPrompt).toContain("fact: de=0.45 ratio (seed)");
    expect(capturedSystemPrompt).not.toContain("de=0.45 ratio (live)");
  });

  it("mixed-source PB: the prompt says mixed-source and claims no as-of for PB", async () => {
    stubProviderReply({ answer: "Steady.", claims: [], uncertainties: [] });

    const res = await POST(makeReq({ personaId: "buffett", symbol: "RELIANCE", history: [], message: "View on Reliance?" }));
    expect(res.status).toBe(200);
    expect(capturedSystemPrompt).toContain("P/B: 2.5253");
    expect(capturedSystemPrompt).toContain("mixed-source derivation");
    expect(capturedSystemPrompt).toContain("fundamental:RELIANCE:pb:no-disclosed-observation-time");
    // and PB is never presented with the fundamentals' observation time
    expect(capturedSystemPrompt).not.toContain("provenance: derived from live inputs (as-of 2026-09-30");
  });
});
