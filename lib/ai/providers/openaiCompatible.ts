/**
 * OpenAI-compatible chat provider (T49). Key travels via the Authorization
 * header — never the URL. User text only ever enters user/system messages.
 *
 * Commit L1: `loopTurns` carries the server-generated turns of the bounded
 * tool loop (assistant tool-request + user TOOL RESULT/TOOL ERROR), in
 * conversation order AFTER the user's message. These turns are produced
 * exclusively by executeAiTool — a client or the model can never inject a
 * tool result (the router builds them; the request contract has no field
 * that reaches here).
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** W3 (founder round-10): the completion text plus the provider-reported
 *  token usage (null when the provider did not report one — the global
 *  token cap only counts observable usage). */
export interface ProviderCompletion {
  text: string;
  totalTokens: number | null;
}

/** The per-attempt output cap sent as max_tokens. W3-A: a factor of the
 *  global token reservation ceiling (lib/chat/globalSpend.ts), pinned by
 *  test/globalSpendReservation.test.ts — changing it requires revisiting
 *  the ceiling. */
export const PROVIDER_MAX_OUTPUT_TOKENS = 2048;

export async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatTurn[],
  message: string,
  timeoutMs: number,
  loopTurns: ChatTurn[] = [],
): Promise<ProviderCompletion> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
    ...loopTurns.map(h => ({ role: h.role, content: h.content })),
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: PROVIDER_MAX_OUTPUT_TOKENS,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Log details server-side only (key never in logs — it is not in the body).
    console.error("[ai/openai] upstream error:", res.status, errText.slice(0, 500));
    throw new Error(`openai-compatible HTTP ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) {
    console.error("[ai/openai] empty completion:", JSON.stringify(data).slice(0, 500));
    throw new Error("openai-compatible empty completion");
  }
  const usage = data?.usage?.total_tokens;
  return { text, totalTokens: typeof usage === "number" && Number.isFinite(usage) ? usage : null };
}
