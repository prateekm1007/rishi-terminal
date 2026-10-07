import { describe, expect, it } from "vitest";
import {
  RishiInsightSchema,
  InsightEvidenceItemSchema,
  deriveInsightConfidence,
  parseRishiInsight,
  INSIGHT_FEATURES,
  INSIGHT_STATUSES,
  type RishiInsight,
} from "@/lib/intelligence/types";
import type { AiEvidenceItem } from "@/lib/ai/schemas";

/**
 * Phase A item 1 — the RishiInsight contract, fail-first (C5). The whole
 * suite is RED before the module exists (import failure — the
 * philosophyGuard precedent); each negative case below is a gate-bites
 * proof: the exact violation is fed in and MUST be rejected.
 *
 * Founder directions 2026-10-07 §13-§15: closed vocabularies, server-only
 * materiality, no model self-assigned confidence, contradictions carry
 * their evidence, deterministic artifacts never wear model labels.
 */

const T0 = "2026-10-07T04:00:00.000Z";
const T1 = "2026-10-07T09:30:00.000Z";

/** A valid, complete deterministic insight (ChangeSince-shaped). */
function validInsight(): RishiInsight {
  return {
    id: "insight:stock-intelligence:RELIANCE:price-2026-10-07",
    feature: "stock-intelligence",
    subject: "RELIANCE",
    generatedAt: T1,
    observationWindow: { from: T0, to: T1 },
    status: "ok",
    confidence: "high",
    materiality: "medium",
    summary: "The price moved materially while volume stayed in its recent band.",
    whyItMatters:
      "A price move without volume confirmation is a weaker signal than the same move on expanding volume; the deterministic delta below is the fact layer for that distinction.",
    whatChanged: [{ field: "price", change: "1204.10 inr -> 1210.10 inr" }],
    invalidators: ["A correction to the observation clock that re-dates the window"],
    evidence: [
      {
        id: "price:RELIANCE:2026-10-07T09:30:00.000Z",
        text: "price = 1210.10 inr — live (observed 2026-10-07T09:30:00.000Z)",
        facts: [{ field: "price", value: 1210.1, unit: "inr", source: "live", observedAt: T1 }],
      },
      {
        id: "price:RELIANCE:2026-10-07T04:00:00.000Z",
        text: "price = 1204.10 inr — live (observed 2026-10-07T04:00:00.000Z)",
        facts: [{ field: "price", value: 1204.1, unit: "inr", source: "live", observedAt: T0 }],
      },
    ],
    contradictions: [],
    uncertainty: [],
    nextInvestigations: ["Whether the next volume observation confirms the move"],
    provenance: { synthesisPath: "deterministic" },
    modelStatus: "deterministic",
  };
}

describe("RishiInsightSchema — the happy path", () => {
  it("accepts a complete deterministic insight", () => {
    const r = RishiInsightSchema.safeParse(validInsight());
    expect(r.success).toBe(true);
  });
  it("accepts a bounded-model insight with full provenance", () => {
    const v = {
      ...validInsight(),
      provenance: {
        synthesisPath: "bounded-model",
        provider: "chat-api",
        model: "agnes-2.5-flash",
        synthesizedAt: T1,
      },
      modelStatus: "model-grounded",
    };
    const r = RishiInsightSchema.safeParse(v);
    expect(r.success).toBe(true);
  });
});

describe("closed vocabularies bite (every one is a gate)", () => {
  const cases: Array<[string, unknown, string]> = [
    ["status", "probably-fine", "status"],
    ["confidence", "very-high", "confidence"],
    ["materiality", "extreme", "materiality"],
    ["modelStatus", "model-sure", "modelStatus"],
    ["feature", "ai-market-fork", "feature"],
  ];
  for (const [field, bad, label] of cases) {
    it(`rejects an invented ${label}`, () => {
      const r = RishiInsightSchema.safeParse({ ...validInsight(), [field]: bad });
      expect(r.success).toBe(false);
    });
  }
  it("rejects an id outside the insight:<feature>:<subject> convention", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      id: "RELIANCE-insight-42",
    });
    expect(r.success).toBe(false);
  });
});

describe("honesty couplings (superRefine)", () => {
  it("rejects contradictions without the conflict status", () => {
    const v = validInsight();
    v.contradictions = [
      {
        field: "price",
        items: [v.evidence[0].id, v.evidence[1].id],
        description: "Two observations disagree on the same window",
      },
    ];
    const r = RishiInsightSchema.safeParse(v);
    expect(r.success).toBe(false);
  });
  it("rejects conflict status with no named contradiction", () => {
    const r = RishiInsightSchema.safeParse({ ...validInsight(), status: "conflict" });
    expect(r.success).toBe(false);
  });
  it("rejects a contradiction citing evidence the insight does not carry", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      status: "conflict",
      contradictions: [
        {
          field: "price",
          items: ["price:RELIANCE:2026-10-06T09:30:00.000Z", "price:RELIANCE:2026-10-07T09:30:00.000Z"],
          description: "Disagreement with an observation outside this object",
        },
      ],
    });
    expect(r.success).toBe(false);
  });
  it("rejects an inverted observation window", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      observationWindow: { from: T1, to: T0 },
    });
    expect(r.success).toBe(false);
  });
  it("rejects high confidence on unvalidated synthesis", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      modelStatus: "model-unvalidated",
    });
    expect(r.success).toBe(false);
  });
  it("rejects high confidence on blocked synthesis", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      modelStatus: "model-blocked",
    });
    expect(r.success).toBe(false);
  });
  it("rejects bounded-model provenance without provider/model/synthesizedAt", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      provenance: { synthesisPath: "bounded-model" },
      modelStatus: "model-grounded",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a deterministic artifact wearing model labels", () => {
    const r = RishiInsightSchema.safeParse({
      ...validInsight(),
      provenance: {
        synthesisPath: "deterministic",
        provider: "chat-api",
        model: "agnes-2.5-flash",
      },
    });
    expect(r.success).toBe(false);
  });
  it("rejects an empty summary (there is always something to say or the insight does not exist)", () => {
    const r = RishiInsightSchema.safeParse({ ...validInsight(), summary: "" });
    expect(r.success).toBe(false);
  });
});

describe("evidence compatibility — no second evidence format", () => {
  it("accepts a real AiEvidenceItem shape built by the existing evidence layer", () => {
    const item: AiEvidenceItem = {
      id: "fundamental:RELIANCE:pe:2026-09-30T10:00:00.000Z",
      text: "pe = 24.1 multiple — live (observed 2026-09-30)",
      facts: [{ field: "pe", value: 24.1, unit: "multiple", source: "live", observedAt: "2026-09-30T10:00:00.000Z" }],
    };
    const r = InsightEvidenceItemSchema.safeParse(item);
    expect(r.success).toBe(true);
  });
  it("accepts a qualitative item with no facts (news/profile class)", () => {
    const r = InsightEvidenceItemSchema.safeParse({
      id: "news:SYM:unavailable",
      text: "No per-symbol news evidence is wired for this symbol",
    });
    expect(r.success).toBe(true);
  });
});

describe("deriveInsightConfidence — the server decides, never the model", () => {
  const liveFacts = [{ field: "price", value: 1210.1, unit: "inr", source: "live" as const, observedAt: T1 }];
  const seedFacts = [{ field: "pe", value: 24.1, unit: "multiple", source: "seed" as const }];
  it("never raises above low for unknown, stale or unvalidated status", () => {
    for (const status of ["unknown", "stale", "unvalidated"] as const) {
      expect(deriveInsightConfidence({ status, modelStatus: "deterministic", evidence: [{ facts: liveFacts }] })).toBe("low");
    }
  });
  it("high requires ok status AND a live/derived typed fact", () => {
    expect(
      deriveInsightConfidence({ status: "ok", modelStatus: "deterministic", evidence: [{ facts: liveFacts }] }),
    ).toBe("high");
    expect(
      deriveInsightConfidence({ status: "ok", modelStatus: "deterministic", evidence: [{ facts: seedFacts }] }),
    ).toBe("moderate");
  });
  it("caps conflict at moderate even with live evidence", () => {
    expect(
      deriveInsightConfidence({ status: "conflict", modelStatus: "deterministic", evidence: [{ facts: liveFacts }] }),
    ).toBe("moderate");
  });
  it("low for conflict with no observations", () => {
    expect(
      deriveInsightConfidence({ status: "conflict", modelStatus: "deterministic", evidence: [] }),
    ).toBe("low");
  });
  it("low for unvalidated/blocked model status even when ok", () => {
    for (const modelStatus of ["model-unvalidated", "model-blocked"] as const) {
      expect(
        deriveInsightConfidence({ status: "ok", modelStatus, evidence: [{ facts: liveFacts }] }),
      ).toBe("low");
      expect(
        deriveInsightConfidence({ status: "ok", modelStatus, evidence: [{ facts: liveFacts }] }),
      ).toBe("low");
    }
  });
});

describe("parseRishiInsight — trust-boundary guard", () => {
  it("returns the object for a valid insight", () => {
    const v = validInsight();
    expect(parseRishiInsight(v)?.id).toBe(v.id);
  });
  it("returns null for garbage (never best-effort)", () => {
    expect(parseRishiInsight(null)).toBeNull();
    expect(parseRishiInsight("insight")).toBeNull();
    expect(parseRishiInsight({ ...validInsight(), feature: "invented" })).toBeNull();
  });
});

describe("registry sanity", () => {
  it("the feature registry covers the roadmap surfaces without an ai-market fork", () => {
    expect(INSIGHT_FEATURES).not.toContain("ai-market");
    expect(INSIGHT_FEATURES).toContain("dashboard-brief");
    expect(INSIGHT_FEATURES).toContain("stock-intelligence");
    expect(INSIGHT_FEATURES).toContain("portfolio-doctor");
  });
  it("the status vocabulary is exactly the five honest states", () => {
    expect([...INSIGHT_STATUSES].sort()).toEqual(
      ["conflict", "ok", "stale", "unknown", "unvalidated"].sort(),
    );
  });
});
