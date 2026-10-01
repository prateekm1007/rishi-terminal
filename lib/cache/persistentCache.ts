// lib/cache/persistentCache.ts
// Phase 6 T62 — DB-backed persistent cache (Supabase `provider_cache` table,
// migration 009). Fills the Provider -> DB layer of the cache hierarchy:
//
//   Provider (upstream) -> DB (this, durable) -> server (in-memory reuse +
//   coalescing) -> CDN (s-maxage) -> client (display only, never a source
//   of truth).
//
// STORAGE-RIGHTS GATE (Phase 6 absolute principle: free != free to steal):
// entries are written ONLY for providers whose terms permit storing observed
// values — see docs/DATA_PROVIDER_MATRIX.md "Phase 6 storage policy":
//   - fred-csv          (FRED data terms: attribution "FRED, St. Louis Fed")
//   - exchangerate-api  (free tier permits app use with attribution)
//   - ecb-fx            (ECB reuse policy: attribution "European Central Bank")
// Scraped / terms-unverified sources (NSE, BSE, Yahoo, CoinGecko, screener,
// yahoo-etf-proxy) are NEVER persisted here. An outage on those resolves to
// honest UNAVAILABLE, not to a stored copy.
//
// Failure posture: this layer must never take a quote path down. Every
// operation swallows errors and resolves null/false; the read path is
// time-budgeted so a slow DB can never stall a quote response.

import 'server-only';

import { getAdminSupabase } from '../services/supabaseAdmin';
import { PERSISTABLE_SOURCES, isPersistableSource } from './storageRights';

export interface PersistentCacheEntry<T = unknown> {
  payload: T;
  /** ISO timestamp of the ORIGINAL upstream observation (provenance). */
  observedAt: string;
  providerId: string;
}

const OP_TIMEOUT_MS = 1500;

function configured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function raceTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

interface CacheRow {
  payload: unknown;
  observed_at: string;
  provider_id: string;
}

/** Read an entry. Returns null when unconfigured, missing, expired, slow,
 *  or when the stored provider is NOT storage-entitled.
 *  Corrective gate (deep-audit finding 4): the read path independently
 *  re-validates `provider_id ∈ PERSISTABLE_SOURCES` — the write-path
 *  allow-list alone does not protect against a malformed, historical, or
 *  manually inserted row becoming an entitlement bypass. Defense in depth:
 *  the check resolves the SAME allow-list from lib/cache/storageRights.ts. */
export async function persistentCacheGet<T = unknown>(
  key: string,
): Promise<PersistentCacheEntry<T> | null> {
  if (!configured()) return null;
  try {
    const db = getAdminSupabase();
    const res = await raceTimeout(
      db
        .from('provider_cache')
        .select('payload, observed_at, provider_id, expires_at')
        .eq('key', key)
        .limit(1),
      OP_TIMEOUT_MS,
    );
    if (!res || res.error || !res.data || res.data.length === 0) return null;
    const row = res.data[0] as CacheRow & { expires_at: string };
    // Belt-and-braces expiry check: the DB row also carries expires_at and a
    // cleanup may lag; never serve an entry the storage layer considers dead.
    if (Date.parse(row.expires_at) <= Date.now()) return null;
    // Read-side entitlement guard: a stored provider that is not entitled
    // (today, historically, or by corruption) is never served.
    if (!PERSISTABLE_SOURCES.has(row.provider_id)) return null;
    return { payload: row.payload as T, observedAt: row.observed_at, providerId: row.provider_id };
  } catch {
    return null;
  }
}

/** Upsert an entry. Resolves false on any failure (never throws).
 *  Corrective gate: rejects a null/empty observation timestamp at the
 *  storage boundary — the schema (migration 009, observed_at NOT NULL)
 *  and the provenance rule agree: no genuine observation time, no row. */
export async function persistentCacheSet(
  key: string,
  providerId: string,
  payload: unknown,
  ttlMs: number,
  observedAtIso: string | null,
): Promise<boolean> {
  if (!configured()) return false;
  if (!isPersistableSource(providerId)) return false;
  if (!observedAtIso) return false;
  try {
    const db = getAdminSupabase();
    const res = await raceTimeout(
      db.from('provider_cache').upsert(
        {
          key,
          provider_id: providerId,
          payload,
          observed_at: observedAtIso,
          expires_at: new Date(Date.now() + ttlMs).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      ),
      OP_TIMEOUT_MS,
    );
    return !!res && !res.error;
  } catch {
    return false;
  }
}
