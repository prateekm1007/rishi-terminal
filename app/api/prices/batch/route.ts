import { NextRequest, NextResponse } from 'next/server';
import { fetchBulkPricesForSymbols } from '@/lib/nse/bulkFetch';
import { fetchLivePrice, unavailablePriceEntry } from '@/lib/livePrice';
import { parseSymbolsBody } from '@/lib/registry/validateInput';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  recordAppRequest,
  recordAppRequestDone,
  recordServe,
  type ServeEvent,
} from '@/lib/health/measurement';

/** T59.2: classify a served entry by its provenance status. */
function serveKind(status: unknown): ServeEvent["servedFrom"] {
  switch (status) {
    case "LIVE": return "live";
    case "CACHED": return "cache-replay";
    case "STATIC": return "static-reference";
    case "DERIVED": return "derived";
    default: return "unavailable";
  }
}

export async function POST(req: NextRequest) {
  try {
    // R6 persistent per-IP rate limit (fails open — the validation gate and
    // upstream quotas remain the hard bounds).
    const rl = await checkRateLimit(`data:ip:${clientIp(req)}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body: unknown = await req.json();

    // R5: registry/allow-list gate + batch cap (spec: 50).
    const parsed = parseSymbolsBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const symbols = parsed.symbols;

    // T59.2: this is an application request — counted separately from the
    // upstream calls it may or may not cause (never inferred).
    recordAppRequest('/api/prices/batch', { symbols: symbols.length });

    const t0 = Date.now();
    const prices: Record<string, Record<string, unknown>> = {};

    // Strategy: Yahoo bulk for NSE stocks, fallback for others
    const INDEX_SYMBOLS = ['NIFTY50','SENSEX','BANK_NIFTY','SPX','DJI','IXIC','DAX','FTSE','HSI','N225','VIX'];

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
        source: 'yahoo-bulk',
        status: 'LIVE',
        // T60.1 provenance: lastUpdated is the ORIGINAL Yahoo observation
        // time (meta.regularMarketTime), never the serve time. When Yahoo
        // disclosed no observation time we report null — we do not dress
        // the fetch time up as an observation time. checkedAt is the
        // decision/serve time and is semantically distinct.
        lastUpdated: data.observedAt ?? null,
        observedAt: data.observedAt ?? null,
        checkedAt: new Date().toISOString(),
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
            source: r.value.source,
            status: r.value.status ?? 'LIVE',
            lastUpdated: r.value.lastUpdated,
            observedAt: r.value.observedAt ?? null,
          };
          recordServe('/api/prices/batch', serveKind(r.value.status ?? 'LIVE'), 1);
        } else {
          recordServe('/api/prices/batch', 'unavailable', 1);
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
          prices[otherSymbols[i]] = r.value as unknown as Record<string, unknown>;
          recordServe('/api/prices/batch', serveKind(r.value.status), 1);
        } else {
          // T57: explicit honest unavailability per symbol. Phase 5.1: the
          // entry carries NO observation timestamp — lastUpdated is null
          // (there is no observation) and checkedAt is the decision time.
          prices[otherSymbols[i]] = unavailablePriceEntry();
          recordServe('/api/prices/batch', 'unavailable', 1);
        }
      });
    }

    // Phase 5.1 (T57): EXACTLY ONE normalized entry per requested symbol.
    // The fallback loop above only records successes, so a symbol whose
    // Yahoo bulk lookup missed AND whose per-symbol fetch returned null /
    // rejected was previously silently absent — clients saw 49 entries for
    // 50 requested. Now the total-failure case is explicit: UNAVAILABLE
    // with no fabricated observation time.
    for (const s of symbols) {
      if (!prices[s]) {
        prices[s] = unavailablePriceEntry();
        recordServe('/api/prices/batch', 'unavailable', 1);
      }
    }

    const ms = Date.now() - t0;
    // T59.5: wall time of this application request, for latency attribution.
    recordAppRequestDone('/api/prices/batch', ms);
    console.log(
      `[/api/prices/batch] ${Object.keys(prices).length}/${symbols.length} in ${ms}ms ` +
      `(Yahoo bulk: ${Object.keys(bulkResults).length}, fallback: ${otherSymbols.length})`
    );

        // Normalize payload shape for clients:
    // - Provide { prices: ... } wrapper (expected by hooks/useLivePrices in UI)
    // - Keep legacy top-level symbol keys for backward compatibility
    // - Ensure changePercent24h exists by aliasing from change/changePercent
    // R4: the merged quote shape from the fetchers — only the fields the
    // normalisation below reads are declared.
    const normalized: Record<string, Record<string, unknown>> = {};
    const quoteMap = (prices ?? {}) as Record<string, Record<string, unknown>>;
    Object.keys(quoteMap).forEach((k) => {
      const v = quoteMap[k];
      if (!v) return;

      const ch =
        v.changePercent24h !== undefined
          ? v.changePercent24h
          : (v.changePercent !== undefined ? v.changePercent : v.change);

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
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
