/**
 * Commit O (Coder Directions 2026-10-02 #5–#7, #9) — the grounded-AI canary
 * contract + the unified Yahoo change semantics.
 *
 * Production evidence (docs/evidence/commit-o/raw-provider-diagnostics.md):
 * agnes-2.5-flash answers the price canary with
 *   {"answer": "...", "claims": ["price:RELIANCE:..."], ...}
 * — claims as EVIDENCE-ID STRINGS. The structured schema (correctly) rejects
 * that, the loop fail-closes to structuredResponse="invalid" and the
 * production canary can never reach grounded=true. Two fixes are pinned here:
 *
 *   1. The tool protocol must TEACH the final-answer shape (an explicit
 *      example with claim objects, evidenceIds and copied assertions) —
 *      deterministic, server-side, no new AI path.
 *   2. Yahoo change may not silently become 0: a change that cannot be
 *      established from the upstream payload is null (Rule 16), so the
 *      price evidence item carries NO change fact instead of a fabricated
 *      live "0 percent" — the canary's verified surface stays honest.
 *
 * Rule 21: rows marked MUST FAIL PRE-O were captured failing on the
 * pre-fix tree (docs/evidence/commit-o/failfirst-o2-raw.txt).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { buildPriceItem } from "@/lib/ai/evidence";
import { yahooChangeFromMeta } from "@/lib/livePrice";
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

const TOOL_DEPS: AiToolDeps = {
  getFundamentals: async () => null,
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

const PRICE_FACT_ID = "price:RELIANCE:2026-10-01T10:00:00.000Z";

describe("the agnes claims-shape defect is contained (production evidence pin)", () => {
  it("a reply whose claims are EVIDENCE-ID STRINGS (as agnes-2.5-flash emits) fail-closes — never grounded, never displayed", async () => {
    scriptProvider([
      JSON.stringify({ tool: "getPrices", args: { symbol: "RELIANCE" } }),
      JSON.stringify({
        answer: "The latest observed price for RELIANCE is 1167.7 INR, with a change of 0 percent as of October 1, 2026.",
        claims: [PRICE_FACT_ID], // ← the defect: strings, not claim objects
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.structuredResponse).toBe("invalid");
    // The model's (correct!) price text must NOT surface as a verified answer.
    expect(wire.text).not.toContain("1167.7");
    expect(wire.provenance.claims).toEqual([]);
  });
});

describe("the loop grounds when the model emits the contract shape (canary mechanics)", () => {
  it("tool request → server TOOL RESULT → claim-OBJECT reply → grounded=true + server-generated surface + separate commentary", async () => {
    scriptProvider([
      JSON.stringify({ tool: "getPrices", args: { symbol: "RELIANCE" } }),
      JSON.stringify({
        answer: "Reliance traded at the observed level; this is my read of the tape.",
        claims: [
          {
            claim: "RELIANCE's latest observed price is 1000 INR.",
            evidenceIds: [PRICE_FACT_ID],
            assertions: [{ field: "price", value: 1000, unit: "inr" }],
          },
        ],
        uncertainties: [],
      }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
    // The verified surface is SERVER-generated from the validated fact.
    expect(wire.text).toContain("price = 1000 inr");
    expect(wire.text).toContain("live");
    // Model prose rides separately, labelled commentary.
    expect(wire.provenance.commentary).toBe("Reliance traded at the observed level; this is my read of the tape.");
  });
});

describe("MUST FAIL PRE-O: the tool protocol teaches the final-answer shape", () => {
  it("the system prompt carries an explicit final-JSON example with claim objects, evidenceIds and copied assertions", async () => {
    const { calls } = scriptProvider([
      JSON.stringify({ answer: "ok", claims: [], uncertainties: [] }),
    ]);
    await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: "What is the latest price of RELIANCE?",
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
    });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const system = String((calls[0].body.messages as Array<{ role: string; content: string }>).find((m) => m.role === "system")!.content);
    // The example must show claims as OBJECTS (the exact defect the real
    // provider stumbles on) with evidenceIds + assertions vocabulary.
    expect(system).toContain('"evidenceIds"');
    expect(system).toContain('"assertions"');
    expect(system).toContain('"field"');
    expect(system).toContain('"unit"');
    // The example's claims array must be structurally valid JSON — a broken
    // example would teach the defect it exists to prevent. Slice from the
    // example start to the closing brace AFTER the uncertainties member.
    const shapeStart = system.indexOf("FINAL ANSWER SHAPE");
    expect(shapeStart).toBeGreaterThan(-1);
    const exampleStart = system.indexOf('{"answer"', shapeStart);
    expect(exampleStart).toBeGreaterThan(-1);
    const uncIdx = system.indexOf('"uncertainties"', exampleStart);
    expect(uncIdx).toBeGreaterThan(-1);
    const end = system.indexOf("}", uncIdx);
    expect(end).toBeGreaterThan(uncIdx);
    const example = system.slice(exampleStart, end + 1);
    // Placeholders (<...>) become 1 so the skeleton parses as JSON; a
    // structurally broken example would teach the defect it exists to prevent.
    expect(() => JSON.parse(example.replace(/<[^>]+>/g, "1").replace(/'/g, '"'))).not.toThrow();
    const parsedExample = JSON.parse(example.replace(/<[^>]+>/g, "1").replace(/'/g, '"')) as { claims?: Array<Record<string, unknown>> };
    // claims must be an array of OBJECTS carrying evidenceIds + assertions.
    expect(Array.isArray(parsedExample.claims)).toBe(true);
    expect(typeof parsedExample.claims?.[0]).toBe("object");
    expect(Array.isArray((parsedExample.claims?.[0] as Record<string, unknown>).evidenceIds)).toBe(true);
    expect(Array.isArray((parsedExample.claims?.[0] as Record<string, unknown>).assertions)).toBe(true);
    // Values the tool result marks NOT DISCLOSED must never be guessed.
    expect(system).toContain("NOT DISCLOSED");
  });
});

describe("MUST FAIL PRE-O: Yahoo change that cannot be established is null, never 0 (Rule 16)", () => {
  it("yahooChangeFromMeta: price-only meta → change null (was: silent 0)", () => {
    const meta = { regularMarketPrice: 1167.7, regularMarketTime: 1727784000 };
    const r = yahooChangeFromMeta(meta);
    expect(r).not.toBeNull();
    expect(r!.price).toBe(1167.7);
    expect(r!.change).toBeNull();
  });

  it("yahooChangeFromMeta: junk previousClose (0/NaN) never fabricates a change", () => {
    const r = yahooChangeFromMeta({ regularMarketPrice: 100, previousClose: 0, chartPreviousClose: Number.NaN });
    expect(r).not.toBeNull();
    expect(r!.change).toBeNull();
  });

  it("yahooChangeFromMeta: disclosed regularMarketChangePercent wins (unchanged contract)", () => {
    const r = yahooChangeFromMeta({ regularMarketPrice: 100, regularMarketChangePercent: 1.25 });
    expect(r).toEqual({ price: 100, change: 1.25 });
  });

  it("yahooChangeFromMeta: a genuine chartPreviousClose still computes the change", () => {
    const r = yahooChangeFromMeta({ regularMarketPrice: 110, chartPreviousClose: 100 });
    expect(r).toEqual({ price: 110, change: 10 });
  });

  it("yahooChangeFromMeta: no usable price → null result (unchanged contract)", () => {
    expect(yahooChangeFromMeta({ regularMarketPrice: -5 })).toBeNull();
    expect(yahooChangeFromMeta(null)).toBeNull();
  });
});

describe("MUST FAIL PRE-O: a null-change price observation carries NO change fact (no fabricated 0%)", () => {
  it("buildPriceItem: change null → no change fact, text does not invent '(change 0%)'", () => {
    const item = buildPriceItem("RELIANCE", {
      price: 1167.7,
      change: null,
      source: "yahoo",
      status: "LIVE",
      observedAt: "2026-10-01T09:45:00.000Z",
      lastUpdated: "2026-10-01T09:45:00.000Z",
    } as never);
    expect(item.facts?.some((f) => f.field === "price")).toBe(true);
    expect(item.facts?.some((f) => f.field === "change")).toBe(false);
    expect(item.text).not.toMatch(/change 0%/);
    expect(item.text).not.toMatch(/change null/);
  });

  it("buildPriceItem: a real change still produces the change fact (unchanged contract)", () => {
    const item = buildPriceItem("RELIANCE", {
      price: 1000, change: 0.5, source: "yahoo", status: "LIVE",
      observedAt: "2026-10-01T09:45:00.000Z", lastUpdated: "2026-10-01T09:45:00.000Z",
    } as never);
    expect(item.facts?.some((f) => f.field === "change" && f.value === 0.5)).toBe(true);
  });
});
