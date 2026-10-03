/**
 * Gemini chat provider (T49 fallback). Key travels via the x-goog-api-key
 * header — never the URL.
 *
 * W3 hard-cap audit (round-12): the exact serialized request body is
 * checked against the shared input bound (./serializedInputBound) BEFORE
 * the fetch — an oversized payload is refused fail-closed (it can never
 * silently spend input tokens the global reservation did not cover).
 */

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
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: message }] },
    // Commit L1: server-generated tool-loop turns (assistant tool request +
    // user TOOL RESULT/TOOL ERROR), in conversation order after the message.
    ...loopTurns.map(h => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }],
    })),
  ];

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: PROVIDER_MAX_OUTPUT_TOKENS,
    },
  };
  // W3 hard-cap audit: refuse an oversized request BEFORE the provider
  // call — the attempt fails (failover/502), it never overspends.
  const serialized = JSON.stringify(body);
  assertSerializedInputWithinBound(serialized);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: serialized,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[ai/gemini] upstream error:", res.status, errText.slice(0, 500));
    throw new Error(`gemini HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    console.error("[ai/gemini] empty completion:", JSON.stringify(data).slice(0, 500));
    throw new Error("gemini empty completion");
  }
  // W3 (founder round-10): Gemini reports usageMetadata.totalTokenCount.
  const usage = data?.usageMetadata?.totalTokenCount;
  return { text, totalTokens: typeof usage === "number" && Number.isFinite(usage) ? usage : null };
}
