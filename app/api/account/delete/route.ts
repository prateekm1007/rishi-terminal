import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { createClient as makeServiceClient } from '@supabase/supabase-js';
import { USER_DATA_TABLES } from '@/lib/account/coverage';

/**
 * L5-02 (Round 16 C7): DPDP erasure — DELETE /api/account deletes the
 * CALLER'S account and every user-data row with it.
 *
 * Safety shape:
 *   - identity from the session (the server decides who is deleted —
 *     Constitution 7; a body-supplied id is never trusted);
 *   - explicit confirmation phrase required ("DELETE MY ACCOUNT");
 *   - deletion = auth.users removal; every covered table is emptied
 *     by a schema-level mechanism in the same transaction — an FK
 *     ... ON DELETE CASCADE for most tables, and for chat_usage the
 *     BEFORE DELETE trigger migration 028 added on public.users (015
 *     had to drop its FK: anonymous quota identities are not auth
 *     users). Both halves are asserted by test/account.delete.test.ts
 *     (static) and scripts/ci/account_erasure_invariants.sql (the
 *     live CI Postgres proof, G1); then the session is signed out.
 *
 * The coverage registry is the same module the export uses — one source
 * of truth, mechanically complete (the enumeration test fails when a new
 * user_id table ships without coverage).
 */
export const dynamic = 'force-dynamic';

const confirmSchema = z.object({ confirm: z.literal('DELETE MY ACCOUNT') });

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to delete your account.' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Account deletion requires { "confirm": "DELETE MY ACCOUNT" }.' },
      { status: 400 },
    );
  }

  // The service role is required for auth.admin.deleteUser; the target
  // identity comes ONLY from the verified session, never the request.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Account deletion is not configured.' }, { status: 503 });
  }
  const service = makeServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[account:delete]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not delete the account.' }, { status: 500 });
  }

  // Sign the now-orphaned session out (best effort; the auth user no
  // longer exists, so every token is already dead).
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    deleted: user.id,
    cascaded: USER_DATA_TABLES.map((t) => t.table),
  });
}
