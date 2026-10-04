import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { analyzePortfolio } from '@/lib/portfolio/analytics';
import type { ParsedPosition } from '@/lib/portfolio/csvImport';
import { serveCachedQuotes } from '@/lib/quotePath';
import { getSlimIndexBySymbol } from '@/lib/scoring/slimIndex';

/**
 * X3-07 (Round 14 A6): portfolio summary — holdings, XIRR, sector
 * exposure, concentration over the caller's LATEST import.
 *
 *   GET /api/portfolio/summary -> 200 { ok, import, positions, analytics }
 *     | 401 | 404 (no import yet)
 *
 * Current values come from the shared quote cache (peek semantics, the
 * same X3 SSR path the stock pages use): a position with no cached
 * quote contributes no current value — reported as value: null, never
 * a seed placeholder (Constitution 3/4).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Sign in to see your portfolio.' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: importRow } = await supabase
    .from('portfolio_imports')
    .select('id, source, filename, rows_imported, rows_rejected, errors, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!importRow) {
    return NextResponse.json({ ok: false, error: 'No portfolio imported yet.' }, { status: 404 });
  }

  const { data: rows } = await supabase
    .from('portfolio_positions')
    .select('symbol, isin, quantity, avg_price, first_buy_date, last_buy_date')
    .eq('import_id', importRow.id);

  const positions: ParsedPosition[] = (rows ?? []).map((r) => ({
    symbol: r.symbol,
    quantity: Number(r.quantity),
    avgPrice: Number(r.avg_price),
    firstBuyDate: r.first_buy_date ?? null,
    lastBuyDate: r.last_buy_date ?? null,
    isin: r.isin ?? null,
  }));

  // Current values from the shared quote cache (peek — no upstream fetch
  // storm from a summary view; the stock pages and the warmer keep the
  // cache hot during sessions).
  const equitySymbols = positions.map((p) => p.symbol).filter((s) => !s.startsWith('ISIN:'));
  const quotes = await serveCachedQuotes(equitySymbols);
  const currentValues = new Map<string, number>();
  for (const p of positions) {
    const q = quotes[p.symbol];
    if (q && Number.isFinite(q.price) && q.price > 0) currentValues.set(p.symbol, q.price * p.quantity);
  }

  const slimBySymbol = getSlimIndexBySymbol();
  const analytics = analyzePortfolio(
    positions,
    currentValues,
    (symbol) => {
      const row = slimBySymbol.get(symbol);
      if (!row) return null;
      return { sector: row.sector, consensus: row.consensus };
    },
    Date.now(),
  );

  const positionsWithValue = positions.map((p) => {
    const q = quotes[p.symbol];
    return {
      ...p,
      price: q && Number.isFinite(q.price) && q.price > 0 ? q.price : null,
      value: currentValues.get(p.symbol) ?? null,
      priceStatus: q ? q.status : null,
      priceObservedAt: q ? q.observedAt : null,
      sector: slimBySymbol.get(p.symbol)?.sector ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    import: {
      id: importRow.id,
      source: importRow.source,
      filename: importRow.filename,
      importedAt: importRow.created_at,
      rowsImported: importRow.rows_imported,
      rowsRejected: importRow.rows_rejected,
      rowErrors: importRow.errors,
    },
    positions: positionsWithValue,
    analytics,
  });
}
