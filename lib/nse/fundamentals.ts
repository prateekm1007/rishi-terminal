// lib/nse/fundamentals.ts
// NSE/BSE scraper for live fundamentals: P/E, ROE, ROCE, Market Cap, EPS
// Free API endpoints from NSE India + BSE India

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/',
};

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
// NSE Corporate Info API
// =============================================================================

export async function fetchNSEFundamentals(symbol: string): Promise<LiveFundamentals | null> {
  try {
    // NSE Quote Equity API returns: P/E, EPS, Market Cap, Book Value, Dividend Yield
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
      console.error(`[NSE-Fund] ${symbol}: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    
    // Extract from priceInfo and info sections
    const priceInfo = data?.priceInfo || {};
    const info = data?.info || {};
    const metadata = data?.metadata || {};
    
    const pe = parseFloat(priceInfo?.pe) || 0;
    const eps = parseFloat(info?.eps) || 0;
    const marketCap = parseFloat(priceInfo?.totalMarketCap) || 0;
    const bookValue = parseFloat(info?.bookValue) || 0;
    const dividendYield = parseFloat(info?.dividendYield) || 0;
    const faceValue = parseFloat(info?.faceValue) || 10;

    // NSE doesn't provide ROE/ROCE directly
    // We'll need to calculate from financial statements or leave as 0
    const roe = 0;
    const roce = 0;

    return {
      symbol,
      pe,
      eps,
      marketCap,
      roe,
      roce,
      bookValue,
      dividendYield,
      faceValue,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[NSE-Fund] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// NSE Corporate Actions + Financials (for ROE/ROCE calculation)
// =============================================================================

interface BalanceSheetData {
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  debt: number;
}

interface IncomeStatementData {
  revenue: number;
  netProfit: number;
  ebit: number;
}

export async function fetchNSEFinancialStatements(symbol: string): Promise<{
  balanceSheet: BalanceSheetData | null;
  incomeStatement: IncomeStatementData | null;
} | null> {
  try {
    // NSE Financial Results API
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}&section=fin`;
    
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

    if (!res.ok) return null;

    const data = await res.json();
    
    // Parse balance sheet (if available)
    const balanceSheet: BalanceSheetData | null = null;
    const incomeStatement: IncomeStatementData | null = null;

    // NSE API structure is complex and varies
    // This is a placeholder for actual parsing logic
    
    return {
      balanceSheet,
      incomeStatement,
    };
  } catch (err) {
    console.error(`[NSE-Financials] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Calculate ROE and ROCE from financials
// =============================================================================

export function calculateROE(netProfit: number, equity: number): number {
  if (equity <= 0) return 0;
  return (netProfit / equity) * 100;
}

export function calculateROCE(ebit: number, totalAssets: number, currentLiabilities: number): number {
  const capitalEmployed = totalAssets - currentLiabilities;
  if (capitalEmployed <= 0) return 0;
  return (ebit / capitalEmployed) * 100;
}

// =============================================================================
// Bulk Fetch Fundamentals (for batch updates)
// =============================================================================

export async function fetchBulkFundamentals(symbols: string[]): Promise<Record<string, LiveFundamentals>> {
  const results: Record<string, LiveFundamentals> = {};
  
  // Rate limit: 5 requests per second
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 5) {
    chunks.push(symbols.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(sym => fetchNSEFundamentals(sym));
    const settled = await Promise.allSettled(promises);
    
    settled.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        results[chunk[idx]] = result.value;
      }
    });

    // Wait 1 second between chunks to respect rate limits
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// =============================================================================
// Yahoo Finance Fallback (Free, no auth required)
// =============================================================================

export async function fetchYahooFundamentals(symbol: string): Promise<Partial<LiveFundamentals> | null> {
  try {
    // Yahoo Finance adds .NS suffix for NSE stocks
    const yahooSymbol = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=defaultKeyStatistics,financialData`;
    
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
    const stats = data?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
    const financial = data?.quoteSummary?.result?.[0]?.financialData || {};

    return {
      symbol,
      pe: parseFloat(stats?.trailingPE?.raw) || 0,
      eps: parseFloat(stats?.trailingEps?.raw) || 0,
      marketCap: parseFloat(stats?.marketCap?.raw) || 0,
      bookValue: parseFloat(stats?.bookValue?.raw) || 0,
      roe: parseFloat(financial?.returnOnEquity?.raw) ? parseFloat(financial.returnOnEquity.raw) * 100 : 0,
      roce: 0, // Yahoo doesn't provide ROCE
      dividendYield: parseFloat(stats?.dividendYield?.raw) ? parseFloat(stats.dividendYield.raw) * 100 : 0,
      faceValue: 10,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Yahoo-Fund] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// =============================================================================
// Hybrid Fetch: Try NSE first, fallback to Yahoo
// =============================================================================

export async function fetchLiveFundamentals(symbol: string): Promise<LiveFundamentals | null> {
  // Try NSE first
  let result = await fetchNSEFundamentals(symbol);
  
  if (result && result.pe > 0) {
    return result;
  }

  // Fallback to Yahoo
  const yahooData = await fetchYahooFundamentals(symbol);
  if (yahooData && yahooData.pe && yahooData.pe > 0) {
    return {
      symbol,
      pe: yahooData.pe,
      eps: yahooData.eps || 0,
      marketCap: yahooData.marketCap || 0,
      roe: yahooData.roe || 0,
      roce: yahooData.roce || 0,
      bookValue: yahooData.bookValue || 0,
      dividendYield: yahooData.dividendYield || 0,
      faceValue: yahooData.faceValue || 10,
      lastUpdated: new Date().toISOString(),
    };
  }

  return null;
}