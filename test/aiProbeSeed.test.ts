import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { createCanonicalStockState } from "@/lib/ai/evidence";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { PricePoint } from "@/lib/livePrice";

/**
 * Coder Directions 2026-10-02 §8 — the deterministic probe seed.
 *
 * THE regression test for the 2026-10-02 production defect: on the
 * no-initial-evidence path, after a tool lands evidence, the system prompt
 * MUST be rebuilt with the evidence contract (VERIFIED CONTEXT + the
 * claims/evidenceIds/assertions format). The old code composed the prompt
 * once from the INITIAL (empty) evidence, so the model saw the
 * context-only contract and could never ground — the production canary
 * caught it; this test pins the fix deterministically.
 *
 * The seed exercises the exact production path: real executor, real
 * evidence injection, real provider call (mocked transport only), real
 * structured parse, real grounding validation, real server-generated
 * surface, real timings.
 */

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  resetProviderHealth();
  process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
  process.env.CHAT_API_KEY = "k-test";
  process.env.CHAT_MODEL = "test-model";
});
afterEach(() => {
  process.env.CHAT_API_BASE_URL = ENV_BACKUP.CHAT_API_BASE_URL;
  process.env.CHAT_API_KEY = ENV_BACKUP.CHAT_API_KEY;
  process.env.CHAT_MODEL = ENV_BACKUP.CHAT_MODEL;
  process.env.GEMINI_API_KEY = ENV_BACKUP.GEMINI_API_KEY;
  vi.restoreAllMocks();
});

const LIVE_PRICE: PricePoint & { lastUpdated: string | null } = {
  price: 1167.7,
  change: 1.2,
  source: "nse",
  status: "LIVE",
  observedAt: "2026-10-01T09:45:00.000Z",
  volume24h: null,
  lastUpdated: null,
};

/** Capture what the provider transport actually received. */
interface CapturedCall {
  system: string;
  userMessage: string;
  loopTurns: Array<{ role: string; content: string }>;
}

function mockProviderReply(content: string): CapturedCall[] {
  const calls: CapturedCall[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const messages = body.messages ?? [];
    calls.push({
      system: messages.find((m) => m.role === "system")?.content ?? "",
      userMessage: messages.find((m) => m.role === "user")?.content ?? "",
      // messages = [system, ...history(empty here), user, ...loopTurns]
      loopTurns: messages.slice(messages.findIndex((m, i) => m.role === "user" && i > 0) + 1),
    });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return calls;
}

describe("probeSeedToolCall — the deterministic seeded loop (§8)", () => {
  it("executes the seeded tool, REBUILDS the prompt with the evidence contract, and grounds the structured reply", async () => {
    // The model's final structured reply cites the evidence id the SEEDED
    // tool produced and asserts its fact exactly.
    const calls = mockProviderReply(
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr.",
            evidenceIds: ["price:RELIANCE:2026-10-01T09:45:00.000Z"],
            assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
    );

    const getPrice = vi.fn(async () => LIVE_PRICE);
    const stockState = createCanonicalStockState({ getPrice });
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "RELIANCE" } },
    });

    expect(answer).not.toBeNull();
    // The seeded tool executed through the canonical executor.
    expect(answer?.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);
    expect(getPrice).toHaveBeenCalledTimes(1);

    // THE production-defect assertion: the provider's system prompt was
    // REBUILT with the evidence contract after the seeded tool landed.
    expect(calls.length).toBe(1);
    const system = calls[0].system;
    expect(system).toContain("VERIFIED CONTEXT");
    expect(system).toContain("price:RELIANCE:2026-10-01T09:45:00.000Z");
    expect(system).toContain("Latest observed price");
    // The seeded tool turn + its server-generated result rode as loop turns.
    const toolTurn = calls[0].loopTurns.find((t) => t.content.includes("TOOL RESULT"));
    expect(toolTurn).toBeDefined();
    expect(toolTurn?.content).toContain("getPrices");

    // Grounding closed end to end.
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.groundingMode).toBe("structured-claims");
    expect(answer?.answer).toBe(
      "price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)",
    );
    expect(answer?.commentary).toBe("Reliance is trading at 1167.7 rupees.");

    // §11: timings were attributed (one completion, one tool execution).
    expect(answer?.timings).toBeDefined();
    expect(answer?.timings?.providerAttempts).toBe(1);
    expect(answer?.timings?.completions).toHaveLength(1);
    expect(answer?.timings?.completions[0].outcome).toBe("final-response");
    expect(answer?.timings?.toolExecutions).toHaveLength(1);
    expect(answer?.timings?.toolExecutions[0].tool).toBe("getPrices");
    expect(answer?.timings?.toolExecutions[0].status).toBe("ok");
    expect(answer?.timings?.priceFetches).toEqual([{ symbol: "RELIANCE", ms: expect.any(Number) }]);

    // The wire carries claimsVerified + timings (§6/§11).
    const wire = toChatWire(answer!);
    expect(wire.provenance.claimsVerified).toBe(true);
    expect(wire.provenance.timings?.totalMs).toBeGreaterThanOrEqual(0);
  });

  it("a seeded UNKNOWN symbol executes the honest unknown-symbol failure and never fabricates", async () => {
    const calls = mockProviderReply(
      JSON.stringify({
        answer: "I could not find any symbol named ZZZZNOPE in the platform's registry.",
        claims: [],
        uncertainties: ["ZZZZNOPE is not in the security master"],
      }),
    );

    const stockState = createCanonicalStockState({});
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of ZZZZNOPE?",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "ZZZZNOPE" } },
    });

    expect(answer).not.toBeNull();
    // The honest explicit failure state — not ok, never fabricated.
    expect(answer?.toolCalls).toEqual([{ tool: "getPrices", status: "unknown-symbol", symbol: "ZZZZNOPE" }]);
    // No evidence was injected (the tool failed), so the prompt carried the
    // context-only contract and the model's clean reply stands as context.
    expect(answer?.claimsVerified).toBe(false);
    expect(answer?.groundingMode).toBe("context-only");
    expect(answer?.claims).toEqual([]);
    // The TOOL ERROR turn rode to the provider.
    const errTurn = calls[0]?.loopTurns.find((t) => t.content.includes("TOOL ERROR"));
    expect(errTurn).toBeDefined();
    expect(errTurn?.content).toContain("unknown-symbol");
    // No verified surface, no fabricated price.
    expect(answer?.answer).not.toContain("price =");
  });
});
