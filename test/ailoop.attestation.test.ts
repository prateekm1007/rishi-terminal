import { describe, expect, it } from "vitest";

/**
 * Commit M reconciliation (founder §25) — model identity attestation.
 *
 * The implicit provider default may come ONLY from the approved registry
 * (ATTESTED_PROVIDER_MODELS); an operator-configured CHAT_MODEL is an
 * explicit attestation; a non-well-formed model id fails closed (no
 * candidate). Complements scripts/auditModelIdentity.ts (runtime
 * verification against the provider's own responses).
 */
import { afterEach, vi } from "vitest";

const ENV_BACKUP = { ...process.env };

afterEach(() => {
  process.env.CHAT_API_BASE_URL = ENV_BACKUP.CHAT_API_BASE_URL;
  process.env.CHAT_API_KEY = ENV_BACKUP.CHAT_API_KEY;
  process.env.CHAT_MODEL = ENV_BACKUP.CHAT_MODEL;
  process.env.GEMINI_API_KEY = ENV_BACKUP.GEMINI_API_KEY;
  vi.restoreAllMocks();
});

describe("provider/model identity attestation (founder §25)", () => {
  it("the registry attests the chat-api and gemini defaults", async () => {
    const { ATTESTED_PROVIDER_MODELS, attestedDefaultModel } = await import("@/lib/registry/providerRegistry");
    expect(attestedDefaultModel("chat-api")).toBe("agnes-2.5-flash");
    expect(attestedDefaultModel("gemini")).toBe("models/gemini-2.5-flash");
    expect(ATTESTED_PROVIDER_MODELS["chat-api"]?.has("agnes-2.5-flash")).toBe(true);
  });

  it("an unset CHAT_MODEL resolves to the ATTESTED registry default (not a router constant)", async () => {
    const { resolveAiProviderCandidates } = await import("@/lib/ai/router");
    const { attestedDefaultModel } = await import("@/lib/registry/providerRegistry");
    process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
    process.env.CHAT_API_KEY = "k-test";
    delete process.env.CHAT_MODEL;
    delete process.env.GEMINI_API_KEY;
    const candidates = resolveAiProviderCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0].model).toBe(attestedDefaultModel("chat-api"));
  });

  it("a non-well-formed CHAT_MODEL fails closed — no candidate is created", async () => {
    const { resolveAiProviderCandidates } = await import("@/lib/ai/router");
    process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
    process.env.CHAT_API_KEY = "k-test";
    process.env.CHAT_MODEL = "bad model\nwith control chars";
    delete process.env.GEMINI_API_KEY;
    const candidates = resolveAiProviderCandidates();
    expect(candidates).toHaveLength(0);
  });

  it("a well-formed operator-configured CHAT_MODEL is accepted (operator attestation)", async () => {
    const { resolveAiProviderCandidates } = await import("@/lib/ai/router");
    process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
    process.env.CHAT_API_KEY = "k-test";
    process.env.CHAT_MODEL = "agnes-2.5-pro";
    delete process.env.GEMINI_API_KEY;
    const candidates = resolveAiProviderCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0].model).toBe("agnes-2.5-pro");
  });
});
