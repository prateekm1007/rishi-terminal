import { z } from "zod";

/**
 * AI response schemas — Phase 5 T50/T52; end-to-end AI loop (Commit B).
 *
 * The loop: canonical evidence assembler (lib/ai/evidence.ts) → deterministic
 * evidence ids → model asked for a structured response → every evidenceId is
 * validated against the package (unknown id fails CLOSED) → only claims whose
 * every id is known may set grounded=true / groundingMode="structured-claims".
 *
 * Honesty invariants (T52, kept):
 * - `claims` is populated ONLY by the validated structured pipeline.
 * - `grounded` is false unless claimsVerified && claims.length > 0.
 * - evidence-context injection alone NEVER yields grounded=true.
 */

export const AiClaimSchema = z.object({
  claim: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
});

export const AiAnswerSchema = z.object({
  answer: z.string(),
  claims: z.array(AiClaimSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  provider: z.string(),
  model: z.string(),
  generatedAt: z.string(),
  /** End-to-end loop: true ONLY when every claim's every evidenceId was
   *  validated against the evidence package in THIS request. Set by the
   *  router — never by the model's own say-so. */
  claimsVerified: z.boolean().default(false),
});

export type AiAnswer = z.infer<typeof AiAnswerSchema>;
export type AiClaim = z.infer<typeof AiClaimSchema>;

/**
 * The model's structured output contract (parsed + validated server-side).
 * The model never supplies provider/model/generatedAt — those are stamped by
 * the router (a model claiming provenance would be fabrication).
 */
export const StructuredModelOutputSchema = z.object({
  answer: z.string().min(1),
  claims: z
    .array(
      z.object({
        claim: z.string().min(1),
        evidenceIds: z.array(z.string().min(1)).min(1).max(6),
      }),
    )
    .max(10)
    .default([]),
  uncertainties: z.array(z.string().max(300)).max(5).default([]),
});

export type StructuredModelOutput = z.infer<typeof StructuredModelOutputSchema>;

/** One piece of evidence handed to the model (from an AssetSnapshot, scoring, news…). */
export interface AiEvidenceItem {
  id: string; // stable, e.g. "fundamental:RELIANCE:pe:2026-09-30" or "price:TCS:2025-10-31T08:40:00.000Z"
  text: string;
}

/**
 * Wire format returned by /api/chat — backwards compatible: the UI reads
 * `text`; `provenance` is additive (T50: never pretend the same model was
 * used — the actual provider/model ride along).
 *
 * End-to-end loop: `grounded` is true ONLY for claims validated against the
 * evidence package ids (groundingMode "structured-claims"). Prompt-only
 * context injection stays "evidence-context" / grounded=false. The validated
 * claims (with their evidence ids) ride to the UI so provenance is never
 * hidden behind a bare boolean.
 */
export const ChatWireSchema = z.object({
  text: z.string(),
  provenance: z.object({
    provider: z.string(),
    model: z.string(),
    generatedAt: z.string(),
    grounded: z.boolean(),
    groundingMode: z.enum(["evidence-context", "structured-claims"]).default("evidence-context"),
    /** Validated claims only — an empty array when grounding failed closed. */
    claims: z.array(AiClaimSchema).default([]),
  }),
});

export type ChatWire = z.infer<typeof ChatWireSchema>;
