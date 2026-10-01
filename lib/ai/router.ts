/**
 * AI provider router — Phase 5 T49/T50.
 *
 * Application code calls `generateEvidenceGroundedAnswer(...)` — never
 * Gemini/OpenAI/HF directly. Provider selection is fail-closed, env-driven,
 * and registry-checked (T43): a candidate must be APPROVED, else it is not
 * a candidate at all.
 *
 * Fallback chain (T50 — RUNTIME failover, Phase 5.1 correction):
 *   1. OpenAI-compatible endpoint  (CHAT_API_BASE_URL + CHAT_API_KEY)
 *      ↓ timeout / 5xx / throw / open circuit
 *   2. Gemini fallback             (GEMINI_API_KEY)
 *      ↓ failure
 *   3. upstream failure propagates → caller surfaces 502.
 *      With ZERO candidates: null → caller surfaces 503 (unconfigured).
 *
 * Health: upstream calls are recorded per provider (T45) so a failing
 * provider opens a circuit and the next candidate is used without waiting.
 * An open circuit on the primary therefore causes Gemini to be attempted —
 * Gemini is a runtime failure fallback, not merely a configuration fallback.
 */

import { withProviderHealth } from "@/lib/registry/providerHealth";
import { PROVIDER_IDS, isProviderApproved } from "@/lib/registry/providerRegistry";
import type { AiAnswer, AiClaim, AiEvidenceItem, ChatWire } from "./schemas";
import { StructuredModelOutputSchema } from "./schemas";
import { validateGrounding } from "./evidence";
import { callOpenAiCompatible } from "./providers/openaiCompatible";
import { callGemini } from "./providers/gemini";

const GEMINI_MODEL = "models/gemini-2.5-flash";
const DEFAULT_OPENAI_MODEL = "agnes-2.5-flash";
const TIMEOUT_MS = 20_000;

export type AiProvider =
  | { kind: "openai"; id: string; baseUrl: string; apiKey: string; model: string }
  | { kind: "gemini"; id: string; apiKey: string; model: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateArgs {
  systemPrompt: string;
  history: ChatTurn[];
  message: string;
  /** Evidence context from the canonical pipeline (T51). Optional today; the
   *  claims array is only populated when this is present. */
  evidence?: AiEvidenceItem[];
}

/**
 * Resolve the ORDERED candidate chain from env at request time. A provider
 * is a candidate only when it is configured AND registry-APPROVED (T43/T55).
 * Order: OpenAI-compatible first, Gemini second.
 */
export function resolveAiProviderCandidates(): AiProvider[] {
  const candidates: AiProvider[] = [];
  const baseUrl = (process.env.CHAT_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/, "");
  const chatKey = (process.env.CHAT_API_KEY || "").trim();
  if (baseUrl && chatKey && isProviderApproved(PROVIDER_IDS.CHAT_API)) {
    candidates.push({
      kind: "openai",
      id: PROVIDER_IDS.CHAT_API,
      baseUrl,
      apiKey: chatKey,
      model: (process.env.CHAT_MODEL || "").trim() || DEFAULT_OPENAI_MODEL,
    });
  }
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (geminiKey && isProviderApproved(PROVIDER_IDS.GEMINI)) {
    candidates.push({ kind: "gemini", id: PROVIDER_IDS.GEMINI, apiKey: geminiKey, model: GEMINI_MODEL });
  }
  return candidates;
}

/**
 * Primary provider (kept for backwards compatibility with earlier callers
 * and tests): the first candidate, or null when nothing is configured.
 */
export function resolveAiProvider(): AiProvider | null {
  return resolveAiProviderCandidates()[0] ?? null;
}

/** T51: evidence renders into the system prompt with stable ids the model can cite.
 *  End-to-end loop: when evidence exists the model is ALSO given the
 *  structured-response contract — its claims will be validated against the
 *  evidence ids before anything is marked grounded (fail closed). */
function evidenceBlock(evidence: AiEvidenceItem[]): string {
  if (evidence.length === 0) return "";
  const lines = evidence.map(e => `[${e.id}] ${e.text}`);
  return (
    "\n\nVERIFIED CONTEXT (cite ids only from this list; do not invent ids; " +
    "if a datum is absent, say so rather than guessing):\n" +
    lines.join("\n") +
    "\n\nRESPONSE CONTRACT — reply with ONLY a JSON object (no prose outside " +
    'the JSON): {"answer": <your full reply as one string>, "claims": ' +
    '[{"claim": <one factual statement you are making>, "evidenceIds": ' +
    '[<ids from VERIFIED CONTEXT that support it>]}], "uncertainties": ' +
    "[<things you could not verify>]}. Every claim MUST list the evidence " +
    "ids it rests on; a claim without ids or with an invented id will be " +
    "rejected wholesale. If you make no verifiable factual claims, return " +
    'an empty claims array. Example: {"answer": "...", "claims": [], ' +
    '"uncertainties": ["..."]}'
  );
}

/** Extract the JSON object from a model reply (tolerates code fences and
 *  surrounding prose, which weaker models add despite instructions). */
function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function generateEvidenceGroundedAnswer(args: GenerateArgs): Promise<AiAnswer | null> {
  const candidates = resolveAiProviderCandidates();
  // Zero candidates → explicit unconfigured state; caller surfaces 503 (T50).
  if (candidates.length === 0) return null;

  const evidence = args.evidence ?? [];
  const fullSystem = args.systemPrompt + evidenceBlock(evidence);

  const generatedAt = new Date().toISOString();
  // Phase 5.1: RUNTIME failover. Each candidate is attempted in order; a
  // timeout, 5xx, throw, empty completion, or open circuit (ProviderCooldown-
  // Error thrown by withProviderHealth) moves execution to the next candidate
  // — it never aborts the chain. Only when EVERY candidate fails does the
  // last upstream error propagate, so the caller can distinguish
  // "unconfigured" (503) from "upstream broke" (502) — never a silently
  // degraded pseudo-answer.
  let text: string | null = null;
  let used: AiProvider | null = null;
  let lastError: unknown = null;
  for (const provider of candidates) {
    try {
      const t =
        provider.kind === "openai"
          ? await withProviderHealth(provider.id, () =>
              callOpenAiCompatible(provider.baseUrl, provider.apiKey, provider.model, fullSystem, args.history, args.message, TIMEOUT_MS),
            )
          : await withProviderHealth(provider.id, () =>
              callGemini(provider.apiKey, provider.model, fullSystem, args.history, args.message, TIMEOUT_MS),
            );
      text = t;
      used = provider;
      break;
    } catch (err) {
      // Recorded in provider health by withProviderHealth; try the next
      // candidate (if any) instead of failing the request.
      lastError = err;
    }
  }
  if (text === null || !used) {
    throw lastError instanceof Error
      ? lastError
      : new Error(`ai upstream failure across ${candidates.length} provider(s)`);
  }
  const provider = used;

  // ── End-to-end AI loop: structured claims + evidence-ID validation ──
  // With evidence in scope, the model was asked for the structured contract.
  // Parse → zod-validate → validate every evidenceId against THIS request's
  // evidence ids. Any unknown id fails CLOSED: no claim is served as
  // verified, grounded stays false, and the rejection is disclosed. A parse
  // failure degrades honestly to evidence-context (the answer text is still
  // the model's — no data is invented to repair the pipeline).
  if (evidence.length > 0) {
    const parsed = extractJsonObject(text);
    const structured = parsed ? StructuredModelOutputSchema.safeParse(parsed) : null;
    if (structured?.success) {
      // R4-02: grounding now validates BOTH the evidence ids and every
      // number in the claims + answer against the cited evidence items.
      const grounding = validateGrounding(evidence, structured.data.claims, structured.data.answer);
      return {
        answer: structured.data.answer,
        claims: grounding.validatedClaims as AiClaim[],
        uncertainties: [
          ...grounding.rejections.map(r => `grounding validation: ${r}`),
          ...structured.data.uncertainties,
          ...(grounding.grounded
            ? []
            : ["claims were not grounded in the verified evidence package — treat this reply as context-only"]),
        ],
        provider: provider.id,
        model: provider.model,
        generatedAt,
        claimsVerified: grounding.grounded,
      };
    }
    return {
      answer: text,
      claims: [],
      uncertainties: [
        "structured response contract not satisfied (unparseable or invalid JSON) — presented as unverified text",
      ],
      provider: provider.id,
      model: provider.model,
      generatedAt,
      claimsVerified: false,
    };
  }

  // T52 — HONEST grounding state (Phase 5.1 wording): no evidence pipeline
  // context was supplied, so this is unstructured provider output — claims
  // stay empty and `grounded` is false by construction.
  return {
    answer: text,
    claims: [],
    uncertainties: [
      "unstructured provider output — claims not extracted (no evidence pipeline context supplied)",
    ],
    provider: provider.id,
    model: provider.model,
    generatedAt,
    claimsVerified: false,
  };
}

/** Wire-shape helper for the chat route (backwards compatible `{text}`).
 *  grounded is true ONLY for claims whose every evidenceId was validated
 *  against the evidence package in the same request — never from evidence
 *  presence, and never from the model's own assertions. */
export function toChatWire(answer: AiAnswer): ChatWire {
  const grounded = answer.claimsVerified && answer.claims.length > 0;
  return {
    text: answer.answer,
    provenance: {
      provider: answer.provider,
      model: answer.model,
      generatedAt: answer.generatedAt,
      grounded,
      groundingMode: grounded ? "structured-claims" : "evidence-context",
      claims: grounded ? answer.claims : [],
    },
  };
}
