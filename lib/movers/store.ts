// lib/movers/store.ts — LIVE-TODAY (founder order, 2026-10-13): the
// market_movers persistence (migration 033) — the warmer WRITES the last
// computed snapshot, the homepage's ISR regeneration READS it (one cheap
// query, the same class as initialPriceSnapshot — never a vendor fetch
// in the render path, the Y1 contract).
//
// Write semantics: full replace (the table is ≤ 2×limit rows). A stale
// list must never linger beside a fresh one — replace-both-kinds or
// leave the previous snapshot whole. Idempotent by design: a retried
// warmer tick writes the same snapshot again.
//
// Read semantics: null when no meta row exists (the honest "not
// generated yet" state — the panel renders its empty copy, never a
// fabricated list).

import 'server-only';

import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import type { MoversDerivation, MoversSnapshot, MoverRow } from "./types";

const META_ID = 1;

interface MetaRow {
  derivation: MoversDerivation;
  universe_observed: number | null;
  written_at: string;
}

interface MoverDbRow {
  kind: "gainer" | "loser";
  rank: number;
  symbol: string;
  name: string | null;
  price: number;
  change_pct: number | null;
  volume: number | null;
  source: string | null;
  observed_at: string | null;
}

function toDbRow(r: MoverRow): MoverDbRow {
  return {
    kind: r.kind,
    rank: r.rank,
    symbol: r.symbol,
    name: r.name,
    price: r.price,
    change_pct: r.changePct,
    volume: r.volume,
    source: r.source,
    observed_at: r.observedAt,
  };
}

/** Full-replace write of one snapshot (rows + meta). Throws on failure —
 * the warmer catches and discloses; a failed write leaves the previous
 * snapshot whole. */
export async function writeMoversSnapshot(snap: MoversSnapshot): Promise<void> {
  const db = getAdminSupabase();
  const rows = [...snap.gainers, ...snap.losers].map((r) => ({ ...toDbRow(r), written_at: snap.writtenAt }));
  // Full replace, rows first then meta: a reader that sees new meta
  // always finds the matching rows already in place.
  const del = await db.from("market_movers").delete().neq("kind", ""); // all rows
  if (del.error) throw new Error(del.error.message);
  if (rows.length > 0) {
    const ins = await db.from("market_movers").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
  const metaUpsert = await db
    .from("market_movers_meta")
    .upsert({
      id: META_ID,
      derivation: snap.derivation,
      universe_observed: snap.universeObserved,
      written_at: snap.writtenAt,
    });
  if (metaUpsert.error) throw new Error(metaUpsert.error.message);
}

/**
 * The last written snapshot, or null when none exists / the read fails
 * (both are the honest "not generated yet" state for the panel — an
 * infrastructure failure must never block the homepage render).
 */
export async function readMoversSnapshot(): Promise<MoversSnapshot | null> {
  try {
    const db = getAdminSupabase();
    const metaRes = await db
      .from("market_movers_meta")
      .select("derivation, universe_observed, written_at")
      .eq("id", META_ID)
      .maybeSingle();
    if (metaRes.error) throw new Error(metaRes.error.message);
    const meta = metaRes.data as MetaRow | null;
    if (!meta) return null;

    const rowsRes = await db
      .from("market_movers")
      .select("kind, rank, symbol, name, price, change_pct, volume, source, observed_at")
      .order("kind", { ascending: true })
      .order("rank", { ascending: true });
    if (rowsRes.error) throw new Error(rowsRes.error.message);

    const toRow = (r: Record<string, unknown>): MoverRow => ({
      kind: r.kind === "loser" ? "loser" : "gainer",
      rank: Number(r.rank),
      symbol: String(r.symbol),
      name: r.name == null ? null : String(r.name),
      price: Number(r.price),
      changePct: r.change_pct == null ? null : Number(r.change_pct),
      volume: r.volume == null ? null : Number(r.volume),
      source: r.source == null ? null : String(r.source),
      observedAt: r.observed_at == null ? null : String(r.observed_at),
    });

    const all = (rowsRes.data ?? []).map(toRow);
    return {
      gainers: all.filter((r) => r.kind === "gainer"),
      losers: all.filter((r) => r.kind === "loser"),
      derivation: meta.derivation === "nse" ? "nse" : "computed",
      universeObserved: meta.universe_observed,
      writtenAt: String(meta.written_at),
    };
  } catch (e) {
    console.error("[movers/store] read failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
