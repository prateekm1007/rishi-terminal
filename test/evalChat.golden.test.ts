/**
 * CI runner for the eval:chat golden set (Coder Directions §6).
 *
 * Runs EVERY kind — including the route-kind ugly paths (unauthenticated,
 * forged persona, quota exhaustion, oversized input), which need the route
 * handler's module mocks — under the SAME declarative expectations the
 * CLI harness (scripts/evalChat.ts) uses. The fixtures in
 * test/fixtures/eval-chat/golden.ts are the single source of truth.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GOLDEN_CASES } from "./fixtures/eval-chat/golden";
import {
  runGroundingCase,
  runToolCase,
  runRouterCase,
  type CaseFailure,
  type RouteCase,
} from "../scripts/evalChatRunner";

// ── route-kind plumbing (module mocks, quota ledger) ─────────────────────

let quotaCount = 0;
let refundCalls = 0;
let quotaExhausted = false;
let assemblyThrows = false;
let authedUser: { id: string; email: string; tier: string; tierExpiresAt: null } | null = {
  id: "u1", email: "t@e.st", tier: "disciple", tierExpiresAt: null,
};

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(async () => authedUser),
}));
vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string) => {
      if (fn === "consume_chat_quota") {
        quotaCount += 1;
        return { data: { ok: !quotaExhausted, count: quotaCount }, error: null };
      }
      if (fn === "refund_chat_quota") {
        refundCalls += 1;
        return { data: { ok: true, refunded: true }, error: null };
      }
      if (fn === "hit_rate_limit") {
        return { data: { allowed: true, count: 1 }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));
vi.mock("@/lib/ai/evidence", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@/lib/ai/evidence");
  return {
    ...actual,
    buildAiEvidencePackage: (symbol: string, deps?: Parameters<typeof actual.buildAiEvidencePackage>[1]) => {
      if (assemblyThrows) throw new Error("simulated registry corruption");
      return actual.buildAiEvidencePackage(symbol, deps);
    },
  };
});

import { POST } from "@/app/api/chat/route";

beforeEach(() => {
  quotaCount = 0;
  refundCalls = 0;
  quotaExhausted = false;
  assemblyThrows = false;
  authedUser = { id: "u1", email: "t@e.st", tier: "disciple", tierExpiresAt: null };
  // Provider reply for route cases that reach the provider (Gemini-shaped —
  // the vitest env has GEMINI_API_KEY configured).
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch);
});

afterEach(() => vi.restoreAllMocks());

function makeRouteReq(json: unknown): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? "1.2.3.4" : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

async function runRouteCase(c: RouteCase): Promise<CaseFailure[]> {
  const failures: CaseFailure[] = [];
  authedUser = c.setup?.authenticated === false
    ? null
    : { id: "u1", email: "t@e.st", tier: c.setup?.tier ?? "disciple", tierExpiresAt: null };
  quotaExhausted = c.setup?.quotaExhausted ?? false;
  assemblyThrows = c.setup?.assemblyThrows ?? false;

  const res = await POST(makeRouteReq(c.body));
  if (res.status !== c.expect.status) {
    failures.push({ id: c.id, expectation: "status", detail: `expected ${c.expect.status}, got ${res.status}` });
  }
  if (c.expect.errorContains) {
    const body = await res.json();
    if (!JSON.stringify(body).includes(c.expect.errorContains)) {
      failures.push({ id: c.id, expectation: "errorContains", detail: `body missing ${JSON.stringify(c.expect.errorContains)}` });
    }
  }
  if (c.expect.quotaConsumed !== undefined && quotaCount !== c.expect.quotaConsumed) {
    failures.push({ id: c.id, expectation: "quotaConsumed", detail: `expected ${c.expect.quotaConsumed}, got ${quotaCount}` });
  }
  if (c.expect.refunds !== undefined && refundCalls !== c.expect.refunds) {
    failures.push({ id: c.id, expectation: "refunds", detail: `expected ${c.expect.refunds}, got ${refundCalls}` });
  }
  return failures;
}

// ── the suite: every golden case, one it() each ──────────────────────────

describe("eval:chat golden set — deterministic contract states (§6)", () => {
  it("fixture set covers >=100 cases across the mandated categories", () => {
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(100);
    const categories = new Set(GOLDEN_CASES.map(c => c.category));
    expect(categories.size).toBeGreaterThanOrEqual(31);
  });

  it("ids are unique", () => {
    const ids = GOLDEN_CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const c of GOLDEN_CASES) {
    it(`${c.id} [${c.kind}/${c.category}]`, async () => {
      let failures: CaseFailure[];
      if (c.kind === "grounding") failures = await runGroundingCase(c);
      else if (c.kind === "tool") failures = await runToolCase(c);
      else if (c.kind === "router") failures = await runRouterCase(c);
      else failures = await runRouteCase(c);
      expect(failures).toEqual([]);
    });
  }
});
