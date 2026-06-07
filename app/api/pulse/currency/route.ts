import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAIRS = [
  { symbol: 'USDINR=X', pair: 'USD/INR', base: 'USD', quote: 'INR' },
  { symbol: 'EURINR=X', pair: 'EUR/INR', base: 'EUR', quote: 'INR' },
  { symbol: 'GBPINR=X', pair: 'GBP/INR', base: 'GBP', quote: 'INR' },
  { symbol: 'JPYINR=X', pair: 'JPY/INR', base: 'JPY', quote: 'INR' },
];

async function fetchPair(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('No meta for ' + symbol);

  const price    = meta.regularMarketPrice ?? 0;
  const prev     = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change   = parseFloat((price - prev).toFixed(4));
  const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(3)) : 0;

  return { price, prev, change, changePct };
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      PAIRS.map(p => fetchPair(p.symbol))
    );

    const currencies = PAIRS.map((p, i) => {
      const r = results[i];
      if (r.status === 'rejected') {
        return { pair: p.pair, rate: 0, change: 0, changePct: 0, error: true };
      }
      const { price, change, changePct } = r.value;

      const trend =
        changePct > 0.15 ? 'weakening' :
        changePct < -0.15 ? 'strengthening' : 'stable';

      const volatility =
        Math.abs(changePct) > 0.5 ? 'high' :
        Math.abs(changePct) > 0.2 ? 'medium' : 'low';

      const signal =
        p.pair === 'USD/INR'
          ? changePct > 0.3
            ? 'INR under pressure — dollar strength. Watch RBI intervention at key levels.'
            : changePct < -0.3
            ? 'INR strengthening — positive for importers and rate-sensitive sectors.'
            : 'USD/INR range-bound. RBI managing volatility within comfort zone.'
          : p.pair === 'EUR/INR'
          ? 'EUR/INR move driven by ECB policy and global risk appetite.'
          : p.pair === 'GBP/INR'
          ? 'GBP/INR influenced by UK macro data and BoE stance.'
          : 'JPY/INR — watch yen carry trade unwind risk impacting EM flows.';

      return {
        pair: p.pair,
        rate: price,
        change,
        changePct,
        trend,
        volatility,
        signal,
      };
    });

    return NextResponse.json(
      { currencies, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );

  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch currencies', detail: String(err) },
      { status: 500 }
    );
  }
}
