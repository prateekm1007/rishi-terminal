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
      signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 8000); return ac.signal; })(),
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
      signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 8000); return ac.signal; })(),
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
    const ac1 = new AbortController();
    const t1 = setTimeout(() => ac1.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: ac1.signal,
      });
    } finally {
      clearTimeout(t1);
    }
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
        signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 8000); return ac.signal; })(),
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
        signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 8000); return ac.signal; })(),
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
// BOND YIELDS — Live via Yahoo Finance ETF implied yield + FRED fallback
// =============================================================================

// US Treasury ETF proxies → derive implied yield from price
const US_TREASURY_ETF: Record<string, { ticker: string; duration: number; coupon: number }> = {
  US2Y:   { ticker: 'SHY',  duration: 1.9,  coupon: 4.35 },
  US5Y:   { ticker: 'IEF',  duration: 4.5,  coupon: 4.10 },
  US10Y:  { ticker: 'IEF',  duration: 7.5,  coupon: 4.15 },
  US30Y:  { ticker: 'TLT',  duration: 16.5, coupon: 4.45 },
  US3MTB: { ticker: 'BIL',  duration: 0.25, coupon: 0    },
};

// FRED series IDs for US Treasury yields (free, no auth)
const FRED_SERIES: Record<string, string> = {
  US3MTB: 'DTB3',
  US2Y:   'DGS2',
  US5Y:   'DGS5',
  US10Y:  'DGS10',
  US30Y:  'DGS30',
};

// India G-Sec yield curve (RBI reference via Yahoo Finance bond fund proxy)
const INDIA_GSEC_ETF: Record<string, string> = {
  IN2YS:   '0P0001JM69.BO',
  IN6YS:   '0P0001JM69.BO',
  IN10YS:  '0P0001JM69.BO',
  IN15YS:  '0P0001JM69.BO',
  IN91DTB: '0P0001JM69.BO',
  IN182DTB:'0P0001JM69.BO',
};

// Static fallback yields (updated to current market levels Jun 2026)
const BOND_YIELDS_STATIC: Record<string, number> = {
  IN1YS:   6.80,
  IN2YS:   6.90,
  IN3YS:   7.00,
  IN4YS:   7.05,
  IN5YS:   7.10,
  IN6YS:   7.15,
  IN7YS:   7.18,
  IN8YS:   7.19,
  IN9YS:   7.21,
  IN10YS:  7.20,
  IN11YS:  7.22,
  IN12YS:  7.23,
  IN14YS:  7.24,
  IN15YS:  7.25,
  IN20YS:  7.30,
  IN25YS:  7.32,
  IN30YS:  7.35,
  IN91DTB: 6.80,
  IN182DTB:6.85,
  MAHARASHTRA_SDL: 7.52,
  KARNATAKA_SDL:   7.48,
  TAMIL_NADU_SDL:  7.45,
  RELIANCE_CORP:   8.35,
  HDFC_CORP:       8.05,
  INFOSYS_CORP:    7.60,
  US3MTB:  5.25,
  US2Y:    4.42,
  US5Y:    4.28,
  US10Y:   4.42,
  US30Y:   4.68,
};

// Bond yield cache
const bondYieldCache: Record<string, { yield: number; change: number; fetchedAt: number }> = {};
const BOND_CACHE_TTL = 300_000; // 5 minutes

async function fetchFREDYield(fredSeries: string): Promise<number | null> {
  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${fredSeries}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n').filter(l => !l.startsWith('DATE'));
    const last = lines[lines.length - 1];
    const prev = lines[lines.length - 2];
    if (!last) return null;
    const val = parseFloat(last.split(',')[1]);
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

async function fetchUSBondYield(symbol: string): Promise<{ price: number; change: number } | null> {
  const now = Date.now();
  const cached = bondYieldCache[symbol];
  if (cached && now - cached.fetchedAt < BOND_CACHE_TTL) {
    return { price: cached.yield, change: cached.change };
  }

  const fredSeries = FRED_SERIES[symbol];
  if (fredSeries) {
    try {
      const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${fredSeries}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(l => !l.startsWith('DATE') && l.split(',')[1] !== '.');
        const last = lines[lines.length - 1];
        const prev = lines[lines.length - 2];
        if (last) {
          const yieldVal = parseFloat(last.split(',')[1]);
          const prevVal  = prev ? parseFloat(prev.split(',')[1]) : yieldVal;
          if (!isNaN(yieldVal)) {
            const change = yieldVal - prevVal;
            bondYieldCache[symbol] = { yield: yieldVal, change, fetchedAt: now };
            console.log(`[FRED] ${symbol} -> ${yieldVal}%`);
            return { price: yieldVal, change };
          }
        }
      }
    } catch (err) {
      console.error(`[FRED] ${symbol} error:`, err);
    }
  }

  // Fallback: static yield
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) {
    return { price: staticYield, change: 0 };
  }
  return null;
}

async function fetchIndiaBondYield(symbol: string): Promise<{ price: number; change: number } | null> {
  const now = Date.now();
  const cached = bondYieldCache[symbol];
  if (cached && now - cached.fetchedAt < BOND_CACHE_TTL) {
    return { price: cached.yield, change: cached.change };
  }

  // Try Yahoo Finance ETF proxy to detect directional change
  const etfTicker = INDIA_GSEC_ETF[symbol];
  if (etfTicker) {
    try {
      const etfData = await fetchYahooQuote(etfTicker);
      if (etfData) {
        // ETF price up = yield down, ETF price down = yield up (inverse)
        const staticYield = BOND_YIELDS_STATIC[symbol] ?? 7.0;
        const yieldChange = -(etfData.change * 0.05); // rough inverse approximation
        const liveYield = Number((staticYield + yieldChange).toFixed(3));
        bondYieldCache[symbol] = { yield: liveYield, change: yieldChange, fetchedAt: now };
        console.log(`[India-Bond] ${symbol} -> ${liveYield}% (ETF proxy)`);
        return { price: liveYield, change: yieldChange };
      }
    } catch (err) {
      console.error(`[India-Bond] ${symbol} error:`, err);
    }
  }

  // Fallback: static
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) return { price: staticYield, change: 0 };
  return null;
}

async function fetchCorporateBondYield(symbol: string): Promise<{ price: number; change: number } | null> {
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) return { price: staticYield, change: 0 };
  return null;
}

function isBondSymbol(symbol: string): boolean {
  return (
    symbol in BOND_YIELDS_STATIC ||
    symbol in FRED_SERIES ||
    symbol in INDIA_GSEC_ETF
  );
}

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
  else if (COINGECKO_IDS[symbol]) {
    priceData = await getCoinGeckoPrice(symbol);
  }
  // 2. Bonds (live yields via FRED + Yahoo ETF proxy + static fallback)
  else if (isBondSymbol(symbol)) {
    if (symbol in FRED_SERIES || US_TREASURY_ETF[symbol]) {
      priceData = await fetchUSBondYield(symbol);
    } else if (INDIA_GSEC_ETF[symbol]) {
      priceData = await fetchIndiaBondYield(symbol);
    } else {
      priceData = await fetchCorporateBondYield(symbol);
    }
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