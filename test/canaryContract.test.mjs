import { describe, expect, it } from "vitest";
import {
  evaluatePositiveCanary,
  evaluateNegativeCanary,
  extractNumbers,
  expectedVerifiedSurface,
} from "../scripts/lib/groundedCanaryContract.mjs";

/**
 * Coder Directions 2026-10-02 §6/§7 — the canary CONTRACT itself, unit
 * tested. Every violating fixture below documents a hole the OLD inline
 * checks let through (verified by the RED demo in the PR description):
 *
 *   - old positive check was `text.includes("price = ")` — extra
 *     unvalidated prose after the verified statement PASSED;
 *   - old negative check was `!/\d{3,}/` — a hallucinated "42" PASSED.
 *
 * The strengthened contract is structural: exact equality, bijection,
 * zero numbers, no fake commentary.
 */

const STATEMENT = "price = 1167.7 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)";
const EVIDENCE_ID = "price:RELIANCE:2026-10-01T09:45:00.000Z";

const CTX = {
  expectedProvider: "chat-api",
  expectedModel: "agnes-2.5-flash",
  expectedTool: "getPrices",
  expectedSymbol: "RELIANCE",
};

function positiveWire(overrides = {}) {
  return {
    status: 200,
    body: {
      text: STATEMENT,
      provenance: {
        provider: "chat-api",
        model: "agnes-2.5-flash",
        generatedAt: "2026-10-02T00:00:00.000Z",
        grounded: true,
        claimsVerified: true,
        groundingMode: "structured-claims",
        structuredResponse: "valid",
        claims: [
          {
            claim: "The latest observed price of RELIANCE is 1167.7 inr.",
            evidenceIds: [EVIDENCE_ID],
            assertions: [{ field: "price", value: 1167.7, unit: "inr" }],
            verifiedFacts: [
              {
                field: "price",
                value: 1167.7,
                unit: "inr",
                sourceState: "live",
                observedAt: "2026-10-01T09:45:00.000Z",
                statement: STATEMENT,
              },
            ],
          },
        ],
        commentary: "Reliance is trading at 1167.7 rupees.",
        groundingRejections: [],
        toolCalls: [{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }],
        ...overrides,
      },
    },
  };
}

function negativeWire(overrides = {}) {
  return {
    status: 200,
    body: {
      text: "I could not find any symbol named ZZZZNOPE in the platform's registry.",
      provenance: {
        provider: "chat-api",
        model: "agnes-2.5-flash",
        generatedAt: "2026-10-02T00:00:00.000Z",
        grounded: false,
        claimsVerified: false,
        groundingMode: "context-only",
        structuredResponse: "valid",
        claims: [],
        groundingRejections: [],
        toolCalls: [{ tool: "getPrices", status: "unknown-symbol", symbol: "ZZZZNOPE" }],
        ...overrides,
      },
    },
  };
}

function failing(checks, id) {
  return checks.find((c) => c.id === id);
}

describe("§6 positive contract", () => {
  it("passes a wire that satisfies every row", () => {
    const { checks, allPassed } = evaluatePositiveCanary(positiveWire(), CTX);
    expect(allPassed).toBe(true);
    expect(checks.filter((c) => !c.ok)).toEqual([]);
  });

  it("REJECTS extra unvalidated prose in the grounded text (old check: passed)", () => {
    const wire = positiveWire();
    wire.body.text = STATEMENT + "\nTrust me, this stock is great.";
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "verified-surface-exact")?.ok).toBe(false);
    expect(failing(checks, "no-extra-prose")?.ok).toBe(false);
    // The OLD check — text.includes("price = ") — accepted this wire.
    expect(wire.body.text.includes("price = ")).toBe(true);
  });

  it("REJECTS a verified fact that is not represented in the claim set", () => {
    // Text carries a statement that NO claim's verifiedFacts contain.
    const wire = positiveWire();
    wire.body.text = STATEMENT + "\nchange = 1.2 percent — live (observed/as-of 2026-10-01T09:45:00.000Z)";
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "verified-surface-exact")?.ok).toBe(false);
    expect(failing(checks, "facts-claims-bijection")?.ok).toBe(false);
  });

  it("REJECTS a claim whose verified fact is missing from the text surface", () => {
    const wire = positiveWire();
    wire.body.provenance.claims[0].verifiedFacts.push({
      field: "change",
      value: 1.2,
      unit: "percent",
      sourceState: "live",
      observedAt: "2026-10-01T09:45:00.000Z",
      statement: "change = 1.2 percent — live (observed/as-of 2026-10-01T09:45:00.000Z)",
    });
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "facts-claims-bijection")?.ok).toBe(false);
  });

  it("REJECTS commentary identical to the verified surface", () => {
    const wire = positiveWire();
    wire.body.provenance.commentary = STATEMENT;
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "commentary-present")?.ok).toBe(false);
  });

  it("REJECTS missing commentary (§6: commentary must be present and distinct)", () => {
    const wire = positiveWire();
    delete wire.body.provenance.commentary;
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "commentary-present")?.ok).toBe(false);
  });

  it("REJECTS a wrong provider/model identity (exact attestation)", () => {
    const wire = positiveWire();
    wire.body.provenance.provider = "openai";
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "identity-attested-exact")?.ok).toBe(false);
  });

  it("REJECTS claimsVerified=false even when grounded=true (impossible wire, pinned anyway)", () => {
    const wire = positiveWire();
    wire.body.provenance.claimsVerified = false;
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "claims-verified-true")?.ok).toBe(false);
  });

  it("REJECTS a number in the surface that no verified fact carries", () => {
    const wire = positiveWire();
    wire.body.text = "price = 1167.8 inr — live (observed/as-of 2026-10-01T09:45:00.000Z)";
    const { checks, allPassed } = evaluatePositiveCanary(wire, CTX);
    expect(allPassed).toBe(false);
    expect(failing(checks, "verified-surface-exact")?.ok).toBe(false);
    expect(failing(checks, "numbers-covered-by-facts")?.ok).toBe(false);
  });
});

describe("§7 negative contract", () => {
  it("passes an honest unknown-symbol wire", () => {
    const { checks, allPassed } = evaluateNegativeCanary(negativeWire());
    expect(allPassed).toBe(true);
    expect(checks.filter((c) => !c.ok)).toEqual([]);
  });

  it("REJECTS a small hallucinated number (old check: !/\\d{3,}/ PASSED '42')", () => {
    const wire = negativeWire();
    wire.body.text = "No data for ZZZZNOPE; maybe try symbol 42 instead.";
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "no-numeric-answer")?.ok).toBe(false);
    // The OLD check accepted this exact text:
    expect(/\d{3,}/.test(wire.body.text)).toBe(false);
  });

  it("REJECTS a fabricated price statement in the text", () => {
    const wire = negativeWire();
    wire.body.text = "price = 99.5 inr — unknown symbol guess";
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "no-server-price-stmt")?.ok).toBe(false);
    expect(failing(checks, "no-numeric-answer")?.ok).toBe(false);
  });

  it("REJECTS verified facts riding a failure response", () => {
    const wire = negativeWire();
    wire.body.provenance.claims = [
      {
        claim: "fabricated",
        evidenceIds: ["price:ZZZZNOPE:x"],
        assertions: [{ field: "price", value: 42, unit: "inr" }],
        verifiedFacts: [{ field: "price", value: 42, unit: "inr", sourceState: "live", observedAt: null, statement: "price = 42 inr — live (no disclosed observation time)" }],
      },
    ];
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "no-verified-price-fact")?.ok).toBe(false);
  });

  it("REJECTS false grounding", () => {
    const wire = negativeWire();
    wire.body.provenance.grounded = true;
    wire.body.provenance.claimsVerified = true;
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "no-false-grounding")?.ok).toBe(false);
  });

  it("REJECTS model commentary presented alongside a failure state", () => {
    const wire = negativeWire();
    wire.body.provenance.commentary = "It might be trading near 100 rupees though.";
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "no-fake-commentary")?.ok).toBe(false);
  });

  it("REJECTS a reply with neither an explicit failure state nor BLOCKED", () => {
    const wire = negativeWire();
    wire.body.provenance.toolCalls = [];
    wire.body.provenance.structuredResponse = "valid";
    const { checks, allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(false);
    expect(failing(checks, "explicit-failure-state")?.ok).toBe(false);
  });

  it("accepts the BLOCKED text as an explicit failure state", () => {
    const wire = negativeWire();
    wire.body.text = "BLOCKED: this looks like a request for specific market data, but no verified platform data was retrieved for it.";
    wire.body.provenance.structuredResponse = "blocked";
    wire.body.provenance.toolCalls = [];
    const { allPassed } = evaluateNegativeCanary(wire);
    expect(allPassed).toBe(true);
  });
});

describe("helpers", () => {
  it("extractNumbers strips ISO timestamps but keeps market figures", () => {
    const nums = extractNumbers("observed 2026-10-01T09:45:00.000Z at price 1,167.7");
    expect([...nums]).toEqual(["1167.7"]);
  });

  it("expectedVerifiedSurface dedupes statements across claims in order", () => {
    const claims = [
      { verifiedFacts: [{ statement: "a = 1 inr — live (no disclosed observation time)" }, { statement: "b = 2 inr — live (no disclosed observation time)" }] },
      { verifiedFacts: [{ statement: "a = 1 inr — live (no disclosed observation time)" }] },
    ];
    expect(expectedVerifiedSurface(claims)).toBe(
      "a = 1 inr — live (no disclosed observation time)\nb = 2 inr — live (no disclosed observation time)",
    );
  });
});
