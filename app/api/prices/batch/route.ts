import { NextRequest, NextResponse } from 'next/server';
import { fetchBulkPricesForSymbols } from '@/lib/nse/bulkFetch';
import { fetchLivePrice } from '@/lib/livePrice';

export async function POST(req: NextRequest) {
  try {
    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    if (symbols.length > 1000) {
      return NextResponse.json({ error: 'Max 1000 symbols' }, { status: 400 });
    }

    const t0 = Date.now();
    const prices: Record<string, any> = {};

    // Strategy: Yahoo bulk for NSE stocks, fallback for others
    const INDEX_SYMBOLS = ['NIFTY50','SENSEX','BANK_NIFTY'];

    const nseSymbols = symbols.filter(s =>
      !INDEX_SYMBOLS.includes(s) && 
      !s.includes('/') && // not forex
      !['IN2YS','IN6YS','IN10YS','IN15YS','IN91DTB','IN182DTB'].includes(s) && // not bonds
      !['BTC','ETH','BNB','SOL','ADA','AVAX','DOT','MATIC','LINK','UNI','AAVE','MKR','XRP','DOGE','SHIB'].includes(s) && // not crypto
      !['GOLD','SILVER','PLATINUM','CRUDEOIL','WTI','BRENT','NATURALGAS','COPPER','ALUMINIUM','ZINC','NICKEL','LEAD','BRENTCRUDE','PALLADIUM','COTTON','RUBBER','MENTHAOIL','CARDAMOM'].includes(s) // not commodities
    );

    const otherSymbols = symbols.filter(s => !nseSymbols.includes(s));

    // Fetch NSE stocks via Yahoo bulk
    const bulkResults = await fetchBulkPricesForSymbols(nseSymbols);
    
    for (const [sym, data] of Object.entries(bulkResults)) {
      prices[sym] = {
        price: data.price,
        change: data.change,
        changePercent24h: data.change,
        volume24h: data.volume,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Fetch non-NSE symbols (crypto/forex/bonds/commodities) via individual calls
    if (otherSymbols.length > 0) {
      const results = await Promise.allSettled(
        otherSymbols.map(s => fetchLivePrice(s))
      );

      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          prices[otherSymbols[i]] = r.value;
        }
      });
    }

    const ms = Date.now() - t0;
    console.log(
      `[/api/prices/batch] ${Object.keys(prices).length}/${symbols.length} in ${ms}ms ` +
      `(Yahoo bulk: ${Object.keys(bulkResults).length}, fallback: ${otherSymbols.length})`
    );

    return NextResponse.json(prices, {
      headers: { 'Cache-Control': 'public, s-maxage=30' },
    });
  } catch (error) {
    console.error('[/api/prices/batch] error:', error);
    return NextResponse.json(
      { error: 'Batch fetch failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}