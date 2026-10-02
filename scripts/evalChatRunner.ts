// scripts/evalChatRunner.ts — shared executors for the eval:chat golden set.
//
// Coder Directions §6 (roadmap R4-02): an automated fixture harness with
// ≥100 deterministic golden questions, each with an EXPECTED CONTRACT
// STATE (grounded / mode / structuredResponse / tool status / rejection
// substrings) — never a textual-similarity assertion.
//
// Fixtures: test/fixtures/eval-chat/golden.ts (single source of truth).
// Runners:
//   - npm run eval:chat  → scripts/evalChat.ts (tsx --conditions react-server;
//     executes grounding/tool/router/loop kinds, prints the matrix, exit 1
//     on any failure; route-kind cases are executed by CI — the CLI reports
//     them as CI-delegated rather than pretending to run them).
//   - CI → test/evalChat.golden.test.ts (runs EVERY kind, including the
//     route-kind ugly paths, under the same expectations).
//
// The executors are deterministic: no network (fetch is scripted), no
// clock dependency, no randomness.

import {
  validateGrounding,
} from "../lib/ai/evidence";
import { generateEvidenceGroundedAnswer } from "../lib/ai/router";
import { executeAiTool, type AiToolDeps } from "../lib/ai/tools";
import type { AiEvidenceItem } from "../lib/ai/schemas";

// ── fixture case types ───────────────────────────────────────────────────

export interface GroundingExpect {
  grounded?: boolean;
  mode?: "structured-claims" | "context-only" | "evidence-context";
  /** Every substring must appear in the joined rejection trail. */
  rejectionContains?: string[];
  /** Substrings required in the server-generated verified surface. */
  verifiedContains?: string[];
  /** Substrings forbidden in the server-generated verified surface. */
  verifiedNotContains?: string[];
  unvalidatedProseCount?: number;
  /** Total verified facts across validated claims. */
  verifiedFactCount?: number;
}

export interface GroundingCase {
  id: string;
  category: string;
  kind: "grounding";
  evidence: AiEvidenceItem[];
  claims: Array<{
    claim: string;
    evidenceIds: string[];
    assertions?: Array<{ field: string; value: number; unit: string }>;
  }>;
  answer?: string;
  expect: GroundingExpect;
}

/** Declarative tool deps — mapped to canonical-surface stubs by the runner.
 *  "throw" simulates an upstream failure; null simulates an honest empty
 *  observation; an object supplies a canonical-shaped observation. */
export interface ToolDepsFixture {
  fundamentals?: Record<string, unknown> | null | "throw";
  price?: Record<string, unknown> | null | "throw";
  peers?: "empty";
}

export interface ToolCase {
  id: string;
  category: string;
  kind: "tool";
  tool: string;
  args: unknown;
  deps?: ToolDepsFixture;
  expect: {
    status: string;
    evidenceCountMin?: number;
    evidenceCountMax?: number;
    evidenceIdPrefix?: string;
    /** Substrings forbidden in the model payload (fabrication / leak guards). */
    payloadNotContains?: string[];
    /** Every evidence fact's source must be one of these. */
    factSources?: string[];
  };
}

export interface RouterCase {
  id: string;
  category: string;
  kind: "router";
  /** Scripted provider completions, consumed in order (the last repeats). */
  providerReplies: string[];
  /** When true every provider call rejects (upstream failure). */
  providerFails?: boolean;
  evidence?: AiEvidenceItem[];
  toolDeps?: ToolDepsFixture;
  expect: {
    grounded?: boolean;
    structuredResponse?: "valid" | "invalid" | "blocked";
    textEquals?: string;
    textContains?: string[];
    textNotContains?: string[];
    commentaryEquals?: string;
    /** The ordered list of tool-call statuses on the audit trail. */
    toolCallStatuses?: string[];
    fetchCallCount?: number;
    /** Expect the router to THROW (upstream failure propagates → 502). */
    throws?: boolean;
  };
}

/** Executed by CI (vitest) only — the route handler needs module mocks. */
export interface RouteCase {
  id: string;
  category: string;
  kind: "route";
  body: { personaId?: string; symbol?: string; message?: string; history?: unknown[] };
  setup?: {
    authenticated?: boolean;
    tier?: "seeker" | "student" | "disciple";
    /** consume_chat_quota returns ok:false (daily quota exhausted). */
    quotaExhausted?: boolean;
    /** buildAiEvidencePackage throws. */
    assemblyThrows?: boolean;
    /** Provider completion text (Gemini-shaped mock). */
    providerReply?: string;
  };
  expect: {
    status: number;
    errorContains?: string;
    quotaConsumed?: number;
    refunds?: number;
  };
}

export type GoldenCase = GroundingCase | ToolCase | RouterCase | RouteCase;

// ── expectation checking (shared by both runners) ────────────────────────

export interface CaseFailure {
  id: string;
  expectation: string;
  detail: string;
}

function checkStrings(
  failures: CaseFailure[],
  id: string,
  label: string,
  haystack: string | undefined,
  mustContain: string[] | undefined,
  mustNotContain: string[] | undefined,
): void {
  if (haystack === undefined) {
    if ((mustContain && mustContain.length > 0) || (mustNotContain && mustNotContain.length > 0)) {
      failures.push({ id, expectation: label, detail: "value absent" });
    }
    return;
  }
  for (const s of mustContain ?? []) {
    if (!haystack.includes(s)) failures.push({ id, expectation: label, detail: `missing ${JSON.stringify(s)}` });
  }
  for (const s of mustNotContain ?? []) {
    if (haystack.includes(s)) failures.push({ id, expectation: label, detail: `forbidden ${JSON.stringify(s)} present` });
  }
}

export function checkGroundingExpectations(c: GroundingCase, result: ReturnType<typeof validateGrounding>): CaseFailure[] {
  const f: CaseFailure[] = [];
  if (c.expect.grounded !== undefined && result.grounded !== c.expect.grounded) {
    f.push({ id: c.id, expectation: "grounded", detail: `expected ${c.expect.grounded}, got ${result.grounded}` });
  }
  if (c.expect.mode !== undefined && result.mode !== c.expect.mode) {
    f.push({ id: c.id, expectation: "mode", detail: `expected ${c.expect.mode}, got ${result.mode}` });
  }
  checkStrings(f, c.id, "rejections", result.rejections.join(" | "), c.expect.rejectionContains, undefined);
  checkStrings(f, c.id, "verifiedAnswer", result.verifiedAnswer, c.expect.verifiedContains, c.expect.verifiedNotContains);
  if (c.expect.unvalidatedProseCount !== undefined && result.unvalidatedProse.length !== c.expect.unvalidatedProseCount) {
    f.push({ id: c.id, expectation: "unvalidatedProseCount", detail: `expected ${c.expect.unvalidatedProseCount}, got ${result.unvalidatedProse.length}` });
  }
  if (c.expect.verifiedFactCount !== undefined) {
    const total = result.validatedClaims.reduce((n, cl) => n + (cl.verifiedFacts?.length ?? 0), 0);
    if (total !== c.expect.verifiedFactCount) {
      f.push({ id: c.id, expectation: "verifiedFactCount", detail: `expected ${c.expect.verifiedFactCount}, got ${total}` });
    }
  }
  return f;
}

export function checkToolExpectations(c: ToolCase, result: Awaited<ReturnType<typeof executeAiTool>>): CaseFailure[] {
  const f: CaseFailure[] = [];
  if (result.status !== c.expect.status) {
    f.push({ id: c.id, expectation: "status", detail: `expected ${c.expect.status}, got ${result.status}` });
  }
  if (result.status === "ok") {
    const evCount = result.evidence.length;
    if (c.expect.evidenceCountMin !== undefined && evCount < c.expect.evidenceCountMin) {
      f.push({ id: c.id, expectation: "evidenceCountMin", detail: `expected >=${c.expect.evidenceCountMin}, got ${evCount}` });
    }
    if (c.expect.evidenceCountMax !== undefined && evCount > c.expect.evidenceCountMax) {
      f.push({ id: c.id, expectation: "evidenceCountMax", detail: `expected <=${c.expect.evidenceCountMax}, got ${evCount}` });
    }
    if (c.expect.evidenceIdPrefix) {
      if (!result.evidence.every(e => e.id.startsWith(c.expect.evidenceIdPrefix!))) {
        f.push({ id: c.id, expectation: "evidenceIdPrefix", detail: `not all ids start with ${c.expect.evidenceIdPrefix}` });
      }
    }
    if (c.expect.factSources) {
      for (const item of result.evidence) {
        for (const fact of item.facts ?? []) {
          if (!c.expect.factSources.includes(fact.source ?? "")) {
            f.push({ id: c.id, expectation: "factSources", detail: `fact ${fact.field} source ${fact.source} not in ${c.expect.factSources.join(",")}` });
          }
        }
      }
    }
  }
  checkStrings(f, c.id, "payload", result.modelPayload, undefined, c.expect.payloadNotContains);
  return f;
}

export function checkRouterExpectations(
  c: RouterCase,
  result: { threw: boolean; answer: Awaited<ReturnType<typeof generateEvidenceGroundedAnswer>> },
): CaseFailure[] {
  const f: CaseFailure[] = [];
  if (c.expect.throws) {
    if (!result.threw) f.push({ id: c.id, expectation: "throws", detail: "expected the upstream failure to propagate" });
    return f;
  }
  if (result.threw || !result.answer) {
    f.push({ id: c.id, expectation: "resolved", detail: result.threw ? "router threw unexpectedly" : "router returned null (unconfigured)" });
    return f;
  }
  const a = result.answer;
  if (c.expect.grounded !== undefined && a.claimsVerified !== c.expect.grounded) {
    f.push({ id: c.id, expectation: "grounded", detail: `expected ${c.expect.grounded}, got ${a.claimsVerified}` });
  }
  if (c.expect.structuredResponse !== undefined && a.structuredResponse !== c.expect.structuredResponse) {
    f.push({ id: c.id, expectation: "structuredResponse", detail: `expected ${c.expect.structuredResponse}, got ${a.structuredResponse}` });
  }
  if (c.expect.textEquals !== undefined && a.answer !== c.expect.textEquals) {
    f.push({ id: c.id, expectation: "textEquals", detail: `expected ${JSON.stringify(c.expect.textEquals)}, got ${JSON.stringify(a.answer)}` });
  }
  checkStrings(f, c.id, "text", a.answer, c.expect.textContains, c.expect.textNotContains);
  if (c.expect.commentaryEquals !== undefined && a.commentary !== c.expect.commentaryEquals) {
    f.push({ id: c.id, expectation: "commentaryEquals", detail: `expected ${JSON.stringify(c.expect.commentaryEquals)}, got ${JSON.stringify(a.commentary)}` });
  }
  if (c.expect.toolCallStatuses) {
    const statuses = (a.toolCalls ?? []).map(t => t.status);
    if (JSON.stringify(statuses) !== JSON.stringify(c.expect.toolCallStatuses)) {
      f.push({ id: c.id, expectation: "toolCallStatuses", detail: `expected [${c.expect.toolCallStatuses}], got [${statuses}]` });
    }
  }
  return f;
}

// ── scripted fetch plumbing (no vitest dependency) ───────────────────────

/** Install a scripted fetch: each call consumes the next reply; a reply
 *  that is an Error instance rejects. Returns a restore function + call log. */
export function scriptFetch(replies: Array<string | Error>): { restore: () => void; calls: () => number } {
  const realFetch = globalThis.fetch;
  let i = 0;
  let calls = 0;
  const impl = async () => {
    const reply = replies[Math.min(i, replies.length - 1)];
    i += 1;
    calls += 1;
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  (globalThis as { fetch: unknown }).fetch = impl as unknown as typeof fetch;
  return { restore: () => { (globalThis as { fetch: unknown }).fetch = realFetch; }, calls: () => calls };
}

/** Map declarative fixture deps onto the canonical tool surface stubs. */
export function toToolDeps(fx?: ToolDepsFixture): AiToolDeps {
  const deps: AiToolDeps = {};
  if (fx?.fundamentals !== undefined) {
    deps.getFundamentals = fx.fundamentals === "throw"
      ? async () => { throw new Error("simulated upstream failure"); }
      : async () => fx.fundamentals as never;
  }
  if (fx?.price !== undefined) {
    deps.getPrice = fx.price === "throw"
      ? async () => { throw new Error("simulated upstream failure"); }
      : async () => fx.price as never;
  }
  if (fx?.peers === "empty") {
    deps.getPeers = () => [];
  }
  return deps;
}

// ── executors ────────────────────────────────────────────────────────────

export async function runGroundingCase(c: GroundingCase): Promise<CaseFailure[]> {
  return checkGroundingExpectations(c, validateGrounding(c.evidence, c.claims, c.answer ?? ""));
}

export async function runToolCase(c: ToolCase): Promise<CaseFailure[]> {
  const result = await executeAiTool({ tool: c.tool, args: c.args }, toToolDeps(c.deps));
  return checkToolExpectations(c, result);
}

export async function runRouterCase(c: RouterCase): Promise<CaseFailure[]> {
  // Router env: exactly one candidate (the scripted OpenAI-compatible one).
  const prev = { base: process.env.CHAT_API_BASE_URL, key: process.env.CHAT_API_KEY, model: process.env.CHAT_MODEL, gem: process.env.GEMINI_API_KEY };
  process.env.CHAT_API_BASE_URL = "https://eval.invalid/v1";
  process.env.CHAT_API_KEY = "eval-key";
  process.env.CHAT_MODEL = "eval-model";
  delete process.env.GEMINI_API_KEY;
  const scripted = scriptFetch(
    c.providerFails
      ? [new Error("simulated upstream failure")]
      : c.providerReplies,
  );
  let threw = false;
  let answer: Awaited<ReturnType<typeof generateEvidenceGroundedAnswer>> = null;
  try {
    answer = await generateEvidenceGroundedAnswer({
      systemPrompt: "eval persona",
      history: [],
      message: c.id,
      evidence: c.evidence ?? [],
      toolDeps: toToolDeps(c.toolDeps),
    });
  } catch {
    threw = true;
  } finally {
    scripted.restore();
    if (prev.base === undefined) delete process.env.CHAT_API_BASE_URL; else process.env.CHAT_API_BASE_URL = prev.base;
    if (prev.key === undefined) delete process.env.CHAT_API_KEY; else process.env.CHAT_API_KEY = prev.key;
    if (prev.model === undefined) delete process.env.CHAT_MODEL; else process.env.CHAT_MODEL = prev.model;
    if (prev.gem === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prev.gem;
  }
  if (c.expect.fetchCallCount !== undefined && scripted.calls() !== c.expect.fetchCallCount) {
    return [{ id: c.id, expectation: "fetchCallCount", detail: `expected ${c.expect.fetchCallCount}, got ${scripted.calls()}` }];
  }
  return checkRouterExpectations(c, { threw, answer });
}
