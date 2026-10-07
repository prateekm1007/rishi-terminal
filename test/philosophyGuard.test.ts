/**
 * G7 (founder Round-22) — the DISTINCT no-numbers / philosophy-mode
 * validator. Contract: claim-free conceptual prose MAY take the
 * context-only (philosophy) path; any factual/numeric content is REJECTED
 * by the guard and stays inside the normal grounding contract. The guard
 * NEVER bypasses the factual/evidence validator — it is the gate that
 * decides whether the grounding validator even needs to be involved.
 *
 * Fail-first: these tests were written against main BEFORE the guard
 * existed (import failure = RED) and against the router's inline
 * decision pre-extraction.
 */
import { describe, expect, it } from "vitest";
import { evaluatePhilosophyProse } from "@/lib/ai/philosophyGuard";

describe("G7 — philosophy-mode validator (no-numbers guard)", () => {
  it("pure claim-free conceptual prose PASSES", () => {
    const v = evaluatePhilosophyProse({
      answer:
        "Patience is a temperament, not a technique. The market rewards those who can sit with uncertainty without demanding certainty from it.",
      claimCount: 0,
      ungroundedNumbers: [],
    });
    expect(v.verdict).toBe("philosophy-ok");
  });

  it("philosophy prose carrying an UNSUPPORTED number is REJECTED", () => {
    const v = evaluatePhilosophyProse({
      answer:
        "Compounding is patience made visible; a business growing at 24% for a decade transforms almost beyond recognition.",
      claimCount: 0,
      ungroundedNumbers: ["24"],
    });
    expect(v.verdict).toBe("reject");
    if (v.verdict === "reject") {
      expect(v.reason).toBe("unsupported-number");
      expect(v.numbers).toContain("24");
    }
  });

  it("claims present are REJECTED — factual claims always enter the grounding contract", () => {
    const v = evaluatePhilosophyProse({
      answer: "The margin story matters more than the headline growth number.",
      claimCount: 2,
      ungroundedNumbers: [],
    });
    expect(v.verdict).toBe("reject");
    if (v.verdict === "reject") {
      expect(v.reason).toBe("has-claims");
    }
  });

  it("a number MATCHED to verified evidence is not unsupported — the guard never vetoes verified data", () => {
    // The router computes ungroundedNumbers = extracted - matched; when the
    // number came from verified evidence the set is empty, so prose citing
    // it is still claims-free philosophy-shaped text by THIS guard — and
    // the grounding validator (not this guard) owns the verified surface.
    const v = evaluatePhilosophyProse({
      answer: "The reported revenue figure sits in the verified surface above.",
      claimCount: 0,
      ungroundedNumbers: [],
    });
    expect(v.verdict).toBe("philosophy-ok");
  });

  it("an empty/blank answer is claim-free and number-free", () => {
    expect(evaluatePhilosophyProse({ answer: "", claimCount: 0, ungroundedNumbers: [] }).verdict).toBe(
      "philosophy-ok",
    );
    expect(
      evaluatePhilosophyProse({ answer: "   \n  ", claimCount: 0, ungroundedNumbers: [] }).verdict,
    ).toBe("philosophy-ok");
  });

  it("multiple unsupported numbers are all reported", () => {
    const v = evaluatePhilosophyProse({
      answer: "Revenue doubled, ROE sits near 30, and the debt ratio is 0.8.",
      claimCount: 0,
      ungroundedNumbers: ["30", "0.8"],
    });
    expect(v.verdict).toBe("reject");
    if (v.verdict === "reject") {
      expect(v.reason).toBe("unsupported-number");
      expect(v.numbers).toEqual(expect.arrayContaining(["30", "0.8"]));
    }
  });
});
