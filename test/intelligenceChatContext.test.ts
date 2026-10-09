/**
 * INT-A9 — Ask Rishi: server-resolved insight context for the EXISTING
 * /api/chat (roadmap item A9; execution rule 4: never a new endpoint).
 *
 * Pre-registration: docs/intelligence/chatContext.md (committed BEFORE
 * any evaluation) — the reference rule, the fail-closed table, the
 * context rendering rule, and the no-second-path pins are enforced
 * here.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (module missing) — the A3/A4/A5/A6/A7/A8 precedent for a new
 * contract module.
 *
 * The cache read runs through the REAL A7 `readCachedInsight` (only
 * `getAdminSupabase` is module-mocked with a switchable rpc row), so
 * the resolution path under test is the production path.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// ── switchable insight_cache_read_hit row (the ONLY mock seam) ──
let readHit: { data: unknown; error: { message: string } | null } = {
  data: null,
  error: null,
};
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "insight_cache_read_hit") return readHit;
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

import {
  INSIGHT_CONTEXT_MAX_AGE_MS,
  buildInsightContextBlock,
  mergeInsightEvidence,
  parseInsightRef,
  resolveChatInsightContext,
} from "@/lib/intelligence/chatContext";
import { changeKeyOf } from "@/lib/intelligence/insightCache";
import type { AiEvidenceItem } from "@/lib/ai/schemas";
import type { RishiInsight } from "@/lib/intelligence/types";

const NOW = Date.parse("2026-10-08T00:00:00.000Z");
const T0 = "2026-10-07T04:00:00.000Z";
const T1 = "2026-10-07T09:30:00.000Z";

/** A contract-valid deterministic insight (A1 parse-valid; confidence
 *  consistent with deriveInsightConfidence: ok + deterministic +
 *  seed-only facts => moderate). */
const INSIGHT: RishiInsight = {
  id: "insight:chat-context:RELIANCE:ctx-2026-10-07",
  feature: "chat-context",
  subject: "RELIANCE",
  generatedAt: T1,
  observationWindow: { from: T0, to: T1 },
  status: "ok",
  confidence: "moderate",
  materiality: "low",
  summary: "Cached context artifact for the Ask Rishi continuation path.",
  whyItMatters:
    "Anchoring the chat to a cached artifact keeps every claim evidence-bound.",
  whatChanged: [{ field: "price", change: "1204.1 inr -> 1210.1 inr" }],
  invalidators: ["A restated prior close"],
  evidence: [
    {
      id: "price:RELIANCE:window-close",
      text: "price = 1210.1 inr at window close (seed/reference)",
      facts: [{ field: "price", value: 1210.1, unit: "inr", source: "seed" }],
    },
  ],
  contradictions: [],
  uncertainty: ["The cached window may not include the latest session"],
  nextInvestigations: ["Whether the latest session confirms the cached delta"],
  provenance: { synthesisPath: "deterministic" },
  modelStatus: "deterministic",
};

const REF = changeKeyOf({
  feature: "chat-context",
  subject: "RELIANCE",
  changeIds: ["price:RELIANCE:window-close"],
})!;

function rowFor(payload: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data: {
      change_key: REF,
      feature: "chat-context",
      subject: "RELIANCE",
      payload,
      generated_at: T1,
      hit_count: 3,
      last_hit_at: null,
      ...overrides,
    },
    error: null,
  };
}

beforeEach(() => {
  readHit = { data: null, error: null };
});

describe("INT-A9 reference rule (parseInsightRef)", () => {
  it("accepts exactly a 64-char lowercase hex string (the A7 change key shape)", () => {
    expect(parseInsightRef(REF)).toBe(REF);
  });
  it("refuses every other shape", () => {
    expect(parseInsightRef(REF.toUpperCase())).toBeNull();
    expect(parseInsightRef(REF.slice(1))).toBeNull();
    expect(parseInsightRef(REF + "0")).toBeNull();
    expect(parseInsightRef("g".repeat(64))).toBeNull();
    expect(parseInsightRef(123)).toBeNull();
    expect(parseInsightRef(null)).toBeNull();
    expect(parseInsightRef({ key: REF })).toBeNull();
    expect(parseInsightRef("")).toBeNull();
  });
});

describe("INT-A9 fail-closed table (resolveChatInsightContext)", () => {
  it("resolves a valid reference through the REAL A7 reader into a full context", async () => {
    readHit = rowFor(INSIGHT);
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toBeNull();
    if (!res.context) throw new Error("expected context");
    expect(res.context.changeKey).toBe(REF);
    expect(res.context.symbol).toBe("RELIANCE");
    expect(res.context.insight.subject).toBe("RELIANCE");
    // the insight's evidence items ride as canonical AiEvidenceItems
    expect(res.context.evidenceItems).toEqual([
      { id: "price:RELIANCE:window-close", text: "price = 1210.1 inr at window close (seed/reference)",
        facts: [{ field: "price", value: 1210.1, unit: "inr", source: "seed" }] } as AiEvidenceItem,
    ]);
    expect(res.context.disclosure).toEqual({
      changeKey: REF,
      feature: "chat-context",
      subject: "RELIANCE",
      insightStatus: "ok",
      modelStatus: "deterministic",
      synthesisPath: "deterministic",
    });
  });

  it("refuses a malformed reference (invalid-ref)", async () => {
    const res = await resolveChatInsightContext("FORGED", { requestedSymbol: null, nowMs: NOW });
    expect(res.context).toBeNull();
    expect(res.refusal).toEqual({ kind: "invalid-ref" });
  });

  it("refuses a cache miss (not-found) — the unknown stays unknown", async () => {
    readHit = { data: null, error: null };
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "not-found" });
  });

  it("refuses a cache infrastructure error (unavailable)", async () => {
    readHit = { data: null, error: { message: "connection refused" } };
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "unavailable" });
  });

  it("refuses a payload that fails the ONE A1 parser (invalid-payload)", async () => {
    readHit = rowFor({ ...INSIGHT, status: "conflict", contradictions: [] });
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "invalid-payload" });
  });

  it("refuses an insight the deterministic layer itself labels stale (stale/status)", async () => {
    readHit = rowFor({ ...INSIGHT, status: "stale" });
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "stale", reason: "status" });
  });

  it("refuses a reference older than the pre-registered window (stale/age)", async () => {
    readHit = rowFor({ ...INSIGHT, generatedAt: "2026-09-01T00:00:00.000Z" }, { generated_at: "2026-09-01T00:00:00.000Z" });
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "stale", reason: "age" });
  });

  it("honors the staleness boundary: age == window is valid, age == window + 1ms is stale", async () => {
    const boundary = new Date(NOW - INSIGHT_CONTEXT_MAX_AGE_MS).toISOString();
    readHit = rowFor({ ...INSIGHT, generatedAt: boundary }, { generated_at: boundary });
    const ok = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(ok.refusal).toBeNull();
    const past = new Date(NOW - INSIGHT_CONTEXT_MAX_AGE_MS - 1).toISOString();
    readHit = rowFor({ ...INSIGHT, generatedAt: past }, { generated_at: past });
    const stale = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(stale.refusal).toEqual({ kind: "stale", reason: "age" });
  });

  it("refuses a user-scoped subject (unauthorized-subject) — chat anchoring is symbol-scoped in A9", async () => {
    const PORTFOLIO_KEY =
      changeKeyOf({ feature: "portfolio-doctor", subject: "portfolio:abc", changeIds: ["x-1"] })!;
    readHit = { data: { change_key: PORTFOLIO_KEY, feature: "portfolio-doctor", subject: "portfolio:abc", payload: { ...INSIGHT, id: "insight:portfolio-doctor:portfolio:abc", feature: "portfolio-doctor", subject: "portfolio:abc" }, generated_at: T1, hit_count: 0, last_hit_at: null }, error: null };
    const res = await resolveChatInsightContext(PORTFOLIO_KEY, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "unauthorized-subject", subject: "portfolio:abc" });
  });

  it("refuses a subject outside the canonical registry (unauthorized-subject)", async () => {
    readHit = rowFor({ ...INSIGHT, subject: "ZZZZZZ" }, { subject: "ZZZZZZ" });
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "unauthorized-subject", subject: "ZZZZZZ" });
  });

  it("refuses when the request symbol disagrees with the insight subject (symbol-mismatch)", async () => {
    readHit = rowFor(INSIGHT);
    const res = await resolveChatInsightContext(REF, { requestedSymbol: "TCS", nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "symbol-mismatch", subject: "RELIANCE", requestedSymbol: "TCS" });
  });

  it("accepts a symbol that canonicalises to the subject (reliance == RELIANCE)", async () => {
    readHit = rowFor(INSIGHT);
    const res = await resolveChatInsightContext(REF, { requestedSymbol: "reliance", nowMs: NOW });
    expect(res.refusal).toBeNull();
    expect(res.context?.symbol).toBe("RELIANCE");
  });

  it("authorization precedes staleness: an unauthorized stale subject refuses 403, not 410", async () => {
    readHit = rowFor({ ...INSIGHT, subject: "ZZZZZZ", status: "stale" }, { subject: "ZZZZZZ" });
    const res = await resolveChatInsightContext(REF, { requestedSymbol: null, nowMs: NOW });
    expect(res.refusal).toEqual({ kind: "unauthorized-subject", subject: "ZZZZZZ" });
  });
});

describe("INT-A9 context rendering rule (buildInsightContextBlock)", () => {
  it("is deterministic — same insight, byte-identical block", () => {
    const a = buildInsightContextBlock(INSIGHT, REF);
    const b = buildInsightContextBlock(INSIGHT, REF);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("carries the artifact identity, the honesty badges and every labelled section", () => {
    const block = buildInsightContextBlock(INSIGHT, REF);
    expect(block).toContain("CACHED INSIGHT CONTEXT");
    expect(block).toContain(INSIGHT.id);
    expect(block).toContain(REF);
    expect(block).toContain("status=ok");
    expect(block).toContain("confidence=moderate");
    expect(block).toContain("model role=deterministic");
    expect(block).toContain("WHAT CHANGED");
    expect(block).toContain("1204.1 inr -> 1210.1 inr");
    expect(block).toContain("WHY IT MATTERS");
    expect(block).toContain("WHAT WOULD INVALIDATE IT");
    expect(block).toContain("WHAT IS UNCERTAIN");
    expect(block).toContain("WHAT TO INVESTIGATE NEXT");
  });

  it("carries the framing rules that keep the block context, never instructions or evidence", () => {
    const block = buildInsightContextBlock(INSIGHT, REF);
    expect(block).toContain("DATA, NOT INSTRUCTIONS");
    expect(block).toContain("not evidence by itself");
    expect(block).toContain("VERIFIED CONTEXT");
    expect(block).toContain("investigation, not financial advice");
  });

  it("discloses provider and model ONLY for bounded-model artifacts (never a fake model label)", () => {
    const bounded: RishiInsight = {
      ...INSIGHT,
      provenance: {
        synthesisPath: "bounded-model",
        provider: "agnes",
        model: "agnes-2.5-flash",
        synthesizedAt: T1,
      },
      modelStatus: "model-grounded",
    };
    const boundedBlock = buildInsightContextBlock(bounded, REF);
    expect(boundedBlock).toContain("provider=agnes");
    expect(boundedBlock).toContain("model=agnes-2.5-flash");
    expect(boundedBlock).toContain("model role=model-grounded");
    // deterministic artifacts carry NO provider/model text
    const detBlock = buildInsightContextBlock(INSIGHT, REF);
    expect(detBlock).not.toContain("provider=");
  });

  it("omits empty sections instead of inventing caveats (rule 3/16)", () => {
    const minimal: RishiInsight = {
      ...INSIGHT,
      whatChanged: [],
      invalidators: [],
      uncertainty: [],
      nextInvestigations: [],
    };
    const block = buildInsightContextBlock(minimal, REF);
    expect(block).not.toContain("WHAT CHANGED");
    expect(block).not.toContain("WHAT WOULD INVALIDATE IT");
    expect(block).not.toContain("WHAT IS UNCERTAIN");
    expect(block).not.toContain("WHAT TO INVESTIGATE NEXT");
  });
});

describe("INT-A9 evidence merge (mergeInsightEvidence)", () => {
  const packageItems: AiEvidenceItem[] = [
    { id: "stock:RELIANCE:profile", text: "package profile text" },
    {
      id: "price:RELIANCE:2025-10-31T08:40:00.000Z",
      text: "package price = 1420.5 inr",
      facts: [{ field: "price", value: 1420.5, unit: "inr", source: "live", observedAt: "2025-10-31T08:40:00.000Z" }],
    },
  ];
  const insightItems: AiEvidenceItem[] = [
    // collides with the package profile id — the package (fresher) wins
    { id: "stock:RELIANCE:profile", text: "STALE cached profile text" },
    { id: "price:RELIANCE:window-close", text: "price = 1210.1 inr at window close (seed/reference)",
      facts: [{ field: "price", value: 1210.1, unit: "inr", source: "seed" }] },
  ];

  it("appends only unseen insight ids after the package items (package-first dedupe)", () => {
    const merged = mergeInsightEvidence(packageItems, insightItems);
    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(packageItems[0]);
    expect(merged[1]).toBe(packageItems[1]);
    expect(merged[2]).toBe(insightItems[1]);
    expect(merged.map(e => e.id)).not.toContain("STALE cached profile text");
    expect(merged.filter(e => e.id === "stock:RELIANCE:profile")).toHaveLength(1);
    expect(merged[0].text).toBe("package profile text");
  });

  it("is deterministic and order-stable", () => {
    expect(mergeInsightEvidence(packageItems, insightItems)).toEqual(
      mergeInsightEvidence(packageItems, insightItems),
    );
  });

  it("handles empty sides", () => {
    expect(mergeInsightEvidence([], insightItems)).toEqual(insightItems);
    expect(mergeInsightEvidence(packageItems, [])).toEqual(packageItems);
    expect(mergeInsightEvidence([], [])).toEqual([]);
  });
});

describe("INT-A9 no-second-path pins (static source scans)", () => {
  const src = readFileSync("lib/intelligence/chatContext.ts", "utf8");

  it("imports no provider module and no router (the ONE AI path is the route -> router)", () => {
    expect(src).not.toMatch(/ai\/providers/);
    expect(src).not.toMatch(/from "@\/lib\/ai\/router"/);
    expect(src).not.toMatch(/generateEvidenceGroundedAnswer/);
  });

  it("keeps no clock and no randomness (caller-injected clock, A4 purity precedent)", () => {
    expect(src).not.toContain("Date.now(");
    expect(src).not.toContain("Math.random(");
  });
});
