// app/api/portfolio/import/route.ts
// X3-07 (Round 14): CSV import — auth-only, idempotent by file hash.
//
// Re-importing the SAME file is a NO-OP (the per-user unique index on
// portfolio_imports.source_hash + an explicit pre-check): the second run
// reports what the first did and inserts nothing. Malformed rows are
// REPORTED line-by-line — never silently dropped (rule 3) — while valid
// rows in the same file still import (the report carries both counts).
// The whole insert runs in ONE transaction-like sequence: the import row
// and its transactions are linked by FK with ON DELETE CASCADE, so a
// failure mid-way leaves the orphan-safe state a retry can complete
// (rule 11: a retry completes; nothing double-counts — the hash gate).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { parsePortfolioCsv } from '@/lib/portfolio/importCsv';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  const contentType = req.headers.get('content-type') ?? '';
  let csvText: string;
  let format: 'generic' | 'cas' = 'generic';
  let sourceName = 'import.csv';

  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as { csv?: unknown; format?: unknown; name?: unknown } | null;
    if (!body || typeof body.csv !== 'string' || body.csv.length === 0) {
      return NextResponse.json({ error: 'csv must be a non-empty string' }, { status: 400 });
    }
    csvText = body.csv;
    if (body.format === 'cas') format = 'cas';
    if (typeof body.name === 'string' && body.name.length > 0 && body.name.length <= 120) {
      sourceName = body.name;
    }
  } else {
    csvText = await req.text();
    if (csvText.length === 0) {
      return NextResponse.json({ error: 'csv body must be non-empty' }, { status: 400 });
    }
  }

  let parsed;
  try {
    parsed = parsePortfolioCsv(csvText, format);
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unrecognised format';
    return NextResponse.json({ error: 'could not parse file', detail }, { status: 400 });
  }

  const supabase = await createClient();

  // Idempotency: same user + same hash → report the ORIGINAL import and
  // insert nothing (the unique index is the last line of defence).
  const { data: existing } = await supabase
    .from('portfolio_imports')
    .select('id, created_at, rows_ok, rows_failed')
    .eq('source_hash', parsed.sourceHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      noop: true,
      importId: existing.id,
      originallyImportedAt: existing.created_at,
      rowsOk: existing.rows_ok,
      rowsFailed: existing.rows_failed,
    });
  }

  // service-role path is NOT used here: the client (authenticated) insert
  // is what RLS is designed to police — the row lands with the caller's
  // own user_id and the policy checks it (rule 13).
  const { data: importRow, error: importErr } = await supabase
    .from('portfolio_imports')
    .insert({
      user_id: user.id,
      source_name: sourceName,
      source_hash: parsed.sourceHash,
      rows_ok: parsed.transactions.length,
      rows_failed: parsed.errors.length,
    })
    .select('id')
    .single();

  if (importErr || !importRow) {
    const msg = importErr?.message ?? '';
    // a concurrent duplicate import hits the unique index — treat as noop
    if (msg.includes('duplicate key')) {
      return NextResponse.json({ noop: true, note: 'already imported (concurrent)' });
    }
    console.error('[portfolio/import] insert failed:', msg);
    return NextResponse.json({ error: 'could not record import' }, { status: 500 });
  }

  if (parsed.transactions.length > 0) {
    const rows = parsed.transactions.map(t => ({
      user_id: user.id,
      import_id: importRow.id,
      trade_date: t.tradeDate,
      symbol: t.symbol,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
    }));
    const { error: txErr } = await supabase.from('portfolio_transactions').insert(rows);
    if (txErr) {
      // roll the import row back by deleting it (cascade removes any
      // partially-inserted transactions) — the retry can complete
      await supabase.from('portfolio_imports').delete().eq('id', importRow.id);
      console.error('[portfolio/import] transactions insert failed:', txErr.message);
      return NextResponse.json({ error: 'could not store transactions' }, { status: 500 });
    }
  }

  return NextResponse.json({
    noop: false,
    importId: importRow.id,
    rowsOk: parsed.transactions.length,
    rowsFailed: parsed.errors.length,
    errors: parsed.errors,
  }, { status: 201 });
}
