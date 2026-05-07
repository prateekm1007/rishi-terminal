// Yahoo Finance API integration for live stock prices
// Free tier: 2000 requests/day, supports NSE/BSE stocks

interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  marketState: string;
}

interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  previousClose: number;
  isMarketOpen: boolean;
  lastUpdated: string;
}

// Convert NSE symbol to Yahoo Finance format
function toYahooSymbol(symbol: string): string {
  // NSE stocks need .NS suffix
  // BSE stocks need .BO suffix
  if (symbol.includes('.')) return symbol; // Already formatted
  return symbol + '.NS'; // Default to NSE
}

// Fetch live price for single stock
export async function fetchLivePrice(symbol: string): Promise<LivePrice | null> {
  try {
    const yahooSymbol = toYahooSymbol(symbol);
    
    // Using public Yahoo Finance API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const quote = data.chart?.result?.[0];
    
    if (!quote || !quote.meta) {
      console.warn(`No data for ${symbol}`);
      return null;
    }

    const meta = quote.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      dayHigh: meta.regularMarketDayHigh || currentPrice,
      dayLow: meta.regularMarketDayLow || currentPrice,
      volume: meta.regularMarketVolume || 0,
      previousClose: previousClose,
      isMarketOpen: meta.marketState === 'REGULAR',
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

// Fetch multiple stocks in batch
export async function fetchBatchPrices(symbols: string[]): Promise<Record<string, LivePrice>> {
  const results: Record<string, LivePrice> = {};
  
  // Yahoo Finance allows comma-separated symbols
  const yahooSymbols = symbols.map(toYahooSymbol);
  const chunks = chunkArray(yahooSymbols, 10); // Process 10 at a time

  for (const chunk of chunks) {
    const promises = chunk.map(async (yahooSymbol, index) => {
      const symbol = symbols[yahooSymbols.indexOf(yahooSymbol)];
      const price = await fetchLivePrice(symbol);
      if (price) results[symbol] = price;
    });

    await Promise.all(promises);
    
    // Rate limiting: wait 100ms between batches
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Helper: chunk array
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Alternative: Alpha Vantage (fallback)
export async function fetchAlphaVantagePrice(symbol: string): Promise<LivePrice | null> {
  const API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || 'demo';
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.BSE&apikey=${API_KEY}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    const data = await response.json();
    const quote = data['Global Quote'];

    if (!quote || !quote['05. price']) {
      return null;
    }

    const price = parseFloat(quote['05. price']);
    const change = parseFloat(quote['09. change']);
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

    return {
      symbol: symbol,
      price: price,
      change: change,
      changePercent: changePercent,
      dayHigh: parseFloat(quote['03. high']),
      dayLow: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume']),
      previousClose: parseFloat(quote['08. previous close']),
      isMarketOpen: true,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error);
    return null;
  }
}

// Cache management
const priceCache = new Map<string, { data: LivePrice; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export function getCachedPrice(symbol: string): LivePrice | null {
  const cached = priceCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    priceCache.delete(symbol);
    return null;
  }
  
  return cached.data;
}

export function setCachedPrice(symbol: string, price: LivePrice): void {
  priceCache.set(symbol, {
    data: price,
    timestamp: Date.now(),
  });
}

// Preload top stocks on server startup
export async function preloadTopStocks(symbols: string[]): Promise<void> {
  const prices = await fetchBatchPrices(symbols);
  Object.entries(prices).forEach(([symbol, price]) => {
    setCachedPrice(symbol, price);
  });
}