import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { resolveTickerAlias } from '@/lib/registry/tickerRegistry';

/**
 * X3-08 (Round 16 C7): alert triggers — list, create, delete.
 *
 * All rows flow through the REQUEST'S user-scoped client; Postgres RLS
 * decides what exists for this caller (Constitution 7 + 13). The 25-trigger
 * cap is enforced by the 027 database trigger, not by this code.
 *
 *   GET    /api/alerts                 -> { ok, triggers, events }
 *   POST   /api/alerts {symbol,kind,threshold} -> 201 | 400 | 401
 *   DELETE /api/alerts?id=<uuid>       -> 200 | 400 | 401
 */
export const dynamic = 'force-dynamic';

const KINDS = ['price_above', 'price_below', 'score_above', 'score_below', 'filing_new'] as const;

const createSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  kind: z.enum(KINDS),
  threshold: z.number().finite().min(0).max(1e9),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use alerts.' }, { status: 401 });
  }
  const supabase = await createClient();
  const [triggers, events] = await Promise.all([
    supabase
      .from('alerts_triggers')
      .select('id, symbol, kind, threshold, active, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('alerts_events')
      .select('id, trigger_id, event_key, observed_value, delivery_status, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (triggers.error || events.error) {
    console.error('[alerts:list]', triggers.error?.message, events.error?.message);
    return NextResponse.json({ ok: false, error: 'Could not load alerts.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, triggers: triggers.data ?? [], events: events.data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use alerts.' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Expected { symbol, kind, threshold }.', issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  // Rule 9: registry-check the symbol at the trust boundary.
  const canonical = resolveTickerAlias(parsed.data.symbol);
  const symbol = canonical ?? parsed.data.symbol.toUpperCase();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('alerts_triggers')
    .insert({ user_id: user.id, symbol, kind: parsed.data.kind, threshold: parsed.data.threshold })
    .select('id, symbol, kind, threshold, active, created_at')
    .maybeSingle();
  if (error) {
    // The 25-cap violation arrives as 23514 — surface it honestly.
    console.error('[alerts:create]', error.message);
    return NextResponse.json(
      { ok: false, error: error.code === '23514' ? 'Alert trigger cap reached (25).' : 'Could not create the alert.' },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, trigger: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to use alerts.' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: 'A trigger id is required.' }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.from('alerts_triggers').delete().eq('id', id);
  if (error) {
    console.error('[alerts:delete]', error.message);
    return NextResponse.json({ ok: false, error: 'Could not delete the alert.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
