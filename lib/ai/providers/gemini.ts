/**
 * Gemini chat provider (T49 fallback) — now executed through the
 * provider-agnostic vercel/ai layer (FD8-AI-SDK, round 56; the founder's
 * batch-2 adoption record row 8). `@ai-sdk/google` builds and sends the
 * request to the DOCUMENTED generative-language path (v1beta/models/
 * {model}:generateContent — the hand-rolled adapter's non-models path is
 * superseded by the SDK's); the key travels via the x-goog-api-key header
 * — never the URL.
 *
 * W3 hard-cap audit (round-12): the exact serialized logical request body
 * is checked against the shared input bound (./serializedInputBound)
 * BEFORE the call — an oversized payload is refused fail-closed (it can
 * never silently spend input tokens the global reservation did not
 * cover; pinned by test/w3.inputBound.test.ts).
 */

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { ChatTurn, ProviderCompletion } from "./openaiCompatible";
import { assertSerializedInputWithinBound } from "./serializedInputBound";

/** The per-attempt output cap sent as maxOutputTokens. W3-A: a factor
 *  of the global token reservation ceiling (lib/chat/globalSpend.ts),
 *  pinned by test/globalSpendReservation.test.ts — changing it requires
 *  revisiting the ceiling. */
export const PROVIDER_MAX_OUTPUT_TOKENS = 2048;

export async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatTurn[],
  message: string,
  timeoutMs: number,
  loopTurns: ChatTurn[] = [],
): Promise<ProviderCompletion> {
  const contents = [
    ...history.map(h => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user" as const, content: message },
    // Commit L1: server-generated tool-loop turns (assistant tool request +
    // user TOOL RESULT/TOOL ERROR), in conversation order after the message.
    ...loopTurns.map(h => ({
      role: h.role === "user" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
  ];

  // W3 hard-cap audit: refuse an oversized request BEFORE the provider
  // call — the attempt fails (failover/502), it never overspends. The
  // bound runs on the serialized logical request (system + contents +
  // generation params) — the same payload basis the bound has always
  // enforced.
  const serialized = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: PROVIDER_MAX_OUTPUT_TOKENS,
    },
  });
  assertSerializedInputWithinBound(serialized);

  const provider = createGoogleGenerativeAI({ apiKey });

  const result = await generateText({
    model: provider.languageModel(model),
    system: systemPrompt,
    messages: contents,
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: PROVIDER_MAX_OUTPUT_TOKENS,
    abortSignal: AbortSignal.timeout(timeoutMs),
  }).catch((err: unknown) => {
    // Preserve the router's error shape for the health circuit (the SDK's
    // APICallError carries a status — mapped to the same generic message;
    // details stay server-side, rule 10).
    const status = (err as { statusCode?: number }).statusCode;
    if (typeof status === "number") {
      console.error("[ai/gemini] upstream error:", status, String((err as Error).message).slice(0, 500));
      throw new Error(`gemini HTTP ${status}`);
    }
    throw err;
  });

  const text = typeof result.text === "string" ? result.text : "";
  if (!text) {
    console.error("[ai/gemini] empty completion:", JSON.stringify(result).slice(0, 500));
    throw new Error("gemini empty completion");
  }
  // W3 (founder round-10): only observable usage counts. The provider's
  // own total (usage.raw.totalTokenCount — the exact field the hand-rolled
  // adapter read from usageMetadata) takes precedence; the SDK's
  // normalised totalTokens is the fallback.
  const rawTotal = (result.usage?.raw as { totalTokenCount?: unknown } | undefined)?.totalTokenCount;
  const total = typeof rawTotal === "number" && Number.isFinite(rawTotal)
    ? rawTotal
    : result.usage?.totalTokens;
  return { text, totalTokens: typeof total === "number" && Number.isFinite(total) ? total : null };
}
