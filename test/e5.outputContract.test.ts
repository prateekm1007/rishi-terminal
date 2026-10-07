/**
 * R16/R18 E5 — the model-output contract and repair interface for the two
 * DOMINANT battery failure classes (docs/evidence/round16/ai-battery-r16-fresh.md):
 *
 *   unsupported-numeric-prose  11/31 repairs — root cause: the model asserts
 *     the signed value correctly but writes natural-English prose that drops
 *     the minus sign ("declined 1.401 percent" vs assertion change=-1.401),
 *     or copies observation timestamps into the answer, or uses numbered
 *     lists whose marker digits are "unsupported figures".
 *   malformed-json  7/31 repairs — root cause: the provider request never
 *     constrained the output format, and the repair feedback never re-taught
 *     the JSON shape ("your reply was not parseable as a single JSON object"
 *     names the failure but not the contract).
 *
 * Rule 21: written FIRST, watched FAIL on main, then the fix, then GREEN.
 * The two behavioral pins at the end (signed prose grounds / unsigned prose
 * rejected) document the validator semantics the contract rule targets —
 * they are expected GREEN on main already (the validator is PROTECTED; the
 * fix lives in the contract, the repair interface, and the provider request).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
import { callOpenAiCompatible } from "@/lib/ai/providers/openaiCompatible";
import { createCanonicalStockState } from "@/lib/ai/evidence";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { PricePoint } from "@/lib/livePrice";

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
  vi.restoreAllMocks();
});

/** A NEGATIVE session change: the exact shape the signed-prose rules teach. */
const NEG_PRICE: PricePoint & { lastUpdated: string | null } = {
  price: 1020.5,
  change: -1.401,
  source: "yahoo-bulk",
  status: "CACHED",
  observedAt: "2026-10-05T09:45:00.000Z",
  volume24h: null,
  lastUpdated: null,
};

function mockProviderReplies(contents: string[]) {
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const content = contents[Math.min(i, contents.length - 1)];
    i++;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

/** Capture every serialized provider request body AND script the replies. */
function captureWithReplies(contents: string[]): string[] {
  const bodies: string[] = [];
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: unknown, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ""));
    const content = contents[Math.min(i, contents.length - 1)];
    i++;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return bodies;
}

function systemPromptOf(body: string): string {
  const parsed = JSON.parse(body) as { messages: Array<{ role: string; content: string }> };
  return parsed.messages.find(m => m.role === "system")?.content ?? "";
}

const SEEDED_ARGS = () => {
  const getPrice = vi.fn(async () => NEG_PRICE);
  return { stockState: createCanonicalStockState({ getPrice }), getPrice };
};

const EVIDENCE_ID = "price:RELIANCE:2026-10-05T09:45:00.000Z";
const TOOL_REQUEST = JSON.stringify({ tool: "getPrices", args: { symbol: "RELIANCE" } });
const TOOL_REQUEST_TCS = JSON.stringify({ tool: "getPrices", args: { symbol: "TCS" } });

/** Correctly-SIGNED structured reply — the shape the contract now teaches. */
const GOOD_SIGNED = JSON.stringify({
  answer: "RELIANCE trades at 1020.5 inr, changed by -1.401 percent in the session.",
  claims: [
    {
      claim: "The latest observed price of RELIANCE is 1020.5 inr.",
      evidenceIds: [EVIDENCE_ID],
      assertions: [{ field: "price", value: 1020.5, unit: "inr" }],
    },
    {
      claim: "The session change of RELIANCE is -1.401 percent.",
      evidenceIds: [EVIDENCE_ID],
      assertions: [{ field: "change", value: -1.401, unit: "percent" }],
    },
  ],
  uncertainties: [],
});

/** The battery's dominant numeric failure: assertion signed, prose unsigned. */
const UNSIGNED_PROSE = JSON.stringify({
  answer: "RELIANCE trades at 1020.5 inr, down 1.401 percent in the session.",
  claims: [
    {
      claim: "The session change of RELIANCE declined 1.401 percent.",
      evidenceIds: [EVIDENCE_ID],
      assertions: [{ field: "change", value: -1.401, unit: "percent" }],
    },
  ],
  uncertainties: [],
});

// ── T1: the provider request enforces JSON mode ──────────────────────────

describe("E5 — provider request layer (malformed-json root cause)", () => {
  it("callOpenAiCompatible sends response_format json_object (the wire-level JSON contract)", async () => {
    const bodies = captureWithReplies(["{}"]);
    await callOpenAiCompatible("https://example.invalid/v1", "k", "m", "sys", [], "hi", 1_000);
    expect(bodies).toHaveLength(1);
    expect(JSON.parse(bodies[0]).response_format).toEqual({ type: "json_object" });
  });

  it("a 400 that names response_format retries ONCE without it (bounded, availability-only)", async () => {
    const bodies: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: unknown, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      if (bodies.length === 1) {
        return new Response(
          JSON.stringify({ error: { message: "response_format is not supported by this model" } }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const out = await callOpenAiCompatible("https://example.invalid/v1", "k", "m", "sys", [], "hi", 1_000);
    expect(JSON.parse(bodies[0]).response_format).toEqual({ type: "json_object" });
    expect(bodies).toHaveLength(2);
    expect(JSON.parse(bodies[1]).response_format).toBeUndefined();
    expect(out.text).toBe("{\"ok\":true}");
  });

  it("a 400 that does NOT name response_format still fails closed (no silent param probing)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ error: { message: "invalid model id" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      callOpenAiCompatible("https://example.invalid/v1", "k", "m", "sys", [], "hi", 1_000),
    ).rejects.toThrow("HTTP 400");
  });
});

// ── T2: the malformed-json repair interface re-teaches the shape ─────────

describe("E5 — malformed-json repair teaches the exact final-JSON skeleton", () => {
  it("no-evidence path: repair feedback carries the context-only skeleton", async () => {
    mockProviderReplies(["Loss is inevitable. How you carry it determines everything.", "still just prose"]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "How should one respond to loss?",
      evidence: [],
    });
    expect(answer?.structuredResponse).toBe("invalid");
    const fb = answer?.timings?.repairs?.[0]?.feedback ?? "";
    expect(fb).toContain('"answer"');
    expect(fb).toContain('"uncertainties"');
    expect(fb).toContain('"claims": []');
  });

  it("evidence path: repair feedback carries the claims/assertions skeleton", async () => {
    const { stockState } = SEEDED_ARGS();
    // G7 driver 1: re-scoped to a two-symbol ask (the singleton data ask
    // is served deterministically before the post-tool completion now).
    mockProviderReplies([TOOL_REQUEST, TOOL_REQUEST_TCS, "Reliance is a great company, trust me.", "still not JSON"]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of RELIANCE and TCS.",
      evidence: [],
      stockState,
    });
    expect(answer?.structuredResponse).toBe("invalid");
    const fb = answer?.timings?.repairs?.[0]?.feedback ?? "";
    expect(fb).toContain('"answer"');
    expect(fb).toContain('"assertions"');
    expect(fb).toContain('"evidenceIds"');
  });
});

// ── T3/T4: the contract text covers the measured failure modes ───────────

describe("E5 — the response contract teaches signed values and bans list digits", () => {
  it("evidence contract: the signed-value rule with the WRONG example named", async () => {
    const bodies = captureWithReplies([TOOL_REQUEST, TOOL_REQUEST_TCS, GOOD_SIGNED]);
    const { stockState } = SEEDED_ARGS();
    // G7 driver 1: re-scoped to a two-symbol ask (see test/aiRouter.fastPath.test.ts).
    await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of RELIANCE and TCS.",
      evidence: [],
      stockState,
    });
    // The FIRST provider call carries the context-only contract (no evidence
    // yet); the evidence contract appears on the post-tool call, after the
    // TOOL RESULT lands — assert against THAT body (bodies[1]).
    const sys = systemPromptOf(bodies[1]);
    expect(sys).toContain("minus sign");
    expect(sys).toContain("down 1.401 percent");
    expect(sys).toContain("numbered list");
  });

  it("context-only contract: numbered lists are named as a rejection cause", async () => {
    const bodies = captureWithReplies(["{\"answer\":\"ok\",\"claims\":[],\"uncertainties\":[]}"]);
    await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "How should one respond to loss?",
      evidence: [],
    });
    const sys = systemPromptOf(bodies[0]);
    expect(sys).toContain("numbered list");
  });

  it("numeric repair feedback carries the signed-value rule (evidence path)", async () => {
    const { stockState } = SEEDED_ARGS();
    // G7 driver 1: re-scoped to a two-symbol ask (see test/aiRouter.fastPath.test.ts).
    mockProviderReplies([TOOL_REQUEST, TOOL_REQUEST_TCS, UNSIGNED_PROSE, GOOD_SIGNED]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of RELIANCE and TCS.",
      evidence: [],
      stockState,
    });
    const repairs = answer?.timings?.repairs ?? [];
    expect(repairs.length).toBeGreaterThanOrEqual(1);
    const numeric = repairs.find(r =>
      r.cause === "unsupported-numeric-prose" || r.cause === "field-value-mismatch");
    expect(numeric?.feedback ?? "").toContain("minus sign");
  });
});

// ── T5: behavioral pins of the PROTECTED validator (document the trap) ────

describe("E5 — validator semantics the contract rule targets (protected, unchanged)", () => {
  it("signed prose ('changed by -1.401 percent') GROUNDS — the rule's positive control", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([TOOL_REQUEST, GOOD_SIGNED]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.groundingMode ?? answer?.claims?.length ? "structured-claims" : "").toBe("structured-claims");
  });

  it("unsigned prose ('declined 1.401 percent' with assertion -1.401) is REJECTED — the failure mode the contract targets", async () => {
    const { stockState } = SEEDED_ARGS();
    // G7 driver 1: re-scoped to a two-symbol ask (see test/aiRouter.fastPath.test.ts).
    mockProviderReplies([TOOL_REQUEST, TOOL_REQUEST_TCS, UNSIGNED_PROSE, UNSIGNED_PROSE]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of RELIANCE and TCS.",
      evidence: [],
      stockState,
    });
    // The validator must keep refusing the unsigned magnitude (rule 23: no
    // weakening) — the contract change teaches the model, never the gate.
    expect(answer?.claimsVerified).toBe(false);
  });
});
