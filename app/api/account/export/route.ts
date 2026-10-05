import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { USER_DATA_TABLES } from '@/lib/account/coverage';

/**
 * L5-02 (Round 16 C7): DPDP data portability — the user's own data from
 * EVERY table the coverage registry lists (which the enumeration test
 * proves equals every public table with a user_id column).
 *
 * All reads go through the request's user-scoped client: RLS decides
 * which rows exist for this caller (Constitution 7 + 13). The service
 * role is never used on this route.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to export your data.' }, { status: 401 });
  }
  const supabase = await createClient();

  const data: Record<string, unknown> = {};
  const failed: string[] = [];
  for (const { table } of USER_DATA_TABLES) {
    const { data: rows, error } = await supabase.from(table).select('*');
    if (error) {
      // Detailed inward, generic outward (Constitution 10). A missing
      // table (migration not yet applied) is reported per-table so the
      // export is honest about what it could and could not include.
      console.error('[account:export]', table, error.message);
      failed.push(table);
      continue;
    }
    data[table] = rows ?? [];
  }

  return NextResponse.json({
    ok: failed.length === 0,
    exportedAt: new Date().toISOString(),
    format: 'rishi-account-export/1 (DPDP s.4 data portability)',
    coverage: { tables: USER_DATA_TABLES.map((t) => t.table), failed },
    data,
  });
}
