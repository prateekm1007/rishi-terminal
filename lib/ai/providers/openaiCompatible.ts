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
 *
 * W3 hard-cap audit (round-12): the exact serialized request body is
 * checked against the shared input bound (./serializedInputBound) BEFORE
 * the fetch — an oversized payload is refused fail-closed (it can never
 * silently spend input tokens the global reservation did not cover).
 */

import { assertSerializedInputWithinBound } from "./serializedInputBound";

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

/** E5 (R16 fresh battery, 2026-10-05): 7 of 31 repairs were malformed-json
 *  — the model answered open-ended questions with markdown prose despite
 *  the in-prompt JSON contract. The wire-level fix is the OpenAI-compatible
 *  JSON mode: the API itself refuses to emit non-JSON, which enforces the
 *  contract at the earliest layer (the request) instead of catching it at
 *  validation. Accepted by the production provider (probe, 2026-10-05:
 *  HTTP 200 with response_format json_object; tool-request replies are
 *  JSON objects too, so the bounded tool loop is unaffected). The tool
 *  request and the final structured reply are BOTH single JSON objects,
 *  so one mode covers both — there is no non-JSON reply this loop wants. */
const JSON_MODE: Record<string, unknown> = { type: "json_object" };

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

  const baseParams = {
    model,
    messages,
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: PROVIDER_MAX_OUTPUT_TOKENS,
  };
  const doFetch = (body: string) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

  // W3 hard-cap audit: refuse an oversized request BEFORE the provider
  // call — the attempt fails (failover/502), it never overspends.
  let body = JSON.stringify({ ...baseParams, response_format: JSON_MODE });
  assertSerializedInputWithinBound(body);
  let res = await doFetch(body);
  // Availability-only bounded fallback: if THIS provider build rejects the
  // json_object param outright (a 400 naming response_format — a future
  // model/base-URL swap), retry ONCE without it. Everything downstream
  // (parse, zod, grounding) is unchanged, so this can never launder a bad
  // reply — it only restores the pre-E5 request shape for that provider.
  // Logged server-side (rule 10); any other 400 still fails closed.
  if (res.status === 400) {
    const errText = await res.text();
    if (/response_format/i.test(errText)) {
      console.error(
        "[ai/openai] provider rejected response_format (json mode) — one bounded retry without it; validation unchanged",
      );
      body = JSON.stringify(baseParams);
      assertSerializedInputWithinBound(body);
      res = await doFetch(body);
    } else {
      console.error("[ai/openai] upstream error:", res.status, errText.slice(0, 500));
      throw new Error(`openai-compatible HTTP ${res.status}`);
    }
  }

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
