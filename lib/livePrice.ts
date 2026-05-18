// lib/livePrice.ts
// Universal live pricing
// Stocks/Commodities: NSE India API
// Crypto: CoinGecko
// Forex: ExchangeRate-API
// Bonds: Static yields

// =============================================================================
// NSE INDIA API — Stocks + MCX Commodities
// =============================================================================

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/',
};

// NSE equity quote
async function getNSEStockPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const price = data?.priceInfo?.lastPrice;
    const changePct = data?.priceInfo?.pChange;

    if (price == null) return null;

    return {
      price: Number(price),
      change: Number(changePct) || 0,
    };
  } catch (err) {
    console.error(`[NSE] ${symbol} error:`, (err as Error).message);
    return null;
  }
}

// NSE commodity/derivatives quote
async function getNSEDerivativePrice(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://www.nseindia.com/api/quote-derivative?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const price = data?.underlyingValue ?? data?.priceInfo?.lastPrice;
    const changePct = data?.priceInfo?.pChange ?? 0;

    if (price == null) return null;

    return {
      price: Number(price),
      change: Number(changePct) || 0,
    };
  } catch (err) {
    console.error(`[NSE-D] ${symbol} error:`, (err as Error).message);
    return null;
  }
}


// =============================================================================
// YAHOO FINANCE -- Indices + Commodity Futures (works from cloud without auth)
// =============================================================================

const YAHOO_INDEX_SYMBOLS: Record<string, string> = {
  NIFTY50:    '^NSEI',
  SENSEX:     '^BSESN',
  BANK_NIFTY: '^NSEBANK',
};

const YAHOO_COMMODITY_SYMBOLS: Record<string, string> = {
  GOLD:       'GC=F',
  SILVER:     'SI=F',
  CRUDEOIL:   'CL=F',
  WTI:        'CL=F',
  BRENT:      'BZ=F',
  BRENTCRUDE: 'BZ=F',
  PLATINUM:   'PL=F',
  PALLADIUM:  'PA=F',
  COPPER:     'HG=F',
  NATURALGAS: 'NG=F',
};

async function fetchYahooQuote(
  yahooSymbol: string
): Promise<{ price: number; change: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = Number(meta.regularMarketPrice) || 0;
    const prevClose = Number(meta.previousClose) || price;
    const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    return { price, change };
  } catch {
    return null;
  }
}
// =============================================================================
// COMMODITY MAPPING — MCX symbol to NSE/Global
// =============================================================================

// MCX commodities trade on NSE derivatives segment
const COMMODITY_NSE_SYMBOLS: Record<string, string> = {
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  CRUDEOIL: 'CRUDEOIL',
  NATURALGAS: 'NATURALGAS',
  COPPER: 'COPPER',
  ALUMINIUM: 'ALUMINIUM',
  ZINC: 'ZINC',
  NICKEL: 'NICKEL',
  LEAD: 'LEAD',
};

// For commodities not on NSE, use static USD prices (updated periodically)
// Brent crude tracks WTI closely; MCX gold tracks international gold
const COMMODITY_STATIC_USD: Record<string, number> = {
  BRENTCRUDE: 65.0,    // USD per barrel - update periodically
  PLATINUM: 980.0,     // USD per troy oz
  PALLADIUM: 980.0,    // USD per troy oz
  COTTON: 68.0,        // USD per pound (cents)
  RUBBER: 180.0,       // USD per 100kg
  MENTHAOIL: 950.0,    // INR per kg (MCX)
  CARDAMOM: 1800.0,    // INR per kg (MCX)
};

// =============================================================================
// COINGECKO — Crypto ONLY
// =============================================================================

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  MKR: 'maker',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
};

const coinGeckoCache: Record<string, { price: number; change: number; fetchedAt: number }> = {};
let lastCoinGeckoFetch = 0;
let coinGeckoFetchPromise: Promise<void> | null = null;

async function fetchAllCoinGecko(): Promise<void> {
  const now = Date.now();
  if (now - lastCoinGeckoFetch < 60000) return;
  if (coinGeckoFetchPromise) return coinGeckoFetchPromise;

  coinGeckoFetchPromise = (async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const data = await res.json();
      for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
        if (data[geckoId]) {
          coinGeckoCache[symbol] = {
            price: Number(data[geckoId].usd) || 0,
            change: Number(data[geckoId].usd_24h_change) || 0,
            fetchedAt: now,
          };
        }
      }
      lastCoinGeckoFetch = now;
    } catch (err) {
      console.error('[CoinGecko] batch error:', err);
    } finally {
      coinGeckoFetchPromise = null;
    }
  })();

  return coinGeckoFetchPromise;
}

async function getCoinGeckoPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  await fetchAllCoinGecko();
  const cached = coinGeckoCache[symbol];
  return cached ? { price: cached.price, change: cached.change } : null;
}

// =============================================================================
// FOREX — ExchangeRate-API (free, no auth)
// =============================================================================

const forexCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
let forexCacheData: { rates: Record<string, number>; fetchedAt: number } | null = null;
let forexFetchPromise: Promise<void> | null = null;

async function fetchForexRates(): Promise<void> {
  const now = Date.now();
  if (forexCacheData && now - forexCacheData.fetchedAt < 300000) return; // 5 min cache
  if (forexFetchPromise) return forexFetchPromise;

  forexFetchPromise = (async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`ExchangeRate HTTP ${res.status}`);
      const data = await res.json();
      forexCacheData = { rates: data.rates, fetchedAt: now };
    } catch (err) {
      console.error('[Forex] fetch error:', err);
    } finally {
      forexFetchPromise = null;
    }
  })();

  return forexFetchPromise;
}

// Forex pairs stored as "BASE/QUOTE" e.g. "EUR/USD"
async function getForexRate(pair: string): Promise<{ price: number; change: number } | null> {
  await fetchForexRates();
  if (!forexCacheData) return null;

  const [base, quote] = pair.split('/');
  if (!base || !quote) return null;

  const rates = forexCacheData.rates;

  // Convert: base/quote = (1/USD_base) * USD_quote
  // rates are all relative to USD
  if (base === 'USD') {
    const price = rates[quote];
    return price ? { price, change: 0 } : null;
  }

  if (quote === 'USD') {
    const baseRate = rates[base];
    return baseRate ? { price: 1 / baseRate, change: 0 } : null;
  }

  // Cross rate
  const baseRate = rates[base];
  const quoteRate = rates[quote];
  if (!baseRate || !quoteRate) return null;

  return { price: quoteRate / baseRate, change: 0 };
}

// =============================================================================
// BOND YIELDS (static — no free real-time Indian bond API)
// =============================================================================

const BOND_YIELDS: Record<string, number> = {
  IN1YS: 6.8,
  IN2YS: 6.9,
  IN3YS: 7.0,
  IN4YS: 7.05,
  IN5YS: 7.1,
  IN6YS: 7.15,
  IN7YS: 7.18,
  IN8YS: 7.19,
  IN9YS: 7.21,
  IN10YS: 7.2,
  IN11YS: 7.22,
  IN12YS: 7.23,
  IN14YS: 7.24,
  IN15YS: 7.25,
  IN20YS: 7.3,
  IN25YS: 7.32,
  IN30YS: 7.35,
};

// =============================================================================
// EXPORT: YAHOO_SYMBOLS (kept for backward compatibility)
// =============================================================================

export const YAHOO_SYMBOLS: Record<string, string> = {};

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function fetchLivePrice(
  symbol: string
): Promise<{ price: number; change: number; lastUpdated: string }> {
  let priceData: { price: number; change: number } | null = null;

  // 0. Market indices (Yahoo Finance)
  if (YAHOO_INDEX_SYMBOLS[symbol]) {
    priceData = await fetchYahooQuote(YAHOO_INDEX_SYMBOLS[symbol]);
  }
  // 1. Crypto (CoinGecko)
  if (COINGECKO_IDS[symbol]) {
    priceData = await getCoinGeckoPrice(symbol);
  }
  // 2. Bonds (static yields)
  else if (BOND_YIELDS[symbol]) {
    priceData = { price: BOND_YIELDS[symbol], change: 0 };
  }
  // 3. Forex pairs (ExchangeRate-API)
  else if (symbol.includes('/')) {
    priceData = await getForexRate(symbol);
  }
  // 4. Commodities via Yahoo Finance futures
  else if (YAHOO_COMMODITY_SYMBOLS[symbol]) {
    priceData = await fetchYahooQuote(YAHOO_COMMODITY_SYMBOLS[symbol]);
  }
  // 4b. MCX Commodities on NSE derivatives (fallback)
  else if (COMMODITY_NSE_SYMBOLS[symbol]) {
    priceData = await fetchYahooQuote(`${COMMODITY_NSE_SYMBOLS[symbol]}.NS`) ??
                await getNSEDerivativePrice(COMMODITY_NSE_SYMBOLS[symbol]);
  }
  // 5. Static commodity fallback
  else if (COMMODITY_STATIC_USD[symbol]) {
    priceData = { price: COMMODITY_STATIC_USD[symbol], change: 0 };
  }
  // 6. Indian stocks (NSE equity API)
  else {
    priceData = await getNSEStockPrice(symbol);
  }

  if (!priceData) {
    return { price: 0, change: 0, lastUpdated: new Date().toISOString() };
  }

  return {
    price: priceData.price,
    change: priceData.change,
    lastUpdated: new Date().toISOString(),
  };
}