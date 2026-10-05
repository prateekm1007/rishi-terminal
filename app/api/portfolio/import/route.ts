import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { parsePortfolioCsv } from '@/lib/portfolio/csvImport';
import { checkRateLimit } from '@/lib/rateLimit';
import { STOCKS } from '@/data/stocks';

/**
 * X3-07 (Round 14 A6): portfolio CSV import.
 *
 *   POST /api/portfolio/import { csv, filename? }
 *     200 { ok, duplicate, importId, positions, errors, mappedColumns }
 *     400 (unparseable file shape / bad body) | 401 | 413 | 429
 *
 * Idempotency (roadmap acceptance: "re-importing the same file is a
 * no-op"): the parse produces a sha256 of the content; the
 * (user_id, content_hash) UNIQUE constraint + this pre-check make the
 * second import of identical content return the FIRST import's rows
 * unchanged. Malformed rows are REPORTED (line + reason), never
 * silently dropped — a file whose rows all fail still records an import
 * with rows_imported = 0 and the full error report (the user sees what
 * happened; we do not pretend it worked — Constitution 25).
 *
 * All writes go through the user-scoped client; RLS confines every row
 * to the caller (Constitution 7/13).
 */
export const dynamic = 'force-dynamic';

const MAX_CSV_BYTES = 2 * 1024 * 1024; // 2 MB — far above any real holdings file
const MAX_POSITIONS = 500;
const IMPORTS_PER_HOUR = 20;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to import a portfolio.' }, { status: 401 });
  }

  const rl = await checkRateLimit(`portfolio-import:${user.id}`, IMPORTS_PER_HOUR, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many imports — wait an hour and retry.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'body must be JSON' }, { status: 400 });
  }

  const { csv, filename } = body as { csv?: unknown; filename?: unknown };
  if (typeof csv !== 'string' || csv.length === 0) {
    return NextResponse.json({ ok: false, error: 'field "csv" must be a non-empty string' }, { status: 400 });
  }
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
    return NextResponse.json({ ok: false, error: 'file too large (limit 2 MB)' }, { status: 413 });
  }
  const fname = typeof filename === 'string' && filename.trim() ? filename.trim().slice(0, 200) : 'portfolio.csv';

  const parsed = parsePortfolioCsv(csv, { universe: Object.keys(STOCKS) });

  if (parsed.positions.length === 0 && parsed.errors.length === 0) {
    return NextResponse.json({ ok: false, error: 'no positions and no errors — empty file?' }, { status: 400 });
  }
  if (parsed.positions.length > MAX_POSITIONS) {
    return NextResponse.json(
      { ok: false, error: `too many positions (${parsed.positions.length}; limit ${MAX_POSITIONS})` },
      { status: 413 },
    );
  }

  const supabase = await createClient();

  // Idempotency pre-check (the UNIQUE constraint is the backstop).
  const { data: existing } = await supabase
    .from('portfolio_imports')
    .select('id, rows_imported, rows_rejected, created_at')
    .eq('content_hash', parsed.contentHash)
    .maybeSingle();

  if (existing) {
    const { data: existingPositions } = await supabase
      .from('portfolio_positions')
      .select('symbol, isin, quantity, avg_price, first_buy_date, last_buy_date')
      .eq('import_id', existing.id);
    return NextResponse.json({
      ok: true,
      duplicate: true,
      importId: existing.id,
      importedAt: existing.created_at,
      positions: existingPositions ?? [],
      errors: parsed.errors,
      warnings: parsed.warnings,
      mappedColumns: parsed.mappedColumns,
      note: 'identical content was already imported — nothing changed',
    });
  }

  // Insert the import row first.
  const { data: importRow, error: importError } = await supabase
    .from('portfolio_imports')
    .insert({
      content_hash: parsed.contentHash,
      source: parsed.mappedColumns.isin !== undefined && parsed.mappedColumns.symbol === undefined ? 'cas' : 'holdings-csv',
      filename: fname,
      rows_imported: parsed.positions.length,
      rows_rejected: parsed.errors.length,
      errors: parsed.errors,
    })
    .select('id, created_at')
    .single();

  if (importError || !importRow) {
    // B3: the 20-imports-per-user database cap (migration 026) maps to a
    // clean 409 — the rate limiter bounds attempts per hour, this bounds
    // total distinct contents.
    if (/imports cap reached/i.test(importError?.message ?? '')) {
      return NextResponse.json(
        { ok: false, error: 'You already have 20 portfolio imports — this is the per-account limit.' },
        { status: 409 },
      );
    }
    console.error('[portfolio:import]', importError?.message ?? 'no row returned');
    return NextResponse.json({ ok: false, error: 'Could not record the import.' }, { status: 500 });
  }

  // Then the positions (same client; RLS checks user_id on every row).
  if (parsed.positions.length > 0) {
    const { error: posError } = await supabase.from('portfolio_positions').insert(
      parsed.positions.map((p) => ({
        import_id: importRow.id,
        symbol: p.symbol,
        isin: p.isin,
        quantity: p.quantity,
        avg_price: p.avgPrice,
        first_buy_date: p.firstBuyDate,
        last_buy_date: p.lastBuyDate,
      })),
    );
    if (posError) {
      // B3: the 500-positions-per-import database cap (migration 026).
      // The route pre-checks MAX_POSITIONS, so this is the backstop for
      // direct-to-database writes — still mapped cleanly if ever hit.
      if (/positions cap reached/i.test(posError.message)) {
        return NextResponse.json(
          { ok: false, error: `too many positions in one import (limit ${MAX_POSITIONS})` },
          { status: 413 },
        );
      }
      console.error('[portfolio:import:positions]', posError.message);
      // The import row is orphaned — remove it so a retry starts clean
      // (idempotency is per content; a half-finished import must not
      // claim the hash). Constitution 11: a failure midway leaves a
      // state a retry can complete.
      await supabase.from('portfolio_imports').delete().eq('id', importRow.id);
      return NextResponse.json({ ok: false, error: 'Could not store the positions — please retry.' }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    duplicate: false,
    importId: importRow.id,
    importedAt: importRow.created_at,
    positions: parsed.positions.map((p) => ({
      symbol: p.symbol,
      isin: p.isin,
      quantity: p.quantity,
      avg_price: p.avgPrice,
      first_buy_date: p.firstBuyDate,
      last_buy_date: p.lastBuyDate,
      known_symbol: p.knownSymbol,
    })),
    errors: parsed.errors,
    warnings: parsed.warnings,
    mappedColumns: parsed.mappedColumns,
  });
}
