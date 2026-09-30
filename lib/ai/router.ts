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
import type { AiAnswer, AiEvidenceItem, ChatWire } from "./schemas";
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

/** T51: evidence renders into the system prompt with stable ids the model can cite. */
function evidenceBlock(evidence: AiEvidenceItem[]): string {
  if (evidence.length === 0) return "";
  const lines = evidence.map(e => `[${e.id}] ${e.text}`);
  return (
    "\n\nVERIFIED CONTEXT (cite ids only from this list; do not invent ids; " +
    "if a datum is absent, say so rather than guessing):\n" +
    lines.join("\n")
  );
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

  // T52 — HONEST grounding state (Phase 5.1 wording): this implementation is
  // evidence-CONTEXT injection. The provider output is unstructured, claims
  // are NOT extracted, and citations are not machine-verified — so claims
  // stays empty and `grounded` is false even when evidence context was
  // supplied. The uncertainty note always discloses this instead of wiping
  // it when evidence exists (the previous shape implied verified grounding
  // that does not exist yet). Structured claims with stable evidence ids and
  // fabricated-id rejection is the T51/T52 destination, not the current state.
  return {
    answer: text,
    claims: [],
    uncertainties: [
      evidence.length > 0
        ? "evidence-context injection only — provider output was not parsed into claims; cited ids are not machine-verified (T51/T52 structured claims pending)"
        : "unstructured provider output — claims not extracted (no evidence pipeline context supplied)",
    ],
    provider: provider.id,
    model: provider.model,
    generatedAt,
  };
}

/** Wire-shape helper for the chat route (backwards compatible `{text}`). */
export function toChatWire(answer: AiAnswer): ChatWire {
  return {
    text: answer.answer,
    provenance: {
      provider: answer.provider,
      model: answer.model,
      generatedAt: answer.generatedAt,
      // Honest by construction: claims is empty in this implementation, so
      // grounded is false. It becomes true only when the structured claims
      // pipeline (T51/T52) actually ships — never derived from evidence
      // presence.
      grounded: answer.claims.length > 0,
      groundingMode: "evidence-context",
    },
  };
}
