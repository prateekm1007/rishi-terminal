// lib/livePrice.ts
// Universal live pricing
// Stocks/Commodities: NSE India API
// Crypto: CoinGecko
// Forex: ExchangeRate-API
// Bonds: Static yields

// Phase 5 T45/T46: provider health accounting + request coalescing.
// Phase 6 T60/T62: result-snapshot reuse + DB persistent cache (storage-
// entitled sources only) + honest observation timestamps.
import { withProviderHealth, coalesce, getCachedResult, putCachedResult, ProviderCooldownError } from './registry/providerHealth';
import { PROVIDER_IDS, isProviderApproved } from './registry/providerRegistry';
import { persistentCacheGet, persistentCacheSet } from './cache/persistentCache';
import { recordUpstreamAttempt } from './health/measurement';

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
// =============================================================================
// YAHOO FINANCE v8 — Indian stock price (NSE suffix)
// =============================================================================
const YAHOO_STOCK_CACHE: Record<string, { price: number; change: number; ts: number }> = {};

/**
 * Pure: price + 24h % change from a Yahoo chart `meta` object.
 *
 * 2026-09-30 drift: chart meta no longer carries `previousClose`. It now has
 * `chartPreviousClose` (close before the chart window) plus a precomputed
 * `regularMarketChangePercent`. The old `Number(meta.previousClose) || price`
 * fell back to prev = price, silently zeroing every Indian-stock change —
 * homepage tickers were stuck at 0.00% while prices still served.
 * Trust order: regularMarketChangePercent (Yahoo's own, vs true prev close)
 * → previousClose (legacy shape) → chartPreviousClose → change 0.
 * Returns null when no usable price exists.
 */
export function yahooChangeFromMeta(
  meta: Record<string, unknown> | null | undefined
): { price: number; change: number } | null {
  const price = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const direct = Number(meta?.regularMarketChangePercent);
  if (Number.isFinite(direct)) return { price, change: direct };
  const prev = Number(meta?.previousClose) || Number(meta?.chartPreviousClose) || 0;
  return { price, change: prev > 0 ? ((price - prev) / prev) * 100 : 0 };
}

async function getYahooNSEPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  const now = Date.now();
  const cached = YAHOO_STOCK_CACHE[symbol];
  if (cached && now - cached.ts < 60000) return cached;

  try {
    const yahooSym = `${symbol}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 6000); return ac.signal; })(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const result = yahooChangeFromMeta(meta);
    if (!result) return null;
    YAHOO_STOCK_CACHE[symbol] = { ...result, ts: now };
    return result;
  } catch {
    return null;
  }
}

// =============================================================================
// YAHOO FINANCE v7 — alternate endpoint (different rate limit pool)
// =============================================================================
async function getYahooNSEPriceV7(symbol: string): Promise<{ price: number; change: number } | null> {
  try {
    const yahooSym = `${symbol}.NS`;
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSym)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 6000); return ac.signal; })(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q?.regularMarketPrice) return null;
    const price = Number(q.regularMarketPrice);
    const change = Number(q.regularMarketChangePercent) || 0;
    return { price, change };
  } catch {
    return null;
  }
}

// =============================================================================
// SCREENER.IN — REMOVED from the price routing layer (Phase 5.1).
//
// The registry marks Screener RESEARCH_ONLY (display/redistribution rights
// unresolved, founder-flagged FD-1). Production price routing may therefore
// never reach it — not even as a last-resort fallback. The explicitly frozen
// legacy fundamentals path (lib/liveFundamentals.ts → lib/scrapers/screener.ts)
// is a separate surface and is unchanged.
//
// Enforcement is structural, not conventional: attempt() refuses to call any
// provider whose registry status is not APPROVED (T55), so a RESEARCH_ONLY
// provider cannot be introduced into a fallback chain again without failing
// the gating test.
// =============================================================================

// BSE INDIA API — additional free source for Indian stocks
// =============================================================================
const BSE_SCRIP_MAP: Record<string, string> = {
  RELIANCE: '500325', TCS: '532540', INFY: '500209', WIPRO: '507685',
  HDFCBANK: '500180', ICICIBANK: '532174', SBIN: '500112', ITC: '500875',
  HINDUNILVR: '500696', BHARTIARTL: '532454', KOTAKBANK: '500247',
  LT: '500510', AXISBANK: '532215', BAJFINANCE: '500034', ASIANPAINT: '500820',
  MARUTI: '532500', HCLTECH: '532281', SUNPHARMA: '524715', TATAMOTORS: '500570',
  TITAN: '500114', ADANIENT: '512599', ULTRACEMCO: '532538', NTPC: '532555',
  POWERGRID: '532898', ONGC: '500312', JSWSTEEL: '500228', TATASTEEL: '500470',
  TECHM: '532755', NESTLE: '500790', DRREDDY: '500124', CIPLA: '500087',
  DIVISLAB: '532488', HINDALCO: '500440', COALINDIA: '533278', BPCL: '500547',
  EICHERMOT: '505200', BAJAJFINSV: '532978', GRASIM: '500300', APOLLOHOSP: '508869',
};

async function getBSEPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  const scripCode = BSE_SCRIP_MAP[symbol];
  if (!scripCode) return null;
  try {
    const url = `https://api.bseindia.com/BseIndiaAPI/api/getScripHeaderData/w?Debtflag=&scripcode=${scripCode}&seriesid=`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bseindia.com/',
        'Accept': 'application/json',
      },
      signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 6000); return ac.signal; })(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const price = parseFloat(json?.CurrRate ?? json?.Ltp ?? '0');
    const change = parseFloat(json?.PcntChange ?? json?.Change ?? '0');
    if (price <= 0) return null;
    return { price, change };
  } catch {
    return null;
  }
}
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

// R5: moved from app/api/history/route.ts so the input gate
// (lib/registry/validateInput.ts) can share the same alias set.
export const YAHOO_SPECIAL: Record<string, string> = {
  BGV01: 'BSLIMITED.NS',
  // Indexes
  NIFTY50:    "^NSEI",
  SENSEX:     "^BSESN",
  BANK_NIFTY: "^NSEBANK",
  NIFTYBANK:  "^NSEBANK",
  NIFTYIT:    "^CNXIT",
  NIFTYFMCG:  "^CNXFMCG",
  NIFTYMETAL: "^CNXMETAL",
  NIFTYAUTO:  "^CNXAUTO",
  SPX:        "^GSPC",
  DJI:        "^DJI",
  IXIC:       "^IXIC",
  FTSE:       "^FTSE",
  DAX:        "^GDAXI",
  N225:       "^N225",
  HSI:        "^HSI",
  VIX:        "^VIX",
  INDIAVIX:   "^INDIAVIX",

  // Precious Metals
  GOLD:       "GC=F",
  SILVER:     "SI=F",
  PLATINUM:   "PL=F",
  PALLADIUM:  "PA=F",
  COPPER:     "HG=F",

  // Energy
  WTI:        "CL=F",
  BRENT:      "BZ=F",
  NATGAS:     "NG=F",
  NATURALGAS: "NG=F",

  // Agriculture
  WHEAT:      "ZW=F",
  CORN:       "ZC=F",
  SOYBEANS:   "ZS=F",
  COFFEE:     "KC=F",
  SUGAR:      "SB=F",
  COTTON:     "CT=F",
  COCOA:      "CC=F",
  LUMBER:     "LBS=F",
  CATTLE:     "LE=F",

  // Industrial Metals
  ALUMINUM:   "ALI=F",

  // US Treasuries (ETF proxies for yield charts)
  US2Y:       "SHY",
  US5Y:       "IEF",
  US10Y:      "IEF",
  US30Y:      "TLT",
  US3MTB:     "BIL",

  // India bonds - ETF proxy (closest available)
  IN6YS:          "0P0001JM69.BO",
  IN10YS:         "0P0001JM69.BO",
  IN15YS:         "0P0001JM69.BO",
  IN2YS:          "0P0001JM69.BO",
  IN91DTB:        "0P0001JM69.BO",
  IN182DTB:       "0P0001JM69.BO",
  MAHARASHTRA_SDL: "0P0001JM69.BO",
  KARNATAKA_SDL:   "0P0001JM69.BO",
  TAMIL_NADU_SDL:  "0P0001JM69.BO",
  RELIANCE_CORP:   "RELIANCE.NS",
  HDFC_CORP:       "HDFCBANK.NS",
  INFOSYS_CORP:    "INFY.NS",
};

export const YAHOO_INDEX_SYMBOLS: Record<string, string> = {
  NIFTY50:    '^NSEI',
  SENSEX:     '^BSESN',
  BANK_NIFTY: '^NSEBANK',
  SPX:        '^GSPC',
  DJI:        '^DJI',
  IXIC:       '^IXIC',
  DAX:        '^GDAXI',
  FTSE:       '^FTSE',
  HSI:        '^HSI',
  N225:       '^N225',
  VIX:        '^VIX',
};

export const YAHOO_COMMODITY_SYMBOLS: Record<string, string> = {
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

export const COINGECKO_IDS: Record<string, string> = {
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
const YAHOO_FOREX_SYMBOLS: Record<string, string> = {
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'JPY/USD': 'JPY=X',
  'AUD/USD': 'AUDUSD=X',
  'NZD/USD': 'NZDUSD=X',
  'CHF/USD': 'CHF=X',
  'USD/INR': 'INR=X',
  'EUR/INR': 'EURINR=X',
  'GBP/INR': 'GBPINR=X',
  'JPY/INR': 'JPYINR=X',
};

async function getForexRate(pair: string): Promise<{ price: number; change: number; source?: string } | null> {
  // Try Yahoo Finance first (has 24h change data). Attribution matters
  // (Phase 6): the data source is yahoo here — without the explicit label
  // attempt() would stamp the chain id (exchangerate-api), mislabelling a
  // Yahoo observation AND accidentally qualifying it for persistence.
  if (YAHOO_FOREX_SYMBOLS[pair]) {
    const yahooData = await fetchYahooQuote(YAHOO_FOREX_SYMBOLS[pair]);
    if (yahooData) return { ...yahooData, source: "yahoo" };
  }

  // Fallback to ExchangeRate-API (no 24h change)
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

async function fetchUSBondYield(symbol: string): Promise<{ price: number; change: number; source?: string; status?: "LIVE" | "CACHED" | "STATIC" | "DERIVED" | "UNAVAILABLE"; observedAt?: string } | null> {
  const now = Date.now();
  const cached = bondYieldCache[symbol];
  if (cached && now - cached.fetchedAt < BOND_CACHE_TTL) {
    return { price: cached.yield, change: cached.change, source: "fred-csv", status: "CACHED", observedAt: new Date(cached.fetchedAt).toISOString() };
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
            return { price: yieldVal, change, source: "fred-csv", status: "LIVE" };
          }
        }
      }
    } catch (err) {
      console.error(`[FRED] ${symbol} error:`, err);
    }
  }

  // Fallback: static reference yield — served but honestly labelled STATIC
  // (T47: a static reference must never present itself as a live observation).
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) {
    return { price: staticYield, change: 0, source: "static-yields-us", status: "STATIC" };
  }
  return null;
}

async function fetchIndiaBondYield(symbol: string): Promise<{ price: number; change: number; source?: string; status?: "LIVE" | "CACHED" | "STATIC" | "DERIVED" | "UNAVAILABLE"; observedAt?: string } | null> {
  const now = Date.now();
  const cached = bondYieldCache[symbol];
  if (cached && now - cached.fetchedAt < BOND_CACHE_TTL) {
    return { price: cached.yield, change: cached.change, source: "yahoo-etf-proxy", status: "CACHED", observedAt: new Date(cached.fetchedAt).toISOString() };
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
        // T47: static base + inverse ETF change = DERIVED, never LIVE.
        return { price: liveYield, change: yieldChange, source: "yahoo-etf-proxy", status: "DERIVED" };
      }
    } catch (err) {
      console.error(`[India-Bond] ${symbol} error:`, err);
    }
  }

  // Fallback: static
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) return { price: staticYield, change: 0, source: "static-yields-in", status: "STATIC" };
  return null;
}

async function fetchCorporateBondYield(symbol: string): Promise<{ price: number; change: number; source?: string; status?: "LIVE" | "CACHED" | "STATIC" | "DERIVED" | "UNAVAILABLE" } | null> {
  const staticYield = BOND_YIELDS_STATIC[symbol];
  if (staticYield) return { price: staticYield, change: 0, source: "static-yields-corp", status: "STATIC" };
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

const STOCK_ALIASES: Record<string,string> = {
  BGV01: 'BSLIMITED',
};
// ── Phase 5 T47/T48: provenance-carrying price points ────────────────
export type PriceStatus = "LIVE" | "CACHED" | "STATIC" | "DERIVED" | "UNAVAILABLE";
export interface PricePoint {
  price: number;
  change: number;
  source: string;
  status?: PriceStatus;
  /** Phase 6: ISO time of the ORIGINAL upstream observation (never the
   *  serve time — a CACHED replay keeps the observation timestamp). */
  observedAt?: string;
}

// Phase 6 T62: storage-entitled sources + reference symbol set.
// Persist ONLY providers whose terms permit storing observed values
// (evidence: docs/FREE_OPEN_DATA_RESEARCH.md §2.6/§2.7/§2.9 and
// docs/DATA_PROVIDER_MATRIX.md "Phase 6 storage policy"). Scraped or
// terms-unverified sources (NSE, BSE, Yahoo, CoinGecko, screener,
// yahoo-etf-proxy) stay out — an outage on those yields honest
// UNAVAILABLE, never a stored copy.
const PERSISTABLE_SOURCES: ReadonlySet<string> = new Set([
  "fred-csv",         // FRED data terms: attribution "FRED, Federal Reserve Bank of St. Louis"
  "exchangerate-api", // free tier permits app use with attribution
  "ecb-fx",           // ECB reuse policy: attribution "European Central Bank"
]);

export function isPersistableSource(source: string | undefined): boolean {
  return !!source && PERSISTABLE_SOURCES.has(source);
}

/**
 * T61: symbols whose observations are eligible for nightly persistence
 * under the storage-rights gate — FRED yield curve + FX reference pairs.
 * India G-Sec (yahoo-etf-proxy, DERIVED) and equity quotes are
 * deliberately excluded: no storage rights.
 */
export const REFERENCE_SYMBOLS: string[] = [
  ...new Set([...Object.keys(FRED_SERIES), ...Object.keys(YAHOO_FOREX_SYMBOLS)]),
];

/**
 * Run one provider in a fallback chain with health accounting (T45).
 * A provider whose circuit is open (3 consecutive failures → 60 s cooldown)
 * throws ProviderCooldownError; here that becomes null so the next fallback
 * is tried. The winning provider's registry id rides on the result (T48).
 * A result that already carries `source`/`status` (e.g. bond layers with
 * mixed internals) keeps its own provenance.
 */
async function attempt(
  id: string,
  fn: () => Promise<{ price: number; change: number; source?: string; status?: PriceStatus; observedAt?: string } | null>,
): Promise<PricePoint | null> {
  // Phase 5.1 (T55 enforced at the primitive): ONLY APPROVED providers may
  // serve production routing. Fail-closed inside the routing primitive itself
  // — a RESEARCH_ONLY/REJECTED/unregistered id can never be invoked, even if
  // a future edit adds it to a chain. Without an upstream call there is no
  // observation, so the result is null (honest unavailability downstream).
  if (!isProviderApproved(id)) {
    console.warn(`[livePrice] blocked non-APPROVED provider in routing chain: ${id}`);
    return null;
  }
  // Phase 6.1 (T59.2): the single path records its REAL upstream attempts in
  // the measurement ledger (the bulk path records its own). Health counters
  // and ledger counts are independent measures of the same calls and must
  // reconcile (T59.4).
  const t0 = Date.now();
  try {
    const r = await withProviderHealth(id, fn);
    recordUpstreamAttempt({
      providerId: id, path: "single", ok: true,
      latencyMs: Date.now() - t0, httpFailureClass: null,
      symbolsRequested: 1, symbolsReturned: r ? 1 : 0,
    });
    if (!r) return null;
    const observedAt = r.observedAt ?? new Date().toISOString();
    return { status: "LIVE", ...r, source: r.source ?? id, observedAt } as PricePoint;
  } catch (err) {
    // Cooldown, timeout, network, parse — recorded in health; fall through.
    recordUpstreamAttempt({
      providerId: id, path: "single", ok: false,
      latencyMs: Date.now() - t0,
      httpFailureClass: err instanceof ProviderCooldownError ? "cooldown" : null,
      symbolsRequested: 1, symbolsReturned: 0,
    });
    return null;
  }
}

async function fetchLivePriceInner(
  symbol: string
): Promise<PricePoint | null> {
  // 0. Market indices (Yahoo Finance)
  if (YAHOO_INDEX_SYMBOLS[symbol]) {
    return attempt(PROVIDER_IDS.YAHOO, () => fetchYahooQuote(YAHOO_INDEX_SYMBOLS[symbol]));
  }
  // 1. Crypto (CoinGecko)
  if (COINGECKO_IDS[symbol]) {
    return attempt(PROVIDER_IDS.COINGECKO, () => getCoinGeckoPrice(symbol));
  }
  // 2. Bonds (FRED CSV primary; Yahoo ETF proxy + static reference fallbacks)
  if (isBondSymbol(symbol)) {
    if (symbol in FRED_SERIES || US_TREASURY_ETF[symbol]) {
      return attempt(PROVIDER_IDS.FRED_CSV, () => fetchUSBondYield(symbol));
    } else if (INDIA_GSEC_ETF[symbol]) {
      return attempt(PROVIDER_IDS.YAHOO, () => fetchIndiaBondYield(symbol));
    } else {
      return attempt(PROVIDER_IDS.FRED_CSV, () => fetchCorporateBondYield(symbol));
    }
  }
  // 3. Forex pairs (ExchangeRate-API)
  if (symbol.includes('/')) {
    return attempt(PROVIDER_IDS.EXCHANGERATE_API, () => getForexRate(symbol));
  }
  // 4. Commodities via Yahoo Finance futures
  if (YAHOO_COMMODITY_SYMBOLS[symbol]) {
    return attempt(PROVIDER_IDS.YAHOO, () => fetchYahooQuote(YAHOO_COMMODITY_SYMBOLS[symbol]));
  }
  // 4b. MCX Commodities on NSE derivatives (fallback)
  if (COMMODITY_NSE_SYMBOLS[symbol]) {
    const viaYahoo = await attempt(
      PROVIDER_IDS.YAHOO,
      () => fetchYahooQuote(`${COMMODITY_NSE_SYMBOLS[symbol]}.NS`),
    );
    if (viaYahoo) return viaYahoo;
    return attempt(PROVIDER_IDS.NSE, () => getNSEDerivativePrice(COMMODITY_NSE_SYMBOLS[symbol]));
  }
  // 5. Static commodity reference values — served but honestly labelled
  //    STATIC (T47: never presented as live).
  if (COMMODITY_STATIC_USD[symbol]) {
    return {
      price: COMMODITY_STATIC_USD[symbol],
      change: 0,
      source: "static-commodities",
      status: "STATIC",
    };
  }
  // 6. Indian stocks — multi-source fallback chain, health-gated per provider.
  //    Phase 5.1: chain terminates at the last APPROVED provider (BSE).
  //    Screener (RESEARCH_ONLY) was removed — it is unreachable by design;
  //    total failure of every APPROVED source yields honest UNAVAILABLE.
  return (
    (await attempt(PROVIDER_IDS.NSE, () => getNSEStockPrice(symbol))) ??
    (await attempt(PROVIDER_IDS.YAHOO, () => getYahooNSEPrice(symbol))) ??
    (await attempt(PROVIDER_IDS.YAHOO, () => getYahooNSEPriceV7(symbol))) ??
    (await attempt(PROVIDER_IDS.BSE, () => getBSEPrice(symbol)))
  );
}

// ── Phase 6 T62: persistent-cache write-through + last-known fallback ───
const SNAPSHOT_REUSE_MS = 30_000;   // T60 result-reuse window (matches CDN s-maxage)
const PERSIST_WRITE_THROTTLE_MS = 60_000; // max one DB write per key per minute
const PERSIST_TTL_MS = 24 * 60 * 60 * 1000;        // quote-class storage TTL
const PERSIST_TTL_BOND_MS = 7 * 24 * 60 * 60 * 1000; // daily-series class
const PERSIST_MAX_AGE_QUOTE_MS = PERSIST_TTL_MS;
const PERSIST_MAX_AGE_BOND_MS = PERSIST_TTL_BOND_MS;

const lastPersistAt: Record<string, number> = {};

/**
 * Phase 5.1 (T57): the honest unavailable entry. Two different timestamps
 * exist and must never be conflated:
 * - `lastUpdated: null` — there is NO observation, so there is NO observation
 *   time. Stamp "now" here would dress the absence of data up as a recent
 *   data point.
 * - `checkedAt: <now>` — the time the system DECIDED it had no observation
 *   (decision time, operationally useful, semantically distinct).
 */
export function unavailablePriceEntry(): {
  status: "UNAVAILABLE";
  lastUpdated: null;
  checkedAt: string;
} {
  return { status: "UNAVAILABLE", lastUpdated: null, checkedAt: new Date().toISOString() };
}

/** Write-through, storage-entitled only, throttled, never throws. */
async function persistIfEntitled(key: string, symbol: string, point: PricePoint): Promise<void> {
  if (!isPersistableSource(point.source)) return;
  const now = Date.now();
  if (now - (lastPersistAt[key] ?? 0) < PERSIST_WRITE_THROTTLE_MS) return;
  lastPersistAt[key] = now;
  const ttl = isBondSymbol(symbol) ? PERSIST_TTL_BOND_MS : PERSIST_TTL_MS;
  await persistentCacheSet(
    key,
    point.source,
    { price: point.price, change: point.change },
    ttl,
    point.observedAt ?? new Date().toISOString(),
  );
}

/**
 * T62 fallback: total upstream failure -> serve the last legitimately
 * persisted observation (storage-entitled sources only) as CACHED with its
 * original observedAt; else null so callers report honest UNAVAILABLE.
 */
async function lastKnownObservation(symbol: string): Promise<(PricePoint & { lastUpdated: string }) | null> {
  const persisted = await persistentCacheGet<{ price: number; change: number }>(`quote:${symbol}`);
  if (!persisted) return null;
  const maxAge = isBondSymbol(symbol) ? PERSIST_MAX_AGE_BOND_MS : PERSIST_MAX_AGE_QUOTE_MS;
  const observedMs = Date.parse(persisted.observedAt);
  if (!Number.isFinite(observedMs) || Date.now() - observedMs > maxAge) return null;
  const payload = persisted.payload;
  if (!payload || !Number.isFinite(payload.price) || payload.price <= 0) return null;
  return {
    price: payload.price,
    change: Number.isFinite(payload.change) ? payload.change : 0,
    source: persisted.providerId,
    status: "CACHED",
    observedAt: persisted.observedAt,
    lastUpdated: persisted.observedAt,
  };
}

export async function fetchLivePrice(
  symbol: string
): Promise<(PricePoint & { lastUpdated: string }) | null> {
  symbol = STOCK_ALIASES[symbol] ?? symbol;

  // T60: reuse a recent snapshot — one observation serves sequential widget
  // polls within the reuse window. The replay is honestly labelled CACHED
  // and keeps the ORIGINAL observation timestamp as lastUpdated.
  const reused = getCachedResult<PricePoint>(`quote:${symbol}`, SNAPSHOT_REUSE_MS);
  if (reused && Number.isFinite(reused.price) && reused.price > 0) {
    // A LIVE observation replayed from the reuse store becomes CACHED;
    // STATIC/DERIVED semantics are intrinsic and must survive the replay.
    const replayStatus: PriceStatus =
      reused.status && reused.status !== "LIVE" ? reused.status : "CACHED";
    return { ...reused, status: replayStatus, lastUpdated: reused.observedAt ?? new Date().toISOString() };
  }

  // T46: concurrent identical requests share one upstream pass.
  const result = await coalesce(`liveprice:${symbol}`, () => fetchLivePriceInner(symbol));

  // T57: the fallback is UNAVAILABLE — never a seed placeholder, never
  // zeros dressed up as a quote. T62 refines it: before reporting
  // unavailability, try the last legitimately persisted observation.
  if (!result || !Number.isFinite(result.price) || result.price <= 0) {
    return await lastKnownObservation(symbol);
  }

  putCachedResult(`quote:${symbol}`, result);
  // T62 write-through (throttled; awaited so a serverless freeze cannot
  // silently drop the write; bounded by the cache layer's 1.5 s budget).
  await persistIfEntitled(`quote:${symbol}`, symbol, result);

  return { ...result, lastUpdated: result.observedAt ?? new Date().toISOString() };
}
