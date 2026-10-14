/**
 * probe-gemini-wire.mts — capture the EXACT wire body @ai-sdk/google emits for
 * callGemini (fetch stubbed; zero network, zero spend). Run:
 *   npx tsx scripts/r57/probe-gemini-wire.mts
 * Evidence for the FD8-AI-SDK closeout addendum (docs/evidence/round56/
 * fd8-ai-sdk.md): the SDK emits the documented camelCase systemInstruction,
 * the server persona ONLY, and the user text solely in the last user turn.
 */
import type { ChatTurn } from "../../lib/ai/providers/openaiCompatible";

const calls: Array<{ url: string; body: unknown }> = [];
(globalThis as unknown as { fetch: unknown }).fetch = async (
  url: unknown,
  init?: { body?: string },
) => {
  calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null });
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: "ok", claims: [], uncertainties: [] }) }] } }],
      usageMetadata: { totalTokenCount: 42 },
    }),
    { status: 200 },
  );
};

const { callGemini } = await import("../../lib/ai/providers/gemini");

const history: ChatTurn[] = [{ role: "assistant", content: "Hello earlier" }];
const out = await callGemini(
  "fake-key", "test-model", "SERVER PERSONA PROMPT — never the client's",
  history, "My secret mark 42-XYZ", 5000,
);

console.log("=== URL ===");
console.log(calls[0].url);
console.log("=== BODY KEYS ===");
console.log(Object.keys(calls[0].body as object));
const body = calls[0].body as Record<string, unknown>;
console.log("=== systemInstruction (camel) ===");
console.log(JSON.stringify(body.systemInstruction ?? null));
console.log("=== system_instruction (snake) ===");
console.log(JSON.stringify(body.system_instruction ?? null));
console.log("=== last content ===");
console.log(JSON.stringify((body.contents as unknown[]).at(-1)));
console.log("=== generationConfig ===");
console.log(JSON.stringify(body.generationConfig ?? null));
console.log("=== result ===");
console.log(JSON.stringify(out));
