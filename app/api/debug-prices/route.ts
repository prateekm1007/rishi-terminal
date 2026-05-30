export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {};

  // Test 1: Yahoo ^NSEI directly
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    results['yahoo_nsei'] = { status: r.status, price };
  } catch(e) {
    results['yahoo_nsei'] = { error: String(e) };
  }

  // Test 2: Yahoo ^BSESN directly
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    results['yahoo_bsesn'] = { status: r.status, price };
  } catch(e) {
    results['yahoo_bsesn'] = { error: String(e) };
  }

  // Test 3: Yahoo query2 (alternate endpoint)
  try {
    const r = await fetch(
      'https://query2.finance.yahoo.com/v8/finance/chart/%5ENSEI',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const price = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
    results['yahoo2_nsei'] = { status: r.status, price };
  } catch(e) {
    results['yahoo2_nsei'] = { error: String(e) };
  }

  // Test 4: Yahoo v7/finance/quote
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await r.json();
    const price = j?.quoteResponse?.result?.[0]?.regularMarketPrice;
    results['yahoo_v7_nsei'] = { status: r.status, price };
  } catch(e) {
    results['yahoo_v7_nsei'] = { error: String(e) };
  }

  return Response.json(results);
}