/**
 * Commit O (Coder Directions 2026-10-02 #7/#8) — the DETERMINISTIC
 * probe-only production canary witness.
 *
 * Why: the live-model canary is diagnostic, not a gate — model behaviour is
 * nondeterministic (production evidence: docs/evidence/commit-o/
 * raw-provider-diagnostics.md — the real model fabricated a change value the
 * source never disclosed, rounded assertions, and put ids in claims). The
 * founder's contract: a deterministic, probe-only mechanism that still
 * exercises the REAL provider (turn-1 call + attestation), the REAL server
 * tool executor, the REAL evidence assembly, the REAL grounding validator and
 * the REAL ChatWire — without creating a fake success mode and without
 * becoming a hidden alternate application path.
 *
 * The witness:
 *   - is triggered ONLY by a server-side token (env CHAT_CANARY_PROBE_TOKEN)
 *     compared inside /api/chat against a request HEADER; a client body
 *     field can never set it (Rule 7);
 *   - builds the tool request deterministically when the model does not
 *     (closed intent→tool mapping — no NLP);
 *   - builds its final structured reply ONLY from the typed facts of the
 *     REAL tool outcome, then passes through the UNCHANGED validateGrounding
 *     — with no real tool evidence there is NOTHING to ground and the
 *     witness reports honest unavailability (a failing/unknown tool can
 *     never produce grounded=true);
 *   - never issues a second provider turn (one attested provider call).
 *
 * Rule 21: every row here failed on the pre-O3 tree (no witness existed).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateEvidenceGroundedAnswer, toChatWire } from "@/lib/ai/router";
import { buildWitnessFinalReply } from "@/lib/ai/evidence";
import { detectFinancialDataIntent } from "@/lib/ai/financialIntent";
import { resetProviderHealth } from "@/lib/registry/providerHealth";
import type { AiToolDeps } from "@/lib/ai/tools";

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  resetProviderHealth();
  process.env.CHAT_API_BASE_URL = "https://example.invalid/v1";
  process.env.CHAT_API_KEY = "k-test";
  process.env.CHAT_MODEL = "test-model";
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  process.env.CHAT_API_BASE_URL = ENV_BACKUP.CHAT_API_BASE_URL;
  process.env.CHAT_API_KEY = ENV_BACKUP.CHAT_API_KEY;
  process.env.CHAT_MODEL = ENV_BACKUP.CHAT_MODEL;
  process.env.GEMINI_API_KEY = ENV_BACKUP.GEMINI_API_KEY;
  vi.restoreAllMocks();
});

const TOOL_DEPS: AiToolDeps = {
  getFundamentals: async () => null,
  getPrice: async () => ({
    price: 1167.7, change: null, source: "test-vendor", status: "LIVE",
    observedAt: "2026-10-01T09:45:00.000Z", lastUpdated: "2026-10-01T09:45:00.000Z",
  } as never),
};

const FAILING_TOOL_DEPS: AiToolDeps = {
  getFundamentals: async () => null,
  getPrice: async () => { throw new Error("upstream exploded"); },
};

function scriptProvider(replies: string[]): { calls: Array<{ url: string; body: Record<string, unknown> }> } {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {} });
    const reply = replies[Math.min(i, replies.length - 1)];
    i += 1;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { calls };
}

const CANARY_QUESTION = "What is the latest price of RELIANCE?";

describe("the deterministic intent→tool mapping (closed vocabulary, no NLP)", () => {
  it("a price question maps to getPrices; fundamentals to getFinancials; score to getScore", () => {
    expect(detectFinancialDataIntent(CANARY_QUESTION).suggestedTool).toBe("getPrices");
    expect(detectFinancialDataIntent("What is the ROE of TCS?").suggestedTool).toBe("getFinancials");
    expect(detectFinancialDataIntent("What is the Rishi consensus score for INFY?").suggestedTool).toBe("getScore");
    expect(detectFinancialDataIntent("What is your philosophy on risk?").suggestedTool).toBeUndefined();
  });
});

describe("buildWitnessFinalReply — deterministic construction from real tool evidence only", () => {
  it("one claim per fact-carrying item, ids verbatim, assertions copied", () => {
    const witness = buildWitnessFinalReply([
      {
        id: "price:RELIANCE:2026-10-01T09:45:00.000Z",
        text: "Latest observed price: 1167.7 (24h change: not disclosed by the source). Source: test-vendor; status: LIVE.",
        facts: [{ field: "price", value: 1167.7, unit: "inr", source: "live", observedAt: "2026-10-01T09:45:00.000Z" }],
      },
    ] as never);
    expect(witness).not.toBeNull();
    expect(witness!.claims).toHaveLength(1);
    expect(witness!.claims[0].evidenceIds).toEqual(["price:RELIANCE:2026-10-01T09:45:00.000Z"]);
    expect(witness!.claims[0].assertions).toEqual([{ field: "price", value: 1167.7, unit: "inr" }]);
    // The claim text states the fact verbatim (for the stated-number gate).
    expect(witness!.claims[0].claim).toContain("1167.7");
  });

  it("items without typed facts produce NOTHING (no claims from thin air)", () => {
    const witness = buildWitnessFinalReply([
      { id: "news:RELIANCE:unavailable", text: "News: UNAVAILABLE." },
      { id: "price:RELIANCE:unavailable", text: "Price: UNAVAILABLE at assembly time." },
    ] as never);
    expect(witness).toBeNull();
  });
});

describe("MUST FAIL PRE-O3: the witness runs the REAL chain deterministically", () => {
  it("grounded=true on one request: real provider turn-1, REAL tool execution, witness reply, REAL grounding — exactly ONE provider call", async () => {
    const { calls } = scriptProvider([
      // The model does NOT request a tool — the witness must still close the
      // loop deterministically (this is the gate's determinism guarantee).
      JSON.stringify({ answer: "Let me think about that philosophically.", claims: [], uncertainties: [] }),
    ]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: CANARY_QUESTION,
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
      deterministicWitness: true,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    // Exactly ONE provider call (turn-1; the witness never asks the model twice).
    expect(calls).toHaveLength(1);
    // The REAL tool executed server-side and its status rides the audit trail.
    expect(wire.provenance.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);
    // The REAL grounding validator passed the witness reply against the REAL tool evidence.
    expect(wire.provenance.grounded).toBe(true);
    expect(wire.provenance.groundingMode).toBe("structured-claims");
    expect(wire.provenance.structuredResponse).toBe("valid");
    // Server-generated verified surface from the REAL observation.
    expect(wire.text).toContain("price = 1167.7 inr");
    expect(wire.text).toContain("live");
    // Provider/model attested from the REAL turn-1 call.
    expect(wire.provenance.provider).toBe("chat-api");
    expect(wire.provenance.model).toBe("test-model");
    // The wire marks the witness so probes (and only probes) can assert mode.
    expect(wire.provenance.canaryWitness).toBe(true);
  });

  it("the witness never fabricates: a failing tool yields grounded=false with the explicit failure state", async () => {
    scriptProvider([JSON.stringify({ answer: "philosophy", claims: [], uncertainties: [] })]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: CANARY_QUESTION,
      evidence: [],
      stockState: undefined,
      toolDeps: FAILING_TOOL_DEPS,
      deterministicWitness: true,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.toolCalls).toEqual([{ tool: "getPrices", status: "failed", symbol: "RELIANCE" }]);
    expect(wire.text).not.toMatch(/\d{3,}/); // no fabricated price
    expect(wire.provenance.claims).toEqual([]);
  });

  it("the witness never fabricates: an unknown symbol yields the explicit unknown-symbol state, no price", async () => {
    scriptProvider([JSON.stringify({ answer: "philosophy", claims: [], uncertainties: [] })]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: "What is the latest price of ZZZZNOPE?",
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
      // The probe pins the symbol; the REAL executor's security master is
      // the authority that fails closed.
      deterministicWitness: { symbol: "ZZZZNOPE" },
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.toolCalls).toEqual([{ tool: "getPrices", status: "unknown-symbol", symbol: "ZZZZNOPE" }]);
    expect(wire.text).not.toMatch(/\d{3,}/);
  });

  it("a non-financial message in witness mode has no deterministic tool to call — honest unavailable, provider still attested", async () => {
    scriptProvider([JSON.stringify({ answer: "philosophy", claims: [], uncertainties: [] })]);
    const answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "test persona",
      history: [],
      message: "What is your view on patience?",
      evidence: [],
      stockState: undefined,
      toolDeps: TOOL_DEPS,
      deterministicWitness: true,
    });
    expect(answer).not.toBeNull();
    const wire = toChatWire(answer!);
    expect(wire.provenance.grounded).toBe(false);
    expect(wire.provenance.canaryWitness).toBe(true);
    expect(wire.provenance.provider).toBe("chat-api");
  });
});

// ── Route-level trigger isolation (direction #8): the probe control can
// never be supplied by a normal client request. ────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => null),
}));
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "consume_chat_quota") return { data: { ok: true, count: 1 }, error: null };
      if (fn === "refund_chat_quota") return { data: { ok: true }, error: null };
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import { POST as chatPOST } from "@/app/api/chat/route";
import { GET as probeGET } from "@/app/api/probe/ai-loop/route";

function makeRouteReq(
  json: unknown,
  headers: Record<string, string> = {},
  ip = "10.9.0.1",
): never {
  return {
    headers: {
      get: (k: string) => {
        const lk = k.toLowerCase();
        if (lk === "x-forwarded-for") return ip;
        return headers[lk] ?? null;
      },
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function makeProbeReq(
  mode: string,
  headers: Record<string, string> = {},
  ip = "10.9.0.2",
): never {
  return {
    headers: {
      get: (k: string) => {
        const lk = k.toLowerCase();
        if (lk === "x-forwarded-for") return ip;
        return headers[lk] ?? null;
      },
    },
    nextUrl: { searchParams: new URL(`http://x/api/probe/ai-loop?mode=${mode}`).searchParams },
  } as never;
}

describe("MUST FAIL PRE-O3: route-level — the probe control is secret-gated only", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("a forged body field can NEVER activate the witness (Rule 7 — client untrusted)", async () => {
    vi.stubEnv("CHAT_API_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("CHAT_API_KEY", "k-test");
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "philosophy", claims: [], uncertainties: [] }) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const res = await chatPOST(makeRouteReq({
      personaId: "damani",
      history: [],
      message: "What is your view on patience?",
      // The forged field: the chat route must ignore it completely.
      deterministicWitness: true,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provenance.canaryWitness).toBeUndefined();
  });

  it("a wrong or missing probe secret -> 404 (mode not reachable)", async () => {
    vi.stubEnv("PROBE_SECRET", "probe-secret-minimum16chars");
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () => {
      throw new Error("provider must never be called for a rejected probe");
    });
    for (const secret of ["wrong-secret", ""]) {
      const res = await probeGET(makeProbeReq("witness", { "x-probe-secret": secret }));
      expect(res.status).toBe(404);
    }
  });

  it("with the env unset the route does not exist — a presented secret fails closed 404", async () => {
    vi.stubEnv("PROBE_SECRET", "");
    const res = await probeGET(makeProbeReq("witness", { "x-probe-secret": "probe-secret" }));
    expect(res.status).toBe(404);
  });

  it("the correct secret activates the witness through the REAL probe pipeline (real tool executor, real grounding)", async () => {
    vi.stubEnv("PROBE_SECRET", "probe-secret-minimum16chars");
    vi.stubEnv("CHAT_API_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("CHAT_API_KEY", "k-test");
    (globalThis as { fetch: unknown }).fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/chat/completions")) {
        // The model does NOT request a tool — the witness must close the loop.
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "philosophy", claims: [], uncertainties: [] }) } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // The REAL price path (NSE/Yahoo/BSE upstreams) — a Yahoo chart payload
      // with a genuine disclosed change percent.
      return new Response(
        JSON.stringify({
          chart: { result: [{ meta: { regularMarketPrice: 1167.7, regularMarketChangePercent: 0.42, regularMarketTime: 1727784000, chartPreviousClose: 1162.8 } }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const res = await probeGET(makeProbeReq("witness", { "x-probe-secret": "probe-secret-minimum16chars" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.probe.mode).toBe("witness");
    expect(body.provenance.canaryWitness).toBe(true);
    expect(body.provenance.grounded).toBe(true);
    expect(body.provenance.groundingMode).toBe("structured-claims");
    expect(body.provenance.toolCalls).toEqual([{ tool: "getPrices", status: "ok", symbol: "RELIANCE" }]);
    expect(body.text).toContain("price = 1167.7 inr");
  });

  it("witness-negative pins the unknown symbol: explicit unknown-symbol failure, no fabrication", async () => {
    vi.stubEnv("PROBE_SECRET", "probe-secret-minimum16chars");
    vi.stubEnv("CHAT_API_BASE_URL", "https://example.invalid/v1");
    vi.stubEnv("CHAT_API_KEY", "k-test");
    (globalThis as { fetch: unknown }).fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/chat/completions")) {
        return new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "no data", claims: [], uncertainties: [] }) } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error("the unknown symbol must never reach a price upstream");
    });
    const res = await probeGET(makeProbeReq("witness-negative", { "x-probe-secret": "probe-secret-minimum16chars" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provenance.canaryWitness).toBe(true);
    expect(body.provenance.grounded).toBe(false);
    expect(body.provenance.toolCalls).toEqual([{ tool: "getPrices", status: "unknown-symbol", symbol: "ZZZZNOPE" }]);
    expect(body.text).not.toContain("price =");
  });
});
