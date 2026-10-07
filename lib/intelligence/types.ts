// lib/intelligence/types.ts (Phase A, item 1) — the CANONICAL RishiInsight
// contract. Founder directions (2026-10-07) §15: one shared insight shape
// for every intelligence surface; no per-feature response contracts.
//
// What this module is:
//   - the single zod-validated type every intelligence consumer renders
//     from (Dashboard Brief, Stock Intelligence, Portfolio Doctor, …);
//   - the closed vocabularies for status, confidence, materiality and the
//     model's role — a model can NEVER set materiality (deterministic
//     engine only, §13) and can NEVER upgrade provenance in prose (§14);
//   - the coupling rules that keep honesty mechanical, not intentional:
//       * contradictions[] non-empty  <=>  status === "conflict"
//       * every contradiction's evidence ids must exist in evidence[]
//       * observationWindow.from <= observationWindow.to
//       * a "high"-confidence insight can never rest on model-unvalidated
//         synthesis (deriveInsightConfidence encodes the rule; the schema
//         refinement enforces the structural half)
//
// What this module is NOT: an AI path. It imports the EXISTING evidence
// item shape (lib/ai/schemas.ts) — no second evidence format, no second
// provenance vocabulary (§8). It performs no I/O and decides nothing about
// the world; events/materiality/thesis state arrive in their own Phase-A
// modules and CONSUME this contract.
//
// Field provenance (who may set what):
//   id, feature, subject, generatedAt, observationWindow, status,
//   confidence, materiality, provenance, modelStatus  → SERVER ONLY
//   summary, whyItMatters, whatChanged, invalidators[],
//   nextInvestigations[], uncertainty[]                 → server-generated
//     (deterministic layer) or model-synthesized THROUGH the bounded loop
//     and then validated; every consumer renders them as labelled prose,
//     never as verified facts. evidence[]/contradictions[] are ALWAYS
//     server-assembled.

import { z } from "zod";
import type { AiEvidenceFact } from "@/lib/ai/schemas";

// ── closed vocabularies ────────────────────────────────────────────────────

/**
 * The unified honesty/status model (§14). Exactly one state per insight:
 *  - "ok"           every required observation was available and fresh
 *  - "unknown"      a required input has never been observed (never guessed)
 *  - "stale"        a required observation exists but is past its SLO
 *  - "conflict"     cited evidence disagrees with itself (contradictions[]
 *                   name the disagreement; the biconditional is enforced)
 *  - "unvalidated"  the synthesis layer ran but its output failed
 *                   validation — served honestly, never as verified prose
 */
export const INSIGHT_STATUSES = [
  "ok",
  "unknown",
  "stale",
  "conflict",
  "unvalidated",
] as const;
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

/**
 * Server-computed confidence — NEVER model-asserted (§14: a model cannot
 * upgrade its own credibility). Assignment rules live in
 * deriveInsightConfidence(); the vocabulary is closed here so no consumer
 * can invent a level.
 */
export const INSIGHT_CONFIDENCE_LEVELS = ["high", "moderate", "low"] as const;
export type InsightConfidence = (typeof INSIGHT_CONFIDENCE_LEVELS)[number];

/**
 * Deterministic materiality (§13): set ONLY by the materiality engine
 * (Phase A, its own module) from event/state transitions. Its presence in
 * the contract is a FIELD, not a license — the schema carries it, the
 * engine computes it, the model never touches it.
 */
export const INSIGHT_MATERIALITIES = ["high", "medium", "low"] as const;
export type InsightMateriality = (typeof INSIGHT_MATERIALITIES)[number];

/**
 * The model's role in THIS insight (the insight-layer counterpart of the
 * chat wire's structuredResponse/groundingMode, kept consistent with
 * lib/modelStatus.ts as the wording authority for user-facing status
 * lines):
 *  - "deterministic"     no model involved — pure computation (the default
 *                        for event deltas, screening, ChangeSince)
 *  - "model-grounded"    bounded-loop synthesis whose claims passed
 *                        grounding against the insight's own evidence[]
 *  - "model-unvalidated" synthesis served but not grounded — labelled
 *                        prose, never verified facts
 *  - "model-blocked"     synthesis failed/exhausted — the honest fallback
 *                        content is deterministic, the model state is
 *                        disclosed
 *  - "model-pending"     the event is material, synthesis is scheduled but
 *                        has not run (event-driven generation, §11)
 */
export const INSIGHT_MODEL_STATUSES = [
  "deterministic",
  "model-grounded",
  "model-unvalidated",
  "model-blocked",
  "model-pending",
] as const;
export type InsightModelStatus = (typeof INSIGHT_MODEL_STATUSES)[number];

/**
 * The closed feature registry: which surface an insight belongs to
 * (§16 — deepen existing routes; no "AI Market" product fork). Adding a
 * feature means editing this enum in the PR that ships the feature — the
 * mechanical enforcement that no consumer invents a feature id.
 */
export const INSIGHT_FEATURES = [
  "dashboard-brief",
  "stock-intelligence",
  "stock-dossier",
  "portfolio-doctor",
  "portfolio-movers",
  "since-last-visit",
  "watchtower",
  "earnings-copilot",
  "truth-tracker",
  "corporate-action",
  "stress-lab",
  "sector-intelligence",
  "ownership-detective",
  "research-room",
  "rishi-council",
  "short-radar-thesis",
  "technical-interpreter",
  "news-intelligence",
  "screening",
  "chat-context",
] as const;
export type InsightFeature = (typeof INSIGHT_FEATURES)[number];

// ── component schemas ──────────────────────────────────────────────────────

/** One named disagreement between two pieces of evidence the insight
 *  itself carries. The ids MUST exist in the same insight's evidence[]
 *  (cross-field refinement below) — a contradiction may never cite
 *  evidence the user cannot open in the same object. */
export const InsightContradictionSchema = z.object({
  field: z.string().min(1).max(60),
  items: z.tuple([z.string().min(1), z.string().min(1)]),
  description: z.string().min(1).max(300),
});
export type InsightContradiction = z.infer<typeof InsightContradictionSchema>;

/**
 * Provenance for the insight AS AN ARTIFACT (the evidence items carry
 * their own fact-level provenance):
 *  - changeKey: the deterministic identity of the underlying state change
 *    (Phase A insight-cache item fills this; deterministic insights may
 *    already set it as a stable hash of subject+window+evidence ids).
 *  - synthesisPath: which architecture produced the prose.
 *  - provider/model/synthesizedAt: present only when a model was involved
 *    — "deterministic" artifacts carry none (never a fake model label).
 */
export const InsightProvenanceSchema = z.object({
  synthesisPath: z.enum(["deterministic", "bounded-model"]),
  changeKey: z.string().min(1).max(200).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  /** ISO timestamp of the model synthesis (NOT the observation window) —
   *  present only for bounded-model artifacts. */
  synthesizedAt: z.string().optional(),
});
export type InsightProvenance = z.infer<typeof InsightProvenanceSchema>;

// Reuse the ONE evidence item shape — structural mirror of AiEvidenceItem
// (lib/ai/schemas.ts) for validation at this boundary; the TS type stays
// the source of truth there. No second evidence format (§8).
export const InsightEvidenceItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  facts: z
    .array(
      z.object({
        field: z.string().min(1).max(60),
        value: z.number().finite(),
        unit: z.string().min(1).max(20),
        source: z.enum(["live", "derived", "seed"]).optional(),
        observedAt: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

// ── the contract ───────────────────────────────────────────────────────────

export const RishiInsightSchema = z
  .object({
    /** Deterministic artifact id, convention:
     *  `insight:<feature>:<subject>[:<changeKey|window>]`. */
    id: z.string().regex(/^insight:[a-z-]+:.+$/, "id must be `insight:<feature>:<subject>…`"),
    feature: z.enum(INSIGHT_FEATURES),
    /** Registry symbol | `portfolio:<id>` | `market:<scope>` — the thing
     *  the insight is ABOUT. */
    subject: z.string().min(1).max(80),
    generatedAt: z.string().datetime(),
    observationWindow: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    status: z.enum(INSIGHT_STATUSES),
    confidence: z.enum(INSIGHT_CONFIDENCE_LEVELS),
    materiality: z.enum(INSIGHT_MATERIALITIES),
    /** One-paragraph WHAT CHANGED (the common reasoning language, §26). */
    summary: z.string().min(1).max(1200),
    /** WHY IT MATTERS — interpretation, labelled prose, never a fact. */
    whyItMatters: z.string().min(1).max(1200),
    /** WHAT CHANGED in deterministic terms: field-level delta lines the
     *  deterministic layer computed (never model-composed numbers). */
    whatChanged: z
      .array(
        z.object({
          field: z.string().min(1).max(60),
          /** Human-readable `old -> new` with units, copied from typed
           *  facts — the numbers come from evidence[], never the model. */
          change: z.string().min(1).max(200),
        }),
      )
      .max(24),
    /** WHAT WOULD INVALIDATE IT. */
    invalidators: z.array(z.string().min(1).max(300)).max(10),
    evidence: z.array(InsightEvidenceItemSchema).max(32),
    contradictions: z.array(InsightContradictionSchema).max(8),
    /** WHAT IS UNCERTAIN — model-or-server stated, always labelled. */
    uncertainty: z.array(z.string().min(1).max(300)).max(10),
    /** WHAT TO INVESTIGATE NEXT (never advice: the product contract is
     *  investigation, not buy/sell). */
    nextInvestigations: z.array(z.string().min(1).max(300)).max(10),
    provenance: InsightProvenanceSchema,
    modelStatus: z.enum(INSIGHT_MODEL_STATUSES),
  })
  .superRefine((v, ctx) => {
    // Biconditional: contradictions exist <=> status is "conflict".
    if (v.contradictions.length > 0 && v.status !== "conflict") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: 'an insight with contradictions must have status "conflict"',
      });
    }
    if (v.contradictions.length === 0 && v.status === "conflict") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contradictions"],
        message: 'status "conflict" requires at least one named contradiction',
      });
    }
    // Every contradiction cites evidence THIS insight carries.
    const ids = new Set(v.evidence.map((e) => e.id));
    v.contradictions.forEach((c, i) => {
      for (const itemId of c.items) {
        if (!ids.has(itemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["contradictions", i, "items"],
            message: `contradiction cites evidence id not in this insight: ${itemId}`,
          });
        }
      }
    });
    // Window ordering.
    if (Date.parse(v.observationWindow.from) > Date.parse(v.observationWindow.to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observationWindow"],
        message: "observationWindow.from must be <= observationWindow.to",
      });
    }
    // High confidence never rests on unvalidated or blocked synthesis.
    if (
      v.confidence === "high" &&
      (v.modelStatus === "model-unvalidated" || v.modelStatus === "model-blocked")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "confidence \"high\" is not compatible with unvalidated or blocked model synthesis",
      });
    }
    // A model-involved artifact must disclose provider+model+time; a
    // deterministic one must NOT carry a fake model label.
    if (v.provenance.synthesisPath === "bounded-model") {
      if (!v.provenance.provider || !v.provenance.model || !v.provenance.synthesizedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["provenance"],
          message: "bounded-model provenance requires provider, model and synthesizedAt",
        });
      }
    } else if (v.provenance.provider !== undefined || v.provenance.model !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provenance"],
        message: "deterministic provenance must not carry provider/model labels",
      });
    }
  });

export type RishiInsight = z.infer<typeof RishiInsightSchema>;

// ── server-side derivation helpers (pure, testable) ───────────────────────

/**
 * The deterministic confidence rule (§14 — the server decides, the model
 * never self-assigns credibility):
 *  - "low"   when the insight is unknown/stale/unvalidated, or rests on
 *            zero live/derived facts (seed/unavailable evidence only)
 *  - "high"  ONLY when status is ok, the model layer is deterministic or
 *            grounded, and the evidence carries at least one live or
 *            derived typed fact
 *  - "moderate" otherwise (ok + seed-only evidence; conflict is capped at
 *            moderate — a named disagreement is at least a caveat)
 */
export function deriveInsightConfidence(input: {
  status: InsightStatus;
  modelStatus: InsightModelStatus;
  evidence: Array<{ facts?: AiEvidenceFact[] }>;
}): InsightConfidence {
  if (input.status === "unknown" || input.status === "stale" || input.status === "unvalidated") {
    return "low";
  }
  const hasObservation = input.evidence.some((e) =>
    (e.facts ?? []).some((f) => f.source === "live" || f.source === "derived"),
  );
  if (input.status === "conflict") return hasObservation ? "moderate" : "low";
  // status ok
  if (input.modelStatus === "model-unvalidated" || input.modelStatus === "model-blocked") {
    return "low";
  }
  return hasObservation ? "high" : "moderate";
}

/** TS-level guard used at trust boundaries (route handlers, persistence
 *  writers) — parse or refuse, never best-effort. */
export function parseRishiInsight(input: unknown): RishiInsight | null {
  const parsed = RishiInsightSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
