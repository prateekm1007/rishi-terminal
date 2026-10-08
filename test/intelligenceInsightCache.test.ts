import { describe, expect, it } from "vitest";
import {
  changeKeyOf,
  parseInsightPayload,
} from "@/lib/intelligence/insightCache";
import { INSIGHT_FEATURES, type RishiInsight } from "@/lib/intelligence/types";

/**
 * INT-A7 — the deterministic change key + persistent insight cache
 * (roadmap item A7; execution rule 4: never in-memory memoization).
 *
 * Pre-registration: docs/intelligence/insightCache.md (committed BEFORE
 * any evaluation) — the key rule, the cache semantics, and the
 * fail-closed table are pinned here. The DB-side gates (idempotent
 * upsert, payload/hit_count constraints, RLS deny-all) are proven on
 * real Postgres by scripts/ci/insight_cache_invariants.sql (CI
 * migrations job); this suite pins the pure TS contracts.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the A3/A4/A5/A6 precedent for a new contract
 * module.
 */

const T0 = "2026-10-07T04:00:00.000Z";
const T1 = "2026-10-07T09:30:00.000Z";

const IDS = ["c-aaa", "c-bbb", "c-ccc"];

const KEY_INPUT = {
  feature: "stock-intelligence" as const,
  subject: "RELIANCE",
  changeIds: IDS,
};

/** A contract-valid deterministic insight (mirrors the stateLog
 *  compatibility fixture; parseRishiInsight accepts it). */
const INSIGHT: RishiInsight = {
  id: "insight:stock-intelligence:RELIANCE:price-2026-10-07",
  feature: "stock-intelligence",
  subject: "RELIANCE",
  generatedAt: T1,
  observationWindow: { from: T0, to: T1 },
  status: "ok",
  confidence: "high",
  materiality: "medium",
  summary: "The price changed during the window while the observation stayed live.",
  whyItMatters:
    "A priced move is the raw material every downstream judgement builds on; this insight only states the observed delta.",
  whatChanged: [{ field: "price", change: "1204.1 inr -> 1210.1 inr" }],
  invalidators: ["A provider clock correction that re-dates either observation"],
  evidence: [
    {
      id: `price:RELIANCE:${T0}`,
      text: `price = 1204.1 inr — live (observed ${T0})`,
      facts: [{ field: "price", value: 1204.1, unit: "inr", source: "live", observedAt: T0 }],
    },
  ],
  contradictions: [],
  uncertainty: [],
  nextInvestigations: ["Whether volume confirms the move"],
  provenance: { synthesisPath: "deterministic" },
  modelStatus: "deterministic",
};

// ── changeKeyOf — the deterministic key rule (pinned) ───────────────────────

describe("changeKeyOf — the ONE deterministic change key", () => {
  it("is deterministic and format-pinned (64-char lowercase hex)", () => {
    const a = changeKeyOf(KEY_INPUT);
    const b = changeKeyOf({ ...KEY_INPUT });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is order-insensitive and duplicate-insensitive (set semantics)", () => {
    const shuffled = changeKeyOf({
      ...KEY_INPUT,
      changeIds: ["c-ccc", "c-aaa", "c-bbb", "c-aaa"],
    });
    expect(shuffled).toBe(changeKeyOf(KEY_INPUT));
  });

  it("a different feature, subject, or changeId set yields a different key", () => {
    const base = changeKeyOf(KEY_INPUT) as string;
    expect(changeKeyOf({ ...KEY_INPUT, feature: "watchtower" })).not.toBe(base);
    expect(changeKeyOf({ ...KEY_INPUT, subject: "TCS" })).not.toBe(base);
    expect(changeKeyOf({ ...KEY_INPUT, changeIds: ["c-aaa", "c-bbb"] })).not.toBe(base);
    expect(changeKeyOf({ ...KEY_INPUT, changeIds: [...IDS, "c-new"] })).not.toBe(base);
  });

  it("the closed feature registry is enforced — an unknown feature refuses (null)", () => {
    expect(
      changeKeyOf({ ...KEY_INPUT, feature: "made-up-feature" as never }),
    ).toBeNull();
    for (const feature of INSIGHT_FEATURES) {
      expect(changeKeyOf({ ...KEY_INPUT, feature })).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("empty subject, oversized subject, empty changeIds, or an empty id refuse", () => {
    expect(changeKeyOf({ ...KEY_INPUT, subject: "   " })).toBeNull();
    expect(changeKeyOf({ ...KEY_INPUT, subject: "x".repeat(81) })).toBeNull();
    expect(changeKeyOf({ ...KEY_INPUT, changeIds: [] })).toBeNull();
    expect(changeKeyOf({ ...KEY_INPUT, changeIds: ["c-aaa", ""] })).toBeNull();
  });
});

// ── parseInsightPayload — parse or refuse (the ONE parser) ──────────────────

describe("parseInsightPayload — the cache stores only contract artifacts", () => {
  it("a contract-valid deterministic insight parses", () => {
    const parsed = parseInsightPayload(INSIGHT);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(INSIGHT.id);
  });

  it("a non-contract payload refuses (null) — never best-effort", () => {
    expect(parseInsightPayload(null)).toBeNull();
    expect(parseInsightPayload("insight")).toBeNull();
    expect(parseInsightPayload({ ...INSIGHT, feature: "not-a-feature" })).toBeNull();
    expect(
      parseInsightPayload({ ...INSIGHT, id: "missing-feature-prefix" }),
    ).toBeNull();
    expect(
      parseInsightPayload({
        ...INSIGHT,
        provenance: { synthesisPath: "deterministic", provider: "openai" },
      }),
    ).toBeNull();
  });
});

// ── determinism and honesty pins ────────────────────────────────────────────

describe("determinism and closed behaviour", () => {
  it("key inputs are never mutated", () => {
    const input = { ...KEY_INPUT, changeIds: [...IDS] };
    const snapshot = JSON.stringify(input);
    changeKeyOf(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("the module contains no in-memory cache, model, randomness, or clock surface", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/intelligence/insightCache.ts", "utf8");
    for (const forbidden of [
      "lib/ai",
      "fetch(",
      "provider",
      "prompt",
      "Date.now(",
      "new Date(",
      "Math.random(",
      "new Map(",
      "globalThis.",
    ]) {
      expect(src, `forbidden surface: ${forbidden}`).not.toContain(forbidden);
    }
  });
});
