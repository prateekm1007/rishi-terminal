import { NextRequest, NextResponse } from 'next/server';
import { fetchBulkPricesForSymbols } from '@/lib/nse/bulkFetch';
import { fetchLivePrice } from '@/lib/livePrice';
import { validateSymbolsInput } from '@/lib/registry/validateInput';
import { consumeIpBudget, clientIpFromHeaders } from '@/lib/ratelimit/persistent';

export async function POST(req: NextRequest) {
  try {
    // R5: persistent per-IP rate limit on this open proxy.
    const ip = clientIpFromHeaders(req.headers);
    if (!(await consumeIpBudget(ip, 'prices-batch', 20)).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { symbols } = await req.json();

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Invalid symbols' }, { status: 400 });
    }

    // R5: batch cap 50 + registry/allow-list validation (was: 1000, unvalidated).
    const checked = validateSymbolsInput(symbols.map(String), { max: 50 });
    if (!checked.ok) {
      return NextResponse.json({ error: checked.reason }, { status: 400 });
    }
    const list = checked.symbols;

    const t0 = Date.now();
    // Shape written below: every entry carries price + change + changePercent24h
    // (+ optional volume/lastUpdated). fetchLivePrice returns a superset.
    type PriceEntry = {
      price: number;
      change: number | null;
      changePercent24h?: number | null;
      changePercent?: number | null;
      volume24h?: number | null;
      lastUpdated?: string;
      source?: string;
    };
    const prices: Record<string, PriceEntry> = {};

    // Strategy: Yahoo bulk for NSE stocks, fallback for others
    const INDEX_SYMBOLS = ['NIFTY50','SENSEX','BANK_NIFTY','SPX','DJI','IXIC','DAX','FTSE','HSI','N225','VIX'];

    const nseSymbols = list.filter(s =>
      !INDEX_SYMBOLS.includes(s) && 
      !s.includes('/') && // not forex
      !['IN2YS','IN6YS','IN10YS','IN15YS','IN91DTB','IN182DTB'].includes(s) && // not bonds
      !['BTC','ETH','BNB','SOL','ADA','AVAX','DOT','MATIC','LINK','UNI','AAVE','MKR','XRP','DOGE','SHIB'].includes(s) && // not crypto
      !['GOLD','SILVER','PLATINUM','CRUDEOIL','WTI','BRENT','NATURALGAS','COPPER','ALUMINIUM','ZINC','NICKEL','LEAD','BRENTCRUDE','PALLADIUM','COTTON','RUBBER','MENTHAOIL','CARDAMOM'].includes(s) // not commodities
    );

    const otherSymbols = list.filter(s => !nseSymbols.includes(s));

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

    // Fallback: NSE symbols missing from Yahoo bulk -> fetchLivePrice() (multi-source)
    const missingNseSymbols = nseSymbols.filter(s => !prices[s]);

    for (let i = 0; i < missingNseSymbols.length; i += 25) {
      const chunk = missingNseSymbols.slice(i, i + 25);
      const chunkResults = await Promise.allSettled(chunk.map(s => fetchLivePrice(s)));
      chunkResults.forEach((r, j) => {
        if (r.status === "fulfilled" && r.value) {
          const sym = chunk[j];
          prices[sym] = {
            price: r.value.price,
            change: r.value.change,
            changePercent24h: r.value.change,
            volume24h: null,
            lastUpdated: r.value.lastUpdated,
          };
        }
      });
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
      `[/api/prices/batch] ${Object.keys(prices).length}/${list.length} in ${ms}ms ` +
      `(Yahoo bulk: ${Object.keys(bulkResults).length}, fallback: ${otherSymbols.length})`
    );

        // Normalize payload shape for clients:
    // - Provide { prices: ... } wrapper (expected by hooks/useLivePrices in UI)
    // - Keep legacy top-level symbol keys for backward compatibility
    // - Ensure changePercent24h exists by aliasing from change/changePercent
    const normalized: Record<string, PriceEntry> = {};
    Object.keys(prices || {}).forEach((k) => {
      const v = prices[k];
      if (!v) return;

      const ch: number | null =
        v.changePercent24h !== undefined && v.changePercent24h !== null
          ? v.changePercent24h
          : v.changePercent !== undefined && v.changePercent !== null
            ? v.changePercent
            : v.change;

      normalized[k] = {
        ...v,
        change: v.change !== undefined ? v.change : ch,
        changePercent24h: ch,
      };
    });

    return NextResponse.json(
      { prices: normalized, ...normalized },
      { headers: { 'Cache-Control': 'public, s-maxage=30' } }
    );
  } catch (error) {
    console.error('[/api/prices/batch] error:', error);
    return NextResponse.json(
      { error: 'Batch fetch failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}