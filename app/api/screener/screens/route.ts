// app/api/screener/screens/route.ts
// X3-05 (Round 14): saved screens — list, create, delete. All three paths
// are AUTH-ONLY (rule 6: no session → 401, never a degraded public path)
// and the DB carries RLS keyed to auth.uid() (migration 024) so a
// compromised or buggy route can still never leak another user's rows.
//
// The expression is parse-VALIDATED at save time (fail the save, not the
// later run) and re-validated on every execution by the query route.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { parseExpression, MAX_EXPRESSION_LENGTH } from '@/lib/screener/parser';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('screens')
    .select('id, name, expression, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[screens] list failed:', error.message);
    return NextResponse.json({ error: 'could not list screens' }, { status: 500 });
  }
  return NextResponse.json({ screens: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'name must be 1-80 chars, expression 1-400' }, { status: 400 });
  }

  // validate the expression BEFORE storing (a screen that cannot parse
  // must never be saved — fail the save, not the later run)
  try {
    parseExpression(parsed.data.expression);
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'invalid expression';
    return NextResponse.json({ error: 'invalid expression', detail }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('screens')
    .insert({ user_id: user.id, name: parsed.data.name, expression: parsed.data.expression })
    .select('id, name, expression, created_at')
    .single();

  if (error) {
    console.error('[screens] insert failed:', error.message);
    return NextResponse.json({ error: 'could not save screen' }, { status: 500 });
  }
  return NextResponse.json({ screen: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'id must be a uuid' }, { status: 400 });
  }

  const supabase = await createClient();
  // RLS (migration 024) additionally scopes this to the caller's own rows —
  // deleting someone else's screen deletes zero rows and that is honest.
  const { error, count } = await supabase
    .from('screens')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    console.error('[screens] delete failed:', error.message);
    return NextResponse.json({ error: 'could not delete screen' }, { status: 500 });
  }
  return NextResponse.json({ deleted: count ?? 0 });
}
