/**
 * Commit M (founder §22–§24) — ONE end-to-end server AI pipeline.
 *
 * Pre-M there were TWO AI behavior paths:
 *   - symbol/evidence path → structured bounded tool loop (Commit L), and
 *   - the no-evidence `/rishis` path → RAW unstructured provider text.
 *
 * The second path is a bypass: a financial-looking question asked without a
 * preselected symbol got the provider's raw prose back — including prices,
 * scores and dates nobody verified — while the symbol path would have
 * discarded the same text as unverifiable. Required architecture: EVERY
 * request enters the same server orchestrator; the model may request
 * canonical tools in ANY path; a philosophical reply is context-only and
 * explicitly unverified; a financial-looking numeric reply that nobody
 * grounded can never be served as the answer; exhaustion is BLOCKED.
 *
 * Rule 21: the no-evidence bypass tests FAIL on the pre-M tree (the raw
 * path returns the provider text verbatim).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer, toChatWire, MAX_TOOL_ITERATIONS } from "@/lib/ai/router";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { AiToolDeps } from "@/lib/ai/tools";

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

const NO_TOOLS: AiToolDeps = {
  getFundamentals: async () => null,
  getPrice: async () => null,
};

/** Script the provider: each fetch call returns the next scripted reply. */
function scriptProvider(replies: string[]): { calls: Array<{ url: string; body: Record<string, unknown> }> } {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {} });
    const reply = replies[Math.min(i, replies.length - 1)];
    i += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { calls };
}

describe("the unified loop — no raw unstructured provider output can escape (founder §24)", () => {
  it("MUST FAIL PRE-M: a financial-looking numeric answer on the NO-EVIDENCE path is never served as the answer", async () => {
    scriptProvider(["RELIANCE is trading at 2500 right now and it is a great buy."]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.",
      history: [],
      message: "What is the price of RELIANCE?",
      evidence: [], // no preselected symbol → pre-M this path returned the RAW text
      toolDeps: NO_TOOLS,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    // The fabricated number can be neither grounded nor displayed:
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.text).not.toContain("2500");
    expect(wire.text).not.toBe("RELIANCE is trading at 2500 right now and it is a great buy.");
    expect(answer!.claimsVerified).toBe(false);
  });

  it("MUST FAIL PRE-M: claims with no evidence and no tools can never ground — not even the raw text is served", async () => {
    scriptProvider([
      JSON.stringify({
        answer: "The Rishi score is 88 and the price is 9999.",
        claims: [
          { claim: "The Rishi score is 88", evidenceIds: ["score:MADEUP:v9:2026-10-02"], assertions: [{ field: "score", value: 88, unit: "points" }] },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "score?",
      evidence: [], toolDeps: NO_TOOLS,
    });
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.text).not.toContain("9999");
    expect(wire.text).not.toContain("88");
  });

  it("a clearly non-financial reply with NO numbers is context-only: shown, explicitly unverified", async () => {
    scriptProvider([
      JSON.stringify({
        answer: "Patience is a temperament, not a technique.",
        claims: [],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "What is the most important quality?",
      evidence: [], toolDeps: NO_TOOLS,
    });
    expect(answer).not.toBeNull();
    expect(answer!.answer).toBe("Patience is a temperament, not a technique.");
    expect(answer!.claimsVerified).toBe(false); // explicitly unverified — never a verified surface
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.groundingMode).toBe("context-only");
  });

  it("MUST FAIL PRE-M: an unparseable reply on the no-evidence path is discarded, never shown raw", async () => {
    scriptProvider(["I am feeling chatty today!!! No JSON here."]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "hello",
      evidence: [], toolDeps: NO_TOOLS,
    });
    expect(answer!.answer).not.toBe("I am feeling chatty today!!! No JSON here.");
    expect(answer!.structuredResponse).toBe("invalid");
    expect(answer!.claimsVerified).toBe(false);
  });
});

describe("the unified loop — financial questions in general chat enter the same tool path (founder §23)", () => {
  const PRICE_ITEM = {
    id: "price:RELIANCE:2026-10-01T10:00:00.000Z",
    text: "Latest observed price: 1000 (change 0.5%). Source: test-vendor; status: LIVE; observation time: 2026-10-01T10:00:00.000Z. | fact: price=1000 inr (live); change=0.5 percent (live)",
    facts: [
      { field: "price", value: 1000, unit: "inr", source: "live" as const, observedAt: "2026-10-01T10:00:00.000Z" },
      { field: "change", value: 0.5, unit: "percent" as const, source: "live" as const, observedAt: "2026-10-01T10:00:00.000Z" },
    ],
  };

  const TOOL_DEPS: AiToolDeps = {
    ...NO_TOOLS,
    getPrice: async () => ({
      price: 1000, change: 0.5, source: "test-vendor", status: "LIVE",
      observedAt: "2026-10-01T10:00:00.000Z", lastUpdated: "2026-10-01T10:00:00.000Z",
    } as never),
  };

  it("MUST FAIL PRE-M: with NO initial evidence the model can request a canonical tool and ground its answer on the TOOL result", async () => {
    const { calls } = scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "RELIANCE"}}',
      JSON.stringify({
        answer: "RELIANCE trades at 1000.",
        claims: [
          {
            claim: "RELIANCE trades at 1000",
            evidenceIds: ["price:RELIANCE:2026-10-01T10:00:00.000Z"],
            assertions: [{ field: "price", value: 1000, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "What is RELIANCE trading at?",
      evidence: [], toolDeps: TOOL_DEPS,
    });
    // two provider completions: the tool request + the final structured reply
    expect(calls.length).toBe(2);
    expect(answer!.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);
    expect(answer!.claimsVerified).toBe(true);
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(true);
    // the verified surface is the server-generated statement — not the model prose
    expect(wire.text).toContain("price = 1000 inr");
    expect(wire.text).not.toBe("RELIANCE trades at 1000.");
  });

  it("an unsupported data request in general chat discloses unavailability — no invented numbers", async () => {
    scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "FAKECOIN"}}',
      JSON.stringify({
        answer: "FAKECOIN is not in the security master — I cannot provide its price.",
        claims: [],
        uncertainties: ["no security-master entry for FAKECOIN"],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "price of FAKECOIN?",
      evidence: [], toolDeps: TOOL_DEPS,
    });
    expect(answer!.toolCalls).toEqual([{ tool: "getPrices", status: "unknown-symbol", symbol: "FAKECOIN" }]);
    expect(answer!.claimsVerified).toBe(false);
    expect(answer!.answer).not.toMatch(/\d{3,}/); // no plausible price invented
  });

  it("tool exhaustion in the no-evidence path terminates BLOCKED (same budget, same honesty)", async () => {
    const replies = Array.from({ length: MAX_TOOL_ITERATIONS + 1 }, (_, i) =>
      JSON.stringify({ tool: "getStock", args: { symbol: `SYM${i}XYZ` } }),
    );
    const { calls } = scriptProvider(replies);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "analyze everything",
      evidence: [], toolDeps: NO_TOOLS,
    });
    expect(calls.length).toBe(MAX_TOOL_ITERATIONS + 1);
    expect(answer!.structuredResponse).toBe("blocked");
    expect(answer!.claimsVerified).toBe(false);
    expect(answer!.answer).toContain("BLOCKED");
  });

  it("REGRESSION (founder §27): the evidence path still grounds via the bounded loop (Commit-L behavior preserved)", async () => {
    const { calls } = scriptProvider([
      JSON.stringify({
        answer: "RELIANCE trades at 1000.",
        claims: [
          {
            claim: "RELIANCE trades at 1000",
            evidenceIds: [PRICE_ITEM.id],
            assertions: [{ field: "price", value: 1000, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "price?",
      evidence: [PRICE_ITEM], toolDeps: TOOL_DEPS,
    });
    expect(calls.length).toBe(1);
    expect(answer!.claimsVerified).toBe(true);
    expect(answer!.answer).toContain("price = 1000 inr");
    expect(answer!.commentary).toBe("RELIANCE trades at 1000.");
  });
});
