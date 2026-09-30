import 'server-only';

import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

/**
 * Persistent rate limiter (R6, round 2) over the `rate_limits` table
 * (migration 008, RPC `hit_rate_limit`, fixed window).
 *
 * The previous per-IP limiter was an in-memory Map, which does nothing
 * meaningful on serverless — every instance has its own map. This one is
 * Supabase-backed and shared across all instances.
 *
 * Failure semantics: OPEN. The limiter is abuse defense-in-depth, not
 * accounting; if the limiter table/RPC is unreachable the request is
 * allowed and the daily quota (which fails CLOSED) still bounds spend.
 */

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await getAdminSupabase().rpc('hit_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error('[rateLimit] rpc error (failing open):', error.message);
      return { allowed: true, count: 0 };
    }
    const r = data as { allowed?: boolean; count?: number } | null;
    return { allowed: r?.allowed !== false, count: r?.count ?? 0 };
  } catch (e) {
    console.error('[rateLimit] exception (failing open):', e instanceof Error ? e.message : e);
    return { allowed: true, count: 0 };
  }
}
