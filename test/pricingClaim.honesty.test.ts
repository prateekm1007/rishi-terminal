/**
 * PRICING-CLAIM (founder direction 6, 2026-10-10): the /pricing chip
 * "AI Rishi chat with verified, grounded answers" overstates the shipped
 * behavior. The chat pipeline verifies claims when a reply carries
 * financial numbers (validateGrounding + the two-surface answer), but
 * philosophical/context-only replies are served and honestly labeled
 * "context-only · not numerically verified" — an UNCONDITIONAL
 * "verified, grounded answers" claim is not true per-reply.
 *
 * Decision (C10 protocol, logged in the PR thread): DELETE the
 * overclaim — the root cause is the copy promising more than the system
 * guarantees per reply. The replacement describes what is structurally
 * guaranteed on EVERY reply: grounding provenance (provider/model/
 * grounded/groundingMode ride the wire and the UI footer labels each
 * answer). The verifier itself already ships (lib/ai: validateGrounding,
 * two-surface answers, claimsVerified); what was false is the blanket
 * wording, not the machinery.
 *
 * What this pin enforces:
 *   1. The overclaim string is absent from every locale.
 *   2. The replacement ("per-answer grounding provenance") is present
 *      in every locale.
 *   3. Positive control (B-18/C1): the provenance the new copy
 *      describes is REAL — the chat UI renders the per-reply grounding
 *      footer labels, and the wire schema carries groundingMode +
 *      claimsVerified. The copy may never describe more than this.
 *
 * Fail-first: RED 2F/2P on the pre-fix tree (raw capture at
 * docs/evidence/round44/red-pricing-claim.txt).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

function localeFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function localeString(locale: string, dottedKey: string): string | undefined {
  const path = `messages/${locale}.json`;
  if (!existsSync(path)) return undefined;
  let node: unknown = JSON.parse(readFileSync(path, "utf8"));
  for (const part of dottedKey.split(".")) {
    if (!node || typeof node !== "object" || !(part in (node as Record<string, unknown>))) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** The overclaim, exactly as the audit found it on the live /pricing. */
const OVERCLAIM = "verified, grounded answers";

/** The replacement: structurally true for EVERY reply — provenance rides
 * the wire and the footer labels each answer's grounding state. */
const REPLACEMENT = "per-answer grounding provenance";

describe("PRICING-CLAIM — the free-tier chat chip describes the shipped per-reply behavior", () => {
  it("the overclaim 'verified, grounded answers' is absent from every locale's pricing chip", () => {
    for (const locale of localeFiles()) {
      const value = localeString(locale, "pricing.free.aiChat");
      expect(value, `${locale} pricing.free.aiChat exists`).toBeTruthy();
      expect(
        value!.includes(OVERCLAIM),
        `${locale} still carries the overclaim: ${value}`,
      ).toBe(false);
    }
  });

  it("the chip describes the per-reply grounding provenance in every locale", () => {
    for (const locale of localeFiles()) {
      const value = localeString(locale, "pricing.free.aiChat");
      expect(
        value!.includes(REPLACEMENT),
        `${locale} chip must describe the shipped behavior (${REPLACEMENT}): ${value}`,
      ).toBe(true);
    }
  });

  it("positive control: the chat UI actually renders per-reply grounding labels (the copy must never exceed this)", () => {
    const rishisPage = readFileSync("app/rishis/page.tsx", "utf8");
    expect(rishisPage.includes("evidence-grounded · numbers checked")).toBe(true);
    expect(rishisPage.includes("context-only · not numerically verified")).toBe(true);
    // The provenance object the footer reads rides the wire schema.
    const schemas = readFileSync("lib/ai/schemas.ts", "utf8");
    expect(schemas.includes("groundingMode")).toBe(true);
    expect(schemas.includes("claimsVerified")).toBe(true);
  });

  it("bite control: the overclaim detector catches the pre-fix string (B-18/C5)", () => {
    const preFixEn = "AI Rishi chat with verified, grounded answers";
    expect(preFixEn.includes(OVERCLAIM)).toBe(true);
    const postFixEn = "AI Rishi chat with per-answer grounding provenance";
    expect(postFixEn.includes(OVERCLAIM)).toBe(false);
  });
});
