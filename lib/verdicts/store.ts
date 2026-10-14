// lib/verdicts/store.ts — TODAY-VERDICTS: the verdicts_produced
// persistence (migration 036). The warmer WRITES produced rows + meta;
// the homepage's ISR regeneration and the methodology page READ (one
// cheap query each, the same class as readMoversSnapshot — never a
// vendor fetch in the render path, the Y1 contract).
//
// Write semantics: UPSERT per (symbol, ist_date) — one verdict per
// symbol per IST day, idempotent on retry (a rerun of the same tick
// writes the same row again; a later tick the same day refreshes it
// with the newer production). Meta is a single upsert row carrying the
// disclosed candidate set and the last run's outcome.
//
// Read semantics: today's IST slice + meta in one call; null-safe on
// every leg (an infrastructure failure renders the honest empty row,
// never blocks the page). The tracking state (baselines + startedOn)
// is a SECOND read shared by the Today row and the methodology page
// (rule 14 — one state source; the wording lives in lib/demoState).

import 'server-only';

import { z } from "zod";

import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import { istParts } from "@/lib/marketHours";
import type {
  ProducedVerdict,
  TrackingState,
  VerdictRefusal,
  VerdictsTodayFace,
} from "./types";

const META_ID = 1;

/** TODAY-NIFTY: a refusal row as the backoff gate reads it (the DB row
 * plus the parsed attempt count). */
export interface RefusedTodayRow {
  symbol: string;
  reason: string;
  lastTriedAt: string;
  attempts: number;
}

/** TODAY-NIFTY: the cached candidate set's provenance (verdicts_meta
 * columns, migration 037) — the once-per-day cache the warm step
 * consults before fetching the NSE constituent list. */
export interface CandidateSetCache {
  source: "nifty50-nse" | "founder-five";
  fetchedOn: string;
  symbols: string[];
  universeSize: number | null;
}

/** The consensus is a number on every produced row (the gate refuses
 * null consensuses) — the DB numeric comes back as string; parse and
 * validate on read (zod at the trust boundary, rule 9). */
const verdictRowSchema = z.object({
  symbol: z.string().min(1).max(24),
  ist_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().nullable(),
  consensus: z.number(),
  category: z.string().min(1),
  data_quality: z.enum(["live", "delayed"]),
  field_sources: z.record(z.string(), z.string()),
  fundamentals_source: z.string().nullable(),
  baseline_price: z.number().positive().nullable(),
  baseline_source: z.string().nullable(),
  baseline_observed_at: z.string().nullable(),
  produced_at: z.string(),
});

interface VerdictDbRow {
  symbol: string;
  ist_date: string;
  name: string | null;
  consensus: string | number;
  category: string;
  data_quality: string;
  field_sources: unknown;
  fundamentals_source: string | null;
  baseline_price: string | number | null;
  baseline_source: string | null;
  baseline_observed_at: string | null;
  produced_at: string;
}

function parseVerdictRow(r: VerdictDbRow): z.infer<typeof verdictRowSchema> | null {
  return verdictRowSchema.safeParse({
    symbol: r.symbol,
    ist_date: r.ist_date,
    name: r.name,
    consensus: Number(r.consensus),
    category: r.category,
    data_quality: r.data_quality,
    field_sources: r.field_sources,
    fundamentals_source: r.fundamentals_source,
    baseline_price: r.baseline_price == null ? null : Number(r.baseline_price),
    baseline_source: r.baseline_source,
    baseline_observed_at: r.baseline_observed_at,
    produced_at: r.produced_at,
  }).data ?? null; // a malformed cell is skipped, never partially served
}

/**
 * Write one run: upsert every produced verdict (symbol, ist_date), the
 * refusal rows (TODAY-NIFTY: the backoff ledger, attempts incremented
 * read-modify-write from the gate's read — the warm tick is a serialized
 * minute cadence, and `attempts` is a disclosure counter, not money),
 * and the meta row. Throws on failure — the warmer catches and
 * discloses; a failed write leaves the previous ledger whole.
 */
export async function writeVerdictsRun(
  produced: ProducedVerdict[],
  refused: VerdictRefusal[],
  candidates: readonly string[],
  ranAtIso: string,
  candidateMeta?: { source: "nifty50-nse" | "founder-five"; universeSize: number | null; fetchedOn: string },
  refusedAttemptsBase?: ReadonlyMap<string, number>,
): Promise<void> {
  const db = getAdminSupabase();

  if (produced.length > 0) {
    const rows = produced.map((v) => ({
      symbol: v.symbol,
      ist_date: v.istDate,
      name: v.name,
      consensus: v.consensus,
      category: v.category,
      data_quality: v.dataQuality,
      field_sources: v.fieldSources,
      fundamentals_source: v.fundamentalsSource,
      baseline_price: v.baseline ? v.baseline.price : null,
      baseline_source: v.baseline ? v.baseline.source : null,
      baseline_observed_at: v.baseline ? v.baseline.observedAt : null,
      produced_at: v.producedAt,
    }));
    const up = await db
      .from("verdicts_produced")
      .upsert(rows, { onConflict: "symbol,ist_date" });
    if (up.error) throw new Error(up.error.message);
  }

  // TODAY-NIFTY: the refusal backoff ledger — every refusal THIS run
  // actually attempted lands in verdicts_refused with its (incremented)
  // attempt count; candidates skipped by the backoff or the same-day
  // gate do not touch it.
  if (refused.length > 0) {
    const refusalRows = refused.map((r) => {
      const istDate = istParts(Date.parse(ranAtIso)).isoDate;
      const base = refusedAttemptsBase?.get(r.symbol) ?? 0;
      return {
        symbol: r.symbol,
        ist_date: istDate,
        reason: r.reason,
        attempts: base + 1,
        last_tried_at: ranAtIso,
      };
    });
    const refusalUp = await db
      .from("verdicts_refused")
      .upsert(refusalRows, { onConflict: "symbol,ist_date" });
    if (refusalUp.error) throw new Error(refusalUp.error.message);
  }

  const metaUpsert = await db
    .from("verdicts_meta")
    .upsert({
      id: META_ID,
      candidate_set: [...candidates],
      last_run_at: ranAtIso,
      last_outcome: {
        produced: produced.length,
        refused: refused.map((r) => ({ symbol: r.symbol, reason: r.reason })),
        candidates: [...candidates],
        ranAt: ranAtIso,
      },
      ...(candidateMeta
        ? {
            candidate_source: candidateMeta.source,
            candidate_universe_size: candidateMeta.universeSize,
            candidate_fetched_on: candidateMeta.fetchedOn,
          }
        : {}),
    });
  if (metaUpsert.error) throw new Error(metaUpsert.error.message);
}

/**
 * TODAY-NIFTY: today's refusal rows (the backoff gate's read). One
 * query, null-safe on failure (a read miss re-fetches refused
 * candidates — the pre-backoff behavior, honest and disclosed — never
 * blocks production).
 */
export async function readVerdictsRefusedToday(istDate: string): Promise<RefusedTodayRow[]> {
  try {
    const db = getAdminSupabase();
    const res = await db
      .from("verdicts_refused")
      .select("symbol, reason, attempts, last_tried_at")
      .eq("ist_date", istDate);
    if (res.error) throw new Error(res.error.message);
    const rows: RefusedTodayRow[] = [];
    for (const r of (res.data ?? []) as Array<Record<string, unknown>>) {
      const symbol = typeof r.symbol === "string" ? r.symbol : null;
      const reason = typeof r.reason === "string" ? r.reason : null;
      const lastTriedAt = typeof r.last_tried_at === "string" ? r.last_tried_at : null;
      if (!symbol || !reason || !lastTriedAt) continue; // a malformed cell is skipped, never partially served
      rows.push({
        symbol,
        reason,
        lastTriedAt,
        attempts: typeof r.attempts === "number" ? r.attempts : 1,
      });
    }
    return rows;
  } catch (e) {
    console.error("[verdicts/store] readVerdictsRefusedToday failed:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * TODAY-NIFTY: the cached candidate set (the once-per-day NSE list).
 * Reads verdicts_meta's provenance columns; null when no NSE-sourced
 * set has been recorded (the warm step then fetches fresh, or serves
 * the founder-five floor when the transport misses).
 */
export async function readCandidateSetCache(): Promise<CandidateSetCache | null> {
  try {
    const db = getAdminSupabase();
    const res = await db
      .from("verdicts_meta")
      .select("candidate_set, candidate_source, candidate_universe_size, candidate_fetched_on")
      .eq("id", META_ID)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    const meta = res.data as
      | {
          candidate_set: unknown;
          candidate_source: unknown;
          candidate_universe_size: unknown;
          candidate_fetched_on: unknown;
        }
      | null;
    if (!meta) return null;
    if (meta.candidate_source !== "nifty50-nse") return null;
    if (!Array.isArray(meta.candidate_set)) return null;
    if (!meta.candidate_set.every((c) => typeof c === "string")) return null;
    if (typeof meta.candidate_fetched_on !== "string") return null;
    const universeSize =
      typeof meta.candidate_universe_size === "number" ? meta.candidate_universe_size : null;
    return {
      source: "nifty50-nse",
      fetchedOn: meta.candidate_fetched_on,
      symbols: meta.candidate_set as string[],
      universeSize,
    };
  } catch (e) {
    console.error("[verdicts/store] readCandidateSetCache failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Today's face of the ledger (ONE read: today's IST slice + meta).
 * Null-safe: any infrastructure failure renders the honest empty row.
 */
export async function readVerdictsToday(nowMs: number): Promise<VerdictsTodayFace | null> {
  try {
    const db = getAdminSupabase();
    const istDate = istParts(nowMs).isoDate;

    const rowsRes = await db
      .from("verdicts_produced")
      .select("symbol, ist_date, name, consensus, category, data_quality, field_sources, fundamentals_source, baseline_price, baseline_source, baseline_observed_at, produced_at")
      .eq("ist_date", istDate)
      .order("produced_at", { ascending: true });
    if (rowsRes.error) throw new Error(rowsRes.error.message);

    const today = (rowsRes.data ?? [])
      .map((r) => parseVerdictRow(r as VerdictDbRow))
      .filter((r): r is z.infer<typeof verdictRowSchema> => r !== null)
      .map((r) => ({
        symbol: r.symbol,
        name: r.name,
        consensus: r.consensus,
        category: r.category,
        dataQuality: r.data_quality,
        fundamentalsSource: r.fundamentals_source,
        producedAt: r.produced_at,
        baseline: r.baseline_price == null
          ? null
          : { price: r.baseline_price, source: r.baseline_source, observedAt: r.baseline_observed_at },
      }));

    const metaRes = await db
      .from("verdicts_meta")
      .select("candidate_set, last_run_at, last_outcome, candidate_source, candidate_universe_size")
      .eq("id", META_ID)
      .maybeSingle();
    if (metaRes.error) throw new Error(metaRes.error.message);
    const meta = metaRes.data as
      | { candidate_set: unknown; last_run_at: string | null; last_outcome: unknown; candidate_source: unknown; candidate_universe_size: unknown }
      | null;

    const candidates = Array.isArray(meta?.candidate_set)
      ? (meta!.candidate_set as unknown[]).every((c) => typeof c === "string")
        ? (meta!.candidate_set as string[])
        : null
      : null;

    // TODAY-NIFTY: the candidate-set provenance (the row's disclosure —
    // the licensed NSE list vs the founder-confirmed floor).
    const candidateSource: "nifty50-nse" | "founder-five" | null =
      meta?.candidate_source === "nifty50-nse" || meta?.candidate_source === "founder-five"
        ? (meta!.candidate_source as "nifty50-nse" | "founder-five")
        : null;
    const candidateUniverseSize =
      typeof meta?.candidate_universe_size === "number" ? meta!.candidate_universe_size : null;

    let lastRunSummary: string | null = null;
    const outcome = meta?.last_outcome as
      | { produced?: unknown; refused?: unknown; candidates?: unknown }
      | null
      | undefined;
    if (outcome && typeof outcome === "object" && outcome !== null) {
      const producedN = typeof outcome.produced === "number" ? outcome.produced : null;
      const refusedN = Array.isArray(outcome.refused) ? outcome.refused.length : null;
      if (producedN !== null) {
        lastRunSummary =
          refusedN !== null && refusedN > 0
            ? `${producedN} produced, ${refusedN} refused (reasons disclosed in the warmer response)`
            : `${producedN} produced, none refused`;
      }
    }

    return {
      count: today.length,
      today,
      candidates,
      lastRunAt: meta?.last_run_at ?? null,
      lastRunSummary,
      candidateSource,
      candidateUniverseSize,
    };
  } catch (e) {
    console.error("[verdicts/store] readVerdictsToday failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * The tracking state — the forward-return calibration track's day-0
 * record. ONE read, shared by the Today row and the methodology page.
 * Null-safe (the honest "not started" renders on failure).
 */
export async function readTrackingState(): Promise<TrackingState | null> {
  try {
    const db = getAdminSupabase();
    const res = await db
      .from("verdicts_produced")
      .select("ist_date, baseline_price")
      .not("baseline_price", "is", null)
      .order("produced_at", { ascending: true })
      .limit(1000);
    if (res.error) throw new Error(res.error.message);
    const rows = res.data ?? [];
    if (rows.length === 0) return { baselines: 0, startedOn: null };
    const first = rows[0] as { ist_date?: unknown };
    const startedOn =
      typeof first.ist_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(first.ist_date)
        ? first.ist_date
        : null;
    return { baselines: rows.length, startedOn };
  } catch (e) {
    console.error("[verdicts/store] readTrackingState failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
