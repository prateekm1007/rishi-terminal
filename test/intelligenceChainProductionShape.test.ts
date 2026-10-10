/**
 * INT-RECONCILE — the production-shape proof for the two founder audit
 * findings (2026-10-10 directives 5 + 6):
 *
 * Finding 1 (the 928/928 pair): the artifact's uncertainty carried the
 * TOTAL non-material count and the single observed refusal class with
 * the SAME number and no stated relation — it reads as a double-count.
 * The partition is disjoint and complete by construction (every
 * non-material verdict has exactly one reason); these tests pin that
 * the breakdown lines bind to the total ("Of those excluded:") so the subset relation is
 * explicit, and that the counts reconcile exactly (summary excluded ==
 * uncertainty total == the verdicts' own partition).
 *
 * Finding 2 (whatChanged:[] / evidence:[] with changeSince CHANGED):
 * no field line is dropped between ChangeSince and the artifact — the
 * projection is materiality-gated BY DESIGN, and the empty ledger must
 * be EXPLAINED by verdicts. The root cause of the observed all-refused
 * state was the A2 value round-trip: the pre-repair writer stored
 * JSON.stringify(value) — a STRING — into the JSONB columns, the reader
 * returned it verbatim, and A4 correctly refused to scale strings (every
 * leg abstained non-comparable; the statistical thresholds never
 * evaluated a number). Verified read-only on production 2026-10-10:
 * 160,200 rows across 840 entities, jsonb_typeof='string' for 100% of
 * old/new values in all three fields.
 *
 * This file pins the REAL production seam end to end: ONLY the Supabase
 * client is mocked (PostgREST row shapes: snake_case keys, legacy jsonb
 * STRING values); the REAL readStateHistory decoder and the REAL chain
 * run. Rule 21 fail-first: on the pre-repair tree every test below
 * fails (captured in docs/evidence/round42/).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// The PostgREST rows per field, exactly as production returns them for
// legacy rows (snake_case; old_value/new_value are STRINGS — the
// pre-repair jsonOf encoding).
const seam = vi.hoisted(() => ({
  rowsByField: {} as Record<string, unknown[]>,
}));

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    // readStateHistory's exact builder chain: from().select().eq(entity)
    // .eq(field).order().limit() -> { data, error }.
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: (_name2: string, field: string) => ({
            order: () => ({
              limit: async () => ({
                data: seam.rowsByField[field] ?? [],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
    // The thesis path never touches the insight cache — any rpc here is
    // a contract breach and must fail loudly, not silently pass.
    rpc: async (fn: string) => {
      throw new Error(`unexpected rpc on the thesis path: ${fn}`);
    },
  }),
}));

// readStateHistory is deliberately NOT mocked: the chain consumes the
// REAL decoder — this file exists to pin that boundary.
import { runIntelligenceChain } from "@/lib/intelligence/chain";

const NOW = Date.parse("2026-10-10T00:00:00.000Z");
const DAY1 = "2026-10-08T10:15:01+00:00";
const DAY2 = "2026-10-09T10:15:01+00:00";

/** A PostgREST row in the legacy (pre-repair) string encoding. */
function pgRow(over: Record<string, unknown>): Record<string, unknown> {
  return {
    change_id: "chg-x",
    entity: "stock:RELIANCE",
    field: "price",
    observed_at: "2026-10-08T10:15:00+00:00",
    recorded_at: DAY1,
    source: "yahoo-bulk",
    unit: "inr",
    source_state: "live",
    old_value: "1000",
    new_value: "1070",
    ...over,
  };
}

beforeEach(() => {
  seam.rowsByField = {};
});

describe("INT-RECONCILE production shape — legacy string rows classify with REAL verdicts", () => {
  it("a material intraday move on string-encoded rows is MATERIAL and projects into whatChanged/evidence (no silent drop)", async () => {
    seam.rowsByField = {
      price: [
        pgRow({ change_id: "p-0", old_value: "1000", new_value: "1005" }),
        pgRow({
          change_id: "p-1",
          old_value: "1005",
          new_value: "1070",
          recorded_at: DAY2,
          observed_at: "2026-10-09T10:15:00+00:00",
        }),
      ],
      change: [
        pgRow({
          change_id: "c-0",
          field: "change",
          unit: "percent",
          old_value: "0.5",
          new_value: "0.4",
        }),
        pgRow({
          change_id: "c-1",
          field: "change",
          unit: "percent",
          old_value: "0.4",
          new_value: "6.5",
          recorded_at: DAY2,
          observed_at: "2026-10-09T10:15:00+00:00",
        }),
      ],
      volume24h: [
        pgRow({
          change_id: "v-0",
          field: "volume24h",
          unit: "shares",
          old_value: "5000000",
          new_value: "5100000",
        }),
        pgRow({
          change_id: "v-1",
          field: "volume24h",
          unit: "shares",
          old_value: "5100000",
          new_value: "5200000",
          recorded_at: DAY2,
          observed_at: "2026-10-09T10:15:00+00:00",
        }),
      ],
    };

    const out = await runIntelligenceChain({
      capability: "thesis",
      subject: "RELIANCE",
      nowMs: NOW,
    });
    expect(out.refusal).toBeNull();
    if (!out.insight) throw new Error("expected insight");

    // The chain classified REAL numbers: the two >= 4% intraday moves
    // are material (the pre-repair tree refused EVERYTHING here as
    // non-comparable — the silent degradation this test pins dead).
    expect(out.material).toBe(true);
    const materialReasons = out.verdicts
      .filter((v) => v.verdict === "material")
      .map((v) => v.reason);
    expect(materialReasons).toEqual(["price-intraday", "price-intraday"]);
    expect(out.insight.materiality).toBe("high");

    // Finding 2's positive control: the material events PROJECT —
    // field lines are not dropped between ChangeSince and the artifact.
    expect(out.insight.whatChanged).toEqual([
      { field: "change", change: "0.4 -> 6.5 percent" },
      { field: "price", change: "1005 -> 1070 inr" },
    ]);
    expect(out.insight.evidence.map((e) => e.id)).toEqual([
      "evt:PRICE:c-1",
      "evt:PRICE:p-1",
    ]);
    // The typed fact carries the decoded NUMBER (never a string).
    const priceFact = out.insight.evidence
      .find((e) => e.id === "evt:PRICE:p-1")
      ?.facts?.[0];
    expect(priceFact?.value).toBe(1070);
    expect(typeof priceFact?.value).toBe("number");

    // Finding 1's partition: the total line, then "Of those excluded:" lines
    // whose counts sum to it (derived from the SAME verdicts).
    const nonMaterial = out.verdicts.filter((v) => v.verdict !== "material");
    expect(nonMaterial).toHaveLength(4);
    expect(out.insight.uncertainty[0]).toBe(
      "4 observed transition(s) did not qualify as material evidence in this window and are excluded from the ledger.",
    );
    expect(out.insight.uncertainty[1]).toBe(
      "Of those excluded: 4 transition(s) were refused fail-closed by the materiality engine (insufficient-history).",
    );
    // every breakdown line states the partition relation
    for (const line of out.insight.uncertainty.slice(1)) {
      expect(line.startsWith("Of those excluded: ")).toBe(true);
    }
    // the summary's ledger count and the uncertainty total reconcile
    expect(out.thesis.detail).toContain("excluded=4");
  });

  it("the all-refused production shape (the BANKBARODA signature): empty by VERDICT, explained, and every count reconciles", async () => {
    // Three fields share the oldest recorded timestamp (the warmer's
    // batch write — the production shape); one later price row follows.
    seam.rowsByField = {
      price: [
        pgRow({ change_id: "b-0", old_value: "1000", new_value: "1001" }),
        pgRow({
          change_id: "b-1",
          old_value: "1001",
          new_value: "1002",
          recorded_at: DAY2,
          observed_at: "2026-10-09T10:15:00+00:00",
        }),
      ],
      change: [
        pgRow({
          change_id: "b-2",
          field: "change",
          unit: "percent",
          old_value: "0.1",
          new_value: "0.2",
        }),
      ],
      volume24h: [
        pgRow({
          change_id: "b-3",
          field: "volume24h",
          unit: "shares",
          old_value: "1000000",
          new_value: "1100000",
        }),
      ],
    };

    const out = await runIntelligenceChain({
      capability: "thesis",
      subject: "RELIANCE",
      nowMs: NOW,
    });
    expect(out.refusal).toBeNull();
    if (!out.insight) throw new Error("expected insight");

    // Nothing qualifies: the honest unknown, never fabricated.
    expect(out.material).toBe(false);
    expect(out.insight.status).toBe("unknown");
    expect(out.insight.materiality).toBe("low");

    // Finding 2: the ledger is empty BY VERDICT — and the artifact now
    // says so, with the counts that reconcile (4 events = 1 in-window
    // transition + 3 window-start baselines; excluded == the total
    // uncertainty line == the verdict partition).
    expect(out.insight.whatChanged).toEqual([]);
    expect(out.insight.evidence).toEqual([]);
    expect(out.insight.whyItMatters).toContain(
      "1 in-window transition(s) across 3 tracked field(s), 3 window-start baseline row(s), 4 projected event(s)",
    );
    expect(out.insight.whyItMatters).toContain(
      "No event qualified as material, so whatChanged and the evidence ledger are empty by A4 verdict, never by data loss",
    );
    expect(out.insight.uncertainty).toEqual([
      "4 observed transition(s) did not qualify as material evidence in this window and are excluded from the ledger.",
      "Of those excluded: 4 transition(s) were refused fail-closed by the materiality engine (insufficient-history).",
    ]);
    // changeSince still reports the recorded transitions (CHANGED) —
    // the two counters are different scopes, both stated with their own.
    expect(out.changeSince.state).toBe("CHANGED");
    expect(out.changeSince.totals.transitionsSince).toBe(1);
    expect(out.changeSince.totals.fieldsTracked).toBe(3);
    expect(out.thesis.detail).toContain("excluded=4");

    // Finding 1's exact reconciliation: the partition sums to the total.
    const nonMaterial = out.verdicts.filter((v) => v.verdict !== "material");
    expect(nonMaterial).toHaveLength(4);
    const byReason = new Map<string, number>();
    for (const v of nonMaterial) {
      byReason.set(v.reason, (byReason.get(v.reason) ?? 0) + 1);
    }
    const sum = [...byReason.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(4);
  });
});
