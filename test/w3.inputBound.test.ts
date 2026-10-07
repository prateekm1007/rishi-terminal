/**
 * W3 hard-cap semantics audit (founder round-12, directives 10 + 11).
 *
 * The founder's audit found that the global token cap's "hard spend bound"
 * claim rested on an input estimate that was NOT mechanically enforced:
 *
 *   1. The tool loop's transcript echo carried the model's RAW tool-request
 *      args — model-controlled JSON bounded only by the provider's output
 *      cap (up to ~16k chars of repetitive junk within 2,048 tokens). Four
 *      junk tool requests park ~60k chars in EVERY subsequent attempt's
 *      input, past the 64,000-char budget the 22,000-token input estimate
 *      is derived from (globalSpend.ts header).
 *   2. The providers sent whatever they were handed: no send-boundary
 *      check existed, so "input <= 64,000 chars" was a comment, not a
 *      bound (direction 11: no reliance on measured worst cases).
 *   3. The settlement ledger honestly records provider-reported overage
 *      beyond the reservation, so the day's settled total CAN pass the
 *      cap — the contract wording must describe exactly that (rule 2),
 *      which is pinned in test/chat.globalSpend.test.ts and the module
 *      headers; this file pins the MECHANICAL half.
 *
 * Contract pinned here:
 *   - every provider attempt's serialized input stays within the enforced
 *     64,000-char bound, INCLUDING a model that fills its tool-request
 *     args with junk (rule 22: the ugly path first);
 *   - the transcript's tool-request echo carries canonical validated args,
 *     or a bounded truncation when args are invalid — never raw model JSON;
 *   - BOTH providers refuse (fail closed, before any fetch) a serialized
 *     request beyond the bound — a refused attempt fails over / 502s, it
 *     never silently overspends the reservation's input estimate;
 *   - the worst LEGAL payload (max persona prompt, max history, max
 *     message, four maximal ok tools) stays comfortably under the bound,
 *     so the guard can never wedge legitimate traffic (availability).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
import { callOpenAiCompatible } from "@/lib/ai/providers/openaiCompatible";
import { callGemini } from "@/lib/ai/providers/gemini";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { CANONICAL_PERSONAS } from "@/lib/chat/registry";
import { buildAiEvidencePackage, createCanonicalStockState } from "@/lib/ai/evidence";
import type { AiToolDeps } from "@/lib/ai/tools";

/**
 * The enforced serialized-input bound — the char budget the reservation's
 * 22,000-token input estimate derives from (64,000 chars at the calibrated
 * 3 chars/token). Kept as a literal here so the RED run compiles without
 * the fix module; test/globalSpendReservation.test.ts pins the module
 * constant to this exact value.
 */
const ENFORCED_BOUND_CHARS = 64_000;

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

interface CapturedMessage {
  role: string;
  content: string;
}

/** Script the provider and capture the EXACT serialized request bodies. */
function scriptProvider(replies: string[]): { bodies: Array<{ messages: CapturedMessage[]; raw: string }> } {
  const bodies: Array<{ messages: CapturedMessage[]; raw: string }> = [];
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const raw = String(init?.body ?? "");
    let messages: CapturedMessage[] = [];
    try {
      const parsed = JSON.parse(raw) as { messages?: CapturedMessage[] };
      messages = parsed.messages ?? [];
    } catch {
      messages = [];
    }
    bodies.push({ messages, raw });
    const reply = replies[Math.min(i, replies.length - 1)];
    i += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { bodies };
}

/** Sum of the message contents — the input char count the reservation
 *  estimate is about (the wire JSON overhead rides on top). */
function attemptInputChars(body: { messages: CapturedMessage[]; raw: string }): number {
  return body.messages.reduce((n, m) => n + m.content.length, 0);
}

/** A tool request whose args are ~15.5k chars of junk — valid JSON that
 *  fails the strict zod schema, sized to be emittable within a real
 *  model's 2,048-token output cap (repetitive runs tokenize >= 8 chars
 *  per token) and enough that four of them cross the 64,000-char budget. */
function junkToolRequest(): string {
  return JSON.stringify({ tool: "getStock", args: { note: "a".repeat(15_500) } });
}

const CONTEXT_ONLY_FINAL = JSON.stringify({
  answer: "Value investing is the discipline of buying below intrinsic value.",
  claims: [],
  uncertainties: [],
});

describe("W3 input bound — the ugly path: a model bloating its tool-request args", () => {
  it("every attempt's serialized input stays within the enforced bound (multi-turn valid-args flow)", async () => {
    // G7 driver 1: the bloated-args variant of this scenario now terminates
    // deterministically after ONE invalid-args outcome (pinned below), so
    // the multi-turn serialized-input bound is pinned on the valid-args
    // multi-tool flow — the bound must hold on every attempt, echoes and all.
    const stockReq = () => JSON.stringify({ tool: "getStock", args: { symbol: "RELIANCE" } });
    const { bodies } = scriptProvider([
      stockReq(),
      stockReq(),
      stockReq(),
      stockReq(),
      CONTEXT_ONLY_FINAL,
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "p",
      history: [],
      message: "Analyze RELIANCE for me.",
      evidence: [],
      toolDeps: { getFundamentals: async () => null, getPrice: async () => null },
    });
    expect(answer).not.toBeNull();
    expect(bodies.length).toBe(5);
    const perAttempt = bodies.map(attemptInputChars);
    // The reservation's input estimate (22,000 tokens = 64,000 chars at
    // the calibrated factor) must be a TRUE bound of what we send — for
    // every attempt, including the ones after tool turns.
    for (const chars of perAttempt) {
      expect(chars).toBeLessThanOrEqual(ENFORCED_BOUND_CHARS);
    }
  });

  it("a bloated junk-args request is bounded AND terminates deterministically — the honest invalid-args disclosure, one completion", async () => {
    const { bodies } = scriptProvider([junkToolRequest(), CONTEXT_ONLY_FINAL]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "p",
      history: [],
      message: "What is the philosophy of value investing?",
      evidence: [],
      toolDeps: { getFundamentals: async () => null, getPrice: async () => null },
    });
    expect(answer).not.toBeNull();
    // The invalid-args outcome is a terminal deterministic failure: the
    // loop serves the bounded disclosure instead of a second completion.
    expect(bodies.length).toBe(1);
    expect(answer!.synthesis).toBe("deterministic");
    expect(answer!.structuredResponse).toBe("valid");
    expect(answer!.toolCalls).toEqual([
      { tool: "getStock", status: "invalid-args" },
    ]);
    expect(answer!.answer).toContain("Invalid arguments for getStock");
    // The single attempt's serialized input stays within the bound.
    for (const chars of bodies.map(attemptInputChars)) {
      expect(chars).toBeLessThanOrEqual(ENFORCED_BOUND_CHARS);
    }
  });

  it("the transcript's tool-request echo carries canonical or bounded args — never raw model JSON", async () => {
    const { bodies } = scriptProvider([
      junkToolRequest(),
      CONTEXT_ONLY_FINAL,
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "p",
      history: [],
      message: "What is the philosophy of value investing?",
      evidence: [],
      toolDeps: { getFundamentals: async () => null, getPrice: async () => null },
    });
    expect(answer).not.toBeNull();
    // The junk-args echo never rides a SECOND attempt (the deterministic
    // invalid-args disclosure ends the loop after one completion); the
    // truncation guarantee itself is pinned by toolRequestTurn's unit
    // tests — here we pin the honest terminal state the loop serves.
    const assistantEchoes = bodies
      .flatMap(b => b.messages)
      .filter(m => m.role === "assistant");
    for (const echo of assistantEchoes) {
      expect(echo.content.length).toBeLessThanOrEqual(400);
    }
    expect(answer!.toolCalls).toEqual([{ tool: "getStock", status: "invalid-args" }]);
  });
});

describe("W3 input bound — the send boundary refuses oversized payloads (fail closed)", () => {
  it("callOpenAiCompatible throws before any fetch when the serialized body exceeds the bound", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 }),
    );
    await expect(
      callOpenAiCompatible(
        "https://example.invalid/v1",
        "k-test",
        "test-model",
        "s".repeat(ENFORCED_BOUND_CHARS + 1),
        [],
        "m",
        1000,
        [],
      ),
    ).rejects.toThrow(/serialized input/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("callGemini throws before any fetch when the serialized body exceeds the bound", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "x" }] } }] }),
        { status: 200 },
      ),
    );
    await expect(
      callGemini(
        "g-key",
        "test-model",
        "s".repeat(ENFORCED_BOUND_CHARS + 1),
        [],
        "m",
        1000,
        [],
      ),
    ).rejects.toThrow(/serialized input/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("both provider modules enforce the shared bound at the send boundary (source pin)", () => {
    for (const f of ["openaiCompatible.ts", "gemini.ts"]) {
      const src = readFileSync(join(process.cwd(), "lib/ai/providers", f), "utf8");
      expect(src).toContain("assertSerializedInputWithinBound");
    }
  });
});

describe("W3 input bound — the worst LEGAL payload stays comfortably under the bound", () => {
  it("max persona + max history + max message + four maximal ok tools has margin", async () => {
    // Max persona prompt across the canonical registry (the route's actual
    // system-prompt source).
    const maxPersona = Math.max(
      ...CANONICAL_PERSONAS.flatMap(p => [p.systemPrompt.length, p.stockPrompt?.length ?? 0]),
    );
    const persona = CANONICAL_PERSONAS.find(
      p => p.systemPrompt.length === maxPersona || p.stockPrompt?.length === maxPersona,
    )!;
    // Max-legal route contract: 20 history turns totalling exactly 8,000
    // chars, and a 2,000-char message (app/api/chat/route.ts constants).
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: "h".repeat(400),
    }));
    const message = "m".repeat(2000);
    // Worst legal equity path: the canonical evidence package for a real
    // registry symbol with unavailable live data (legal, seed-provenance),
    // then the four data tools at their worst (getPeers at limit 10).
    const deps = {
      getFundamentals: async () => null,
      getPrice: async () => null,
    } as AiToolDeps;
    const state = createCanonicalStockState(deps);
    const pkg = await buildAiEvidencePackage("RELIANCE", {}, state);
    expect(pkg).not.toBeNull();
    const { bodies } = scriptProvider([
      JSON.stringify({ tool: "getStock", args: { symbol: "RELIANCE" } }),
      JSON.stringify({ tool: "getFinancials", args: { symbol: "RELIANCE" } }),
      JSON.stringify({ tool: "getScore", args: { symbol: "RELIANCE" } }),
      JSON.stringify({ tool: "getPeers", args: { symbol: "RELIANCE", limit: 10 } }),
      CONTEXT_ONLY_FINAL,
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: persona.systemPrompt,
      history,
      message,
      evidence: pkg!.items,
      stockState: state,
      toolDeps: deps,
    });
    expect(answer).not.toBeNull();
    expect(bodies.length).toBe(5);
    const perAttempt = bodies.map(attemptInputChars);
    for (const chars of perAttempt) {
      expect(chars).toBeLessThanOrEqual(ENFORCED_BOUND_CHARS);
    }
    // Comfort margin: legal traffic must sit well under the bound so the
    // guard can only ever bite on a builder regression, never on a hard
    // but legitimate conversation.
    expect(Math.max(...perAttempt)).toBeLessThanOrEqual(Math.round(ENFORCED_BOUND_CHARS * 0.8));
  });
});
