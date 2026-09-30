import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

export type Tier = 'seeker' | 'student' | 'disciple';

export interface SessionUser {
  id: string;
  email: string;
  tier: Tier;
  tierExpiresAt: string | null;
}

/**
 * Pure tier resolution — unit-testable without a database.
 *
 * Rules (remediation T5):
 * - `rawTier` always comes from the `public.users` row read on the SERVER.
 *   A client-supplied tier value is never passed here, so a forged tier in
 *   a request body or cookie cannot reach this function.
 * - An expired `tierExpiresAt` downgrades the user to `seeker`.
 */
export function resolveTier(
  rawTier: string | null | undefined,
  tierExpiresAt: string | null | undefined,
  now: Date = new Date(),
): Tier {
  const validTiers: Tier[] = ['seeker', 'student', 'disciple'];
  const tier: Tier = validTiers.includes(rawTier as Tier) ? (rawTier as Tier) : 'seeker';

  if (tier === 'seeker') return 'seeker';
  if (!tierExpiresAt) return 'seeker';

  const expires = new Date(tierExpiresAt);
  if (Number.isNaN(expires.getTime())) return 'seeker';
  if (expires.getTime() <= now.getTime()) return 'seeker';

  return tier;
}

/**
 * Read the authenticated user from the request's Supabase auth cookies and
 * resolve their tier from the `public.users` table — NEVER from any
 * client-supplied value.
 *
 * Returns null when there is no valid session.
 *
 * The users row is created on first sign-in if missing (defensive upsert;
 * the canonical mechanism is the handle_new_user trigger in migration 002).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const admin = getAdminSupabase();

  const { data: row } = await admin
    .from('users')
    .select('id, email, tier, tier_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  let dbRow = row as
    | { id: string; email: string; tier: string; tier_expires_at: string | null }
    | null;

  // First sign-in: the trigger should have created the row. If the trigger
  // migration has not been applied yet, create the row here (service role).
  if (!dbRow) {
    const { data: inserted } = await admin
      .from('users')
      .upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .select('id, email, tier, tier_expires_at')
      .maybeSingle();
    dbRow = inserted as typeof dbRow;
  }

  const tier = resolveTier(dbRow?.tier, dbRow?.tier_expires_at);

  return {
    id: user.id,
    email: user.email,
    tier,
    tierExpiresAt: dbRow?.tier_expires_at ?? null,
  };
}

/**
 * Same as getSessionUser but throws a 401-shaped error — for route handlers
 * that must reject anonymous callers.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error('Authentication required') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return user;
}
