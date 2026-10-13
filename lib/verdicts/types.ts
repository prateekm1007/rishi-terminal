// lib/verdicts/types.ts — TODAY-VERDICTS (founder order, 2026-10-14):
// "finish and tune it to world class now that we have permission …
//  make sure the full today panel is populated on dashboard."
//
// The Today panel's two remaining honest-empty rows (verdicts produced
// today; forward-return tracking) go LIVE on REAL data: verdicts are
// PRODUCED by the same single scoring surface the stock page uses
// (resolveStockMetrics → getStockScore, the P0-1 gate biting exactly as
// on every other surface), over LIVE fundamentals resolved from the
// unofficial transports (Screener.in primary — the D/E derivation this
// round fixed — Yahoo+NSE fallback), and RECORDED in the
// verdicts_produced ledger (migration 036) with the day-0 baseline the
// forward-return calibration track measures from.
//
// The verdict class is honest by construction: a verdict exists here
// only when the resolved record's data quality is 'live' or 'delayed'
// (verdictsAllowed) AND the consensus engine returned a number — every
// refusal (seed-mixed record, missing transport, insufficient valid
// scorers) is DISCLOSED, never silently dropped.

import type { DataQuality } from "@/lib/dataQuality";

/** Day-0 price mark for the forward-return calibration track (S2-03/
 *  S2-04). The SAME quote-cache observation the stock-page header would
 *  render — never a second price source (rule 14). Null when the cache
 *  held no usable row: the verdict still records (the fundamentals are
 *  the verdict's inputs), and the tracking line discloses the missing
 *  baseline rather than fabricating one. */
export interface VerdictBaseline {
  price: number;
  /** The raw cache source key (e.g. "yahoo-bulk"); displayed through
   *  sourceDisplayName, never raw-to-UI. */
  source: string | null;
  observedAt: string | null;
}

/** ONE produced verdict — a row of the verdicts_produced ledger. */
export interface ProducedVerdict {
  symbol: string;
  name: string | null;
  /** The Rishi Merit System v1 consensus (getStockScore). Never null on
   *  a produced row — a null consensus is a refusal, not a verdict. */
  consensus: number;
  category: string;
  /** 'live' | 'delayed' — the P0-1 vocabulary; seed/missing NEVER
   *  produce a row here (the gate refuses them first). */
  dataQuality: DataQuality;
  /** The 10 quality fields' resolved sources (pe, roe, roce, opm, de,
   *  promo, revcagr, epscagr, mktcap, bvps) — 'live' on every field of
   *  a produced row (that is what the gate demands), recorded for the
   *  audit trail, not re-derived on read. */
  fieldSources: Record<string, string>;
  /** Which fundamentals transport served the inputs. */
  fundamentalsSource: string | null;
  baseline: VerdictBaseline | null;
  /** ISO timestamp of production. */
  producedAt: string;
  /** The IST calendar day the verdict counts under (the "today" of
   *  "verdicts produced today"). */
  istDate: string;
}

/** Why a candidate did NOT produce a verdict (disclosed, never hidden). */
export interface VerdictRefusal {
  symbol: string;
  reason:
    | "not-in-registry" // the candidate is not a tracked symbol (rule 9)
    | "no-live-fundamentals" // both transports missed / unparseable
    | `data-quality:${string}` // the P0-1 gate refused (seed/missing/mixed)
    | `no-consensus:${string}`; // the engine returned null (insufficient valid scorers)
}

/** One production run's full outcome — the warmer's disclosure shape. */
export interface VerdictsRunOutcome {
  produced: ProducedVerdict[];
  refused: VerdictRefusal[];
  candidates: string[];
  /** ISO timestamp of the run. */
  ranAt: string;
}

/** The Today-panel face of the ledger — everything the row renders,
 *  derived from ONE read (never a vendor fetch in the render path). */
export interface VerdictsTodayFace {
  /** Rows in today's IST slice. */
  count: number;
  /** Produced today, produced_at ascending (deterministic order). */
  today: Array<Pick<ProducedVerdict, "symbol" | "name" | "consensus" | "category" | "dataQuality" | "fundamentalsSource" | "producedAt" | "baseline">>;
  /** The disclosed candidate set (from verdicts_meta). */
  candidates: string[] | null;
  /** The last run's timestamp (from verdicts_meta), or null. */
  lastRunAt: string | null;
  /** The last run's outcome summary (from verdicts_meta), or null. */
  lastRunSummary: string | null;
}

/** The tracking-line state — one source for the Today row AND the
 *  methodology page (rule 14; the wording lives in lib/demoState). */
export interface TrackingState {
  /** Total baselines recorded across all days. */
  baselines: number;
  /** The IST date of the FIRST recorded baseline — the day the
   *  calibration track began. Null when nothing is recorded. */
  startedOn: string | null;
}
