/**
 * Coder Directions G9 (audit 2026-10-02) — F&O persona ONE-SOURCE-OF-TRUTH.
 *
 * lib/fno/rishiPrompts.ts used to carry a COMPLETE independent persona
 * database: its own RISHI_PERSONALITIES[] with id/name/emoji/color/origin/
 * tier AND F&O system prompts — a direct Rule 14 violation (two authorities
 * that could drift: a display rename in one, a tier change in the other,
 * with nothing failing).
 *
 * The consumer graph was established by automated scan BEFORE the merge
 * (recorded in the commit): exactly one importer
 * (components/fno/RishiStrategyAdvisor.tsx — itself unreachable from any
 * route, a G11 dead-code candidate), zero dynamic imports, zero string-
 * based route references, zero test references.
 *
 * The merge: the canonical registry (lib/chat/registry.ts) gains the F&O
 * entitlement axis `fnoAccess` — carried over VERBATIM from the pre-merge
 * roster (the existing F&O policy, codified, not re-decided) — and the F&O
 * file keeps ONLY its genuinely F&O-specific content (style, fnoStyle,
 * prompt builders) keyed by canonical persona id, deriving its roster from
 * THE registry.
 */
import { describe, expect, it } from "vitest";
import { CANONICAL_PERSONAS, PERSONA_BY_ID } from "@/lib/chat/registry";
import {
  RISHI_PERSONALITIES,
  getRishiById,
  getRishisByTier,
  buildRishiPrompt,
} from "@/lib/fno/rishiPrompts";

/** The pre-merge F&O tier policy, verbatim (lib/fno/rishiPrompts.ts as it
 *  existed on main 5bac707). Codified as fnoAccess on the canonical
 *  personas — changing a tier is a PRODUCT decision, not a refactor. */
const FNO_POLICY_VERBATIM: Record<string, "seeker" | "student" | "disciple"> = {
  jhunjhunwala: "seeker",
  damani: "seeker",
  buffett: "student",
  munger: "student",
  chanos: "student",
  lynch: "disciple",
  soros: "disciple",
};

describe("G9 — the F&O suite derives from the ONE canonical persona authority", () => {
  it("INVARIANT: every F&O persona exists in the canonical registry (no second DB)", () => {
    const canonicalIds = new Set(CANONICAL_PERSONAS.map(p => p.id));
    for (const r of RISHI_PERSONALITIES) {
      expect(canonicalIds.has(r.id), `F&O persona "${r.id}" must exist in lib/chat/registry.ts`).toBe(true);
    }
  });

  it("INVARIANT: fnoAccess is pinned VERBATIM to the pre-merge F&O policy", () => {
    for (const [id, tier] of Object.entries(FNO_POLICY_VERBATIM)) {
      expect(PERSONA_BY_ID[id]?.fnoAccess, `fnoAccess for ${id}`).toBe(tier);
    }
    // and no OTHER persona carries an F&O entitlement
    for (const p of CANONICAL_PERSONAS) {
      if (!(p.id in FNO_POLICY_VERBATIM)) {
        expect(p.fnoAccess, `${p.id} must not carry fnoAccess`).toBeUndefined();
      }
    }
  });

  it("INVARIANT: derived display fields EXACTLY match the registry (no drift)", () => {
    for (const r of RISHI_PERSONALITIES) {
      const p = PERSONA_BY_ID[r.id];
      expect(p).toBeTruthy();
      expect(r.name).toBe(p.name);
      expect(r.fullName).toBe(p.fullName);
      expect(r.emoji).toBe(p.emoji);
      expect(r.color).toBe(p.color);
      expect(r.tier).toBe(p.fnoAccess);
    }
  });

  it("INVARIANT: the F&O roster is exactly the fnoAccess set (no extra, no missing)", () => {
    const expected = Object.keys(FNO_POLICY_VERBATIM).sort();
    expect(RISHI_PERSONALITIES.map(r => r.id).sort()).toEqual(expected);
  });

  it("tier gate follows fnoAccess (seeker sees the two seeker F&O personas)", () => {
    expect(getRishisByTier("seeker").map(r => r.id).sort()).toEqual(["damani", "jhunjhunwala"]);
    expect(getRishisByTier("student").map(r => r.id).sort()).toEqual(["buffett", "chanos", "damani", "jhunjhunwala", "munger"]);
    expect(getRishisByTier("disciple")).toHaveLength(7);
  });

  it("lookup + prompt builder still resolve through the derivation", () => {
    expect(getRishiById("soros")?.fullName).toBe(PERSONA_BY_ID["soros"].fullName);
    expect(getRishiById("not-a-rishi")).toBeUndefined();
    const prompt = buildRishiPrompt("damani", {
      symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy",
      longScore: 70, shortScore: 30, conviction: "moderate", headline: "test",
      strategy: {
        name: "Iron Condor", legs: [], netDelta: 0, netTheta: 0, netVega: 0,
        netGamma: 0, maxProfit: 1000, maxLoss: 500, breakevens: [], popEstimate: 60,
      },
    });
    expect(prompt).toBeTruthy();
    expect(prompt).toContain("Reliance Industries");
  });
});
