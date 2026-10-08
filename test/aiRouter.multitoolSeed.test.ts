import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer } from "@/lib/ai/router";
import { createCanonicalStockState } from "@/lib/ai/evidence";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import {
  intentSeedTools,
  registrySymbolsInMessage,
  countRegistrySymbols,
  MAX_UPFRONT_SEED_SYMBOLS,
} from "@/lib/ai/financialIntent";
import type { PricePoint } from "@/lib/livePrice";
import type { FullFundamentals } from "@/lib/liveFundamentals";

/**
 * G7 driver 2 — the RECONCILIATION suite (#257 batch + #258 upfront seeds,
 * founder round-28 direction 5): the synthesis-required composition /
 * multitool classes' measured dominant cost is the SERIAL per-symbol
 * tool-request round trip — every extra symbol costs one extra provider
 * completion (N symbols = N+1 completions before the final answer).
 *
 * The ONE reconciled seed rule under test:
 *   1. advice-shaped asks (incl. compound advice+data wording) seed
 *      NOTHING — advice synthesizes over the model's OWN tool choices;
 *   2. a PURE price-comparison ask seeds ONE batched getPrices call for
 *      up to 8 named symbols (the #257 mechanism);
 *   3. any other multi-symbol data ask seeds each of the first
 *      MAX_UPFRONT_SEED_SYMBOLS named symbols' canonical tool (the #258
 *      mechanism) — the model fetches any remainder itself inside its
 *      preserved 4-call budget.
 *
 * This is evidence prefetch, NOT a fast path (direction 11): the model
 * still synthesizes, its structured answer still runs the full grounding
 * validation, and a 2+-symbol ask can never fast-path (the singleton gate
 * requires exactly one symbol). `synthesis` must stay undefined on every
 * multitool outcome — pinned below.
 *
 * Rule 21 fail-first note: on the pre-reconciliation tree `intentSeedTools`
 * does not exist (import failure = RED), and the router tests see 2 and 4
 * provider calls where the seeded loop needs 1 — the serial round trips
 * the driver removes.
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

const FULL_FUNDAMENTALS = async (symbol: string): Promise<FullFundamentals> => ({
  symbol, pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
  bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: 0.45,
  opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
  roa: 10, lastUpdated: "2026-09-30T10:00:00.000Z", source: "screener",
});

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
  const getFundamentals = vi.fn(FULL_FUNDAMENTALS);
  return {
    stockState: createCanonicalStockState({ getPrice, getFundamentals }),
    getPrice,
    getFundamentals,
  };
};

const TOOL_REQUEST = (tool: string, symbol: string) =>
  JSON.stringify({ tool, args: { symbol } });

const FINAL_TWO_PRICES = JSON.stringify({
  answer: "Both verified prices follow.",
  claims: [
    { claim: "The latest observed price of TCS is 1167.7 inr.", evidenceIds: ["price:TCS:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
    { claim: "The latest observed price of INFY is 1167.7 inr.", evidenceIds: ["price:INFY:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
  ],
  uncertainties: [],
});

const FINAL_THREE_PRICES = JSON.stringify({
  answer: "All three verified prices follow.",
  claims: [
    { claim: "The latest observed price of INFY is 1167.7 inr.", evidenceIds: ["price:INFY:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
    { claim: "The latest observed price of WIPRO is 1167.7 inr.", evidenceIds: ["price:WIPRO:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
    { claim: "The latest observed price of HCLTECH is 1167.7 inr.", evidenceIds: ["price:HCLTECH:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
  ],
  uncertainties: [],
});

const PE_CLAIM = (symbol: string) => ({
  claim: `The pe of ${symbol} is 22.5.`,
  evidenceIds: [`fundamental:${symbol}:pe:2026-09-30T10:00:00.000Z`],
  assertions: [{ field: "pe", value: 22.5, unit: "multiple" }],
});

describe("G7 driver 2 — unit: intentSeedTools (the multi-symbol upfront seed plan)", () => {
  it("a PURE two-symbol price comparison seeds ONE batched getPrices call (#257 rule)", () => {
    expect(intentSeedTools("Compare the latest prices of TCS and INFY.")).toEqual([
      { tool: "getPrices", args: { symbols: ["TCS", "INFY"] } },
    ]);
  });

  it("a PURE three-symbol price ask seeds ONE batched call for all three (batch cap 8, not 2)", () => {
    expect(intentSeedTools("What are the latest prices of INFY, WIPRO and HCLTECH?")).toEqual([
      { tool: "getPrices", args: { symbols: ["INFY", "WIPRO", "HCLTECH"] } },
    ]);
  });

  it("a fundamentals comparison (P/E) seeds BOTH symbols' financials tools (#258 rule)", () => {
    expect(intentSeedTools("Which is cheaper on P/E: SBIN or HDFCBANK?")).toEqual([
      { tool: "getFinancials", args: { symbol: "SBIN" } },
      { tool: "getFinancials", args: { symbol: "HDFCBANK" } },
    ]);
    expect(intentSeedTools("Compare revenue growth of RELIANCE and TCS.")).toEqual([
      { tool: "getFinancials", args: { symbol: "RELIANCE" } },
      { tool: "getFinancials", args: { symbol: "TCS" } },
    ]);
  });

  it("a NON-price three-symbol ask is capped at MAX_UPFRONT_SEED_SYMBOLS (message order)", () => {
    expect(MAX_UPFRONT_SEED_SYMBOLS).toBe(2);
    expect(intentSeedTools("Compare the P/E ratios of SBIN, HDFCBANK and AXISBANK.")).toEqual([
      { tool: "getFinancials", args: { symbol: "SBIN" } },
      { tool: "getFinancials", args: { symbol: "HDFCBANK" } },
    ]);
  });

  it("single-symbol asks seed NOTHING upfront (the reactive seed + fast path own that class)", () => {
    expect(intentSeedTools("What is the latest price of INFY?")).toEqual([]);
    expect(intentSeedTools("What is the current USD/INR rate?")).toEqual([]);
  });

  it("advice-shaped asks seed NOTHING (direction 11 — advice synthesizes)", () => {
    expect(intentSeedTools("Should I buy or sell RELIANCE?")).toEqual([]);
    expect(intentSeedTools("What is RELIANCE's target price?")).toEqual([]);
    expect(intentSeedTools("Is TCS at a fair price?")).toEqual([]);
  });

  it("compound advice+data wording seeds NOTHING (directive-7 re-audit — the leak class)", () => {
    expect(intentSeedTools("What is RELIANCE's price and should I buy it?")).toEqual([]);
    expect(intentSeedTools("Is RELIANCE worth buying at the current price?")).toEqual([]);
    expect(intentSeedTools("Is it a good time to buy TCS at this price?")).toEqual([]);
    expect(intentSeedTools("Is RELIANCE overvalued at the current price?")).toEqual([]);
    expect(intentSeedTools("Is INFY undervalued at today's price?")).toEqual([]);
    expect(intentSeedTools("Should I buy TCS or INFY at current prices?")).toEqual([]);
  });

  it("genuine multi-symbol data asks keep their seeds (controls — non-target behavior unchanged)", () => {
    expect(intentSeedTools("What are the current prices of RELIANCE and SBIN?")).toEqual([
      { tool: "getPrices", args: { symbols: ["RELIANCE", "SBIN"] } },
    ]);
    expect(intentSeedTools("Which is cheaper on P/E: SBIN or HDFCBANK?")).toHaveLength(2);
  });

  it("no-intent prose seeds nothing", () => {
    expect(intentSeedTools("What did the sages teach about patience in investing?")).toEqual([]);
  });

  it("registrySymbolsInMessage is countRegistrySymbols' source of truth (rule 14)", () => {
    expect(registrySymbolsInMessage("Compare TCS and INFY")).toEqual(["TCS", "INFY"]);
    expect(registrySymbolsInMessage("tcs vs tcs")).toEqual(["TCS"]);
    expect(registrySymbolsInMessage("What about USD/INR and gold?")).toEqual(["USD/INR", "GOLD"]);
    expect(countRegistrySymbols("Compare the latest prices of TCS and INFY.")).toBe(
      registrySymbolsInMessage("Compare the latest prices of TCS and INFY.").length,
    );
  });
});

describe("G7 driver 2 — router: the seeded multitool loop (one synthesis pass)", () => {
  it("a PURE two-symbol price ask: ONE batched tool execution, ONE evidence-complete synthesis, no fast path", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([FINAL_TWO_PRICES]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of TCS and INFY.",
      evidence: [],
      stockState,
    });

    // ONE provider call: the batched seed ran before it, the first
    // completion was evidence-complete, grounding validated the model's
    // own claims.
    expect(calls.length).toBe(1);
    expect(getPrice).toHaveBeenCalledTimes(2);
    // ONE TOOL RESULT turn — the batched payload carries BOTH items.
    expect(calls[0].loopTurns.filter((t) => t.content.startsWith("TOOL RESULT:")).length).toBe(1);
    // NOT a fast path: the model synthesized (direction 11).
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.claims.length).toBe(2);
    expect(answer?.toolCalls).toEqual([
      { tool: "getPrices", status: "ok", symbol: "TCS,INFY" },
    ]);
  });

  it("a PURE three-symbol price ask: ONE batched execution of all three, ONE synthesis", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([FINAL_THREE_PRICES]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What are the latest prices of INFY, WIPRO and HCLTECH?",
      evidence: [],
      stockState,
    });

    expect(calls.length).toBe(1);
    expect(getPrice).toHaveBeenCalledTimes(3);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.claims.length).toBe(3);
    expect(answer?.toolCalls).toEqual([
      { tool: "getPrices", status: "ok", symbol: "INFY,WIPRO,HCLTECH" },
    ]);
  });

  it("a NON-price three-symbol ask: two upfront seeds + the model fetches the third itself (budget preserved)", async () => {
    const { stockState, getFundamentals } = SEEDED();
    const calls = mockProviderReplies([
      TOOL_REQUEST("getFinancials", "AXISBANK"),
      JSON.stringify({
        answer: "All three verified pe ratios follow.",
        claims: [PE_CLAIM("SBIN"), PE_CLAIM("HDFCBANK"), PE_CLAIM("AXISBANK")],
        uncertainties: [],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the P/E ratios of SBIN, HDFCBANK and AXISBANK.",
      evidence: [],
      stockState,
    });

    // TWO provider calls: the model's own request for the unseeded third
    // symbol, then the final synthesis. Two seeds + one model request =
    // three tool executions, one budget slot spent by the model.
    expect(calls.length).toBe(2);
    expect(getFundamentals).toHaveBeenCalledTimes(3);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
    expect(answer?.claims.length).toBe(3);
    expect(answer?.toolCalls).toEqual([
      { tool: "getFinancials", status: "ok", symbol: "SBIN" },
      { tool: "getFinancials", status: "ok", symbol: "HDFCBANK" },
      { tool: "getFinancials", status: "ok", symbol: "AXISBANK" },
    ]);
  });

  it("guard: the probe and the upfront seeds are mutually exclusive (a probed request exercises the un-seeded loop)", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([
      JSON.stringify({
        answer: "The one verified price follows.",
        claims: [
          { claim: "The latest observed price of TCS is 1167.7 inr.", evidenceIds: ["price:TCS:2026-10-01T09:45:00.000Z"], assertions: [{ field: "price", value: 1167.7, unit: "inr" }] },
        ],
        uncertainties: ["no verified price was retrieved for the second symbol"],
      }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Compare the latest prices of TCS and INFY.",
      evidence: [],
      stockState,
      probeSeedToolCall: { tool: "getPrices", args: { symbol: "TCS" } },
    });

    // Only the probe executed (1 tool); no intent seeds stacked behind it.
    expect(getPrice).toHaveBeenCalledTimes(1);
    expect(calls.length).toBe(1);
    expect(answer?.synthesis).toBeUndefined();
    expect(answer?.claimsVerified).toBe(true);
  });

  it("guard: a multi-symbol ask with an advice shape seeds nothing and synthesizes", async () => {
    const { stockState, getPrice } = SEEDED();
    const calls = mockProviderReplies([
      JSON.stringify({ answer: "That is a judgment I will not make for you.", claims: [], uncertainties: [] }),
    ]);

    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "Should I buy or sell TCS or INFY?",
      evidence: [],
      stockState,
    });

    expect(getPrice).toHaveBeenCalledTimes(0);
    expect(calls.length).toBe(1);
    expect(answer?.synthesis).toBeUndefined();
  });
});
