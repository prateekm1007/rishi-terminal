import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { createCanonicalStockState } from "@/lib/ai/evidence";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { PricePoint } from "@/lib/livePrice";

/**
 * Coder Directions 2026-10-02 round 3 (§5/§7) — the USER-path request
 * contract for detected financial-data intent:
 *
 *   1. SERVER-ENFORCED canonical tool engagement: an unambiguous data ask
 *      ("latest price of RELIANCE") is seeded through the canonical
 *      executor by the server — exactly like the deterministic probe —
 *      so the pipeline cannot fall back to grounded=false merely because
 *      the model declined to choose the tool. The model stays responsible
 *      for the final structured answer.
 *   2. ONE bounded final-answer repair: when the model's final structured
 *      reply fails the contract (schema or grounding), the loop re-asks
 *      ONCE with the server's rejection reasons appended to the SAME
 *      transcript. Same validator, same evidence, same surfaces — no
 *      second witness, no weakening. Exhausted repairs stay fail-closed.
 *   3. The run-5 hole: a claims-free reply that re-states a verified
 *      observation IN WORDS (dodging the numeric gate) must never be
 *      served as context-only when the loop holds ok tool data for a
 *      detected data ask — the honest state is the bounded BLOCKED text.
 *   4. Philosophy and advice asks are untouched: no seed, no block.
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

const GOOD_STRUCTURED = JSON.stringify({
  answer: "Reliance is trading at 1167.7 rupees.",
  claims: [
    {
      claim: "The latest observed price of RELIANCE is 1167.7 inr.",
      evidenceIds: ["price:RELIANCE:2026-10-01T09:45:00.000Z"],
      assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
    },
  ],
  uncertainties: [],
});

const SEEDED_ARGS = () => {
  const getPrice = vi.fn(async () => LIVE_PRICE);
  return { stockState: createCanonicalStockState({ getPrice }), getPrice };
};

describe("server-enforced canonical tool engagement (Coder Directions §5)", () => {
  it("seeds the canonical price tool for an unambiguous data ask even when the model never requests a tool, and the repair re-ask grounds the answer", async () => {
    // The model NEVER requests a tool: first a claims-free reply, then —
    // after the server's validation feedback — the correct structured cite.
    const { stockState, getPrice } = SEEDED_ARGS();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "Reliance Industries is a large Indian conglomerate with diversified operations.",
        claims: [],
        uncertainties: [],
      }),
      GOOD_STRUCTURED,
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });

    // The SERVER engaged the canonical tool even though the model never did.
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(answer?.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);
    // The repair re-ask happened on the SAME transcript (server feedback turn).
    expect(calls.length).toBe(2);
    const feedbackTurn = calls[1].loopTurns.find((t) => t.role === "user" && t.content.includes("SERVER VALIDATION FEEDBACK"));
    expect(feedbackTurn).toBeDefined();
    // The model's structured answer grounded against the seeded evidence.
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.groundingMode).toBe("structured-claims");
    expect(answer?.answer).toBe("price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)");
  });

  it("advice asks are NOT seeded — no tool runs for 'buy or sell'", async () => {
    const { stockState, getPrice } = SEEDED_ARGS();
    mockProviderReplies([
      JSON.stringify({
        answer: "Position sizing matters more than the binary buy-or-sell framing.",
        claims: [],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Should I buy or sell RELIANCE?",
      evidence: [],
      stockState,
    });

    // No canonical tool auto-executed for an advice ask.
    expect(getPrice).not.toHaveBeenCalled();
    expect(answer?.toolCalls ?? []).toEqual([]);
    // The existing intent backstop still terminates honestly.
    expect(answer?.claimsVerified).toBe(false);
  });

  it("philosophical questions are untouched — context-only reply served, no seed, no repair", async () => {
    const { stockState, getPrice } = SEEDED_ARGS();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "Patience is the investor's quietest edge.",
        claims: [],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What does patience mean in investing?",
      evidence: [],
      stockState,
    });

    expect(getPrice).not.toHaveBeenCalled();
    expect(calls.length).toBe(1);
    expect(answer?.claims).toHaveLength(0);
    expect(answer?.groundingMode).toBe("context-only");
    expect(answer?.structuredResponse).toBe("valid");
    expect(answer?.answer).toBe("Patience is the investor's quietest edge.");
  });
});

describe("bounded final-answer repair (same loop, same contract)", () => {
  it("a grounding-rejected final reply gets ONE re-ask and then grounds (seeded path)", async () => {
    const { stockState } = SEEDED_ARGS();
    const calls = mockProviderReplies([
      // First reply: cites an evidence id that does not exist and states the
      // number in prose — grounding must reject it (today: request dies).
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest price of RELIANCE is 1167.7 inr.",
            evidenceIds: ["price:RELIANCE:WRONG-TIMESTAMP"],
            assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
      GOOD_STRUCTURED,
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "RELIANCE" } },
    });

    expect(calls.length).toBe(2);
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.groundingMode).toBe("structured-claims");
    expect(answer?.structuredResponse).toBe("valid");
    expect(answer?.answer).toBe("price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)");
    // §11 attribution still holds: two completions, one seeded execution.
    expect(answer?.timings?.completions).toHaveLength(2);
    expect(answer?.timings?.toolExecutions).toHaveLength(1);
  });

  it("an exhausted repair stays fail-closed — the bounded honest response, never raw model text", async () => {
    const { stockState } = SEEDED_ARGS();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest price of RELIANCE is 1167.7 inr.",
            evidenceIds: ["price:RELIANCE:WRONG-TIMESTAMP"],
            assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
      "I cannot produce structured JSON, sorry.",
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "RELIANCE" } },
    });

    expect(calls.length).toBe(2); // exactly ONE repair re-ask
    expect(answer?.claimsVerified).toBe(false);
    expect(answer?.claims).toHaveLength(0);
    // Bounded honest surfaces only — no fabricated price statement.
    expect(answer?.answer).not.toContain("1167.7");
    expect(answer?.answer).toMatch(/could not be verified|BLOCKED/);
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
  });
});

describe("the words-in-prose hole (claims-free restatement of verified data)", () => {
  it("a claims-free reply re-stating the observation in words is repaired and, failing that, BLOCKED — never served as context-only", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      JSON.stringify({
        answer:
          "Reliance Industries is trading at one thousand one hundred sixty-seven point seven Indian rupees, down slightly from the previous close.",
        claims: [],
        uncertainties: [],
      }),
      JSON.stringify({
        answer: "As I mentioned, the price is around one thousand one hundred sixty-seven rupees.",
        claims: [],
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

    // The verified data the loop holds must not leak out as unverified prose.
    expect(answer?.groundingMode).not.toBe("context-only");
    expect(answer?.claimsVerified).toBe(false);
    expect(answer?.structuredResponse).toBe("blocked");
    expect(answer?.answer).toMatch(/BLOCKED/);
    expect(answer?.answer).not.toContain("one thousand");
  });
});
