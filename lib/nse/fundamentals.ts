// lib/nse/fundamentals.ts
// Live fundamentals via Yahoo Finance (free, no auth)
// Provides: P/E, EPS, Market Cap, ROE, Book Value, Dividend Yield
// ROCE not available from Yahoo - falls back to static

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
// Yahoo Finance - primary source (free, server-side safe)
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      console.error(`[Yahoo-Fund] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const stats    = result.defaultKeyStatistics || {};
    const fin      = result.financialData        || {};
    const summary  = result.summaryDetail        || {};

    const pe           = parseFloat(stats?.trailingPE?.raw)          || parseFloat(summary?.trailingPE?.raw)      || 0;
    const eps          = parseFloat(stats?.trailingEps?.raw)         || 0;
    const marketCap    = parseFloat(stats?.marketCap?.raw)           || 0;
    const bookValue    = parseFloat(stats?.bookValue?.raw)           || 0;
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
    console.error(`[Yahoo-Fund] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Yahoo Finance v8 quote (faster, more fields)
// =============================================================================

export async function fetchYahooQuote(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      symbol,
      marketCap: meta.marketCap || 0,
      pe: 0,
      eps: 0,
      bookValue: 0,
      roe: 0,
      roce: 0,
      dividendYield: 0,
      faceValue: 10,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Hybrid Fetch: Try Yahoo quoteSummary, fallback to v8 quote
// =============================================================================

export async function fetchLiveFundamentals(symbol: string): Promise<LiveFundamentals | null> {
  const yahoo = await fetchYahooFundamentals(symbol);

  if (yahoo && (yahoo.pe || 0) > 0) {
    return {
      symbol,
      pe:            yahoo.pe            ?? 0,
      eps:           yahoo.eps           ?? 0,
      marketCap:     yahoo.marketCap     ?? 0,
      roe:           yahoo.roe           ?? 0,
      roce:          0,
      bookValue:     yahoo.bookValue     ?? 0,
      dividendYield: yahoo.dividendYield ?? 0,
      faceValue:     10,
      lastUpdated:   new Date().toISOString(),
    };
  }

  // Fallback: v8 quote for at least market cap
  const quote = await fetchYahooQuote(symbol);
  if (quote && (quote.marketCap || 0) > 0) {
    return {
      symbol,
      pe:            0,
      eps:           0,
      marketCap:     quote.marketCap ?? 0,
      roe:           0,
      roce:          0,
      bookValue:     0,
      dividendYield: 0,
      faceValue:     10,
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

  // 3 parallel at a time to avoid Yahoo rate limits
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 3) {
    chunks.push(symbols.slice(i, i + 3));
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk.map(sym => fetchLiveFundamentals(sym)));
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results[chunk[idx]] = result.value;
      }
    });
    // 500ms between chunks
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}