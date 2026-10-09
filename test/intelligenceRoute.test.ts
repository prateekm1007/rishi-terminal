/**
 * INT-A10 — /api/intelligence route wiring: the ONE intelligence API
 * surface (pre-registration docs/intelligence/intelligenceApi.md).
 *
 * Pinned here:
 *   - validation-first refusals (invalid capability / unknown symbol)
 *     return 400 with ZERO rpc traffic (nothing runs, nothing consumes);
 *   - the deterministic thesis surface serves a contract-valid artifact;
 *   - the non-material insight miss is the honest 404 and reaches NO
 *     spend control (the A4 economic gate holds before reserve/consume);
 *   - the material insight miss runs the FULL generation path through the
 *     ONE bounded loop (fixed server prompt, canonical evidence joined
 *     package-first with the chain's items), consumes the SAME persistent
 *     daily quota, settles the reservation and caches through the ONE A7
 *     writer;
 *   - a cache HIT serves the stored artifact with zero generation and
 *     zero quota consumption;
 *   - a null router answer refunds the quota and releases the
 *     reservation, then answers the honest 404.
 *
 * Live surfaces, auth, and the provider are module-mocked (the
 * chat.route.insightContext.test.ts pattern); the chain, the A1 parser,
 * the change-key derivation, the evidence merge and the controls run FOR
 * REAL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── switchable seams ──
let historyRows: unknown[] = [];
let rowsByField: Record<string, unknown[]> | null = null;
let readHit: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let rpcCalls: string[] = [];
let consumeCalls = 0;
let refundCalls = 0;
let routerAnswer: unknown = {
  answer: "The cited transition shows a material price move (evt:PRICE:c-21).",
  claims: [
    { text: "material price move", evidenceIds: ["evt:PRICE:c-21"], assertions: [] },
  ],
  uncertainties: ["Whether the next session confirms the move"],
  provider: "openai-compatible",
  model: "attested-model",
  generatedAt: "2026-10-09T00:00:00.000Z",
  claimsVerified: true,
  groundingRejections: [],
  groundingMode: "structured-claims",
  usage: { totalTokens: 512 },
};

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => null),
}));

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      rpcCalls.push(fn);
      if (fn === "hit_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      if (fn === "reserve_rate_limit") return { data: { allowed: true, count: 1 }, error: null };
      if (fn === "settle_rate_limit") return { data: { ok: true }, error: null };
      if (fn === "consume_chat_quota") {
        consumeCalls += 1;
        return { data: { ok: true, count: consumeCalls }, error: null };
      }
      if (fn === "refund_chat_quota") {
        refundCalls += 1;
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === "insight_cache_read_hit") return readHit;
      if (fn === "insight_cache_write") return { data: 0, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    },
    from: () => {
      throw new Error("unexpected from() — history reads go through readStateHistory");
    },
  }),
}));

vi.mock("@/lib/intelligence/stateLog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intelligence/stateLog")>();
  return {
    ...actual,
    readStateHistory: vi.fn(
      async (_entity: string, field: string) =>
        rowsByField ? (rowsByField[field] ?? []) : historyRows,
    ),
  };
});

vi.mock("@/lib/ai/evidence", () => ({
  buildAiEvidencePackage: vi.fn(async () => ({
    items: [{ id: "pkg:RELIANCE:price", text: "canonical package fact", facts: [] }],
  })),
  createCanonicalStockState: vi.fn(() => ({ symbol: "RELIANCE" })),
}));

vi.mock("@/lib/ai/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/router")>();
  return {
    ...actual,
    generateEvidenceGroundedAnswer: vi.fn(async () => routerAnswer),
  };
});

import { GET } from "@/app/api/intelligence/route";
import { generateEvidenceGroundedAnswer as generateEvidenceGroundedAnswerMock } from "@/lib/ai/router";

const routerMock = vi.mocked(generateEvidenceGroundedAnswerMock);

// ── helpers ──

function makeReq(query: string): never {
  const url = `http://localhost/api/intelligence?${query}`;
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? "9.9.9.9" : null),
    },
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
  } as never;
}

/** 21 flat daily closes then one +4.9% intraday transition. */
function materialPriceHistory(): unknown[] {
  const rows: unknown[] = [];
  let prev: number | null = null;
  for (let i = 0; i < 22; i++) {
    const day = new Date(Date.parse("2026-09-15T10:00:00.000Z") + i * 86_400_000)
      .toISOString()
      .slice(0, 11);
    const value = i < 21 ? 1000 + i : 1070;
    const observedAt = `${day}10:00:00.000Z`;
    rows.push({
      entity: "RELIANCE",
      field: "price",
      observedAt,
      source: "yahoo",
      unit: "inr",
      sourceState: "live",
      oldValue: prev,
      newValue: value,
      changeId: `c-${i}`,
      recordedAt: observedAt,
    });
    prev = value;
  }
  return rows;
}

beforeEach(() => {
  process.env.ANON_ID_PEPPER = "route-test-pepper";
  historyRows = [];
  rowsByField = null;
  readHit = { data: null, error: null };
  rpcCalls = [];
  consumeCalls = 0;
  refundCalls = 0;
  routerAnswer = {
    answer: "The cited transition shows a material price move (evt:PRICE:c-21).",
    claims: [
      { text: "material price move", evidenceIds: ["evt:PRICE:c-21"], assertions: [] },
    ],
    uncertainties: ["Whether the next session confirms the move"],
    provider: "openai-compatible",
    model: "attested-model",
    generatedAt: "2026-10-09T00:00:00.000Z",
    claimsVerified: true,
    groundingRejections: [],
    groundingMode: "structured-claims",
    usage: { totalTokens: 512 },
  };
  routerMock.mockClear();
  
});

afterEach(() => {
  delete process.env.ANON_ID_PEPPER;
});

describe("INT-A10 route: validation-first refusals cost nothing", () => {
  it("an unknown capability id is refused 400 with ZERO rpc traffic", async () => {
    const res = await GET(makeReq("capability=nope&subject=RELIANCE"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid capability");
    expect(rpcCalls).toEqual([]);
  });

  it("a registry-unresolvable subject is refused 400 with ZERO rpc traffic", async () => {
    const res = await GET(makeReq("capability=thesis&subject=ZZZZZZ"));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unknown symbol");
    expect(rpcCalls).toEqual([]);
  });
});

describe("INT-A10 route: the deterministic surface (thesis)", () => {
  it("serves a contract-valid deterministic artifact with no AI and no quota consumption", async () => {
    historyRows = materialPriceHistory();
    const res = await GET(makeReq("capability=thesis&subject=RELIANCE"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      capability: string;
      subject: string;
      insight: { modelStatus: string; provenance: { synthesisPath: string } };
      cached: boolean;
      timings: { wallMs: number; chainMs: number };
    };
    expect(body.ok).toBe(true);
    expect(body.capability).toBe("thesis");
    expect(body.subject).toBe("RELIANCE");
    expect(body.insight.modelStatus).toBe("deterministic");
    expect(body.insight.provenance.synthesisPath).toBe("deterministic");
    expect(body.cached).toBe(false);
    expect(body.timings.wallMs).toBeGreaterThanOrEqual(0);
    // the only rpc traffic is the per-IP burst guard
    expect(rpcCalls).toEqual(["hit_rate_limit"]);
    expect(consumeCalls).toBe(0);
    expect(routerMock).not.toHaveBeenCalled();
  });
});

describe("INT-A10 route: the persistent insight (non-material = honest 404, zero spend)", () => {
  it("a non-material chain reaches NO spend control at all", async () => {
    historyRows = [
      {
        entity: "RELIANCE",
        field: "price",
        observedAt: "2026-10-08T00:00:00.000Z",
        source: "yahoo",
        unit: "inr",
        sourceState: "live",
        oldValue: null,
        newValue: 1204.1,
        changeId: "c-1",
        recordedAt: "2026-10-08T00:00:00.000Z",
      },
    ];
    const res = await GET(makeReq("capability=insight&subject=RELIANCE"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("No generated insight for this subject");
    // the A4 gate held BEFORE any control: no reserve, no consume
    expect(rpcCalls).toEqual(["hit_rate_limit"]);
    expect(consumeCalls).toBe(0);
    expect(routerMock).not.toHaveBeenCalled();
  });
});

describe("INT-A10 route: the material generation path (ONE loop, shared controls)", () => {
  it("cache miss + material: generates through the router, consumes the shared quota, caches through the ONE writer", async () => {
    rowsByField = { price: materialPriceHistory() };
    const res = await GET(makeReq("capability=insight&subject=RELIANCE"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      capability: string;
      insight: {
        modelStatus: string;
        summary: string;
        provenance: {
          synthesisPath: string;
          provider?: string;
          model?: string;
          synthesizedAt?: string;
          changeKey?: string;
        };
      };
      cached: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.cached).toBe(false);
    expect(body.insight.modelStatus).toBe("model-grounded");
    expect(body.insight.summary).toContain("evt:PRICE:c-21");
    expect(body.insight.provenance.synthesisPath).toBe("bounded-model");
    expect(body.insight.provenance.provider).toBe("openai-compatible");
    expect(body.insight.provenance.model).toBe("attested-model");
    expect(body.insight.provenance.synthesizedAt).toBeDefined();
    expect(body.insight.provenance.changeKey).toMatch(/^[0-9a-f]{64}$/);
    // the ONE loop ran ONCE with a server-composed prompt
    expect(routerMock).toHaveBeenCalledTimes(1);
    const call = routerMock.mock.calls[0]?.[0] as {
      systemPrompt: string;
      history: unknown[];
      message: string;
      evidence: Array<{ id: string }>;
    };
    expect(call.systemPrompt.startsWith("You are the synthesis layer")).toBe(true);
    expect(call.history).toEqual([]);
    expect(call.message).toContain("RELIANCE");
    // the chain's own evidence id joined the canonical package
    expect(call.evidence.some((e) => e.id === "evt:PRICE:c-21")).toBe(true);
    // the SAME persistent daily quota consumed exactly once; settled
    expect(consumeCalls).toBe(1);
    expect(refundCalls).toBe(0);
    expect(rpcCalls).toContain("consume_chat_quota");
    expect(rpcCalls).toContain("settle_rate_limit");
    expect(rpcCalls).toContain("insight_cache_write");
  });

  it("a null router answer refunds the quota, releases the reservation, and answers the honest 404", async () => {
    rowsByField = { price: materialPriceHistory() };
    routerAnswer = null;
    const res = await GET(makeReq("capability=insight&subject=RELIANCE"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Insight not available");
    expect(consumeCalls).toBe(1);
    expect(refundCalls).toBe(1);
    expect(routerMock).toHaveBeenCalledTimes(1);
  });

  it("a cache HIT serves the stored artifact with zero generation and zero quota consumption", async () => {
    rowsByField = { price: materialPriceHistory() };
    const payload = {
      id: "insight:stock-intelligence:RELIANCE:hitleg",
      feature: "stock-intelligence",
      subject: "RELIANCE",
      generatedAt: "2026-10-08T00:00:00.000Z",
      observationWindow: { from: "2026-09-15T10:00:00.000Z", to: "2026-10-06T10:00:00.000Z" },
      status: "ok",
      confidence: "high",
      materiality: "high",
      summary: "Stored artifact for the hit leg.",
      whyItMatters: "A hit must serve the stored artifact, not regenerate.",
      whatChanged: [{ field: "price", change: "1020 -> 1070 inr" }],
      invalidators: [],
      evidence: [
        {
          id: "evt:PRICE:c-21",
          text: "price (price, yahoo): 1020 -> 1070 inr",
          facts: [
            { field: "price", value: 1070, unit: "inr", source: "live", observedAt: "2026-10-06T10:00:00.000Z" },
          ],
        },
      ],
      contradictions: [],
      uncertainty: [],
      nextInvestigations: [],
      provenance: { synthesisPath: "deterministic" },
      modelStatus: "deterministic",
    };
    // the change key is derived by the SAME chain computation; find it via
    // a first request's write-call argument on a fresh miss, then hit it.
    const first = await GET(makeReq("capability=insight&subject=RELIANCE"));
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      insight: { provenance: { changeKey?: string } };
    };
    const key = firstBody.insight.provenance.changeKey!;
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    // now the cache holds that key (the previous write went through the
    // mocked rpc); serve the SAME artifact from a plain read
    readHit = {
      data: {
        change_key: key,
        feature: "stock-intelligence",
        subject: "RELIANCE",
        payload,
        generated_at: "2026-10-08T00:00:00.000Z",
        hit_count: 1,
        last_hit_at: null,
      },
      error: null,
    };
    const before = consumeCalls;
    const res = await GET(makeReq("capability=insight&subject=RELIANCE"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      cached: boolean;
      insight: { summary: string; modelStatus: string };
    };
    expect(body.ok).toBe(true);
    expect(body.cached).toBe(true);
    expect(body.insight.summary).toBe("Stored artifact for the hit leg.");
    expect(body.insight.modelStatus).toBe("deterministic");
    expect(consumeCalls).toBe(before);
    expect(routerMock).toHaveBeenCalledTimes(1); // only the earlier miss
  });
});
