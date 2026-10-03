/**
 * Gemini chat provider (T49 fallback). Key travels via the x-goog-api-key
 * header — never the URL.
 */

import type { ChatTurn, ProviderCompletion } from "./openaiCompatible";

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
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
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
