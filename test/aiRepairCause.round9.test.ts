/**
 * Round 9 (Coder Directions 2026-10-02, directives 7 + 12) — repair-cause
 * attribution as a FIRST-CLASS timing field.
 *
 * The router already knows WHY it re-asks; the cause must not be inferred
 * later from text logs. Every repair records its cause code:
 *
 *   malformed-json | schema-mismatch | evidence-id-mismatch |
 *   field-value-mismatch | unsupported-numeric-prose |
 *   forecast-advice-wording | provenance-wording | missing-claims |
 *   zero-tool-engagement
 *
 * and every completion is stage-labelled so the latency chain is explicit:
 *   initial completion → tool request → tool execution → final completion
 *   → repair completion → grounding.
 *
 * Rule 21: written first and watched FAIL on main (timings.repairs absent,
 * completions carried no stage).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
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

const LIVE_PRICE: PricePoint & { lastUpdated: string | null } = {
  price: 1167.7,
  change: 1.2,
  source: "nse",
  status: "LIVE",
  observedAt: "2026-10-01T09:45:00.000Z",
  volume24h: null,
  lastUpdated: null,
};

function mockProviderReplies(contents: string[]) {
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input: unknown, init?: RequestInit) => {
    const content = contents[Math.min(i, contents.length - 1)];
    i++;
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

const SEEDED_ARGS = () => {
  const getPrice = vi.fn(async () => LIVE_PRICE);
  return { stockState: createCanonicalStockState({ getPrice }), getPrice };
};

const EVIDENCE_ID = "price:RELIANCE:2026-10-01T09:45:00.000Z";

const TOOL_REQUEST = JSON.stringify({
  tool: "getPrices",
  args: { symbol: "RELIANCE" },
});

const GOOD_STRUCTURED = JSON.stringify({
  answer: "Reliance is trading at 1167.7 rupees.",
  claims: [
    {
      claim: "The latest observed price of RELIANCE is 1167.7 inr.",
      evidenceIds: [EVIDENCE_ID],
      assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
    },
  ],
  uncertainties: [],
});

describe("R9 — repair causes are first-class timing fields (directive 7)", () => {
  it("unparseable reply → repair cause malformed-json; stages initial → post-tool → repair", async () => {
    const { stockState } = SEEDED_ARGS();
    // The production-canary shape: the model engages the tool, then its
    // post-tool reply is unparseable prose. The repair re-ask grounds.
    mockProviderReplies([TOOL_REQUEST, "Reliance is a great company, trust me.", GOOD_STRUCTURED]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "malformed-json" }),
    ]);
    expect(answer?.timings?.completions.map((c: { stage: string }) => c.stage)).toEqual([
      "initial",
      "post-tool",
      "repair",
    ]);
  });

  it("parseable JSON failing the schema → repair cause schema-mismatch", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      // The production-canary shape: claims as an array of STRINGS.
      JSON.stringify({ answer: "ok", claims: ["price is 1167.7"], uncertainties: [] }),
      GOOD_STRUCTURED,
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "schema-mismatch" }),
    ]);
  });

  it("claim citing an unknown evidence id → repair cause evidence-id-mismatch", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr.",
            evidenceIds: ["price:RELIANCE:not-a-real-observation"],
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
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "evidence-id-mismatch" }),
    ]);
    // Stage chain: initial (tool request) → post-tool (bad cite) → repair.
    expect(answer?.timings?.completions.map((c: { stage: string }) => c.stage)).toEqual([
      "initial",
      "post-tool",
      "repair",
    ]);
  });

  it("assertion with a wrong value → repair cause field-value-mismatch", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "Reliance is trading at 9999 rupees.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 9999 inr.",
            evidenceIds: [EVIDENCE_ID],
            assertions: [{ field: "price", value: 9999, unit: "inr" }],
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
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "field-value-mismatch" }),
    ]);
  });

  it("answer carrying an unsupported figure → repair cause unsupported-numeric-prose", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees, up 45 points on the day.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr.",
            evidenceIds: [EVIDENCE_ID],
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
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "unsupported-numeric-prose" }),
    ]);
  });

  it("forecast wording in a claim → repair cause forecast-advice-wording", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr and will rise.",
            evidenceIds: [EVIDENCE_ID],
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
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "forecast-advice-wording" }),
    ]);
  });

  it("claims-free restatement after ok tool data on a data ask → repair cause missing-claims", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "The price of Reliance recently changed upward.",
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
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "missing-claims" }),
    ]);
  });

  it("financial ask answered with zero tool engagement → repair cause zero-tool-engagement", async () => {
    const { stockState, getPrice } = SEEDED_ARGS();
    mockProviderReplies([
      JSON.stringify({
        answer: "Reliance Industries is a large Indian conglomerate.",
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
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs).toEqual([
      expect.objectContaining({ cause: "zero-tool-engagement" }),
    ]);
    // The seed executed through the real executor between the two
    // completions: the repair completion follows a tool execution.
    expect(answer?.timings?.toolExecutions).toEqual([
      expect.objectContaining({ tool: "getPrices", status: "ok" }),
    ]);
  });
});

describe("R9 — the latency chain is explicit in timings (directive 12)", () => {
  it("a clean tool-grounded request labels stages initial → post-tool with no repairs", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderReplies([TOOL_REQUEST, GOOD_STRUCTURED]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });
    expect(answer?.claimsVerified).toBe(true);
    const timings = answer?.timings;
    expect(timings?.completions).toHaveLength(2);
    expect(timings?.completions[0]).toMatchObject({ stage: "initial", outcome: "tool-request" });
    expect(timings?.completions[1]).toMatchObject({ stage: "post-tool", outcome: "final-response" });
    expect(timings?.repairs).toEqual([]);
    expect(timings?.toolExecutions).toHaveLength(1);
    expect(typeof timings?.validationMs).toBe("number");
    expect(typeof timings?.totalMs).toBe("number");
  });
});
