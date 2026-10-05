import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';

/**
 * B3 follow-up (founder Round-15): DELETE one portfolio import.
 *
 *   DELETE /api/portfolio/import/[id] -> 200 { ok, deleted } | 401 | 400 | 404
 *
 * Why this exists: migration 026 caps a user at 20 imports. Without a
 * delete path, a maxed-out account has no self-service recovery (the
 * gap was flagged in the B3 evidence, not silently shipped).
 *
 * Ownership is enforced by RLS through the user-scoped client: an id
 * owned by another user matches no row and surfaces as 404 (the same
 * information boundary as /api/screens/[id]). Deleting the import row
 * cascades to its positions (FK ON DELETE CASCADE, migration 025) —
 * one operation, no orphans (Constitution 11).
 */
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to manage your imports.' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: 'invalid import id' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('portfolio_imports')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('[portfolio:import:delete]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not delete the import.' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: 'Import not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deleted: id });
}
