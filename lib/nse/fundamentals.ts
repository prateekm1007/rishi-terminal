// lib/nse/fundamentals.ts
// Live fundamentals: NSE API (primary) + Yahoo Finance (fallback)
// NSE works server-side, no CORS issues in Next.js API routes

export interface LiveFundamentals {
  symbol: string;
  pe: number;
  eps: number;
  marketCap: number;
  roe: number;
  roce: number;
  bookValue: number;
  dividendYield: number;
  faceValue: number;
  lastUpdated: string;
}

// =============================================================================
// NSE India API (primary source - free, server-side only)
// =============================================================================

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
};

export async function fetchNSEFundamentals(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: NSE_HEADERS,
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[NSE] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    // NSE response structure:
    // priceInfo: { lastPrice, change, pChange, totalTradedVolume, totalMarketCap }
    // info: { symbol, companyName, industry, isin }
    // metadata: { isin, industryInfo }
    // securityInfo: { faceValue, issuedSize }

    const priceInfo = data?.priceInfo || {};
    const info = data?.info || {};
    const securityInfo = data?.securityInfo || {};

    // Calculate market cap: lastPrice * issuedSize
    const lastPrice = parseFloat(priceInfo?.lastPrice) || 0;
    const issuedSize = parseFloat(securityInfo?.issuedSize) || 0;
    const marketCap = lastPrice * issuedSize;

    // P/E not directly available in NSE API
    // EPS not directly available
    // Book value not directly available
    
    return {
      symbol,
      pe: 0, // Not available from NSE
      eps: 0,
      marketCap: marketCap || 0,
      bookValue: 0,
      roe: 0,
      roce: 0,
      dividendYield: 0,
      faceValue: parseFloat(securityInfo?.faceValue) || 10,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[NSE] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Yahoo Finance (fallback - provides P/E, ROE, etc)
// =============================================================================

export async function fetchYahooFundamentals(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=defaultKeyStatistics,financialData,summaryDetail`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[Yahoo] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const stats   = result.defaultKeyStatistics || {};
    const fin     = result.financialData || {};
    const summary = result.summaryDetail || {};

    const pe           = parseFloat(stats?.trailingPE?.raw) || parseFloat(summary?.trailingPE?.raw) || 0;
    const eps          = parseFloat(stats?.trailingEps?.raw) || 0;
    const marketCap    = parseFloat(stats?.marketCap?.raw) || 0;
    const bookValue    = parseFloat(stats?.bookValue?.raw) || 0;
    const roe          = fin?.returnOnEquity?.raw ? fin.returnOnEquity.raw * 100 : 0;
    const dividendYield = summary?.dividendYield?.raw ? summary.dividendYield.raw * 100 : 0;

    return {
      symbol,
      pe,
      eps,
      marketCap,
      bookValue,
      roe,
      roce: 0,
      dividendYield,
      faceValue: 10,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Yahoo] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Hybrid Strategy: NSE market cap + Yahoo fundamentals
// =============================================================================

export async function fetchLiveFundamentals(symbol: string): Promise<LiveFundamentals | null> {
  // Fetch both in parallel
  const [nse, yahoo] = await Promise.allSettled([
    fetchNSEFundamentals(symbol),
    fetchYahooFundamentals(symbol),
  ]);

  const nseData = nse.status === 'fulfilled' ? nse.value : null;
  const yahooData = yahoo.status === 'fulfilled' ? yahoo.value : null;

  // Prefer NSE market cap (more accurate), Yahoo for P/E, ROE
  if (yahooData || nseData) {
    return {
      symbol,
      pe:            yahooData?.pe ?? 0,
      eps:           yahooData?.eps ?? 0,
      marketCap:     nseData?.marketCap ?? yahooData?.marketCap ?? 0,
      roe:           yahooData?.roe ?? 0,
      roce:          0,
      bookValue:     yahooData?.bookValue ?? 0,
      dividendYield: yahooData?.dividendYield ?? 0,
      faceValue:     nseData?.faceValue ?? yahooData?.faceValue ?? 10,
      lastUpdated:   new Date().toISOString(),
    };
  }

  return null;
}

// =============================================================================
// Bulk Fetch (rate-limited)
// =============================================================================

export async function fetchBulkFundamentals(symbols: string[]): Promise<Record<string, LiveFundamentals>> {
  const results: Record<string, LiveFundamentals> = {};

  // 2 parallel at a time to respect NSE rate limits
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 2) {
    chunks.push(symbols.slice(i, i + 2));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(sym => fetchLiveFundamentals(sym)));
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results[chunk[idx]] = result.value;
      }
    });
    // 1 second between chunks
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}