import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildAiEvidencePackage, validateGrounding } from "@/lib/ai/evidence";
import { generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import { resolveStockMetrics, getStockScore, SCORE_ENGINE_VERSION } from "@/lib/scoring";
import type { FullFundamentals } from "@/lib/liveFundamentals";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

// End-to-end AI loop (Commit B) — the loop is:
//   canonical evidence package → deterministic ids → structured model output
//   → evidence-ID validation (fail closed) → grounded / ungrounded state
//   → provenance-carrying wire.
// These tests prove the loop WORKS and, more importantly, that it FAILS
// CLOSED: an invented evidence id can never produce a "grounded" response,
// an unparseable model reply never becomes a claim, and the canonical Rishi
// score is consumed (never recomputed by the AI).

function liveFundamentals(symbol: string, lastUpdated: string): FullFundamentals {
  return {
    symbol, pe: 22.5, eps: 100, marketCap: 1_600_000, roe: 18, roce: 21,
    bookValue: 990, dividendYield: 0.4, faceValue: 10, debtToEquity: 0.45,
    opm: 24, revCagr3y: 14, epsCagr: 16, promoterHolding: 50.3, fcf: 30000,
    roa: 10, lastUpdated, source: "screener",
  };
}

const FAKE_PRICE = {
  price: 1420.5, change: 0.8, source: "yahoo", status: "LIVE" as const,
  observedAt: "2025-10-31T08:40:00.000Z", lastUpdated: "2025-10-31T08:40:00.000Z",
};

function makeDeps(overrides: Parameters<typeof buildAiEvidencePackage>[1] = {}) {
  return {
    getFundamentals: vi.fn(async () => liveFundamentals("RELIANCE", "2026-09-30T10:00:00.000Z")),
    getPrice: vi.fn(async () => FAKE_PRICE),
    ...overrides,
  };
}

beforeEach(() => resetProviderHealth());
afterEach(() => vi.restoreAllMocks());

describe("evidence assembler — canonical surfaces, deterministic ids", () => {
  it("builds a package with deterministic ids: same inputs → identical id list", async () => {
    const a = await buildAiEvidencePackage("RELIANCE", makeDeps());
    const b = await buildAiEvidencePackage("RELIANCE", makeDeps());
    expect(a).not.toBeNull();
    expect(a!.items.map(i => i.id)).toEqual(b!.items.map(i => i.id));
  });

  it("carries resolveStockMetrics provenance: live fields keep the provider asOf, seed fields claim none", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", makeDeps());
    const pe = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:pe:"));
    expect(pe).toBeDefined();
    expect(pe!.id).toBe("fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z"); // provider's asOf
    expect(pe!.text).toContain("live via vendor screener");
    const fcf = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:fcfMargin:"));
    expect(fcf!.id).toBe("fundamental:RELIANCE:fcfMargin:seed"); // seed → no claimed date
    expect(fcf!.text).toContain("SEED DATA");
  });

  it("carries TYPED FACTS (field/value/unit/source) for every numeric surface (Q4 Commit A)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", makeDeps());
    // fundamental fact: unit + source + value copied from the resolver
    const roe = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:roe:"));
    expect(roe!.facts).toEqual([{ field: "roe", value: 18, unit: "percent", source: "live" }]);
    expect(roe!.text).toContain("fact: roe=18 percent (live)"); // model-visible annotation
    // derived source is EXPLICIT on the fact
    const fcf = pkg!.items.find(i => i.id.startsWith("fundamental:RELIANCE:fcfMargin:"));
    expect(fcf!.facts![0].source).toBe("seed");
    // price facts: price in ₹, change in percent
    const price = pkg!.items.find(i => i.id.startsWith("price:RELIANCE:"));
    expect(price!.facts).toEqual([
      { field: "price", value: 1420.5, unit: "inr", source: "live" },
      { field: "change", value: 0.8, unit: "percent", source: "live" },
    ]);
    // score fact: derived by THE engine, value equals getStockScore output
    const resolved = resolveStockMetrics("RELIANCE", { ...liveFundamentals("RELIANCE", "2026-09-30T10:00:00.000Z"), isLive: true });
    const expected = getStockScore(resolved!);
    const score = pkg!.items.find(i => i.id.startsWith(`score:RELIANCE:${SCORE_ENGINE_VERSION}:`));
    if (expected.consensus === null) {
      expect(score!.facts).toBeUndefined(); // no fact → any numeric score assertion fails closed
    } else {
      expect(score!.facts).toEqual([{ field: "score", value: expected.consensus, unit: "points", source: "derived" }]);
    }
    // qualitative items carry NO facts (nothing to assert against)
    expect(pkg!.items.find(i => i.id === `stock:RELIANCE:profile`)!.facts).toBeUndefined();
    expect(pkg!.items.find(i => i.id === "news:RELIANCE:unavailable")!.facts).toBeUndefined();
  });

  it("price evidence keeps the upstream observation time; unavailable price is an explicit note (never fabricated)", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", makeDeps());
    const price = pkg!.items.find(i => i.id.startsWith("price:"));
    expect(price!.id).toBe("price:RELIANCE:2025-10-31T08:40:00.000Z");
    expect(price!.text).toContain("1420.5");

    const down = await buildAiEvidencePackage(
      "RELIANCE",
      makeDeps({ getPrice: vi.fn(async () => null) }),
    );
    const unavail = down!.items.find(i => i.id === "price:RELIANCE:unavailable");
    expect(unavail).toBeDefined();
    expect(unavail!.text).toMatch(/UNAVAILABLE/);
  });

  it("consumes THE canonical Rishi score (id embeds engine version; value equals getStockScore) — the AI never recomputes it", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", makeDeps());
    const resolved = resolveStockMetrics("RELIANCE", { ...liveFundamentals("RELIANCE", "2026-09-30T10:00:00.000Z"), isLive: true });
    const expected = getStockScore(resolved!);
    const score = pkg!.items.find(i => i.id.startsWith(`score:RELIANCE:${SCORE_ENGINE_VERSION}:`));
    expect(score).toBeDefined();
    if (expected.consensus === null) {
      expect(score!.text).toContain("Insufficient Data");
    } else {
      expect(score!.text).toContain(`${expected.consensus}/100`);
    }
    expect(score!.text).toContain("do not recompute or second-guess");
  });

  it("news: explicit unavailable note when no per-symbol surface is wired; news items use news:<stable-id> when supplied", async () => {
    const pkg = await buildAiEvidencePackage("RELIANCE", makeDeps());
    expect(pkg!.items.find(i => i.id === "news:RELIANCE:unavailable")).toBeDefined();

    const withNews = await buildAiEvidencePackage("RELIANCE", makeDeps({
      news: [{ id: "et-991", headline: "Refining margins expand", summary: "…", source: "ET", pubDate: "2026-09-30" }],
    }));
    const item = withNews!.items.find(i => i.id === "news:et-991");
    expect(item).toBeDefined();
    expect(item!.text).toContain("ET");
  });

  it("unknown symbol → null (registry-gated, no fabricated package)", async () => {
    expect(await buildAiEvidencePackage("NOT_A_STOCK", makeDeps())).toBeNull();
  });
});

describe("grounding validation — fail closed on any unknown evidence id, unsupported number, or field/value/unit mismatch", () => {
  const evidence: AiEvidenceItem[] = [
    {
      id: "price:TCS:2025-10-31T08:40:00.000Z",
      text: "Latest observed price: 1420.5 (change 0.8%). Source: yahoo | fact: price=1420.5 inr (live); change=0.8 percent (live)",
      facts: [
        { field: "price", value: 1420.5, unit: "inr", source: "live" },
        { field: "change", value: 0.8, unit: "percent", source: "live" },
      ],
    },
    {
      id: "score:TCS:rishi-merit-v1:seed-derived",
      text: "Rishi consensus score (rishi-merit-v1): 72/100 | category: HOLD | fact: score=72 points (derived)",
      facts: [{ field: "score", value: 72, unit: "points", source: "derived" }],
    },
  ];

  it("claims whose every id is known AND whose assertions match the cited facts → grounded=true", () => {
    // Audit 2026-10-02 (P0): the answer floor now requires EVERY stated
    // number to be a matched assertion value. "up 0.8%" in the answer needs
    // its own change assertion — asserting only price would fail closed.
    const r = validateGrounding(
      evidence,
      [
        {
          claim: "TCS trades at 1420.5",
          evidenceIds: ["price:TCS:2025-10-31T08:40:00.000Z"],
          assertions: [
            { field: "price", value: 1420.5, unit: "inr" },
            { field: "change", value: 0.8, unit: "percent" },
          ],
        },
      ],
      "TCS trades at 1420.5, up 0.8%.",
    );
    expect(r.grounded).toBe(true);
    expect(r.mode).toBe("structured-claims");
    expect(r.validatedClaims).toHaveLength(1);
  });

  it("one unknown id among many → ALL claims discarded, grounded=false, rejections disclosed", () => {
    const r = validateGrounding(evidence, [
      { claim: "score is 72", evidenceIds: ["score:TCS:rishi-merit-v1:seed-derived"], assertions: [{ field: "score", value: 72, unit: "points" }] },
      { claim: "poisoned claim", evidenceIds: ["price:TCS:made-up-time", "score:TCS:rishi-merit-v1:seed-derived"], assertions: [{ field: "price", value: 1, unit: "inr" }] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.mode).toBe("evidence-context");
    expect(r.validatedClaims).toHaveLength(0); // fail closed, not partially grounded
    expect(r.rejections.join(" ")).toContain("made-up-time");
  });

  it("claim without evidence ids is unverifiable and fails the batch", () => {
    const r = validateGrounding(evidence, [{ claim: "unsupported", evidenceIds: [] }]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("no evidence ids");
  });

  it("no claims at all → evidence-context (context injection is not grounding)", () => {
    const r = validateGrounding(evidence, []);
    expect(r).toMatchObject({ grounded: false, mode: "evidence-context" });
  });

  it("a valid id cited for a number the evidence does not contain → grounded=false (R4-02)", () => {
    const r = validateGrounding(evidence, [
      { claim: "TCS trades at 9999", evidenceIds: ["price:TCS:2025-10-31T08:40:00.000Z"], assertions: [{ field: "price", value: 9999, unit: "inr" }] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("9999");
  });

  it("a valid id cited for a DIFFERENT field's number → grounded=false (Q4 Commit A: semantic, not presence)", () => {
    // 0.8 is real (change fact on the price item) but asserted as the price.
    const r = validateGrounding(evidence, [
      { claim: "TCS trades at 0.8", evidenceIds: ["price:TCS:2025-10-31T08:40:00.000Z"], assertions: [{ field: "price", value: 0.8, unit: "inr" }] },
    ]);
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("price=0.8");
  });

  it("a number in the ANSWER that no cited evidence contains → grounded=false (R4-02)", () => {
    const r = validateGrounding(
      evidence,
      [{ claim: "score is 72", evidenceIds: ["score:TCS:rishi-merit-v1:seed-derived"], assertions: [{ field: "score", value: 72, unit: "points" }] }],
      "The score is 72, driven by momentum of 87.",
    );
    expect(r.grounded).toBe(false);
    expect(r.rejections.join(" ")).toContain("87");
  });
});

// ── Router integration: structured contract over a real provider mock ──

const REAL_FETCH = globalThis.fetch;

function openAiReply(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const EVIDENCE: AiEvidenceItem[] = [
  {
    id: "price:INFY:2025-10-31T08:40:00.000Z",
    text: "Latest observed price: 1600. | fact: price=1600 inr (live)",
    facts: [{ field: "price", value: 1600, unit: "inr", source: "live" }],
  },
  {
    id: "score:INFY:rishi-merit-v1:seed-derived",
    text: "Rishi consensus score: 71/100. | fact: score=71 points (derived)",
    facts: [{ field: "score", value: 71, unit: "points", source: "derived" }],
  },
];

async function withProvider(content: string, fn: () => Promise<void>): Promise<void> {
  vi.stubEnv("CHAT_API_BASE_URL", "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", "sk-test-key");
  const spy = vi.fn(async () => openAiReply(content));
  (globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch;
  try {
    await fn();
  } finally {
    (globalThis as { fetch: unknown }).fetch = REAL_FETCH;
    vi.unstubAllEnvs();
  }
}

describe("router — structured output is validated before grounding is claimed", () => {
  it("valid structured reply with known ids and matching assertions → grounded wire with claims", async () => {
    await withProvider(
      JSON.stringify({
        answer: "INFY shows a solid consensus.",
        claims: [
          { claim: "INFY trades at 1600", evidenceIds: ["price:INFY:2025-10-31T08:40:00.000Z"], assertions: [{ field: "price", value: 1600, unit: "inr" }] },
          { claim: "INFY consensus is 71", evidenceIds: ["score:INFY:rishi-merit-v1:seed-derived"], assertions: [{ field: "consensus", value: 71, unit: "points" }] },
        ],
        uncertainties: ["no news surface for INFY"],
      }),
      async () => {
        const answer = await generateEvidenceGroundedAnswer({
          systemPrompt: "You are a market sage.",
          history: [],
          message: "View on INFY?",
          evidence: EVIDENCE,
        });
        const wire = toChatWire(answer!);
        expect(wire.provenance.grounded).toBe(true);
        expect(wire.provenance.groundingMode).toBe("structured-claims");
        expect(wire.provenance.claims).toHaveLength(2);
        expect(wire.provenance.claims[0].evidenceIds).toContain("price:INFY:2025-10-31T08:40:00.000Z");
        expect(wire.provenance.claims[0].assertions).toEqual([{ field: "price", value: 1600, unit: "inr" }]);
        expect(wire.text).toBe("INFY shows a solid consensus.");
      },
    );
  });

  it("model invents an evidence id → fail closed: no claims, grounded=false, rejection disclosed", async () => {
    await withProvider(
      JSON.stringify({
        answer: "Answer with a fabricated citation.",
        claims: [{ claim: "INFY pays 90% dividend", evidenceIds: ["fundamental:INFY:dividend:invented"], assertions: [{ field: "dividend", value: 90, unit: "percent" }] }],
        uncertainties: [],
      }),
      async () => {
        const answer = await generateEvidenceGroundedAnswer({
          systemPrompt: "x", history: [], message: "q", evidence: EVIDENCE,
        });
        const wire = toChatWire(answer!);
        expect(wire.provenance.grounded).toBe(false);
        expect(wire.provenance.claims).toHaveLength(0);
        expect(answer!.uncertainties.join(" ")).toContain("invented");
        expect(answer!.claimsVerified).toBe(false);
      },
    );
  });

  it("valid id but WRONG unit assertion → fail closed (Q4 Commit A)", async () => {
    await withProvider(
      JSON.stringify({
        answer: "Answer asserting a wrong unit.",
        claims: [{ claim: "INFY trades at 1600 percent", evidenceIds: ["price:INFY:2025-10-31T08:40:00.000Z"], assertions: [{ field: "price", value: 1600, unit: "percent" }] }],
        uncertainties: [],
      }),
      async () => {
        const answer = await generateEvidenceGroundedAnswer({
          systemPrompt: "x", history: [], message: "q", evidence: EVIDENCE,
        });
        const wire = toChatWire(answer!);
        expect(wire.provenance.grounded).toBe(false);
        expect(answer!.uncertainties.join(" ")).toContain("price=1600 percent");
      },
    );
  });

  it("unparseable model reply → honest evidence-context downgrade, answer preserved (no fabricated claims)", async () => {
    await withProvider(
      "Just some plain prose that ignores the JSON contract entirely.",
      async () => {
        const answer = await generateEvidenceGroundedAnswer({
          systemPrompt: "x", history: [], message: "q", evidence: EVIDENCE,
        });
        const wire = toChatWire(answer!);
        expect(wire.provenance.grounded).toBe(false);
        expect(wire.provenance.claims).toHaveLength(0);
        expect(wire.text).toContain("plain prose");
        expect(answer!.uncertainties.join(" ")).toContain("structured response contract not satisfied");
      },
    );
  });

  it("model returning claims as empty → context-only (never 'grounded')", async () => {
    await withProvider(
      JSON.stringify({ answer: "Opinion only.", claims: [], uncertainties: [] }),
      async () => {
        const answer = await generateEvidenceGroundedAnswer({
          systemPrompt: "x", history: [], message: "q", evidence: EVIDENCE,
        });
        const wire = toChatWire(answer!);
        expect(wire.provenance.grounded).toBe(false);
        expect(wire.provenance.groundingMode).toBe("evidence-context");
      },
    );
  });

  it("no evidence → legacy unstructured path unchanged (grounded=false)", async () => {
    await withProvider("plain answer", async () => {
      const answer = await generateEvidenceGroundedAnswer({
        systemPrompt: "x", history: [], message: "q",
      });
      const wire = toChatWire(answer!);
      expect(wire.provenance.grounded).toBe(false);
      expect(wire.provenance.groundingMode).toBe("evidence-context");
      expect(wire.text).toBe("plain answer");
    });
  });
});
