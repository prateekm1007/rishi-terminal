import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAIRS = [
  { symbol: 'USDINR=X', pair: 'USD/INR', base: 'USD', quote: 'INR' },
  { symbol: 'EURINR=X', pair: 'EUR/INR', base: 'EUR', quote: 'INR' },
  { symbol: 'GBPINR=X', pair: 'GBP/INR', base: 'GBP', quote: 'INR' },
  { symbol: 'JPYINR=X', pair: 'JPY/INR', base: 'JPY', quote: 'INR' },
];

// Rule 16 (Coder Directions §9 sweep): a pair with no usable observation
// yields null — the route omits the row (the page's existing unavailable
// state covers it). The previous `prev = price` fallback fabricated a flat
// 0% day, and `regularMarketPrice ?? 0` served a fake ₹0 rate.
async function fetchPair(symbol: string): Promise<{ price: number; change: number; changePct: number } | null> {
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

  const price = typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0 ? meta.regularMarketPrice : null;
  const prev =
    typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0 ? meta.chartPreviousClose :
    typeof meta.previousClose === 'number' && meta.previousClose > 0 ? meta.previousClose :
    null;
  // No price, or no genuine previous close → NO change observation. The old
  // `?? price` fallback computed change = 0 from price − itself: a flat-day
  // fabrication, banned by Commit O on the Yahoo chart path.
  if (price === null || prev === null) return null;
  const change = parseFloat((price - prev).toFixed(4));
  const changePct = parseFloat(((change / prev) * 100).toFixed(3));

  return { price, change, changePct };
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      PAIRS.map(p => fetchPair(p.symbol))
    );

    // Only pairs with a REAL observation are served; rejected fetches and
    // null observations are OMITTED (honest absence — the page renders its
    // explicit unavailable state), never zero-filled rows.
    const currencies = PAIRS.map((p, i) => {
      const r = results[i];
      if (r.status === 'rejected' || r.value === null) return null;
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
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    return NextResponse.json(
      { currencies, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );

  } catch (err) {
    // Rule 10: generic outward, detail server-side only. The previous body
    // leaked `String(err)` (upstream exception text) to clients.
    console.error('[pulse/currency] fetch failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Currency rates unavailable' },
      { status: 503 }
    );
  }
}
