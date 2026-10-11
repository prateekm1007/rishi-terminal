/**
 * lib/dataQuality — the closed data-quality vocabulary and THE
 * verdict gate (round-46 P0-1, founder audit 2026-10-11).
 *
 * Founder order (verbatim scope): "add dataQuality (live, delayed, seed,
 * missing). Seed rows show no verdict, and the badge reads from that
 * field."
 *
 * One vocabulary, one derivation, one gate:
 *   - "live"    — every quality field is live-sourced, dated, and within
 *                 the freshness budget. Verdicts allowed.
 *   - "delayed" — every quality field is live-sourced but at least one is
 *                 undated or beyond the freshness budget. Verdicts
 *                 allowed (the record carries real observations — the
 *                 delay is disclosed, never hidden).
 *   - "seed"    — at least one quality field is seed-sourced (the input
 *                 set is seed-contaminated) or the record is a bare seed
 *                 row. NO verdict — scoring illustrative placeholders
 *                 would present noise as analysis.
 *   - "missing" — no usable data: all-zero, non-finite, or internally
 *                 impossible (the round-5 impossibility rules, preserved
 *                 verbatim). NO verdict.
 *
 * This module is CLIENT-SAFE (no 'server-only', no data imports): UI
 * surfaces import `verdictsAllowed` + the type to render the honest
 * badge. The derivations are pure; the resolved-fields path takes the
 * clock explicitly (caller-injected — no hidden Date.now(), rule 18).
 */

/** The closed data-quality vocabulary (P0-1). */
export type DataQuality = "live" | "delayed" | "seed" | "missing";

export const DATA_QUALITY_VALUES: readonly DataQuality[] = [
  "live",
  "delayed",
  "seed",
  "missing",
] as const;

/**
 * The resolved-field names the derivation reads — exactly the fields
 * resolveStockMetrics resolves (lib/scoring/index.ts). ONE list: the
 * bare-seed adapter reads the same names off the Stock record.
 */
export const QUALITY_FIELDS = [
  "pe",
  "roe",
  "roce",
  "opm",
  "de",
  "promo",
  "revcagr",
  "epscagr",
  "mktcap",
  "bvps",
] as const;

export type QualityField = (typeof QUALITY_FIELDS)[number];

/** Minimal structural view of a resolved provenance field. */
export interface QualityFieldView {
  value: number | null;
  source: "seed" | "live" | "derived";
  asOf: string | null;
}

/**
 * How far a live observation may lag before the record is "delayed"
 * rather than "live". Fundamentals move slowly, but an observation with
 * no provable date can NEVER claim freshness (the R1 rule: no provable
 * date, no claim).
 */
export const LIVE_FRESHNESS_DAYS = 7;

/** The P0-1 verdict gate: verdicts exist only on live and delayed data. */
export function verdictsAllowed(dq: DataQuality): boolean {
  return dq === "live" || dq === "delayed";
}

/** The honest category strings the gated surfaces render. */
export function noVerdictCategory(dq: DataQuality): string {
  return dq === "missing" ? "No Verdict — No Usable Data" : "No Verdict — Seed Data";
}

/**
 * Derive the data quality from RESOLVED per-field provenance (the
 * stock-page path — lib/scoring/index.ts resolveStockMetrics). Pure: the
 * clock is injected.
 *
 * Rollup rule (closed, mechanical):
 *   - every quality field live + dated + fresh  → "live"
 *   - every quality field live, one undated/stale → "delayed"
 *   - any live field among seed ones (mixed)     → "seed"
 *   - no live fields, any non-zero seed value    → "seed"
 *   - otherwise (all zero / absent)              → "missing"
 */
export function dataQualityFromResolvedFields(
  fields: Record<string, QualityFieldView>,
  opts: { now: number },
): DataQuality {
  const now = opts.now;
  const entries = QUALITY_FIELDS.map(
    (name) => [name, fields[name]] as const,
  );

  // P0-2: a null seed value is UNKNOWN — it can never be "live", but it
  // is not non-finite garbage either; the rollup below treats it as a
  // non-live slot (which is what it is).
  const liveEntries = entries.filter(([, f]) => f && f.source === "live" && f.value !== null);

  if (liveEntries.length === QUALITY_FIELDS.length) {
    const budgetMs = LIVE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
    const stale = liveEntries.some(([, f]) => {
      if (!f.asOf) return true; // live-undated claims nothing fresh
      const ts = Date.parse(f.asOf);
      if (Number.isNaN(ts)) return true;
      return now - ts > budgetMs;
    });
    return stale ? "delayed" : "live";
  }

  if (liveEntries.length > 0) {
    // Mixed provenance: part of the input set is still the illustrative
    // seed (or never observed). Verdicts wait for full coverage — scoring
    // a half-live record would present seed noise as live analysis.
    return "seed";
  }

  const hasValue = entries.some(([, f]) => f && f.value !== null && Number.isFinite(f.value) && f.value !== 0);
  return hasValue ? "seed" : "missing";
}

/** Minimal structural view of a bare seed record (lib/types Stock shape).
 *  P0-2: the placeholder classes are NULL at the data layer — null is
 *  UNKNOWN (the field was never observed), which is neither "missing
 *  data" by itself nor an impossibility; non-finite values still are. */
export interface SeedStockView {
  pe: number | null;
  roe: number | null;
  roce: number;
  opm: number | null;
  de: number | null;
  promo: number;
  revcagr: number;
  epscagr: number;
  mktcap: number;
  bvps: number;
  rev: number;
  ocf: number;
  fcf: number;
  np: number;
}

/**
 * Derive the data quality from a BARE seed record (the screener/rankings/
 * snapshot fast path — no live overlay). A bare seed record is NEVER
 * "live" or "delayed": the dataset is SEED_STATUS 'placeholder' (R1) and
 * no record in it carries a provable capture date.
 *
 * The round-5 record-honesty rules are preserved verbatim (previously
 * assessDataQuality's "INCOMPLETE"): non-finite cores, the all-zero
 * fundamental set, and internally impossible combinations are "missing".
 *
 * P0-2: null slots are UNKNOWN, not missing — a record with real values
 * beside nulls classifies "seed" (it has data; some fields were never
 * observed). The impossibility rules (pe 0 with profit, roe 0 with book)
 * keep biting on TYPED zeros — the synthetic regression catch for any
 * dataset that reintroduces placeholder zeros.
 */
export function dataQualityFromSeedStock(stock: SeedStockView): DataQuality {
  const vals: Array<number | null> = [
    stock.pe, stock.roe, stock.roce, stock.opm, stock.de,
    stock.promo, stock.revcagr, stock.epscagr, stock.mktcap, stock.bvps,
  ];
  if (vals.some(v => v !== null && !Number.isFinite(v))) return "missing";
  // T11.4 (preserved): a record where revenue, cash flows, book value,
  // ROCE and promoter holding are ALL zero carries no real fundamentals.
  if (
    stock.rev === 0 && stock.ocf === 0 && stock.fcf === 0 &&
    stock.bvps === 0 && stock.roce === 0 && stock.promo === 0
  ) {
    return "missing";
  }
  // Round-5 audit (preserved): internally IMPOSSIBLE combinations —
  // positive net profit can never yield P/E 0, and positive profit with
  // positive book value can never yield ROE 0. (Nulls skip: null is
  // unknown, not impossible.)
  if (stock.np > 0 && stock.pe === 0) return "missing";
  if (stock.np > 0 && stock.roe === 0 && stock.bvps > 0) return "missing";
  const hasValue = vals.some(v => v !== null && v !== 0);
  return hasValue ? "seed" : "missing";
}

/** Short badge/UI label for the data-quality chip (the badge reads THIS). */
export function describeDataQuality(dq: DataQuality): string {
  switch (dq) {
    case "live":
      return "live data";
    case "delayed":
      return "delayed live data";
    case "seed":
      return "seed data — no verdicts produced";
    case "missing":
      return "no usable data — no verdicts produced";
  }
}
