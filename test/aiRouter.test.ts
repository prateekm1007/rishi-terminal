import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { resolveAiProvider, generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { resetProviderHealth } from "@/lib/registry/providerHealth";

// T49–T52: provider abstraction, fail-closed resolution, provenance.

const ENV_BACKUP = { ...process.env };

beforeEach(() => resetProviderHealth());
afterEach(() => {
  process.env.CHAT_API_BASE_URL = ENV_BACKUP.CHAT_API_BASE_URL;
  process.env.CHAT_API_KEY = ENV_BACKUP.CHAT_API_KEY;
  process.env.CHAT_MODEL = ENV_BACKUP.CHAT_MODEL;
  process.env.GEMINI_API_KEY = ENV_BACKUP.GEMINI_API_KEY;
  vi.restoreAllMocks();
});

describe("resolveAiProvider (T49/T50)", () => {
  it("prefers the OpenAI-compatible endpoint when configured", () => {
    process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
    process.env.CHAT_API_KEY = "k-test";
    const p = resolveAiProvider();
    expect(p?.kind).toBe("openai");
    expect(p?.id).toBe("chat-api");
  });

  it("falls back to Gemini when only GEMINI_API_KEY is set", () => {
    delete process.env.CHAT_API_BASE_URL;
    delete process.env.CHAT_API_KEY;
    process.env.GEMINI_API_KEY = "g-test";
    const p = resolveAiProvider();
    expect(p?.kind).toBe("gemini");
    expect(p?.id).toBe("gemini");
  });

  it("returns null (explicit unavailable) when nothing is configured", () => {
    delete process.env.CHAT_API_BASE_URL;
    delete process.env.CHAT_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(resolveAiProvider()).toBeNull();
  });
});

describe("generateEvidenceGroundedAnswer (T50–T52)", () => {
  beforeEach(() => {
    process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
    process.env.CHAT_API_KEY = "k-test";
    process.env.CHAT_MODEL = "test-model";
  });

  it("returns provenance-carrying answer and a backwards-compatible wire shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "  Buy quality.  " } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "What about TCS?",
    });
    expect(answer).not.toBeNull();
    expect(answer?.answer).toBe("Buy quality.");
    expect(answer?.provider).toBe("chat-api");
    expect(answer?.model).toBe("test-model");
    expect(answer?.generatedAt).toBeTruthy();

    const wire = toChatWire(answer!);
    expect(wire.text).toBe("Buy quality.");
    expect(wire.provenance.provider).toBe("chat-api");
    expect(wire.provenance.grounded).toBe(false);
  });

  it("evidence context flows into the request system prompt (T51)", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }),
    );
    await generateEvidenceGroundedAnswer({
      systemPrompt: "You are a persona.",
      history: [],
      message: "hi",
      evidence: [{ id: "seed:TCS:profile", text: "TCS, sector IT." }],
    });
    const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string);
    const sys = body.messages.find((m: { role: string }) => m.role === "system").content as string;
    expect(sys).toContain("[seed:TCS:profile]");
    expect(sys).toContain("do not invent ids");
  });

  it("upstream failure → throws (explicit unavailable), never a fake answer (T57)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" }),
    ).rejects.toThrow();
  });

  it("upstream 502 → throws with the failure recorded in provider health (T45)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 502 }));
    await expect(
      generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" }),
    ).rejects.toThrow();
    const { providerHealthSnapshot } = await import("@/lib/registry/providerHealth");
    const snap = providerHealthSnapshot().find(p => p.id === "chat-api");
    expect(snap?.errors).toBe(1);
  });
});
