// lib/intelligence/insightCache.ts (INT-A7, roadmap item A7) — THE
// DETERMINISTIC CHANGE KEY + the persistent insight cache.
//
// Roadmap execution rule 4: "A7 means a deterministic change key +
// persistent cache — never in-memory memoization." Pre-registration:
// docs/intelligence/insightCache.md (committed before any evaluation).
// The key rule, the cache semantics, and the fail-closed table are
// pinned by test.
//
// What this module is:
//   - the ONE change-key derivation (rule 14): sha256 over
//     `feature | subject | sorted-unique changeIds` — the same
//     evidence set always yields the same key (this is the value
//     A1's `provenance.changeKey` is reserved for);
//   - the server-side reader/writer for `insight_cache` (migration
//     032), service-role only, with reuse accounting (hit_count via
//     the migration's atomic SQL functions — never read-then-write);
//   - parse-or-refuse at the write boundary: only A1-contract
//     artifacts (`parseRishiInsight`) are ever stored.
//
// What this module is NOT:
//   - not in-memory memoization: no Map, no module-level cache —
//     persistence is the table;
//   - not a generator (A8+), not a second insight contract (A1), not
//     a second evidence identity system (A2 changeIds flow through),
//     not a history system (`observation_state_log` remains the ONE).
//
// Clocks: the pure layer keeps none (`changeKeyOf` is total over its
// inputs); generated_at / last_hit_at are the DATABASE's NOW() —
// every timestamp-producing statement lives in migration 032's SQL
// functions, which the client calls via rpc.

import { createHash } from "node:crypto";
import { getAdminSupabase } from "@/lib/services/supabaseAdmin";
import {
  INSIGHT_FEATURES,
  parseRishiInsight,
  type InsightFeature,
  type RishiInsight,
} from "./types";

// ── the deterministic change key (pure) ─────────────────────────────────────

export interface ChangeKeyInput {
  feature: InsightFeature;
  /** The thing the insight is ABOUT (A1 subject bound: 1..80). */
  subject: string;
  /** The A2/A3-native evidence identities backing the insight. */
  changeIds: readonly string[];
}

/**
 * The ONE change key: sha256 over `feature|subject|sortedUnique
 * changeIds`. Order- and duplicate-insensitive (set semantics). Every
 * fail-closed condition returns null — the honest no-key: an insight
 * with no evidence set is not cacheable and not identity-bearing.
 */
export function changeKeyOf(input: ChangeKeyInput): string | null {
  const { feature, subject, changeIds } = input;
  if (!(INSIGHT_FEATURES as readonly string[]).includes(feature)) return null;
  const trimmed = subject.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return null;
  if (changeIds.length === 0) return null;
  const ids = new Set<string>();
  for (const id of changeIds) {
    if (typeof id !== "string" || id.length === 0) return null;
    ids.add(id);
  }
  const canonical = `${feature}|${trimmed}|${[...ids].sort().join(",")}`;
  return createHash("sha256").update(canonical).digest("hex");
}

/** Parse-or-refuse through the ONE insight contract (A1's parser —
 *  never a second validation path). */
export function parseInsightPayload(input: unknown): RishiInsight | null {
  return parseRishiInsight(input);
}

// ── the persistent cache (server, service-role only) ────────────────────────

export interface CachedInsightRecord {
  changeKey: string;
  feature: string;
  subject: string;
  payload: RishiInsight;
  generatedAt: string;
  hitCount: number;
  lastHitAt: string | null;
}

export interface WriteCachedInsightInput {
  changeKey: string;
  feature: InsightFeature;
  subject: string;
  payload: unknown;
}

export interface WriteCachedInsightResult {
  ok: boolean;
  /** Non-contract payloads are REFUSED before any write (named). */
  error: string | null;
  hitCount: number | null;
}

/**
 * Upsert one generated insight keyed by its change key via the
 * migration's `insight_cache_write` function (atomic ON CONFLICT:
 * payload and generated_at replaced, hit_count PRESERVED — reuse
 * accounting survives a regeneration). The payload is parsed through
 * the ONE contract first — parse or refuse, never best-effort (rules
 * 6/9). Failures are returned, never thrown.
 */
export async function writeCachedInsight(
  input: WriteCachedInsightInput,
): Promise<WriteCachedInsightResult> {
  const payload = parseInsightPayload(input.payload);
  if (!payload) {
    return {
      ok: false,
      error: "payload failed the RishiInsight contract — refused, nothing written",
      hitCount: null,
    };
  }
  const { data, error } = await getAdminSupabase().rpc("insight_cache_write", {
    p_change_key: input.changeKey,
    p_feature: input.feature,
    p_subject: input.subject,
    p_payload: payload as unknown as Record<string, unknown>,
  });
  if (error) {
    return { ok: false, error: error.message, hitCount: null };
  }
  return { ok: true, error: null, hitCount: data == null ? null : Number(data) };
}

/**
 * Read one cached insight by change key via the migration's
 * `insight_cache_read_hit` function (atomic UPDATE…RETURNING:
 * increment + return in one statement — no read-then-write race on
 * the counter). A miss is null: the unknown stays unknown (rule 16).
 * Failures throw (the caller decides how loudly to log — the A2
 * reader precedent).
 */
export async function readCachedInsight(
  changeKey: string,
): Promise<CachedInsightRecord | null> {
  const { data, error } = await getAdminSupabase().rpc("insight_cache_read_hit", {
    p_change_key: changeKey,
  });
  if (error) throw new Error(error.message);
  const row = (data as Record<string, unknown> | null) ?? null;
  if (!row) return null;
  return {
    changeKey: String(row.change_key),
    feature: String(row.feature),
    subject: String(row.subject),
    payload: row.payload as unknown as RishiInsight,
    generatedAt: String(row.generated_at),
    hitCount: Number(row.hit_count),
    lastHitAt: row.last_hit_at == null ? null : String(row.last_hit_at),
  };
}
