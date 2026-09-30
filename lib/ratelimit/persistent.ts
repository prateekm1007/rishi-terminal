import 'server-only';

import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

/**
 * R5/R6: persistent, serverless-safe per-IP rate limiting.
 *
 * The previous in-memory Map limiter did nothing on serverless (one Map per
 * instance). This limiter stores counters in Postgres (`ip_rate_limits`,
 * migration 008) and consumes budget through an ATOMIC RPC
 * (`consume_ip_budget`), so N concurrent instances share one counter.
 *
 * Failure policy (documented, deliberate): if the limiter store is
 * unreachable the check FAILS OPEN — abuse protection degrades, but the
 * product stays available. Cost-bearing quotas (the chat daily limit) are
 * enforced separately and fail CLOSED (see app/api/chat/route.ts).
 *
 * Bucket = name + current minute; rows are pruned opportunistically by the
 * RPC so the table cannot grow unbounded.
 */
export interface IpLimitResult {
  allowed: boolean;
}

function minuteBucket(): string {
  return String(Math.floor(Date.now() / 60_000));
}

/** Best-effort client IP from platform-set headers. Vercel sets x-forwarded-for. */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export async function consumeIpBudget(
  ip: string,
  name: string,
  limit: number,
): Promise<IpLimitResult> {
  const bucket = `${name}:${minuteBucket()}`;
  try {
    const admin = getAdminSupabase();
    const { data, error } = await admin.rpc('consume_ip_budget', {
      p_ip: ip,
      p_bucket: bucket,
      p_limit: limit,
      p_prune_minutes: 10,
    });
    if (error) throw new Error(error.message);
    return { allowed: data === true };
  } catch (err) {
    console.warn('[ratelimit] store unavailable — failing open:', err);
    return { allowed: true };
  }
}
