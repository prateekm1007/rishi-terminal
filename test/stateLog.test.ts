import { describe, expect, it, vi } from "vitest";
import {
  buildQuoteTransitions,
  changeIdOf,
} from "@/lib/intelligence/stateLog";
import type { CachedQuote } from "@/lib/quoteCache";
import type { RishiInsight } from "@/lib/intelligence/types";
import { RishiInsightSchema } from "@/lib/intelligence/types";

/**
 * Phase A item 2 — temporal memory (direction 12), fail-first (C5).
 * The pure transition builder is the deterministic heart: same
 * observations -> same transitions, same change ids, no clocks, no
 * randomness. The DB-side gates (no-op rejection, idempotency, RLS) are
 * proven on real Postgres by scripts/ci/observation_state_log_invariants.sql
 * (CI migrations job); this suite pins the writer/reader TS contracts and
 * the compatibility bridge to the item-1 RishiInsight contract.
 */

const T0 = "2026-10-07T04:00:00.000Z";
const T1 = "2026-10-07T09:30:00.000Z";

function quote(over: Partial<CachedQuote> = {}): CachedQuote {
  return {
    symbol: "RELIANCE",
    price: 1210.1,
    change: -0.618,
    currency: "INR",
    source: "yahoo-bulk",
    observedAt: T1,
    refreshedAt: T1,
    volume24h: 582125,
    ...over,
  };
}

describe("buildQuoteTransitions — the deterministic delta layer", () => {
  it("a first observation carries old = null for every real field (an honest beginning, never a zero)", () => {
    const ts = buildQuoteTransitions("RELIANCE", null, quote());
    expect(ts.map((t) => t.field).sort()).toEqual(["change", "price", "volume24h"]);
    for (const t of ts) {
      expect(t.oldValue).toBeNull();
      expect(t.entity).toBe("stock:RELIANCE");
      expect(t.sourceState).toBe("live");
      expect(t.source).toBe("yahoo-bulk");
      expect(t.observedAt).toBe(T1);
    }
    expect(ts.find((t) => t.field === "price")).toMatchObject({ unit: "inr", newValue: 1210.1 });
    expect(ts.find((t) => t.field === "change")).toMatchObject({ unit: "percent", newValue: -0.618 });
    expect(ts.find((t) => t.field === "volume24h")).toMatchObject({ unit: "shares", newValue: 582125 });
  });

  it("an unchanged field produces NO transition (a re-observation is not a change)", () => {
    const prev = quote({ observedAt: T0, price: 1210.1, refreshedAt: T0 });
    const next = quote({ observedAt: T1, price: 1210.1, change: -0.5, volume24h: 600000 });
    const ts = buildQuoteTransitions("RELIANCE", prev, next);
    expect(ts.map((t) => t.field).sort()).toEqual(["change", "volume24h"]);
    for (const t of ts) {
      expect(t.oldValue).not.toBeNull();
    }
  });

  it("carries the OLD value from the previous observation into each transition", () => {
    const prev = quote({ observedAt: T0, price: 1204.1, change: -0.9, volume24h: 500000, refreshedAt: T0 });
    const next = quote({});
    const price = buildQuoteTransitions("RELIANCE", prev, next).find((t) => t.field === "price");
    expect(price).toMatchObject({ oldValue: 1204.1, newValue: 1210.1 });
  });

  it("a null new value is never a transition (the writer only appends real values)", () => {
    const prev = quote({ observedAt: T0, volume24h: 500000, refreshedAt: T0 });
    const next = quote({ volume24h: null });
    const ts = buildQuoteTransitions("RELIANCE", prev, next);
    expect(ts.find((t) => t.field === "volume24h")).toBeUndefined();
  });

  it("an undisclosed observation time maps to the live-undated source state (never fabricated)", () => {
    const ts = buildQuoteTransitions("BTC-INR", null, quote({ observedAt: null, source: "crypto-aggregate" }));
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) expect(t.sourceState).toBe("live-undated");
  });

  it("deterministic: the same inputs always build the same transitions", () => {
    const a = buildQuoteTransitions("RELIANCE", quote({ observedAt: T0, refreshedAt: T0 }), quote());
    const b = buildQuoteTransitions("RELIANCE", quote({ observedAt: T0, refreshedAt: T0 }), quote());
    expect(a).toEqual(b);
  });
});

describe("changeIdOf — deterministic, idempotent identity", () => {
  it("the same transition maps to the same id", () => {
    const t = { entity: "stock:RELIANCE", field: "price", observedAt: T1, newValue: 1210.1 };
    expect(changeIdOf(t)).toBe(changeIdOf({ ...t }));
  });
  it("a different value, clock or field changes the id (corrections are appendable)", () => {
    const base = { entity: "stock:RELIANCE", field: "price", observedAt: T1, newValue: 1210.1 };
    expect(changeIdOf({ ...base, newValue: 1211.1 })).not.toBe(changeIdOf(base));
    expect(changeIdOf({ ...base, observedAt: T0 })).not.toBe(changeIdOf(base));
    expect(changeIdOf({ ...base, field: "change" })).not.toBe(changeIdOf(base));
  });
  it("a null observation clock is a distinct, honest identity component", () => {
    const a = changeIdOf({ entity: "e", field: "f", observedAt: null, newValue: 1 });
    const b = changeIdOf({ entity: "e", field: "f", observedAt: T1, newValue: 1 });
    expect(a).not.toBe(b);
  });
});

describe("appendStateTransitions — idempotent upsert contract", () => {
  it("sends ONE upsert with onConflict change_id + ignoreDuplicates (retry collapses)", async () => {
    vi.resetModules();
    const upsert = vi.fn().mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ change_id: "x" }], error: null }),
      }),
    });
    vi.doMock("@/lib/services/supabaseAdmin", () => ({
      getAdminSupabase: () => ({ from: () => upsert() }),
    }));
    const { appendStateTransitions: append } = await import("@/lib/intelligence/stateLog");
    const r = await append(
      buildQuoteTransitions("RELIANCE", null, quote()).concat(
        buildQuoteTransitions("TCS", null, quote({ symbol: "TCS" })),
      ),
    );
    expect(r.error).toBeNull();
    expect(r.appended).toBeGreaterThan(0);
    const chain = upsert.mock.results[0].value;
    const upsertFn = chain.upsert.mock.calls[0][0] as unknown[];
    const opts = chain.upsert.mock.calls[0][1] as { onConflict: string; ignoreDuplicates: boolean };
    expect(opts).toMatchObject({ onConflict: "change_id", ignoreDuplicates: true });
    expect(upsertFn.length).toBe(6); // 2 symbols x 3 fields
  });

  it("an empty batch is a no-op (no round trip)", async () => {
    vi.resetModules();
    const { appendStateTransitions: append } = await import("@/lib/intelligence/stateLog");
    const r = await append([]);
    expect(r).toEqual({ attempted: 0, appended: 0, error: null });
  });

  it("a DB error is RETURNED, never thrown (the price path logs and continues)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/services/supabaseAdmin", () => ({
      getAdminSupabase: () => ({
        from: () => ({
          upsert: () => ({
            select: vi.fn().mockResolvedValue({ data: null, error: { message: "relation missing" } }),
          }),
        }),
      }),
    }));
    const { appendStateTransitions: append } = await import("@/lib/intelligence/stateLog");
    const r = await append(buildQuoteTransitions("RELIANCE", null, quote()));
    expect(r.error).toBe("relation missing");
    expect(r.appended).toBe(0);
  });
});

describe("compatibility — the state log feeds the item-1 insight contract", () => {
  it("a persisted transition can back an evidence item + whatChanged line of a valid RishiInsight", () => {
    const prev = quote({ observedAt: T0, price: 1204.1, refreshedAt: T0 });
    const next = quote();
    const transitions = buildQuoteTransitions("RELIANCE", prev, next);
    const price = transitions.find((t) => t.field === "price")!;

    const insight: RishiInsight = {
      id: "insight:stock-intelligence:RELIANCE:price-2026-10-07",
      feature: "stock-intelligence",
      subject: "RELIANCE",
      generatedAt: T1,
      observationWindow: { from: T0, to: T1 },
      status: "ok",
      confidence: "high",
      materiality: "medium",
      summary: "The price changed during the window while the observation stayed live.",
      whyItMatters: "A priced move is the raw material every downstream judgement builds on; this insight only states the observed delta.",
      whatChanged: [
        {
          field: price.field,
          change: `${price.oldValue} inr -> ${price.newValue} inr`,
        },
      ],
      invalidators: ["A provider clock correction that re-dates either observation"],
      evidence: [
        {
          id: `price:RELIANCE:${T0}`,
          text: `price = ${price.oldValue} inr — live (observed ${T0})`,
          facts: [{ field: "price", value: 1204.1, unit: "inr", source: "live", observedAt: T0 }],
        },
        {
          id: `price:RELIANCE:${T1}`,
          text: `price = ${price.newValue} inr — live (observed ${T1})`,
          facts: [{ field: "price", value: 1210.1, unit: "inr", source: "live", observedAt: T1 }],
        },
      ],
      contradictions: [],
      uncertainty: [],
      nextInvestigations: ["Whether volume confirms the move"],
      provenance: { synthesisPath: "deterministic", changeKey: changeIdOf(price) },
      modelStatus: "deterministic",
    };
    const parsed = RishiInsightSchema.safeParse(insight);
    expect(parsed.success).toBe(true);
  });
});
