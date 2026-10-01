import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  resolveAiProvider,
  resolveAiProviderCandidates,
  generateEvidenceGroundedAnswer,
  toChatWire,
} from "@/lib/ai/router";
import { resetProviderHealth, recordProviderResult } from "@/lib/registry/providerHealth";

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

// ── Phase 5.1: RUNTIME failover chain (T50) ──────────────────────────────
// Gemini must be a runtime failure fallback, not merely a configuration
// fallback. These tests prove the three wire states + circuit behavior.
describe("Phase 5.1 — runtime failover chain (T50)", () => {
  beforeEach(() => {
    process.env.CHAT_API_BASE_URL = "https://chat.example/v1";
    process.env.CHAT_API_KEY = "k-chat";
    process.env.GEMINI_API_KEY = "k-gemini";
  });

  it("chat-api succeeds → Gemini is never attempted", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "primary" } }] }), { status: 200 }),
    );
    const a = await generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" });
    expect(a?.provider).toBe("chat-api");
    expect(a?.answer).toBe("primary");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("chat.example");
    expect(String(spy.mock.calls[0]?.[0])).not.toContain("generativelanguage");
  });

  it("chat-api fails → Gemini ANSWERS (runtime failover, not config fallback)", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("primary exploded", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "gemini rescued" }] } }] }),
          { status: 200 },
        ),
      );
    const a = await generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" });
    expect(a?.provider).toBe("gemini");
    expect(a?.answer).toBe("gemini rescued");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(String(spy.mock.calls[1]?.[0])).toContain("generativelanguage.googleapis.com");
    // both providers' outcomes are recorded in health
    const { providerHealthSnapshot } = await import("@/lib/registry/providerHealth");
    const snap = providerHealthSnapshot();
    expect(snap.find(p => p.id === "chat-api")?.errors).toBe(1);
    expect(snap.find(p => p.id === "gemini")?.lastSuccessAt).toBeTruthy();
  });

  it("chat-api times out and Gemini succeeds → failover still happens", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("TimeoutError")), 5)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "late rescue" }] } }] }),
          { status: 200 },
        ),
      );
    const a = await generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" });
    expect(a?.provider).toBe("gemini");
    expect(a?.answer).toBe("late rescue");
  });

  it("both providers fail → the upstream error propagates (caller surfaces 502)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("everything is down", { status: 503 }));
    await expect(
      generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" }),
    ).rejects.toThrow();
  });

  it("neither provider configured → null (caller surfaces 503, unconfigured)", async () => {
    delete process.env.CHAT_API_BASE_URL;
    delete process.env.CHAT_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(resolveAiProviderCandidates()).toHaveLength(0);
    expect(resolveAiProvider()).toBeNull();
    await expect(
      generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" }),
    ).resolves.toBeNull();
  });

  it("chat-api circuit OPEN → Gemini is attempted and chat-api is never fetched", async () => {
    // 3 consecutive failures open the chat-api circuit (60 s cooldown).
    for (let i = 0; i < 3; i++) recordProviderResult("chat-api", false, 5, "forced failure");
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "via gemini" }] } }] }),
        { status: 200 },
      ),
    );
    const a = await generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" });
    expect(a?.provider).toBe("gemini");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("generativelanguage.googleapis.com");
  });
});

// ── Phase 5.1: HONEST AI provenance (T52) ────────────────────────────────
// Evidence context ≠ grounding. claims stays empty; grounded stays false;
// uncertainties ALWAYS disclose that citations are not machine-verified.
describe("Phase 5.1 — honest AI provenance (T52)", () => {
  beforeEach(() => {
    process.env.CHAT_API_BASE_URL = "https://chat.example/v1";
    process.env.CHAT_API_KEY = "k-chat";
    delete process.env.GEMINI_API_KEY;
  });

  it("with evidence context: an unparseable model reply degrades honestly (grounded false, mode disclosed)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "answer" } }] }), { status: 200 }),
    );
    const a = await generateEvidenceGroundedAnswer({
      systemPrompt: "p",
      history: [],
      message: "m",
      evidence: [{ id: "seed:TCS:pe", text: "TCS PE 25.1" }],
    });
    expect(a?.claims).toEqual([]);
    expect(a?.uncertainties.length).toBeGreaterThan(0);
    // End-to-end loop: the structured contract is attempted; a reply that
    // ignores it is presented as UNVERIFIED text — never as grounded claims.
    expect(a?.uncertainties[0]).toContain("structured response contract not satisfied");
    expect(a?.claimsVerified).toBe(false);

    const wire = toChatWire(a!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.groundingMode).toBe("evidence-context");
  });

  it("without evidence: the uncertainty note names the missing pipeline", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "answer" } }] }), { status: 200 }),
    );
    const a = await generateEvidenceGroundedAnswer({ systemPrompt: "p", history: [], message: "m" });
    expect(a?.uncertainties[0]).toContain("no evidence pipeline context supplied");
    expect(toChatWire(a!).provenance.grounded).toBe(false);
  });
});
