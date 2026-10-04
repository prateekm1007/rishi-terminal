/**
 * Round 15 (Coder Directions 2026-10-04, §4) — field-value discipline.
 *
 * The R15 baseline battery (production 618002b,
 * docs/evidence/round15/ai-latency-battery-r15-baseline.json) measured
 * field-value-mismatch as the dominant financial repair cause (7 of 22
 * financial repairs; founder optimization order #1). The observed
 * mechanism: the model places a number from the WRONG fact into a claim
 * field (a price number in the change field, a year fragment in the
 * change field), the validator correctly rejects, and the bounded repair
 * re-ask burns a full provider completion.
 *
 * The fix is prompt-side only — teach the per-field copying rule BEFORE
 * the first pass (cheapest place it can act) and name it in the repair
 * feedback. No validator is weakened, no retry is added.
 *
 * Rule 21 (fail-first): tests 1–2 were written first and watched FAIL on
 * the branch before the router change (the contract carried no per-field
 * rule, the repair feedback no field-discipline clause); test 3 is the
 * regression guard proving correctly-fielded multi-assertion claims still
 * ground (the change must not disturb the validator or correct replies).
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

/** Captures every provider request body so the prompts themselves can be
 *  asserted (the fix is prompt-side; the wire must carry it). */
function mockProviderRepliesCapturing(contents: string[]) {
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

describe("R15 — field-value discipline (founder optimization #1)", () => {
  it("the first-pass contract carries the per-field copying rule and a worked example", async () => {
    const { stockState } = SEEDED_ARGS();
    const bodies = mockProviderRepliesCapturing([TOOL_REQUEST, GOOD_STRUCTURED]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState,
    });
    expect(answer?.claimsVerified).toBe(true);
    const contract = bodies.join("\n");
    // The per-field rule: each assertion's value comes from THAT field's fact.
    expect(contract).toContain("THAT SAME field");
    // The worked example names the exact observed failure mode.
    expect(contract).toContain("1741.05 in the change field is REJECTED");
  });

  it("cross-field assertion (price value in the change field) → field-value-mismatch repair feedback names the field-discipline rule", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderRepliesCapturing([
      TOOL_REQUEST,
      // The exact production battery failure: the model asserts the PRICE
      // number (1167.7) in the change field.
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr, change 1167.7%.",
            evidenceIds: [EVIDENCE_ID],
            assertions: [{ field: "change", value: 1167.7, unit: "%" }],
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
    const repairs = answer?.timings?.repairs ?? [];
    expect(repairs).toEqual([
      expect.objectContaining({ cause: "field-value-mismatch" }),
    ]);
    const feedback = repairs[0]?.feedback ?? "";
    // The rejection names the exact mismatch (this sub-case surfaces the
    // no-matching-fact line; the battery's price-vs-change sub-case
    // surfaces "but the matched ... assertion is ..." — both classify as
    // field-value-mismatch, router.ts:142). The feedback must also carry
    // the per-field rule so the repair can actually fix it.
    expect(feedback).toContain("no matching field/value/unit fact");
    expect(feedback).toContain("its OWN field");
  });

  it("regression guard: a correctly-fielded multi-assertion claim grounds with no repair", async () => {
    const { stockState } = SEEDED_ARGS();
    mockProviderRepliesCapturing([
      TOOL_REQUEST,
      JSON.stringify({
        answer: "Reliance is trading at 1167.7 rupees, up 1.2%.",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr, up 1.2%.",
            evidenceIds: [EVIDENCE_ID],
            assertions: [
              { field: "price", value: 1167.7, unit: "inr" },
              { field: "change", value: 1.2, unit: "%" },
            ],
          },
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
    });
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.timings?.repairs ?? []).toEqual([]);
  });
});
