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
import { readdirSync, readFileSync, statSync } from "node:fs";

// ── switchable seams: A2 history + A7 cache rpc ──
let historyRows: unknown[] = [];
/** Per-field history seam (implementation-commit tests): when non-null it
 *  wins over the flat seam so multi-field chains see field-scoped rows. */
let rowsByField: Record<string, unknown[]> | null = null;
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
    readStateHistory: vi.fn(
      async (_entity: string, field: string) =>
        rowsByField ? (rowsByField[field] ?? []) : historyRows,
    ),
  };
});

import { INTELLIGENCE_CAPABILITIES } from "@/lib/intelligence/capabilities";
import {
  assembleInsightArtifact,
  runIntelligenceChain,
  type ChainScaffold,
} from "@/lib/intelligence/chain";
import { changeKeyOf } from "@/lib/intelligence/insightCache";
import type { RishiInsight } from "@/lib/intelligence/types";

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
  rowsByField = null;
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

// ── implementation-commit pins (the material + generation contract) ────────

/** 21 flat daily closes then one +4.9% intraday transition (the A4
 *  price-intraday leg fires without needing a baseline). */
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

/** A contract-valid cached artifact for the hit leg. */
function cachedArtifact(changeKey: string): RishiInsight {
  return {
    id: `insight:stock-intelligence:RELIANCE:${changeKey.slice(0, 12)}`,
    feature: "stock-intelligence",
    subject: "RELIANCE",
    generatedAt: "2026-10-08T00:00:00.000Z",
    observationWindow: { from: T0, to: T1 },
    status: "ok",
    confidence: "high",
    materiality: "high",
    summary: "Cached deterministic ledger for the hit leg.",
    whyItMatters: "A hit must serve the stored artifact through the ONE parser.",
    whatChanged: [{ field: "price", change: "1020 -> 1070 inr" }],
    invalidators: [],
    evidence: [
      {
        id: "evt:PRICE:c-21",
        text: "price (price, yahoo): 1020 -> 1070 inr",
        facts: [
          { field: "price", value: 1070, unit: "inr", source: "live", observedAt: T1 },
        ],
      },
    ],
    contradictions: [],
    uncertainty: [],
    nextInvestigations: [],
    provenance: { synthesisPath: "deterministic", changeKey },
    modelStatus: "deterministic",
  };
}

describe("INT-A10 material chain (the A4 gate OPENS and the handoff is complete)", () => {
  it("a 4.9% intraday transition is material: the insight handoff carries scaffold, changeKey and the A4 verdicts", async () => {
    rowsByField = { price: materialPriceHistory() };
    const out = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    expect(out.material).toBe(true);
    expect(out.changeKey).toMatch(/^[0-9a-f]{64}$/);
    expect(out.generation).not.toBeNull();
    const gen = out.generation!;
    expect(gen.changeKey).toBe(out.changeKey);
    expect(gen.feature).toBe("stock-intelligence");
    expect(gen.subject).toBe("RELIANCE");
    // The scaffold is deterministic-complete: A4-mapped materiality, the
    // live evidence item for the material transition, thesis-derived status.
    expect(gen.scaffold.materiality).toBe("high");
    expect(gen.scaffold.status).toBe("ok");
    expect(gen.scaffold.confidence).toBe("high");
    expect(gen.scaffold.modelStatus).toBe("deterministic");
    expect(gen.scaffold.evidence).toHaveLength(1);
    expect(gen.scaffold.evidence[0]?.id).toBe("evt:PRICE:c-21");
    expect(gen.scaffold.evidence[0]?.facts?.[0]?.value).toBe(1070);
    expect(gen.scaffold.evidence[0]?.facts?.[0]?.source).toBe("live");
    expect(gen.scaffold.provenance.changeKey).toBe(out.changeKey);
    expect(gen.scaffold.provenance.synthesisPath).toBe("deterministic");
    // whatChanged carries the verbatim typed-fact line
    expect(gen.scaffold.whatChanged).toEqual([
      { field: "price", change: "1020 -> 1070 inr" },
    ]);
    // NOTHING was cached or written on the handoff path
    expect(writeCalls).toHaveLength(0);
  });

  it("a cache HIT serves the stored artifact through the ONE parser (zero generation, zero writes)", async () => {
    rowsByField = { price: materialPriceHistory() };
    const key = changeKeyOf({
      feature: "stock-intelligence",
      subject: "RELIANCE",
      changeIds: Array.from({ length: 22 }, (_, i) => `c-${i}`),
    })!;
    const payload = cachedArtifact(key);
    readHit = {
      data: {
        change_key: key,
        feature: "stock-intelligence",
        subject: "RELIANCE",
        payload,
        generated_at: T0,
        hit_count: 3,
        last_hit_at: null,
      },
      error: null,
    };
    const out = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    expect(out.cached).toBe(true);
    expect(out.insight).toEqual(payload);
    expect(out.generation).toBeNull();
    expect(writeCalls).toHaveLength(0);
  });

  it("a malformed stored payload is a MISS (parse-or-serve): the material chain falls through to the handoff", async () => {
    rowsByField = { price: materialPriceHistory() };
    const key = changeKeyOf({
      feature: "stock-intelligence",
      subject: "RELIANCE",
      changeIds: Array.from({ length: 22 }, (_, i) => `c-${i}`),
    })!;
    readHit = {
      data: {
        change_key: key,
        feature: "stock-intelligence",
        subject: "RELIANCE",
        payload: { broken: true },
        generated_at: T0,
        hit_count: 3,
        last_hit_at: null,
      },
      error: null,
    };
    const out = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    expect(out.cached).toBe(false);
    expect(out.insight).toBeNull();
    expect(out.generation).not.toBeNull();
    expect(writeCalls).toHaveLength(0);
  });
});

describe("INT-A10 pure prose assembler (the A1 boundary refuses, never edits)", () => {
  it("grounded model prose fills ONLY the prose families; provenance carries the full trio", async () => {
    rowsByField = { price: materialPriceHistory() };
    const chain = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    const scaffold = chain.generation!.scaffold as ChainScaffold;
    const artifact = assembleInsightArtifact(scaffold, {
      answer: "The cited transition shows a material price move (evt:PRICE:c-21).",
      provider: "openai-compatible",
      model: "attested-model",
      synthesizedAtMs: NOW + 1_000,
      claimsVerified: true,
      claimCount: 1,
      uncertainties: ["Whether the next session confirms the move", "", "x".repeat(301)],
    });
    expect(artifact).not.toBeNull();
    expect(artifact!.modelStatus).toBe("model-grounded");
    expect(artifact!.provenance.synthesisPath).toBe("bounded-model");
    expect(artifact!.provenance.provider).toBe("openai-compatible");
    expect(artifact!.provenance.model).toBe("attested-model");
    expect(artifact!.provenance.synthesizedAt).toBeDefined();
    expect(artifact!.provenance.changeKey).toBe(chain.changeKey);
    // model touched ONLY the prose families
    expect(artifact!.summary).toBe(
      "The cited transition shows a material price move (evt:PRICE:c-21).",
    );
    expect(artifact!.uncertainty).toEqual(["Whether the next session confirms the move"]);
    expect(artifact!.whyItMatters).toBe(scaffold.whyItMatters);
    expect(artifact!.whatChanged).toEqual(scaffold.whatChanged);
    expect(artifact!.materiality).toBe(scaffold.materiality);
    // oversized/empty uncertainty lines are dropped by the boundary, never edited
    expect(artifact!.uncertainty.every((u) => u.length <= 300)).toBe(true);
  });

  it("unvalidated synthesis is labelled model-unvalidated and cannot reach high confidence", async () => {
    rowsByField = { price: materialPriceHistory() };
    const chain = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    const scaffold = chain.generation!.scaffold as ChainScaffold;
    const artifact = assembleInsightArtifact(scaffold, {
      answer: "Ungrounded prose.",
      provider: "openai-compatible",
      model: "attested-model",
      synthesizedAtMs: NOW + 1_000,
      claimsVerified: false,
      claimCount: 0,
      uncertainties: [],
    });
    expect(artifact).not.toBeNull();
    expect(artifact!.modelStatus).toBe("model-unvalidated");
    expect(artifact!.confidence).toBe("low");
  });

  it("the T52 invariant: claimsVerified with zero claims is NOT grounded", async () => {
    rowsByField = { price: materialPriceHistory() };
    const chain = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    const scaffold = chain.generation!.scaffold as ChainScaffold;
    const artifact = assembleInsightArtifact(scaffold, {
      answer: "Prose without claims.",
      provider: "p",
      model: "m",
      synthesizedAtMs: NOW + 1_000,
      claimsVerified: true,
      claimCount: 0,
      uncertainties: [],
    });
    expect(artifact!.modelStatus).toBe("model-unvalidated");
  });

  it("an over-contract summary is REFUSED at the boundary (never served, never cached)", async () => {
    rowsByField = { price: materialPriceHistory() };
    const chain = await runIntelligenceChain({ capability: "insight", subject: "RELIANCE", nowMs: NOW });
    const scaffold = chain.generation!.scaffold as ChainScaffold;
    const artifact = assembleInsightArtifact(scaffold, {
      answer: "y".repeat(1300),
      provider: "p",
      model: "m",
      synthesizedAtMs: NOW + 1_000,
      claimsVerified: true,
      claimCount: 1,
      uncertainties: [],
    });
    expect(artifact).toBeNull();
  });
});

describe("INT-A10 single-caller pins (static source scans, app/lib/components)", () => {
  const ROOT = process.cwd();

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const p = `${dir}/${entry}`;
      const s = statSync(p);
      if (s.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }

  it("the ONE loop has exactly the sanctioned callers (chat, intelligence, the secret-gated probe)", () => {
    const files = [
      ...walk(`${ROOT}/app`),
      ...walk(`${ROOT}/lib`),
      ...walk(`${ROOT}/components`),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const importers = files.filter((f) =>
      /import\s*\{[^}]*generateEvidenceGroundedAnswer/.test(readFileSync(f, "utf8")),
    );
    const expected = [
      "app/api/chat/route.ts",
      "app/api/intelligence/route.ts",
      // Pre-existing, documented, secret-gated verification surface (the
      // GenerateArgs probe-seed contract) — not a product synthesis path.
      "app/api/probe/ai-loop/route.ts",
    ];
    expect(
      importers.map((f) => f.slice(ROOT.length + 1)).sort(),
    ).toEqual([...expected].sort());
  });

  it("the chain runner has exactly ONE consumer: the intelligence route", () => {
    const files = [
      ...walk(`${ROOT}/app`),
      ...walk(`${ROOT}/lib`),
      ...walk(`${ROOT}/components`),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const importers = files.filter((f) => {
      if (f.endsWith("lib/intelligence/chain.ts")) return false;
      return /intelligence\/chain|from "\.\/chain"/.test(readFileSync(f, "utf8"));
    });
    expect(importers.map((f) => f.slice(ROOT.length + 1))).toEqual([
      "app/api/intelligence/route.ts",
    ]);
  });
});

// ── production-shape repair (INT-A10 production leg, 2026-10-09) ────────────
// The deployed thesis leg returned 503: PostgREST returns row timestamps
// with a "+00:00" offset, and the A1 contract's z.string().datetime()
// (window fields) accepts ONLY the "Z" form — the deterministic artifact
// refused and the chain threw. The live rows are honest; the window must
// be normalized to the contract's UTC form without losing a millisecond.

describe("INT-A10 chain over PRODUCTION row shapes (PostgREST +00:00 timestamps)", () => {
  it("an all-+00:00 history still composes a contract-valid deterministic artifact", async () => {
    rowsByField = {
      price: materialPriceHistory().map((r) => {
        const row = r as Record<string, unknown>;
        return {
          ...row,
          observedAt: String(row.observedAt).replace("Z", "+00:00"),
          recordedAt: String(row.recordedAt).replace("Z", "+00:00"),
        };
      }),
    };
    const out = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    if (!out.insight) throw new Error("expected insight (the artifact must parse, not throw)");
    expect(out.insight.observationWindow.from.endsWith("Z")).toBe(true);
    expect(out.insight.observationWindow.to.endsWith("Z")).toBe(true);
    expect(out.insight.provenance.changeKey).toMatch(/^[0-9a-f]{64}$/);
    // evidence facts keep the upstream's verbatim offset form (G4B: the
    // upstream clock is carried verbatim; only the contract's own window
    // fields are normalized to the UTC form the A1 schema demands)
    expect(out.insight.evidence[0]?.facts?.[0]?.observedAt).toContain("+00:00");
  });

  it("an unparseable recordedAt degrades the window to the caller clock, never fabricates", async () => {
    rowsByField = {
      price: [
        {
          entity: "RELIANCE",
          field: "price",
          observedAt: null,
          source: "yahoo",
          unit: "inr",
          sourceState: "live",
          oldValue: null,
          newValue: 1210.1,
          changeId: "c-x",
          recordedAt: "not-a-timestamp",
        },
      ],
    };
    const out = await runIntelligenceChain({ capability: "thesis", subject: "RELIANCE", nowMs: NOW });
    expect(out.refusal).toBeNull();
    expect(out.insight?.observationWindow.from).toBe(new Date(NOW).toISOString());
    expect(out.insight?.observationWindow.to).toBe(new Date(NOW).toISOString());
  });
});
