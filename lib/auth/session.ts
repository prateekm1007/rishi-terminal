import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { getAdminSupabase } from '@/lib/services/supabaseAdmin';

/**
 * Commit M5 (founder decision 2026-10-02 — every feature free): the
 * session model carries a SINGLE explicit access state.
 *
 *   access: 'free'   — for every signed-in user, always
 *
 * The legacy `seeker | student | disciple` values still exist as DATABASE
 * COLUMNS (public.users.tier / tier_expires_at — historical payment
 * records; migrations preserved), but they no longer have any runtime
 * product meaning: nothing reads them for policy, and this module does
 * not even surface them. A database tier value CANNOT control current
 * feature access because it never crosses this boundary.
 *
 * Authentication itself stays exactly as strict as before: identity is
 * resolved server-side from the request's Supabase auth cookies, never
 * from any client-supplied value.
 */
export type AccessState = 'free';

export interface SessionUser {
  id: string;
  email: string;
  /** The one and only product access state. */
  access: AccessState;
}

/**
 * Read the authenticated user from the request's Supabase auth cookies.
 *
 * Returns null when there is no valid session. The users row is created
 * on first sign-in if missing (defensive upsert; the canonical mechanism
 * is the handle_new_user trigger in migration 002). The row's legacy tier
 * columns are deliberately NOT selected into the session — the account
 * row is read for existence, not for entitlement.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const admin = getAdminSupabase();

  const { data: row } = await admin
    .from('users')
    .select('id, email')
    .eq('id', user.id)
    .maybeSingle();

  let dbRow = row as { id: string; email: string } | null;

  // First sign-in: the trigger should have created the row. If the trigger
  // migration has not been applied yet, create the row here (service role).
  if (!dbRow) {
    const { data: inserted } = await admin
      .from('users')
      .upsert(
        { id: user.id, email: user.email },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .select('id, email')
      .maybeSingle();
    dbRow = inserted as typeof dbRow;
  }

  return {
    id: user.id,
    email: user.email,
    access: 'free',
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
