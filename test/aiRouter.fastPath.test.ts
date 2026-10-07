import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
import { createCanonicalStockState } from "@/lib/ai/evidence";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { PricePoint } from "@/lib/livePrice";

/**
 * G7 driver 1 (founder round-26 directions 10 + 14; FDN 1(b) default from
 * round23/g7-latency-battery.md): the redundant post-tool model synthesis
 * is skipped when the loop's state is DETERMINISTIC — exactly one tool
 * executed on the no-initial-evidence path, and its outcome either (a)
 * carries typed facts for the intent-detected SINGLETON ask's own
 * canonical tool, or (b) is a terminal deterministic failure
 * (unknown-symbol / no-data / failed / invalid-args / unknown-tool). The
 * server then serves its OWN verified surface / bounded honest disclosure
 * — one completion total for the class.
 *
 * Rule 21 fail-first note: on the pre-fix tree every test below that
 * expects ONE provider call sees TWO (the post-tool synthesis completion
 * the fix removes), and the `synthesis: "deterministic"` mark does not
 * exist — verified RED before implementation.
 *
 * Guard pins (must NOT fast-path): multi-symbol asks (the model must
 * synthesize across tools), advice asks, unavailable observations (no
 * facts), the deterministic probe path (it exists to exercise the FULL
 * loop), and any state with zero or 2+ tool executions.
 */

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  resetProviderHealth();
  process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
  process.env.CHAT_API_KEY = "k-test";
  process.env.CHAT_MODEL = "test-model";
  delete process.env.GEMINI_API_KEY;
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
  change: null,
  source: "nse",
  status: "LIVE",
  observedAt: "2026-10-01T09:45:00.000Z",
  volume24h: null,
  lastUpdated: null,
};

/** Script a sequence of provider replies; returns the captured calls. */
function mockProviderReplies(contents: string[]) {
  const calls: Array<{ system: string; loopTurns: Array<{ role: string; content: string }> }> = [];
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const messages = body.messages ?? [];
    const firstUser = messages.findIndex((m, idx) => m.role === "user" && idx > 0);
    calls.push({
      system: messages.find((m) => m.role === "system")?.content ?? "",
      loopTurns: firstUser >= 0 ? messages.slice(firstUser + 1) : [],
    });
    const content = contents[Math.min(i, contents.length - 1)];
    i++;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return calls;
}

const SEEDED = () => {
  const getPrice = vi.fn(async () => LIVE_PRICE);
  return { stockState: createCanonicalStockState({ getPrice }), getPrice };
};

const TOOL_REQUEST = (tool: string, symbol: string) =>
  JSON.stringify({ tool, args: { symbol } });

describe("G7 driver 1: deterministic singleton fast path (one completion)", () => {
  it("(a) model-requested canonical tool on a singleton ask serves the server's verified surface with NO post-tool completion", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([TOOL_REQUEST("getPrices", "INFY")]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of INFY?",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(1);
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(answer?.synthesis).toBe("deterministic");
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.groundingMode).toBe("structured-claims");
    expect(answer?.answer).toBe("price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)");
    expect(answer?.claims.length).toBe(1);
    expect(answer?.claims[0].evidenceIds).toEqual(["price:INFY:2026-10-01T09:45:00.000Z"]);
    expect(answer?.claims[0].assertions).toEqual([{ field: "price", value: 1167.7, unit: "inr" }]);
    expect(answer?.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "INFY" }]);
  });

  it("(a) the reactive-seed path (model dodged) also serves deterministically — the repair feedback is never consumed", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "Reliance Industries is a large Indian conglomerate with diversified operations.",
        claims: [],
        uncertainties: [],
      }),
      // This reply must NEVER be consumed: no post-tool completion exists.
      TOOL_REQUEST("getPrices", "RELIANCE"),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(1);
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(answer?.synthesis).toBe("deterministic");
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.answer).toBe("price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)");
  });

  it("(b) a terminal unknown-symbol outcome serves the bounded honest disclosure with no post-tool completion", async () => {
    const { stockState } = SEEDED();
    const calls = mockProviderReplies([TOOL_REQUEST("getPrices", "BOGUSXYZ")]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of BOGUSXYZ?",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(1);
    expect(answer?.synthesis).toBe("deterministic");
    expect(answer?.claims).toEqual([]);
    expect(answer?.claimsVerified).toBe(false);
    expect(answer?.answer).toContain("not in the security master");
    expect(answer?.toolCalls).toEqual([{ tool: "getPrices", status: "unknown-symbol", symbol: "BOGUSXYZ" }]);
  });

  it("guard: a multi-symbol ask is NOT fast-pathed — the model synthesizes across the two tool results", async () => {
    const { stockState } = SEEDED();
    const calls = mockProviderReplies([
      TOOL_REQUEST("getPrices", "TCS"),
      TOOL_REQUEST("getPrices", "INFY"),
      JSON.stringify({
        answer: "Both verified prices follow.",
        claims: [
          { claim: "The latest observed price of TCS is 1167.7 inr.", evidenceIds: ["price:TCS:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
          { claim: "The latest observed price of INFY is 1167.7 inr.", evidenceIds: ["price:INFY:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
        ],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of TCS and INFY.",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(3);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
  });

  it("guard: the deterministic probe path still exercises the FULL loop (post-tool completion happens)", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "Reliance is trading.",
        claims: [
          { claim: "The latest observed price of RELIANCE is 1167.7 inr.", evidenceIds: ["price:RELIANCE:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
        ],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "RELIANCE" } },
    });

    expect(calls.length).toBe(1);
    expect(getPrice).toHaveBeenCalledTimes(1);
    // The completion that ran is the POST-TOOL synthesis (the probe's whole
    // point): model claims were validated, not server-substituted.
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
    expect(calls[0].loopTurns.some((t) => t.content.startsWith("TOOL RESULT:"))).toBe(true);
  });

  it("guard: an unavailable observation (no facts) is never fast-pathed — the honest model path stands", async () => {
    const getPrice = vi.fn(async () => null);
    const stockState = createCanonicalStockState({ getPrice });
    const calls = mockProviderReplies([
      TOOL_REQUEST("getPrices", "INFY"),
      JSON.stringify({ answer: "No verified price is available for that symbol right now.", claims: [], uncertainties: [] }),
      JSON.stringify({ answer: "Still no verified price.", claims: [], uncertainties: [] }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of INFY?",
      evidence: [],
      stockState,
    });

    expect(answer?.synthesis).toBeUndefined();
    // The fact-less outcome keeps today's bounded flow (repair then honest
    // BLOCKED) — the fast path never invents availability.
    expect(answer?.structuredResponse).toBe("blocked");
    expect(calls.length).toBe(3);
  });
});

describe("G7 audit — advice-shaped asks are never fast-pathed (target price / fair price)", () => {
  it("a target-price ask with a single price tool result runs the model synthesis (no deterministic surface)", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([
      TOOL_REQUEST("getPrices", "RELIANCE"),
      JSON.stringify({
        answer:
          "I do not provide target prices. The latest verified price follows, and how to think about targets is up to your own process.",
        claims: [
          { claim: "The latest observed price of RELIANCE is 1167.7 inr.", evidenceIds: ["price:RELIANCE:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
        ],
        uncertainties: ["no analyst target-price data exists on the platform"],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is RELIANCE's target price?",
      evidence: [],
      stockState,
    });

    // The advice ask MUST run the post-tool synthesis: two provider calls,
    // no deterministic mark. The price card alone under-answers an advice
    // ask (founder direction 11).
    expect(calls.length).toBe(2);
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.answer).toBe("price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)");
    expect(answer?.commentary).toContain("target prices");
  });

  it("a fair-price ask with a single price tool result runs the model synthesis", async () => {
    const { stockState } = SEEDED();
    const calls = mockProviderReplies([
      TOOL_REQUEST("getPrices", "RELIANCE"),
      JSON.stringify({
        answer: "Whether that is fair is your judgment; the verified observation follows.",
        claims: [
          { claim: "The latest observed price of RELIANCE is 1167.7 inr.", evidenceIds: ["price:RELIANCE:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
        ],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Is RELIANCE at a fair price?",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(2);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
  });
});
