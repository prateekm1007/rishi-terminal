/**
 * Audit 2026-10-02 (P0) — persona ONE-SOURCE-OF-TRUTH invariants.
 *
 * Before this fix, four authorities coexisted and drifted:
 *   personas.ts ALL_RISHIS / CHAT_PERSONAS / STOCK_CHAT_PERSONAS,
 *   rishiEngine.ts RISHI_PERSONALITIES, prompts.ts RISHI_PROMPTS,
 *   personaAccess.ts (tier access from RISHI_PERSONALITIES).
 * /api/chat resolved prompts from CHAT_PERSONAS with NO tier check while
 * /api/chat/personas gated via RISHI_PERSONALITIES — the audit's P0.
 *
 * The fix: lib/chat/registry.ts is the ONLY authority; every other module
 * DERIVES from it. These invariants fail if any persona can exist in one
 * authority but not the other (audit directive, verbatim requirement).
 *
 * Rule 21: this file was written and run BEFORE the derivation refactor;
 * on the pre-fix tree CHAT_PERSONAS carried display-name keys and the
 * student roster lacked the Master personas (raw output in the PR).
 */
import { describe, expect, it } from "vitest";
import {
  CANONICAL_PERSONAS,
  PERSONA_BY_ID,
  MARKETING_PERSONAS,
  PERSONA_ALIASES,
  resolveCanonicalPersona,
  CHAT_PERSONAS,
  PERSONA_IDS,
} from "@/lib/chat/registry";
import { ALL_RISHIS, resolvePersonaId } from "@/lib/chat/personas";
import { RISHI_PERSONALITIES } from "@/lib/chat/rishiEngine";
import { RISHI_PROMPTS } from "@/lib/chat/prompts";
import { getChatPersonas, isCanonicalPersonaId } from "@/lib/chat/personaAccess";

const canonicalIds = new Set(CANONICAL_PERSONAS.map(p => p.id));

describe("P0 persona registry — structural invariants (no drift possible)", () => {
  it("canonical ids are unique and non-empty", () => {
    expect(CANONICAL_PERSONAS.length).toBe(new Set(CANONICAL_PERSONAS.map(p => p.id)).size);
    for (const p of CANONICAL_PERSONAS) expect(p.id.length).toBeGreaterThan(0);
  });

  it("every canonical persona has a non-empty system prompt (and NO entitlement axis exists anymore)", () => {
    for (const p of CANONICAL_PERSONAS) {
      expect(p.systemPrompt.trim().length).toBeGreaterThan(0);
      // Commit M3 (free access): the access/fnoAccess entitlement axes were
      // removed from the registry — their return is a regression.
      expect((p as unknown as Record<string, unknown>).access).toBeUndefined();
      expect((p as unknown as Record<string, unknown>).fnoAccess).toBeUndefined();
    }
  });

  it("INVARIANT: CHAT_PERSONAS keys are EXACTLY the canonical ids (no display-name keys)", () => {
    expect(new Set(Object.keys(CHAT_PERSONAS))).toEqual(canonicalIds);
    expect(new Set(PERSONA_IDS)).toEqual(canonicalIds);
  });

  it("INVARIANT: RISHI_PERSONALITIES is exactly the engine-persona subset of the registry", () => {
    const engineIds = new Set(CANONICAL_PERSONAS.filter(p => p.engine).map(p => p.id));
    expect(new Set(Object.keys(RISHI_PERSONALITIES))).toEqual(engineIds);
    for (const [id, p] of Object.entries(RISHI_PERSONALITIES)) {
      expect(p.shortBias).toBe(PERSONA_BY_ID[id].engine!.shortBias);
      expect(p.riskTolerance).toBe(PERSONA_BY_ID[id].engine!.riskTolerance);
    }
  });

  it("INVARIANT: RISHI_PROMPTS ids are canonical and their prompts equal the registry's", () => {
    for (const [id, prompt] of Object.entries(RISHI_PROMPTS)) {
      expect(canonicalIds.has(id)).toBe(true);
      expect(prompt).toBe(PERSONA_BY_ID[id].systemPrompt);
    }
  });

  it("INVARIANT: ALL_RISHIS is exactly the marketing (ranked) roster — same 19 as before", () => {
    expect(new Set(ALL_RISHIS.map(r => r.id))).toEqual(new Set(MARKETING_PERSONAS.map(p => p.id)));
    expect(ALL_RISHIS.length).toBe(19);
  });

  it("aliases are generated from the registry and cover id, short name and full name", () => {
    expect(PERSONA_ALIASES["warren buffett"]).toBe("buffett");
    expect(PERSONA_ALIASES["buffett"]).toBe("buffett");
    expect(PERSONA_ALIASES["rakesh jhunjhunwala"]).toBe("jhunjhunwala");
    expect(PERSONA_ALIASES["mohnish pabrai"]).toBe("pabrai");
    expect(PERSONA_ALIASES["jim chanos"]).toBe("chanos");
  });

  it("resolvePersonaId maps ids and display names to canonical ids; unknown is null", () => {
    expect(resolvePersonaId("damani")).toBe("damani");
    expect(resolvePersonaId("Warren Buffett")).toBe("buffett");
    expect(resolvePersonaId("Buffett")).toBe("buffett");
    expect(resolvePersonaId("  Rakesh Jhunjhunwala ")).toBe("jhunjhunwala");
    expect(resolvePersonaId("Mohnish Pabrai")).toBe("pabrai");
    expect(resolvePersonaId("not-a-persona")).toBeNull();
    expect(resolveCanonicalPersona("Seth Klarman")?.id).toBe("sethklarman");
  });
});

describe("M3 persona access — canonical validation only (no tier anywhere)", () => {
  it("the served roster is EVERY canonical persona (founder decision: all free)", () => {
    const served = getChatPersonas();
    expect(served.map(p => p.id).sort()).toEqual(
      CANONICAL_PERSONAS.map(p => p.id).sort(),
    );
  });

  it("isCanonicalPersonaId accepts every canonical id and rejects everything else", () => {
    for (const p of CANONICAL_PERSONAS) {
      expect(isCanonicalPersonaId(p.id)).toBe(true);
    }
    expect(isCanonicalPersonaId("unknown-persona")).toBe(false);
    expect(isCanonicalPersonaId("")).toBe(false);
  });

  it("personaAccess exports NO tier-keyed function (the gate cannot return)", async () => {
    const mod = (await import("@/lib/chat/personaAccess")) as unknown as Record<string, unknown>;
    expect(typeof mod.getRishisByTier).toBe("undefined");
    expect(typeof mod.isPersonaAllowed).toBe("undefined");
  });

  it("RishiPersonality projection carries no tier field", () => {
    for (const p of Object.values(RISHI_PERSONALITIES)) {
      expect((p as unknown as Record<string, unknown>).tier).toBeUndefined();
    }
  });
});
