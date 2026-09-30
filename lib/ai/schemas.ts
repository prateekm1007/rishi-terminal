import { z } from "zod";

/**
 * AI response schemas — Phase 5 T50/T52.
 *
 * T52: every AI answer is auditable — it carries provider/model provenance
 * and, when an evidence pipeline supplied context, the claims it rests on
 * with their evidence ids. Claims are populated ONLY when produced by the
 * evidence-grounded pipeline; an unstructured provider answer yields an
 * empty claims array plus an explicit uncertainty note (never fabricated
 * citations).
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
});

export type AiAnswer = z.infer<typeof AiAnswerSchema>;
export type AiClaim = z.infer<typeof AiClaimSchema>;

/** One piece of evidence handed to the model (from an AssetSnapshot, scoring, news…). */
export interface AiEvidenceItem {
  id: string; // stable, e.g. "seed:RELIANCE:pe" or "snapshot:TCS:2026-09-30"
  text: string;
}

/**
 * Wire format returned by /api/chat — backwards compatible: the UI reads
 * `text`; `provenance` is additive (T50: never pretend the same model was
 * used — the actual provider/model ride along).
 */
export const ChatWireSchema = z.object({
  text: z.string(),
  provenance: z.object({
    provider: z.string(),
    model: z.string(),
    generatedAt: z.string(),
    grounded: z.boolean(), // true when evidence context was supplied
  }),
});

export type ChatWire = z.infer<typeof ChatWireSchema>;
