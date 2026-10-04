import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { parseQuery } from '@/lib/screener/parser';

/**
 * X3-05 (Round 14 A6): saved screens — list and create.
 *
 * All reads/writes go through the REQUEST'S user-scoped Supabase client
 * (anon key + the caller's JWT), so Postgres RLS — not this code —
 * decides which rows exist for this caller (Constitution 7 + 13). The
 * service-role client is never used here.
 *
 *   GET  /api/screens            -> { ok, screens: [...] }
 *   POST /api/screens {name, q}  -> 201 { ok, screen } | 400 | 401
 *
 * A screen may only be saved when its query PARSES (rule 9: validate at
 * the trust boundary) — a saved screen that cannot run would be a lie
 * the user discovers later.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use saved screens.' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('screens')
    .select('id, name, query, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    // Generic outward, detailed inward (Constitution 10).
    console.error('[screens:list]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load saved screens.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, screens: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use saved screens.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'body must be JSON' }, { status: 400 });
  }

  const { name, q } = body as { name?: unknown; q?: unknown };
  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 60) {
    return NextResponse.json({ ok: false, error: 'name must be 1-60 characters' }, { status: 400 });
  }
  if (typeof q !== 'string') {
    return NextResponse.json({ ok: false, error: 'field "q" must be a string' }, { status: 400 });
  }

  // The query must parse before it can be saved (rule 9).
  const parsed = parseQuery(q);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: `query does not parse: ${parsed.error.message}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  // Same-name save = replace (upsert on the user's own unique
  // (user_id, name); RLS confines both the matched and inserted rows).
  const { data, error } = await supabase
    .from('screens')
    .upsert(
      { name: name.trim(), query: q },
      { onConflict: 'user_id,name' },
    )
    .select('id, name, query, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[screens:save]', error?.message ?? 'no row returned');
    return NextResponse.json({ ok: false, error: 'Could not save the screen.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, screen: data }, { status: 201 });
}
