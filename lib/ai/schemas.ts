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

/**
 * A typed, machine-checkable fact carried by an evidence item (Q4 Commit A).
 * `field` is the canonical metric key (normalized before comparison),
 * `value` is the exact number the platform asserts, `unit` comes from the
 * closed unit taxonomy (percent | multiple | ratio | inr | inr_crore |
 * points | value), and `source` says how the number came to be: observed
 * live, derived by the platform's own engine, or seed. Validation operates
 * on these structured facts — the item's `text` remains for the model, but
 * presence of a number in text is never proof of a semantic assertion.
 */
export type AiEvidenceFact = {
  field: string;
  value: number;
  unit: string;
  source?: "live" | "derived" | "seed";
};

/** What the MODEL asserts about the world for one claim (Q4 Commit A):
 *  every numeric claim must declare the field/value/unit it states, and
 *  validation matches each assertion against the typed facts of the claim's
 *  OWN cited items (exact semantic match, not text presence). */
export type AiAssertion = { field: string; value: number; unit: string };

export const AiClaimSchema = z.object({
  /** For a VALIDATED numeric claim this is NOT the model's prose: the
   *  server replaces it with a canonical statement generated from the
   *  validated assertions ("roe = 12 percent — verified against
   *  fundamental:<sym>:roe:<asOf> (live)"). Commit D §2A: model prose is
   *  never the semantically verified surface. */
  claim: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
  assertions: z
    .array(
      z.object({
        field: z.string().min(1).max(60),
        value: z.number().finite(),
        unit: z.string().min(1).max(20),
      }),
    )
    .max(6)
    .optional(),
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
  /** Q4 Commit A: machine-readable grounding rejections (why a reply is NOT
   *  grounded). Empty when grounded. Auditable provenance, not UI noise. */
  groundingRejections: z.array(z.string()).default([]),
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
        /** Q4 Commit A: numeric claims must assert field/value/unit and the
         *  assertion must EXACTLY match a typed fact on one of the claim's
         *  own cited items (normalized). A numeric claim without a matching
         *  assertion is rejected — number presence in text is not proof. */
        assertions: z
          .array(
            z.object({
              field: z.string().min(1).max(60),
              value: z.number().finite(),
              unit: z.string().min(1).max(20),
            }),
          )
          .max(6)
          .optional(),
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
  /** Typed facts this item carries (Q4 Commit A). Optional: qualitative
   *  items (profile, news) carry none; validation only accepts numeric
   *  claims whose assertions match these facts on the claim's OWN cites. */
  facts?: AiEvidenceFact[];
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
    /** Q4 Commit A: why the reply is not grounded (empty when grounded).
     *  Auditable provenance — the client can show/disclose the reason. */
    groundingRejections: z.array(z.string()).default([]),
  }),
});

export type ChatWire = z.infer<typeof ChatWireSchema>;
