/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks mirror loose wire-format shapes */
/**
 * T7 follow-up: /api/chat dual-provider selection.
 *
 * Primary: any OpenAI-compatible endpoint via CHAT_API_BASE_URL +
 * CHAT_API_KEY (+ optional CHAT_MODEL). Fallback: Gemini via
 * GEMINI_API_KEY. Selection is fail-closed (503 when neither is set).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "u1", email: "t@e.st", access: "free",
  })),
}));

// R6: the route consumes/refunds quota and rate-limits via RPCs.
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "consume_chat_quota") return { data: { ok: true, count: 1 }, error: null };
      if (fn === "refund_chat_quota") return { data: { ok: true, refunded: true }, error: null };
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST } from "@/app/api/chat/route";

let calls: Array<{ url: string; headers: any; body: any }> = [];
let upstreamResponse: (url: string) => Response = () =>
  new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "hi", claims: [], uncertainties: [] }) } }] }),
    { status: 200 },
  );

beforeEach(() => {
  calls = [];
  upstreamResponse = () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "hi", claims: [], uncertainties: [] }) } }] }),
      { status: 200 },
    );
  vi.stubGlobal("fetch", vi.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return upstreamResponse(String(url));
  }) as any);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeReq(json: any, ip = "1.2.3.4"): any {
  return {
    headers: {
      get: (k: string) =>
        k.toLowerCase() === "x-forwarded-for" ? ip : null,
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  };
}

const okBody = { personaId: "buffett", message: "What do you think of reliance?" };

function stubOpenAiProvider(overrides: Record<string, string> = {}) {
  vi.stubEnv("CHAT_API_BASE_URL", overrides.CHAT_API_BASE_URL ?? "https://apihub.agnes-ai.com/v1");
  vi.stubEnv("CHAT_API_KEY", overrides.CHAT_API_KEY ?? "sk-test-key");
  if (overrides.CHAT_MODEL !== undefined) vi.stubEnv("CHAT_MODEL", overrides.CHAT_MODEL);
}

describe("T7 — chat provider selection", () => {
  it("uses the OpenAI-compatible provider when CHAT_API_* is set, even with Gemini present", async () => {
    stubOpenAiProvider();
    const res = await POST(makeReq(okBody, "10.7.0.1"));
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://apihub.agnes-ai.com/v1/chat/completions");
    expect(calls[0].url).not.toContain("generativelanguage");
    const json = await res.json();
    // Phase 5 T50: provenance (provider/model/generatedAt) now rides on every
    // response; text is still trimmed exactly as before.
    expect(json.text).toBe("hi");
    expect(json.provenance).toMatchObject({ provider: "chat-api" });
    expect(typeof json.provenance.generatedAt).toBe("string");
  });

  it("sends the key via the Authorization header — never in the URL or body", async () => {
    stubOpenAiProvider();
    const res = await POST(makeReq(okBody, "10.7.0.2"));
    expect(res.status).toBe(200);
    expect(calls[0].headers["Authorization"]).toBe("Bearer sk-test-key");
    expect(calls[0].url).not.toContain("sk-test-key");
    expect(JSON.stringify(calls[0].body)).not.toContain("sk-test-key");
  });

  it("uses CHAT_MODEL when provided and defaults sensibly otherwise", async () => {
    stubOpenAiProvider({ CHAT_MODEL: "agnes-2.5-pro" });
    await POST(makeReq(okBody, "10.7.0.3"));
    expect(calls[0].body.model).toBe("agnes-2.5-pro");

    calls = [];
    stubOpenAiProvider({ CHAT_MODEL: "" });
    await POST(makeReq(okBody, "10.7.0.4"));
    expect(calls[0].body.model).toBe("agnes-2.5-flash");
  });

  it("normalises trailing slashes and a full path base URL", async () => {
    stubOpenAiProvider({ CHAT_API_BASE_URL: "https://apihub.agnes-ai.com/v1/" });
    await POST(makeReq(okBody, "10.7.0.5"));
    expect(calls[0].url).toBe("https://apihub.agnes-ai.com/v1/chat/completions");
  });

  it("maps history to OpenAI roles; user text never enters the system message", async () => {
    stubOpenAiProvider();
    const res = await POST(makeReq(
      {
        ...okBody,
        history: [
          { role: "assistant", content: "Previous answer" },
          { role: "user", content: "Earlier question" },
        ],
        message: "My secret mark 42-XYZ",
      },
      "10.7.0.6",
    ));
    expect(res.status).toBe(200);
    const msgs = calls[0].body.messages;
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).not.toContain("42-XYZ");
    expect(msgs[0].content).not.toContain("Earlier question");
    expect(msgs[1]).toEqual({ role: "assistant", content: "Previous answer" });
    expect(msgs[2]).toEqual({ role: "user", content: "Earlier question" });
    expect(msgs.at(-1)).toEqual({ role: "user", content: "My secret mark 42-XYZ" });
  });

  it("falls back to Gemini when CHAT_API_* is unset", async () => {
    vi.stubEnv("CHAT_API_BASE_URL", "");
    vi.stubEnv("CHAT_API_KEY", "");
    upstreamResponse = () =>
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "gemini ok" }] } }] }),
        { status: 200 },
      );
    const res = await POST(makeReq(okBody, "10.7.0.7"));
    expect(res.status).toBe(200);
    expect(calls[0].url).toContain("generativelanguage.googleapis.com");
    expect(calls[0].body.system_instruction.parts[0].text.length).toBeGreaterThan(50);
  });

  it("502s with a generic body when the OpenAI-compatible upstream fails", async () => {
    stubOpenAiProvider();
    upstreamResponse = () => new Response("upstream exploded", { status: 500 });
    const res = await POST(makeReq(okBody, "10.7.0.8"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json).toEqual({ error: "Chat service error" });
    expect(JSON.stringify(json)).not.toContain("upstream exploded");
  });

  it("502s when the upstream returns an empty completion", async () => {
    stubOpenAiProvider();
    upstreamResponse = () =>
      new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 });
    const res = await POST(makeReq(okBody, "10.7.0.9"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Chat service error");
  });

  it("503s when no provider is configured", async () => {
    vi.stubEnv("CHAT_API_BASE_URL", "");
    vi.stubEnv("CHAT_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(makeReq(okBody, "10.7.0.10"));
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });
});
