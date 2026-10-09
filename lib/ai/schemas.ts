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
 *
 * Commit L2: `observedAt` carries the upstream's own observation time for
 * live facts (null = live with NO disclosed observation time). Together
 * with `source` it determines the closed source-state vocabulary used for
 * provenance verification and the server-generated verified surface —
 * a model can no longer upgrade seed/derived data to "live" by wording.
 */
export type AiEvidenceFact = {
  field: string;
  value: number;
  unit: string;
  source?: "live" | "derived" | "seed";
  /** The upstream's own observation/as-of time; present only for live
   *  facts. null = live but the upstream disclosed no time. Absent for
   *  seed/derived (they claim no observation). */
  observedAt?: string | null;
};

/** Commit L2 — the closed source-state vocabulary (no fuzzy NLP). Derived
 *  from the matched fact's `source` + `observedAt`; drives provenance
 *  verification and the server-generated verified statements. */
export type AiSourceState =
  | "live" // observed live WITH a disclosed observation time
  | "live-undated" // observed live, NO disclosed observation time
  | "derived" // computed by the platform's engine from other facts
  | "seed" // seed/reference dataset — may be stale
  | "unavailable"; // no verifiable observation exists (fails closed)

/** What the MODEL asserts about the world for one claim (Q4 Commit A):
 *  every numeric claim must declare the field/value/unit it states, and
 *  validation matches each assertion against the typed facts of the claim's
 *  OWN cited items (exact semantic match, not text presence). */
export type AiAssertion = { field: string; value: number; unit: string };

export const AiClaimSchema = z.object({
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
  /** Commit L2: the SERVER-GENERATED verified facts for a grounded claim —
   *  field/value/unit copied from the matched typed fact plus its closed
   *  source state and the user-visible verified statement. Populated by the
   *  validator, never by the model. */
  verifiedFacts: z
    .array(
      z.object({
        field: z.string(),
        value: z.number().finite(),
        unit: z.string(),
        sourceState: z.enum(["live", "live-undated", "derived", "seed", "unavailable"]),
        observedAt: z.string().nullable().optional(),
        statement: z.string(),
      }),
    )
    .optional(),
});

/** Coder Directions 2026-10-02 §11 (latency attribution): per-request AI
 *  stage timings, stamped by the ROUTER (and the chat route for its own
 *  stages) — never by the model. Optional so legacy/test answers remain
 *  valid. Durations are milliseconds; attribution, not billing. */
export const AiTimingsSchema = z.object({
  /** Whole generateEvidenceGroundedAnswer call (the AI loop itself). */
  totalMs: z.number().finite().nonnegative(),
  /** Route-level wall time (set by the caller route, not the router). */
  wallMs: z.number().finite().nonnegative().optional(),
  /** Evidence-package assembly duration at the route level (live price +
   *  fundamentals fetches for the pre-attached context, when a symbol was
   *  in scope). */
  evidenceMs: z.number().finite().nonnegative().optional(),
  /** Total upstream completion attempts across the loop, INCLUDING
   *  failover attempts that threw (timeout / 5xx / open circuit). */
  providerAttempts: z.number().int().nonnegative(),
  /** One entry per provider completion attempt, in order. `outcome`
   *  distinguishes a turn the model spent requesting a tool from the final
   *  structured response and from a failed attempt. `stage` (Round 9,
   *  directive 12) places the completion in the latency chain explicitly:
   *  initial → (tool request → tool execution) → post-tool → repair. */
  completions: z
    .array(
      z.object({
        provider: z.string(),
        model: z.string(),
        ms: z.number().finite().nonnegative(),
        outcome: z.enum(["tool-request", "final-response", "failed"]),
        stage: z.enum(["initial", "post-tool", "repair"]).default("initial"),
      }),
    )
    .default([]),
  /** Round 9 (directive 7): one entry per FINAL-ANSWER REPAIR, in order —
   *  the router's own cause code for why the re-ask happened, recorded at
   *  the decision point (never re-inferred from text logs later). */
  repairs: z
    .array(
      z.object({
        cause: z.enum([
          "malformed-json",
          "schema-mismatch",
          "evidence-id-mismatch",
          "field-value-mismatch",
          "unsupported-numeric-prose",
          "forecast-advice-wording",
          "provenance-wording",
          "missing-claims",
          "zero-tool-engagement",
        ]),
        feedback: z.string(),
      }),
    )
    .default([]),
  /** One entry per tool execution inside the loop (§11 tool-execution
   *  time — includes the live price / fundamentals fetch when the tool
   *  triggered the first observation for its symbol). */
  toolExecutions: z
    .array(
      z.object({
        tool: z.string(),
        symbol: z.string().optional(),
        status: z.string(),
        ms: z.number().finite().nonnegative(),
      }),
    )
    .default([]),
  /** validateGrounding duration for the final structured response. */
  validationMs: z.number().finite().nonnegative().default(0),
  /** Canonical-observation attribution (§11 live-price / live-fundamentals
   *  time): per-symbol FIRST-fetch durations. Subsequent resolutions of
   *  the same symbol are memo hits, counted below — the per-request state
   *  IS the coalescing layer for the AI loop. */
  priceFetches: z
    .array(z.object({ symbol: z.string(), ms: z.number().finite().nonnegative() }))
    .default([]),
  fundamentalsFetches: z
    .array(z.object({ symbol: z.string(), ms: z.number().finite().nonnegative() }))
    .default([]),
  memoHits: z
    .object({
      price: z.number().int().nonnegative().default(0),
      fundamentals: z.number().int().nonnegative().default(0),
    })
    .default({ price: 0, fundamentals: 0 }),
});

export type AiTimings = z.infer<typeof AiTimingsSchema>;

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
  /** Coder Directions G3 (audit 2026-10-02): the explicit grounding state —
   *  "structured-claims" | "context-only" | "evidence-context". Threaded
   *  from validateGrounding; toChatWire surfaces it verbatim. */
  groundingMode: z
    .enum(["structured-claims", "context-only", "evidence-context"])
    .optional(),
  /** Commit L2: the model's prose when the response IS grounded. The wire
   *  `text` is then the server-generated verified surface (built only from
   *  validated typed facts); the model's own answer is commentary that
   *  carries NO validation state and must be labelled as such by the UI. */
  commentary: z.string().optional(),
  /** Coder Directions G4 (audit 2026-10-02): machine-readable mark for the
   *  structured-response contract — "invalid" when the model reply failed
   *  parse/schema validation and the bounded honest response was served
   *  instead of the raw payload. Commit L1 adds "blocked": the tool-loop
   *  budget was exhausted before a verifiable answer was produced — the
   *  honest BLOCKED termination, never a plausible fallback. */
  structuredResponse: z.enum(["valid", "invalid", "blocked"]).optional(),
  /** W3 (founder round-10): provider-reported token usage for the GLOBAL
   *  daily token cap — the sum across every completion of this request's
   *  loop (initial + post-tool + repair). null when no completion
   *  reported usage (the request cap still bounds that traffic). */
  usage: z.object({ totalTokens: z.number().nullable() }).optional(),
  /** Commit L1: the bounded tool loop's audit trail — every tool the model
   *  requested with its explicit outcome status (ok | unknown-tool |
   *  invalid-args | unknown-symbol | no-data | failed). Machine-readable
   *  provenance; empty when the loop was not engaged. */
  toolCalls: z
    .array(
      z.object({
        tool: z.string(),
        status: z.string(),
        symbol: z.string().optional(),
      }),
    )
    .optional(),
  /** §11 latency attribution (router-stamped; optional for legacy
   *  answers/tests). */
  timings: AiTimingsSchema.optional(),
  /** G7 driver 1 (2026-10-07): who produced the ANSWER surface for this
   *  request. "model" (the default, absent on legacy answers) = the model's
   *  validated synthesis. "deterministic" = the loop state was fully
   *  deterministic (one canonical tool outcome on the no-initial-evidence
   *  singleton path) and the server served its OWN verified surface / the
   *  bounded honest disclosure — the post-tool model synthesis completion
   *  was deliberately skipped (latency driver 1, founder direction 10:
   *  "redundant completions"). NEVER set by the model; router-only. */
  synthesis: z.enum(["model", "deterministic"]).optional(),
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
    /** Coder Directions 2026-10-02 §6: the router's own verification flag,
    *  threaded verbatim (grounded === claimsVerified && claims.length > 0
    *  — surfaced separately so the canary/gate can assert the router's
    *  decision directly, not only its derived form). */
    claimsVerified: z.boolean().default(false),
    /** G3: "context-only" = the model made only qualitative claims (or none
     *  survived) — presented as context, never as verified numbers. */
    groundingMode: z
      .enum(["evidence-context", "context-only", "structured-claims"])
      .default("evidence-context"),
    /** G4: "invalid" when the structured reply failed parse/schema and the
     *  bounded honest response was served (raw payload never displayed).
     *  L1 adds "blocked": tool-loop exhaustion terminated the request
     *  honestly instead of serving a plausible fallback. */
    structuredResponse: z.enum(["valid", "invalid", "blocked"]).default("valid"),
    /** L1: the tool loop's audit trail (empty when the loop was not
     *  engaged or no tool was called). */
    toolCalls: z
      .array(
        z.object({
          tool: z.string(),
          status: z.string(),
          symbol: z.string().optional(),
        }),
      )
      .default([]),
    /** Validated claims only — an empty array when grounding failed closed.
     *  Each grounded claim carries its SERVER-GENERATED verifiedFacts. */
    claims: z.array(AiClaimSchema).default([]),
    /** Commit L2: the model's prose when `text` is the server-generated
     *  verified surface. Commentary has NO validation state — the UI must
     *  label it ("model commentary — not verified") and never merge it into
     *  the grounded surface. */
    commentary: z.string().optional(),
    /** Q4 Commit A: why the reply is not grounded (empty when grounded).
     *  Auditable provenance — the client can show/disclose the reason. */
    groundingRejections: z.array(z.string()).default([]),
    /** §11 latency attribution, router/route-stamped. Optional: absent on
     *  legacy wires; the probe/canary surfaces record it. */
    timings: AiTimingsSchema.optional(),
    /** G7 driver 1: "deterministic" when the served surface is the
     *  server's own (no post-tool model synthesis ran for this request).
     *  Absent/"model" for the standard loop. Router-set only. */
    synthesis: z.enum(["model", "deterministic"]).optional(),
    /** INT-A9 (Ask Rishi): present only when the request anchored to a
     *  cached insight. Server-resolved disclosure (change key, feature,
     *  subject, honesty badges) — never client-supplied. Plain chat
     *  omits the field. */
    insightContext: z
      .object({
        changeKey: z.string(),
        feature: z.string(),
        subject: z.string(),
        insightStatus: z.string(),
        modelStatus: z.string(),
        synthesisPath: z.string(),
      })
      .optional(),
  }),
});

export type ChatWire = z.infer<typeof ChatWireSchema>;
