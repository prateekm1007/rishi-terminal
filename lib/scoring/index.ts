/**
 * lib/scoring — THE ONLY PUBLIC SCORING SURFACE (remediation T10).
 *
 * One score, one input set:
 * - `getStockScore` runs `buildConsensus` (Rishi Merit System v1) — the single
 *   consensus engine behind the stock page, screener, lab, chat and nightly
 *   rishiMemory snapshots. Nothing else may be presented as "the Rishi Score".
 * - `resolveStockMetrics` merges the static seed dataset with live
 *   fundamentals and records, for every field, where the value came from
 *   (`seed` | `live` | `derived`) and when it was captured (`asOf`).
 *   UI code must render values from this resolution instead of mixing its own
 *   sources, so every entry path scores the same input set.
 *
 * The former "Rishi Score v2" engine is demoted to a distinct, honestly
 * labelled metric: the Quality-Value Pillar Score (QVPS, `calculateQvps`).
 * It is a pillar-style factor model, NOT the Rishi Score, and UI surfaces
 * must label it as such.
 */

import 'server-only';

import { STOCKS, SEED_STATUS, SEED_CAPTURED_AT, type SeedStatus } from "@/data/stocks";
import type { Stock, ConsensusResult } from "@/lib/consensus/types";
import { buildConsensus } from "@/lib/consensus/engine";
import {
  calculateQvps,
  calculateQvpsDual,
} from "@/lib/scorers/rishiScoreV2";
import type { StockMetrics, RishiScoreResult, ScoreMode } from "@/lib/scorers/types";
import type { FullFundamentals } from "@/hooks/useFundamentals";
import { toSourced, type Sourced } from "@/lib/types/sourced";
import { isAdmissibleLive } from "@/lib/types/admissibility";

export { SCORE_ENGINE_VERSION } from "@/lib/consensus/version";

export type { Stock, ConsensusResult, StockMetrics, RishiScoreResult, ScoreMode };

/** Where a resolved field's value came from. */
export type FieldSource = "seed" | "live" | "derived";

export interface ResolvedField<T = number> {
  value: T;
  source: FieldSource;
  /**
   * Provenance timestamp. Live fields carry their real capture timestamp;
   * seed fields are ALWAYS null (R1: the seed dataset has no provable capture
   * date, so no timestamp may be claimed for it).
   */
  asOf: string | null;
}

export interface ResolvedStockMetrics {
  symbol: string;
  name: string;
  sector: string;
  /** Merged Stock (seed values overridden by live fundamentals). */
  stock: Stock;
  /** QVPS pillar-model input derived from the same resolution. */
  metrics: StockMetrics;
  /** Provenance for every meaningful field (T10/T14). */
  fields: Record<string, ResolvedField>;
  /**
   * UI-facing provenance contract (P0-06): the same fields lifted into
   * `Sourced` — `source` uses `vendor:<upstream>` for live data, and this
   * is what <DataValue> renders. `fields` remains the engine-internal
   * truth that R1 evidence tests pin.
   */
  sourced: Record<string, Sourced<number>>;
  /** Provenance of the merged stock: the seed dataset status (R1). */
  seedStatus: SeedStatus;
  /** Always null while seedStatus === 'placeholder' (no provable capture date). */
  seedCapturedAt: string | null;
}

function isResolved(x: unknown): x is ResolvedStockMetrics {
  return typeof x === "object" && x !== null && "fields" in x && "stock" in x;
}

/**
 * G5 (audit 2026-10-02, Coder Directions): field-specific live admissibility.
 * A live observation overrides the seed only when it is a LEGITIMATE value
 * for THAT field — never merely "> 0". Zero and negative values are real
 * observations for several fundamentals (loss-making ROE, debt-free D/E =
 * 0, promoter stake 0, negative CAGR in downturns); the old global
 * strictly-positive test reinterpreted them as missing and silently
 * substituted the seed, so the AI and the UI saw a different number than
 * the provider reported (rules 15/16). Null/undefined/NaN still mean "no
 * live data" and keep the seed baseline — missing is never reinterpreted
 * as zero and zero/negative is never reinterpreted as missing.
 */
function pick(
  field: string,
  liveValue: number | null | undefined,
  seedValue: number,
): { value: number; source: FieldSource } {
  if (typeof liveValue === "number" && isAdmissibleLive(field, liveValue)) {
    return { value: liveValue, source: "live" };
  }
  return { value: seedValue, source: "seed" };
}

/**
 * Merge the static seed record with live fundamentals.
 * Returns null when the symbol is unknown (callers decide 404 vs empty state).
 */
export function resolveStockMetrics(
  symbol: string,
  live?: FullFundamentals | null,
): ResolvedStockMetrics | null {
  const sym = symbol?.trim().toUpperCase();
  const seed = STOCKS[sym];
  if (!seed) return null;

  // N3 (round 3) + audit 2026-10-02 P0: a live field's asOf is the
  // PROVIDER's own observation time (FullFundamentals.lastUpdated), never
  // "now at resolution time". When the upstream discloses no timestamp the
  // honest value is null — the previous fetchTime fallback dressed serve
  // time up as provider provenance, which then flowed into DataValue
  // tooltips and AI evidence ids. (Mirrors the price pipeline's corrective
  // gate 3.)
  const providerAsOf =
    live && typeof live.lastUpdated === 'string' && !Number.isNaN(Date.parse(live.lastUpdated))
      ? live.lastUpdated
      : null;
  const fields: Record<string, ResolvedField> = {};
  const sourced: Record<string, Sourced<number>> = {};

  // Name the real upstream so tooltips say "vendor:screener" / "vendor:yahoo+nse"
  // instead of a generic "live". FullFundamentals.source: screener | yahoo+nse | static.
  const vendorName = live?.source && live.source !== "static" ? live.source : undefined;

  const set = (key: string, r: { value: number; source: FieldSource }) => {
    fields[key] = {
      value: r.value,
      source: r.source,
      asOf: r.source === "live" ? providerAsOf : null,
    };
    sourced[key] = toSourced(fields[key], vendorName);
  };

  const pe = pick("pe", live?.pe, seed.pe);
  const roe = pick("roe", live?.roe, seed.roe);
  const roce = pick("roce", live?.roce, seed.roce);
  const opm = pick("opm", live?.opm, seed.opm);
  const de = pick("de", live?.debtToEquity, seed.de);
  const promo = pick("promo", live?.promoterHolding, seed.promo);
  const revCagr = pick("revcagr", live?.revCagr3y, seed.revcagr);
  const epsCagr = pick("epscagr", live?.epsCagr, seed.epscagr);
  // H3: live marketCap arrives in ₹ Cr (the /api/fundamentals contract
  // unit) and is used as-is — dividing by 1e7 here corrupted the baseline
  // to 0.16 Cr for a 1.6M Cr live value. G5: only > 0 is admissible.
  const mktcap = pick("mktcap", live?.marketCap, seed.mktcap);
  // G5: BVPS is provider-defined; a NEGATIVE book value (negative equity) is
  // a legitimate observation and stays live — the PB derivation below
  // handles it explicitly (it only divides on a positive BVPS).
  const bvps = pick("bvps", live?.bookValue, seed.bvps);

  set("pe", pe);
  set("roe", roe);
  set("roce", roce);
  set("opm", opm);
  set("de", de);
  set("promo", promo);
  set("revcagr", revCagr);
  set("epscagr", epsCagr);
  set("mktcap", mktcap);
  set("bvps", bvps);

  // Derived from other resolved fields — never invented. PB's operands are
  // the SEED registry price and the (possibly live) BVPS: until a live
  // price operand exists in this resolver, EVERY PB is a mixed-source
  // derivation, and a mixed derivation claims NO freshness — asOf stays
  // null and the source says "derived" (audit 2026-10-02 P0: it previously
  // took the live asOf whenever BVPS was live, presenting seed-price /
  // live-BVPS as a coherent live figure).
  const pb: ResolvedField = {
    value: bvps.value > 0 ? Number((seed.price / bvps.value).toFixed(4)) : 0,
    source: "derived",
    asOf: null,
  };
  fields.pb = pb;
  sourced.pb = toSourced(pb);
  const fcfMargin: ResolvedField = {
    value: seed.rev > 0 ? Number(((seed.fcf / seed.rev) * 100).toFixed(4)) : 0,
    source: "seed",
    asOf: null,
  };
  fields.fcfMargin = fcfMargin;
  sourced.fcfMargin = toSourced(fcfMargin);

  const mergedStock: Stock = {
    ...seed,
    pe: pe.value,
    roe: roe.value,
    roce: roce.value,
    opm: opm.value,
    de: de.value,
    promo: promo.value,
    revcagr: revCagr.value,
    epscagr: epsCagr.value,
    mktcap: mktcap.value,
    bvps: bvps.value,
  };

  const metrics: StockMetrics = {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    pe: pe.value,
    pb: pb.value,
    roe: roe.value,
    roce: roce.value,
    opm: opm.value,
    fcfMargin: fcfMargin.value,
    revenueCAGR3Y: revCagr.value,
    epsCAGR3Y: epsCagr.value,
    debtToEquity: de.value,
    promoterHolding: promo.value,
    marketCap: mktcap.value,
  };

  return {
    symbol: seed.symbol,
    name: seed.name,
    sector: seed.sector,
    stock: mergedStock,
    metrics,
    fields,
    sourced,
    seedStatus: SEED_STATUS,
    seedCapturedAt: SEED_CAPTURED_AT,
  };
}

/**
 * THE stock score. Runs the single consensus engine (Rishi Merit System v1)
 * over a raw Stock or over a resolved metrics object. UI surfaces show
 * `consensus` (or an em dash when null, per T11) and must never present a
 * competing number as "the Rishi Score".
 */
export function getStockScore(input: Stock | ResolvedStockMetrics): ConsensusResult {
  if (isResolved(input)) {
    // X6 (Round 13): the Y4 placeholder-zero contract at the scoring
    // boundary. `resolved.stock` merges seed and live values, and
    // `resolved.fields` records WHICH — so the scoring context marks a
    // field unknown exactly when its value is a SEED-sourced zero (the
    // June placeholder). A live-sourced zero (G5: genuinely debt-free D/E,
    // stagnant EPS CAGR) is an observation and scores normally.
    const unknownFields = new Set(
      Object.entries(input.fields)
        .filter(([, f]) => f.source === "seed" && f.value === 0)
        .map(([name]) => name),
    );
    return buildConsensus(input.stock, { unknownFields });
  }
  // A bare Stock is a seed record (every current caller passes one):
  // seed semantics apply inside runAllScorers — zero fields are
  // placeholder unknowns.
  return buildConsensus(input);
}

/** Quality-Value Pillar Score (QVPS) — the demoted former "v2" engine. */
export function getQvps(
  resolved: ResolvedStockMetrics,
  mode: ScoreMode = "LONG",
): RishiScoreResult {
  return calculateQvps(resolved.metrics, mode);
}

export { calculateQvps, calculateQvpsDual };
