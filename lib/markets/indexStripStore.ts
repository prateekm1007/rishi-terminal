// lib/markets/indexStripStore.ts — INDEXSTRIP: the market_index_strip
// persistence (migration 037) — the ingest route WRITES the last-fetched
// snapshot, the homepage's ISR regeneration READS it (one cheap query,
// the same class as readMoversSnapshot — never a vendor fetch in the
// render path, the Y1 contract).
//
// Write semantics: full replace (≤2 rows), rows first then meta — a
// reader that sees new meta always finds the matching rows already in
// place. Idempotent: a retried tick writes the same snapshot again.
//
// Read semantics: null when no meta row exists (the honest "not
// generated yet" state); every cell is zod-validated on read — a
// malformed cell is the honest null, never a partial fabrication.

import "server-only";

import { z } from "zod";

import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import type { IndexStripRow, IndexStripSnapshot } from "./indexStrip";

const META_ID = 1;

const rowSchema = z.object({
  symbol: z.enum(["NIFTY 50", "SENSEX"]),
  source: z.enum(["nse", "bse"]),
  value: z.number().positive(),
  change_pct: z.number().nullable().optional(),
  observed_at: z.string().nullable().optional(),
});

interface DbRow {
  symbol: string;
  source: string;
  value: number;
  change_pct: number | null;
  observed_at: string | null;
  written_at: string;
}

function toDbRow(r: IndexStripRow & { value: number }, writtenAt: string): DbRow {
  return {
    symbol: r.symbol,
    source: r.source,
    value: r.value,
    change_pct: r.changePct,
    observed_at: r.observedAt,
    written_at: writtenAt,
  };
}

export async function writeIndexStripSnapshot(snap: IndexStripSnapshot): Promise<void> {
  const db = getAdminSupabase();
  // A row without a level cannot persist (the column is NOT NULL CHECK
  // (value > 0)) — and by construction the derivation never emits one.
  // A violation here is a programming bug: throw loudly, write nothing.
  if (snap.rows.some(r => r.value === null || !Number.isFinite(r.value) || r.value <= 0)) {
    throw new Error("index strip: a row without a usable level reached the store — derivation bug");
  }
  // After the guard the rows carry a usable level — narrow for the
  // DB row shape (the column is numeric NOT NULL CHECK (value > 0)).
  const rows = snap.rows
    .filter((r): r is IndexStripRow & { value: number } => r.value !== null)
    .map(r => toDbRow(r, snap.writtenAt));
  const del = await db.from("market_index_strip").delete().neq("symbol", "");
  if (del.error) throw new Error(del.error.message);
  if (rows.length > 0) {
    const ins = await db.from("market_index_strip").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
  const meta = await db
    .from("market_index_strip_meta")
    .upsert({ id: META_ID, derivation: snap.derivation, written_at: snap.writtenAt });
  if (meta.error) throw new Error(meta.error.message);
}

export async function readIndexStripSnapshot(): Promise<IndexStripSnapshot | null> {
  const db = getAdminSupabase();
  const meta = await db
    .from("market_index_strip_meta")
    .select("derivation, written_at")
    .eq("id", META_ID)
    .maybeSingle();
  if (meta.error) throw new Error(meta.error.message);
  if (!meta.data) return null;
  const rowsRes = await db
    .from("market_index_strip")
    .select("symbol, source, value, change_pct, observed_at, written_at");
  if (rowsRes.error) throw new Error(rowsRes.error.message);
  const rows: IndexStripRow[] = [];
  for (const raw of rowsRes.data ?? []) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) continue; // a malformed cell is the honest skip
    rows.push({
      symbol: parsed.data.symbol,
      source: parsed.data.source,
      value: parsed.data.value,
      changePct: parsed.data.change_pct ?? null,
      observedAt: parsed.data.observed_at ?? null,
    });
  }
  rows.sort((a, b) => (a.symbol === "NIFTY 50" ? -1 : b.symbol === "NIFTY 50" ? 1 : 0));
  return {
    rows,
    derivation: String(meta.data.derivation ?? ""),
    writtenAt: String(meta.data.written_at ?? ""),
  };
}
