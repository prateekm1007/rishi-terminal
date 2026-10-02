/**
 * Commit M (founder §21) — SCORE PROVENANCE TRUTHFULNESS.
 *
 * buildScoreItem() derived its ID timestamp state from the set of resolved
 * field asOf values: exactly one distinct asOf → that asOf, ANYTHING else
 * → "seed-derived". That collapsed genuinely mixed observation states into
 * a seed claim:
 *   - all-live fields with NO disclosed observation time → "seed-derived"
 *     (FALSE: the inputs are live, just undated);
 *   - live fields with MULTIPLE distinct observation times → "seed-derived"
 *     (FALSE: the inputs are live mixed observations, not seed);
 *   - partially-live resolution (some direct fields live @T, some seed) →
 *     the single live asOf T (OVERSTATES: seed inputs hide behind a live
 *     timestamp).
 *
 * Rule 3: label data by what it is. The id fragment + the item text must
 * describe the ACTUAL inputs, from a closed vocabulary (no fuzzy NLP):
 *   "seed-derived"            → no live inputs at all
 *   "<asOf>"                  → every direct field live, one shared asOf,
 *                               none undated (a coherent live snapshot)
 *   "live-undated"            → every direct field live, no asOf anywhere
 *   "live-mixed-observation"  → every direct field live, ≥2 distinct asOfs
 *   "mixed-provenance"        → some direct fields live, others seed
 *
 * Rule 21: cases 2/3/5 FAIL on the pre-M tree.
 */
import { describe, expect, it } from "vitest";
import { buildScoreItem } from "@/lib/ai/evidence";
import { resolveStockMetrics, SCORE_ENGINE_VERSION } from "@/lib/scoring";
import type { ResolvedField, ResolvedStockMetrics } from "@/lib/scoring";

const T1 = "2026-09-30T10:00:00.000Z";
const T2 = "2026-10-01T10:00:00.000Z";

const DIRECT_FIELDS = [
  "pe", "roe", "roce", "opm", "de", "promo", "revcagr", "epscagr", "mktcap", "bvps",
] as const;

/** Clone a REAL resolution and swap in a synthetic fields map — the score
 *  engine keeps consuming the real merged stock, only provenance varies. */
function withFields(fields: Record<string, ResolvedField>): ResolvedStockMetrics {
  const base = resolveStockMetrics("TCS");
  expect(base).not.toBeNull();
  return { ...(base as ResolvedStockMetrics), fields };
}

function liveField(value: number, asOf: string | null): ResolvedField {
  return { value, source: "live", asOf };
}
function seedField(value: number): ResolvedField {
  return { value, source: "seed", asOf: null };
}

function coherentLiveFields(asOf: string | null, seedBase: NonNullable<ReturnType<typeof resolveStockMetrics>>): Record<string, ResolvedField> {
  const out: Record<string, ResolvedField> = {};
  for (const f of DIRECT_FIELDS) out[f] = liveField(seedBase.fields[f].value, asOf);
  out.pb = { value: seedBase.fields.pb.value, source: "derived", asOf: null };
  out.fcfMargin = seedField(seedBase.fields.fcfMargin.value);
  return out;
}

describe("score provenance describes the ACTUAL inputs (founder §21)", () => {
  it("MUST FAIL PRE-M (statement half): a coherent live snapshot keeps its asOf in the id AND the statement names the observation time", () => {
    const base = resolveStockMetrics("TCS")!;
    const item = buildScoreItem(withFields(coherentLiveFields(T1, base)));
    expect(item.id).toBe(`score:TCS:${SCORE_ENGINE_VERSION}:${T1}`);
    expect(item.text).toContain(T1); // the statement names the observation time
  });

  it("REGRESSION: an all-seed resolution is honestly 'seed-derived'", () => {
    const base = resolveStockMetrics("TCS")!; // no live input → seed/derived fields
    const item = buildScoreItem(base);
    expect(item.id).toBe(`score:TCS:${SCORE_ENGINE_VERSION}:seed-derived`);
    expect(item.text.toLowerCase()).toContain("seed");
  });

  it("MUST FAIL PRE-M: every direct field live but NO disclosed observation time → 'live-undated', never 'seed-derived'", () => {
    const base = resolveStockMetrics("TCS")!;
    const item = buildScoreItem(withFields(coherentLiveFields(null, base)));
    expect(item.id).toBe(`score:TCS:${SCORE_ENGINE_VERSION}:live-undated`);
    expect(item.id).not.toContain("seed");
    expect(item.text).toContain("live"); // the statement says the inputs are live
  });

  it("MUST FAIL PRE-M: mixed live observation times → 'live-mixed-observation', never collapsed to 'seed-derived'", () => {
    const base = resolveStockMetrics("TCS")!;
    const fields = coherentLiveFields(T1, base);
    fields.roe = liveField(base.fields.roe.value, T2); // a second, later observation
    const item = buildScoreItem(withFields(fields));
    expect(item.id).toBe(`score:TCS:${SCORE_ENGINE_VERSION}:live-mixed-observation`);
    expect(item.id).not.toContain("seed");
    expect(item.text).toContain("mixed"); // the statement discloses the mixed inputs
  });

  it("MUST FAIL PRE-M: partially-live resolution → 'mixed-provenance' — seed inputs may not hide behind a live timestamp", () => {
    const base = resolveStockMetrics("TCS")!;
    const fields: Record<string, ResolvedField> = {};
    for (const f of DIRECT_FIELDS) {
      fields[f] = f === "pe" || f === "roe" ? liveField(base.fields[f].value, T1) : seedField(base.fields[f].value);
    }
    fields.pb = { value: base.fields.pb.value, source: "derived", asOf: null };
    fields.fcfMargin = seedField(base.fields.fcfMargin.value);
    const item = buildScoreItem(withFields(fields));
    expect(item.id).toBe(`score:TCS:${SCORE_ENGINE_VERSION}:mixed-provenance`);
    expect(item.text).toContain("mixed"); // the statement discloses the mixed freshness
  });

  it("the score fact itself stays 'derived' in every case (the engine derives it; inputs vary, the fact's source does not)", () => {
    const base = resolveStockMetrics("TCS")!;
    for (const fields of [
      coherentLiveFields(T1, base),
      coherentLiveFields(null, base),
    ]) {
      const item = buildScoreItem(withFields(fields));
      const fact = (item.facts ?? []).find(f => f.field === "score");
      if (fact) expect(fact.source).toBe("derived");
    }
  });
});
