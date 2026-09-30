/**
 * AI provider router — Phase 5 T49/T50.
 *
 * Application code calls `generateEvidenceGroundedAnswer(...)` — never
 * Gemini/OpenAI/HF directly. Provider selection is fail-closed, env-driven,
 * and registry-checked (T43): the chosen provider must be APPROVED, else 503.
 *
 * Fallback chain (T50):
 *   1. OpenAI-compatible endpoint  (CHAT_API_BASE_URL + CHAT_API_KEY)
 *   2. Gemini fallback             (GEMINI_API_KEY)
 *   3. explicit unavailable state  (null) — never a silent downgrade
 *
 * Health: upstream calls are recorded per provider (T45) so a failing
 * provider opens a circuit and the fallback is used without waiting.
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
 * Resolve the upstream provider from env at request time. Returns null when
 * nothing is configured — the caller surfaces an explicit unavailable state.
 * Registry check (T43/T55): a configured provider that is not APPROVED is
 * treated as unconfigured.
 */
export function resolveAiProvider(): AiProvider | null {
  const baseUrl = (process.env.CHAT_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/chat\/completions$/, "");
  const chatKey = (process.env.CHAT_API_KEY || "").trim();
  if (baseUrl && chatKey && isProviderApproved(PROVIDER_IDS.CHAT_API)) {
    return {
      kind: "openai",
      id: PROVIDER_IDS.CHAT_API,
      baseUrl,
      apiKey: chatKey,
      model: (process.env.CHAT_MODEL || "").trim() || DEFAULT_OPENAI_MODEL,
    };
  }
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (geminiKey && isProviderApproved(PROVIDER_IDS.GEMINI)) {
    return { kind: "gemini", id: PROVIDER_IDS.GEMINI, apiKey: geminiKey, model: GEMINI_MODEL };
  }
  return null;
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
  const provider = resolveAiProvider();
  if (!provider) return null; // unconfigured → caller surfaces 503 (T50)

  const evidence = args.evidence ?? [];
  const fullSystem = args.systemPrompt + evidenceBlock(evidence);

  const generatedAt = new Date().toISOString();
  // Upstream failures PROPAGATE (recorded in provider health by
  // withProviderHealth) so the caller can distinguish "unconfigured" (503)
  // from "upstream broke" (502) — never a silently degraded pseudo-answer.
  const text =
    provider.kind === "openai"
      ? await withProviderHealth(provider.id, () =>
          callOpenAiCompatible(provider.baseUrl, provider.apiKey, provider.model, fullSystem, args.history, args.message, TIMEOUT_MS),
        )
      : await withProviderHealth(provider.id, () =>
          callGemini(provider.apiKey, provider.model, fullSystem, args.history, args.message, TIMEOUT_MS),
        );

  // T52: claims are only produced by a grounded pipeline; keep honest when
  // unstructured (claims empty + explicit uncertainty note).
  const grounded = evidence.length > 0;
  return {
    answer: text,
    claims: [],
    uncertainties: grounded
      ? []
      : ["unstructured provider output — claims not extracted (no evidence pipeline context supplied)"],
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
      grounded: answer.claims.length > 0,
    },
  };
}
