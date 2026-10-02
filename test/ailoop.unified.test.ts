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

// Shared production-grade fixtures (Commit N §9): one typed live price
// fact exactly as buildPriceItem produces for a successful observation.
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

// ── Commit N (Coder Directions §8–§9) — deterministic financial-intent
// enforcement + the production-grade end-to-end loop contract. The intent
// guard closes the model-choice gap: on the no-initial-evidence path a
// clean context-only reply is acceptable ONLY when the request is not a
// clear symbol-specific market-data ask, or when the model actually
// engaged the tool loop. A data question answered from nothing is BLOCKED.
describe("Commit N — financial-intent enforcement before context-only acceptance", () => {
  it("MUST FAIL PRE-N: a symbol-specific data question answered context-only WITHOUT any tool call is BLOCKED, not served", async () => {
    scriptProvider([
      JSON.stringify({
        answer: "Patience is the key to markets.",
        claims: [],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.",
      history: [],
      message: "What is the price of RELIANCE?",
      evidence: [], // general chat — no preselected symbol
      toolDeps: NO_TOOLS,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.structuredResponse).toBe("blocked");
    expect(wire.text).toMatch(/^BLOCKED/);
    // the unverified philosophical prose is NOT displayed either
    expect(wire.text).not.toContain("Patience is the key");
  });

  it("a philosophical question with NO symbol/data-term is still served context-only (guard does not over-trigger)", async () => {
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
    expect(answer!.answer).toBe("Patience is a temperament, not a technique.");
    expect(answer!.groundingMode).toBe("context-only");
    expect(answer!.structuredResponse).toBe("valid");
  });

  it("a data question where the model DID engage a tool is disclosed (not blocked) — even when the tool failed honestly", async () => {
    // FAKECOIN -> unknown-symbol TOOL ERROR -> the model's honest
    // unavailability reply is the correct context-only outcome (the loop
    // was engaged; the failure is disclosed, never fabricated).
    scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "FAKECOIN"}}',
      JSON.stringify({
        answer: "FAKECOIN is not in the security master — I cannot provide its price.",
        claims: [],
        uncertainties: ["no security-master entry for FAKECOIN"],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "What is the price of FAKECOIN?",
      evidence: [], toolDeps: TOOL_DEPS,
    });
    expect(answer!.structuredResponse).toBe("valid");
    expect(answer!.groundingMode).toBe("context-only");
    expect(answer!.claimsVerified).toBe(false);
  });

  it("a numeric improvised answer to a data question is discarded (number rule) — and with the guard, zero-tool context-only is gone entirely", async () => {
    scriptProvider([
      JSON.stringify({
        answer: "RELIANCE trades around 2500 and looks cheap.",
        claims: [],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "What is the price of RELIANCE?",
      evidence: [], toolDeps: NO_TOOLS,
    });
    const wire = toChatWire(answer!);
    // The fail-closed number rule (pre-existing): an unsupported number
    // can never reach the verified surface.
    expect(wire.text).not.toContain("2500");
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.text).not.toBe("RELIANCE trades around 2500 and looks cheap.");
  });
});

// ── Commit N (Coder Directions §9) — the production-grade contract for the
// COMPLETE loop: user -> model -> canonical tool -> evidence -> validated
// claims -> server-generated verified surface -> wire. This is the local
// deterministic twin of the production grounded-AI canary.
describe("Commit N — the complete general-chat loop contract (production-grade)", () => {
  it("What is the price of RELIANCE? -> getPrices -> grounded=true with the server-generated verified surface", async () => {
    const { calls } = scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "RELIANCE"}}',
      JSON.stringify({
        answer: "RELIANCE trades at 1000, up 0.5%.",
        claims: [
          {
            claim: "RELIANCE trades at 1000, up 0.5%",
            evidenceIds: [PRICE_ITEM.id],
            // BOTH numbers in the prose are asserted and both are carried
            // by the same typed fact item — the fail-closed validator
            // rejects any number the assertions do not cover.
            assertions: [
              { field: "price", value: 1000, unit: "inr" },
              { field: "change", value: 0.5, unit: "percent" },
            ],
          },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.",
      history: [],
      message: "What is the price of RELIANCE?",
      evidence: [],
      toolDeps: TOOL_DEPS,
    });

    // 1. Two provider completions: the tool request + the final structure.
    expect(calls.length).toBe(2);

    // 2. The tool audit trail shows the expected tool, ok, on the symbol.
    expect(answer!.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);

    // 3. Grounded: at least one validated claim, claimsVerified true.
    expect(answer!.claimsVerified).toBe(true);
    expect(answer!.claims.length).toBeGreaterThan(0);

    // 4. The verified surface is the SERVER-GENERATED statement built from
    //    the matched typed fact — never the model's prose.
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
    expect(wire.text).toContain("price = 1000 inr");
    expect(wire.text).not.toBe("RELIANCE trades at 1000, up 0.5%.");

    // 5. Commentary (the model prose) rides SEPARATELY, never merged.
    expect(wire.provenance.commentary).toBe("RELIANCE trades at 1000, up 0.5%.");

    // 6. The validated claim carries its evidence id and the
    //    server-generated verifiedFacts with the closed source state.
    const claim = wire.provenance.claims[0];
    expect(claim.evidenceIds).toEqual([PRICE_ITEM.id]);
    expect(claim.verifiedFacts?.length).toBeGreaterThan(0);
    const priceFact = claim.verifiedFacts?.find((f) => f.field === "price");
    expect(priceFact).toBeDefined();
    expect(priceFact?.value).toBe(1000);
    expect(priceFact?.sourceState).toBe("live");
    expect(priceFact?.statement).toContain("price = 1000 inr");

    // 7. An unsupported number cannot appear in the verified surface: the
    //    0.5% change IS carried by the same fact item, but a number the
    //    evidence does not carry (e.g. 9999) is absent by construction —
    //    the surface is rendered only from matched typed facts.
    expect(wire.text).not.toContain("9999");

    // 8. The wire is schema-valid end to end (the UI contract).
    const { ChatWireSchema } = await import("@/lib/ai/schemas");
    expect(ChatWireSchema.safeParse(wire).success).toBe(true);
  });

  it("negative: an unknown-symbol tool request returns an explicit failure state and never a fabricated price", async () => {
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
    // Explicit failure state on the audit trail:
    expect(answer!.toolCalls).toEqual([
      { tool: "getPrices", status: "unknown-symbol", symbol: "FAKECOIN" },
    ]);
    const wire = toChatWire(answer!);
    // No fabricated financial answer, no false grounding:
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.text).not.toMatch(/\d{3,}/);
  });

  it("MUST FAIL PRE-FIX (canary root cause): once a tool lands evidence, the model is re-prompted with the EVIDENCE contract", async () => {
    // Production evidence 2026-10-02 (scripts/prodGroundedCanary.mjs on
    // ce5fbcb): the tool executed (getPrices:ok) but the final reply was
    // structuredResponse=invalid — the live model, still holding the
    // CONTEXT-ONLY contract (which demands claims:[] and never teaches the
    // claims/evidenceIds/assertions format), improvised claims as an array
    // of fact-annotation STRINGS. Root cause: the system prompt was built
    // once from the INITIAL evidence and never rebuilt after tool evidence
    // landed. This regression pins both halves of the fix.
    const { calls } = scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "RELIANCE"}}',
      // The REAL model's reply shape after the fix (captured live): a
      // proper claims object with STRINGLY assertion values — exactly what
      // coerceStringlyTypedValues exists to admit at the parse boundary.
      JSON.stringify({
        answer: "RELIANCE trades at 1000 INR, down 0.5 percent on the session.",
        claims: [
          {
            claim: "The latest observed price for RELIANCE is 1000 INR with a session change of 0.5 percent.",
            evidenceIds: [PRICE_ITEM.id],
            assertions: [
              { field: "price", value: "1000", unit: "inr" },
              { field: "change", value: "0.5", unit: "percent" },
            ],
          },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [], // no initial evidence — the tool must supply it
      toolDeps: TOOL_DEPS,
    });

    // 1. The SECOND provider call's system prompt must carry the EVIDENCE
    //    contract (VERIFIED CONTEXT + the claims format), NOT the stale
    //    context-only contract that starves the model of the format.
    expect(calls.length).toBe(2);
    const secondSystem = JSON.stringify(calls[1]?.body ?? {});
    expect(secondSystem, "the post-tool system prompt must teach the claims format").toContain("VERIFIED CONTEXT");
    expect(
      secondSystem,
      "the post-tool system prompt must no longer demand empty claims",
    ).not.toContain("RESPONSE CONTRACT (no verified platform data attached)");

    // 2. The real-model-shaped reply (stringly values included) GROUNDS:
    //    validated claims + the server-generated verified surface.
    expect(answer!.claimsVerified).toBe(true);
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
    expect(wire.text).toContain("price = 1000 inr");
    expect(wire.provenance.commentary).toBe("RELIANCE trades at 1000 INR, down 0.5 percent on the session.");
  });

  it("the pre-fix failure shape itself stays honest: a string-array claims reply is STILL rejected (invalid), never displayed", async () => {
    // Belt-and-braces: the live model's PRE-FIX reply (claims as an array
    // of fact-annotation strings) must keep failing the schema — the fix
    // changes the PROMPT, it must not loosen the VALIDATOR.
    scriptProvider([
      '{"tool": "getPrices", "args": {"symbol": "RELIANCE"}}',
      JSON.stringify({
        answer: "The latest observed price of Reliance is 1294.30.",
        claims: ["price=1294.3 inr (live) - Source: price:RELIANCE:2026-10-02T05:53:40.947Z"],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are Damani.", history: [], message: "What is the latest price of RELIANCE?",
      evidence: [], toolDeps: TOOL_DEPS,
    });
    const wire = toChatWire(answer!);
    expect(answer!.structuredResponse).toBe("invalid");
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.text).not.toContain("1294");
  });
});
