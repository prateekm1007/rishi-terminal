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
 * Write one run: upsert every produced verdict (symbol, ist_date) and
 * the meta row. Throws on failure — the warmer catches and discloses;
 * a failed write leaves the previous ledger whole.
 */
export async function writeVerdictsRun(
  produced: ProducedVerdict[],
  refused: VerdictRefusal[],
  candidates: readonly string[],
  ranAtIso: string,
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
    });
  if (metaUpsert.error) throw new Error(metaUpsert.error.message);
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
      .select("candidate_set, last_run_at, last_outcome")
      .eq("id", META_ID)
      .maybeSingle();
    if (metaRes.error) throw new Error(metaRes.error.message);
    const meta = metaRes.data as
      | { candidate_set: unknown; last_run_at: string | null; last_outcome: unknown }
      | null;

    const candidates = Array.isArray(meta?.candidate_set)
      ? (meta!.candidate_set as unknown[]).every((c) => typeof c === "string")
        ? (meta!.candidate_set as string[])
        : null
      : null;

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
