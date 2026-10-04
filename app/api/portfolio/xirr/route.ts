// app/api/portfolio/xirr/route.ts
// X3-07 (Round 14): the caller's money-weighted return, computed from
// THEIR imported transactions plus a terminal valuation. Auth-only (the
// portfolio is personal data). The terminal value comes from the live
// quote cache peek for the symbols held (the SAME read-only peek the
// stock pages use — one price path, rule 14); symbols the cache does not
// hold are EXCLUDED from the valuation and reported honestly, so the
// rate is never computed against a guessed total.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { xirr, type CashFlow } from '@/lib/portfolio/xirr';
import { serveCachedQuotes } from '@/lib/quotePath';
import { isBuildPhase } from '@/lib/dashboardSnapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'auth required' }, { status: 401 });

  const supabase = await createClient();
  const { data: txs, error } = await supabase
    .from('portfolio_transactions')
    .select('trade_date, symbol, side, quantity, price')
    .order('trade_date', { ascending: true });

  if (error) {
    console.error('[portfolio/xirr] load failed:', error.message);
    return NextResponse.json({ error: 'could not load portfolio' }, { status: 500 });
  }
  if (!txs || txs.length === 0) {
    return NextResponse.json({ xirr: null, reason: 'no transactions imported' });
  }

  // Cash flows: buys are money IN (negative), sells are money OUT (positive).
  const flows: CashFlow[] = txs.map(t => ({
    date: new Date(`${t.trade_date as string}T00:00:00Z`),
    amount: (t.side === 'buy' ? -1 : 1) * Number(t.quantity) * Number(t.price),
  }));

  // Terminal valuation: the cached price for every held symbol, summed by
  // current net quantity. Missing prices are REPORTED, not guessed (rule 4).
  const netQty = new Map<string, number>();
  for (const t of txs) {
    const q = Number(t.quantity) * (t.side === 'buy' ? 1 : -1);
    netQty.set(t.symbol as string, (netQty.get(t.symbol as string) ?? 0) + q);
  }
  const symbols = [...netQty.keys()];
  const prices: Record<string, { price: number | null }> = {};
  if (!isBuildPhase() && symbols.length > 0) {
    const peeked = await serveCachedQuotes(symbols);
    for (const [sym, q] of Object.entries(peeked)) {
      prices[sym] = { price: q?.price ?? null };
    }
  }

  let terminalValue = 0;
  const missingPrices: string[] = [];
  for (const [sym, qty] of netQty) {
    const price = prices[sym]?.price;
    if (price === null || price === undefined) {
      missingPrices.push(sym);
      continue;
    }
    terminalValue += price * qty;
  }

  const withTerminal: CashFlow[] = [...flows];
  if (missingPrices.length === 0 && terminalValue > 0) {
    withTerminal.push({ date: new Date(), amount: terminalValue });
  }

  const rate = xirr(withTerminal);
  return NextResponse.json({
    xirr: rate,
    xirrPercent: rate === null ? null : rate * 100,
    terminalValueIncluded: missingPrices.length === 0 && terminalValue > 0,
    missingPrices,
    transactions: txs.length,
  });
}
