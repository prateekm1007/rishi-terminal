import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { parseQuery } from '@/lib/screener/parser';

/**
 * X3-05 (Round 14 A6): saved screens — update and delete one.
 *
 *   PUT    /api/screens/[id] {name?, q?} -> 200 { ok, screen } | 400 | 401 | 404
 *   DELETE /api/screens/[id]             -> 200 { ok } | 401 | 404
 *
 * Ownership is enforced by RLS through the user-scoped client: an id
 * that belongs to another user simply does not match any row, which
 * surfaces here as 404 (we do not distinguish "not yours" from "does
 * not exist" — that is the correct information boundary).
 */
export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use saved screens.' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid screen id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'body must be JSON' }, { status: 400 });
  }

  const { name, q } = body as { name?: unknown; q?: unknown };
  const patch: { name?: string; query?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 60) {
      return NextResponse.json({ ok: false, error: 'name must be 1-60 characters' }, { status: 400 });
    }
    patch.name = name.trim();
  }
  if (q !== undefined) {
    if (typeof q !== 'string') {
      return NextResponse.json({ ok: false, error: 'field "q" must be a string' }, { status: 400 });
    }
    const parsed = parseQuery(q);
    if (!parsed.ok) {
      return NextResponse.json(
        { ok: false, error: `query does not parse: ${parsed.error.message}` },
        { status: 400 },
      );
    }
    patch.query = q;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('screens')
    .update(patch)
    .eq('id', id)
    .select('id, name, query, created_at, updated_at')
    .maybeSingle();

  if (error) {
    console.error('[screens:update]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not update the screen.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: 'screen not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, screen: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use saved screens.' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid screen id' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error, count } = await supabase.from('screens').delete({ count: 'exact' }).eq('id', id);

  if (error) {
    console.error('[screens:delete]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not delete the screen.' }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ ok: false, error: 'screen not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
