/**
 * OpenAI-compatible chat provider (T49) — now executed through the
 * provider-agnostic vercel/ai layer (FD8-AI-SDK, round 56; the founder's
 * batch-2 adoption record row 8: "vercel/ai — provider-agnostic chat layer
 * while FD-8 is open"). `@ai-sdk/openai-compatible` builds and sends the
 * request; this module keeps the EXACT contract the router and the tests
 * pin:
 *
 * - Key travels via the Authorization header — never the URL (the SDK
 *   sends the configured apiKey as `Authorization: Bearer`).
 * - User text only ever enters user/system messages.
 * - E5 wire contract: response_format json_object on every request, sent
 *   through the SDK's documented providerOptions passthrough (the
 *   camelCase key rishiOpenaiCompatible — the SDK spreads named provider
 *   options into the request body), with the bounded availability-only
 *   retry WITHOUT json mode when the provider's 400 names response_format.
 *   Any other 400 fails closed.
 * - W3 hard-cap audit: the serialized logical request body is checked
 *   against the shared input bound (./serializedInputBound) BEFORE the
 *   call — an oversized payload is refused fail-closed; no network
 *   attempt happens (pinned by test/w3.inputBound.test.ts).
 *
 * Commit L1: `loopTurns` carries the server-generated turns of the bounded
 * tool loop (assistant tool-request + user TOOL RESULT/TOOL ERROR), in
 * conversation order AFTER the user's message. These turns are produced
 * exclusively by executeAiTool — a client or the model can never inject a
 * tool result (the router builds them; the request contract has no field
 * that reaches here).
 */

import { generateText } from "ai";
import { APICallError } from "@ai-sdk/provider";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

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
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
    ...loopTurns.map(h => ({ role: h.role, content: h.content })),
  ];

  // W3 hard-cap audit: refuse an oversized request BEFORE the provider
  // call — the attempt fails (failover/502), it never overspends. The
  // bound runs on the serialized logical request (system + messages +
  // generation params) — the same payload basis the bound has always
  // enforced; the SDK's transport envelope is not part of the
  // reservation's input estimate.
  const logicalBody = JSON.stringify({
    model,
    system: systemPrompt,
    messages,
    temperature: 0.9,
    top_p: 0.95,
    max_tokens: PROVIDER_MAX_OUTPUT_TOKENS,
    response_format: { type: "json_object" },
  });
  assertSerializedInputWithinBound(logicalBody);

  const provider = createOpenAICompatible({
    name: "rishi-openai-compatible",
    baseURL: baseUrl,
    apiKey,
  });

  // E5: json mode on the wire, retry-once-without on a naming 400. The
  // json_object field rides the SDK's providerOptions passthrough (top-level
  // generateText responseFormat does not reach the openai-compatible wire in
  // ai v7 — verified against the installed package 2026-10-13).
  const attempt = (jsonMode: boolean) =>
    generateText({
      model: provider.chatModel(model),
      system: systemPrompt,
      messages,
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: PROVIDER_MAX_OUTPUT_TOKENS,
      ...(jsonMode
        ? { providerOptions: { rishiOpenaiCompatible: { response_format: { type: "json_object" } } } }
        : {}),
      abortSignal: AbortSignal.timeout(timeoutMs),
      maxRetries: 0,
    });

  let result;
  try {
    result = await attempt(true);
  } catch (err) {
    // Availability-only bounded fallback: if THIS provider build rejects
    // the json_object param outright (a 400 naming response_format — a
    // future model/base-URL swap), retry ONCE without it. Everything
    // downstream (parse, zod, grounding) is unchanged, so this can never
    // launder a bad reply — it only restores the pre-E5 request shape for
    // that provider. Logged server-side (rule 10); any other 400 (or
    // non-400) still fails closed with the router's error shape.
    const status = err instanceof APICallError ? err.statusCode : undefined;
    const detail = err instanceof APICallError ? (err.responseBody ?? err.message) : "";
    if (status === 400 && /response_format/i.test(detail)) {
      console.error(
        "[ai/openai] provider rejected response_format (json mode) — one bounded retry without it; validation unchanged",
      );
      result = await attempt(false);
    } else {
      if (status !== undefined) {
        console.error("[ai/openai] upstream error:", status, String(detail).slice(0, 500));
        throw new Error(`openai-compatible HTTP ${status}`);
      }
      throw err;
    }
  }

  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) {
    console.error("[ai/openai] empty completion:", JSON.stringify(result).slice(0, 500));
    throw new Error("openai-compatible empty completion");
  }
  // W3 (founder round-10): only observable usage counts. The provider's
  // own total (usage.raw.total_tokens — the exact field the hand-rolled
  // adapter read) takes precedence; the SDK's normalised totalTokens is
  // the fallback.
  const rawTotal = (result.usage?.raw as { total_tokens?: unknown } | undefined)?.total_tokens;
  const total = typeof rawTotal === "number" && Number.isFinite(rawTotal)
    ? rawTotal
    : result.usage?.totalTokens;
  return { text, totalTokens: typeof total === "number" && Number.isFinite(total) ? total : null };
}
