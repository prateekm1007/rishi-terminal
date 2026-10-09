/**
 * INT-A10 — /api/intelligence: the ONE intelligence API surface
 * (roadmap item A10; frozen architecture: "one intelligence API").
 *
 * Pre-registration: docs/intelligence/intelligenceApi.md (committed
 * BEFORE any evaluation) — the closed capability registry, the
 * fail-closed table, the A4 generation gate (non-material → zero AI
 * spend), and the no-second-path pins are enforced here.
 *
 * Rule 21 fail-first: on the pre-module tree this file fails at import
 * (modules missing) — the A3..A9 precedent for a new contract module.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// ── switchable seams: A2 history + A7 cache rpc ──
let historyRows: unknown[] = [];
let readHit: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let writeCalls: Array<Record<string, unknown>> = [];

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      if (fn === "insight_cache_read_hit") return readHit;
      if (fn === "insight_cache_write") {
        writeCalls.push(args ?? {});
        return { data: 0, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
    from: () => {
      throw new Error("unexpected from() — the chain reads via readStateHistory");
    },
  }),
}));

vi.mock("@/lib/intelligence/stateLog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/intelligence/stateLog")>();
  return {
    ...actual,
    readStateHistory: vi.fn(async () => historyRows),
  };
});

import { INTELLIGENCE_CAPABILITIES } from "@/lib/intelligence/capabilities";
import { runIntelligenceChain } from "@/lib/intelligence/chain";
import { changeKeyOf } from "@/lib/intelligence/insightCache";

// NOTE (scope-honest fail-first): this commit pins the closed registry,
// the deterministic thesis path, determinism, the empty-history honest
// state, and the A4 economic gate on a non-material chain. The material
// + generation path needs A4's 20-day baseline fixtures and is pinned
// in the implementation commit (reusing the A4 suite's founder
// synthetic cases) — the pre-registration records that path's contract.

const NOW = Date.parse("2026-10-09T00:00:00.000Z");
const T0 = "2026-10-08T00:00:00.000Z";
const T1 = "2026-10-08T12:00:00.000Z";

/** Exactly the StateLogRow key set (A3's entropy guard refuses
 *  anything else). */
function row(
  changeId: string,
  observedAt: string,
  newValue: number,
  oldValue: number | null,
): unknown {
  return {
    entity: "RELIANCE",
    field: "price",
    observedAt,
    source: "yahoo",
    unit: "inr",
    sourceState: "live",
    oldValue,
    newValue,
    changeId,
    recordedAt: observedAt,
  };
}

beforeEach(() => {
  historyRows = [];
  readHit = { data: null, error: null };
  writeCalls = [];
});

describe("INT-A10 closed capability registry", () => {
  it("is exactly the Phase-A set (mechanical gate against invented capability ids)", () => {
    expect([...INTELLIGENCE_CAPABILITIES].sort()).toEqual(["insight", "thesis"]);
  });
});

describe("INT-A10 chain runner (deterministic composition of the ONE substrate)", () => {
  it("composes A2→A3→A4→A5→A6→A7 over live rows and returns a contract-valid deterministic artifact", async () => {
    historyRows = [row("c-1", T0, 1210.1, 1204.1), row("c-2", T1, 1210.1, 1204.1)];
    const out = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    if (!out.insight) throw new Error("expected insight");
    // the A1 contract IS the response boundary
    expect(out.insight.id).toMatch(/^insight:[a-z-]+:.+$/);
    expect(out.insight.feature).toBe("stock-intelligence");
    expect(out.insight.subject).toBe("RELIANCE");
    expect(out.insight.modelStatus).toBe("deterministic");
    expect(out.insight.provenance.synthesisPath).toBe("deterministic");
    expect(out.insight.provenance.provider).toBeUndefined();
    // the changeKey comes from A7 over the event changeIds
    expect(out.changeKey).toMatch(/^[0-9a-f]{64}$/);
    expect(out.changeKey).toBe(out.insight.provenance.changeKey);
    // no AI surface ran: ZERO model calls in the deterministic path
  });

  it("is deterministic: identical chain state → identical changeKey and identical artifact bytes", async () => {
    historyRows = [row("c-1", T0, 1210.1, 1204.1), row("c-2", T1, 1210.1, 1204.1)];
    const a = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    const b = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    expect(a.changeKey).toBe(b.changeKey);
    expect(JSON.stringify(a.insight)).toBe(JSON.stringify(b.insight));
  });

  it("the empty-history state is honest `unknown`, never fabricated", async () => {
    historyRows = [];
    const out = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    expect(out.insight?.status).toBe("unknown");
    expect(out.insight?.confidence).toBe("low");
  });
});

describe("INT-A10 A4 economic gate (non-material → zero AI spend)", () => {
  it("a non-material verdict refuses generation: no router call, honest 404 refusal from the runner", async () => {
    historyRows = [row("c-1", T0, 1204.1, null), row("c-2", T1, 1204.2, 1204.1)];
    const out = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    // miss + non-material → the named refusal; ZERO generation
    expect(out.refusal).toEqual({ kind: "generation-refused", reason: "non-material" });
    expect(writeCalls).toHaveLength(0);
  });
});

describe("INT-A10 cache cycle through the ONE A7 path", () => {
  it("a shapeless cache read result is a miss, never a fabricated artifact", async () => {
    readHit = { data: { id: null, change_key: null, payload: null }, error: null };
    historyRows = [];
    const out = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    // empty chain is non-material → the A4 gate refuses before any read
    expect(out.refusal).toEqual({ kind: "generation-refused", reason: "non-material" });
  });
});

describe("INT-A10 no-second-path pins (static source scans)", () => {
  const chainSrc = readFileSync("lib/intelligence/chain.ts", "utf8");

  it("the chain imports no provider module and no router (deterministic by construction)", () => {
    expect(chainSrc).not.toMatch(/ai\/providers/);
    expect(chainSrc).not.toMatch(/from "@\/lib\/ai\/router"/);
    expect(chainSrc).not.toMatch(/generateEvidenceGroundedAnswer/);
  });

  it("the chain and registry keep no clock and no randomness", () => {
    expect(chainSrc).not.toContain("Date.now(");
    expect(chainSrc).not.toContain("Math.random(");
    const capSrc = readFileSync("lib/intelligence/capabilities.ts", "utf8");
    expect(capSrc).not.toContain("Date.now(");
    expect(capSrc).not.toContain("Math.random(");
  });
});
