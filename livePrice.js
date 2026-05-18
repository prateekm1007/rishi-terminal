// lib/livePrice.ts
// Universal live pricing â€” CoinGecko (crypto) + Yahoo Finance (stocks/commodities/forex)
import yahooFinance from 'yahoo-finance2';
// =============================================================================
// COINGECKO â€” Crypto ONLY (free, no auth)
// =============================================================================
const COINGECKO_IDS = {
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
const coinGeckoCache = {};
let lastCoinGeckoFetch = 0;
let coinGeckoFetchPromise = null;
async function fetchAllCoinGecko() {
    const now = Date.now();
    if (now - lastCoinGeckoFetch < 60000)
        return;
    if (coinGeckoFetchPromise)
        return coinGeckoFetchPromise;
    coinGeckoFetchPromise = (async () => {
        try {
            const ids = Object.values(COINGECKO_IDS).join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
            const res = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok)
                throw new Error(`CoinGecko HTTP ${res.status}`);
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
        }
        catch (err) {
            console.error('[CoinGecko] batch error:', err);
        }
        finally {
            coinGeckoFetchPromise = null;
        }
    })();
    return coinGeckoFetchPromise;
}
async function getCoinGeckoPrice(symbol) {
    await fetchAllCoinGecko();
    const cached = coinGeckoCache[symbol];
    return cached ? { price: cached.price, change: cached.change } : null;
}
// =============================================================================
// YAHOO FINANCE â€” Stocks (999 NSE/BSE) + Commodities + Forex + Indices
// =============================================================================
// Map internal symbols to Yahoo Finance symbols
export const YAHOO_SYMBOLS = {
    // Indices
    '^NSEI': '^NSEI',
    '^BSESN': '^BSESN',
    'NIFTY': '^NSEI',
    'SENSEX': '^BSESN',
    // Commodities (MCX symbols map to global equivalents)
    GOLD: 'GC=F',
    SILVER: 'SI=F',
    CRUDEOIL: 'CL=F',
    NATURALGAS: 'NG=F',
    COPPER: 'HG=F',
    ALUMINIUM: 'ALI=F',
    ZINC: 'ZNC=F',
    NICKEL: 'NKL=F',
    LEAD: 'LEAD=F',
    BRENTCRUDE: 'BZ=F',
    // Forex (Yahoo uses X=X format)
    'EUR/USD': 'EURUSD=X',
    'GBP/USD': 'GBPUSD=X',
    'USD/JPY': 'USDJPY=X',
    'USD/INR': 'USDINR=X',
    'AUD/USD': 'AUDUSD=X',
    'USD/CAD': 'USDCAD=X',
    'USD/CHF': 'USDCHF=X',
    'NZD/USD': 'NZDUSD=X',
    'EUR/GBP': 'EURGBP=X',
    'EUR/JPY': 'EURJPY=X',
};
// All 999 stocks default to .NS (NSE), fallback to .BO (BSE) if needed
// This function is called by /api/prices/batch route
async function getYahooPrice(symbol) {
    try {
        let yahooSym = YAHOO_SYMBOLS[symbol];
        // If not in mapping, assume it's an Indian stock
        if (!yahooSym) {
            yahooSym = `${symbol}.NS`; // Try NSE first
        }
        const quote = await yahooFinance.quote(yahooSym, {}, { validateResult: false });
        const quoteData = quote; // yahoo-finance2 v3 has overly strict types
        if (quoteData?.regularMarketPrice != null) {
            return {
                price: quoteData.regularMarketPrice,
                change: quoteData.regularMarketChangePercent ?? 0,
            };
        }
        // Try BSE fallback if NSE failed and symbol is Indian stock
        if (!YAHOO_SYMBOLS[symbol] && yahooSym.endsWith('.NS')) {
            const bseSym = `${symbol}.BO`;
            const bseQuote = await yahooFinance.quote(bseSym, {}, { validateResult: false });
            const bseData = bseQuote;
            if (bseData?.regularMarketPrice != null) {
                return {
                    price: bseData.regularMarketPrice,
                    change: bseData.regularMarketChangePercent ?? 0,
                };
            }
        }
        return null;
    }
    catch (err) {
        console.error(`[Yahoo] ${symbol} fetch error:`, err);
        return null;
    }
}
// =============================================================================
// BOND YIELDS (static data for now â€” no free API)
// =============================================================================
const BOND_YIELDS = {
    IN1YS: 6.8,
    IN2YS: 6.9,
    IN3YS: 7.0,
    IN5YS: 7.1,
    IN6YS: 7.15,
    IN10YS: 7.2,
    IN15YS: 7.25,
    IN20YS: 7.3,
    IN30YS: 7.35,
    IN4YS: 7.05,
    IN7YS: 7.18,
    IN8YS: 7.19,
    IN9YS: 7.21,
    IN11YS: 7.22,
    IN12YS: 7.23,
    IN14YS: 7.24,
    IN25YS: 7.32,
};
// =============================================================================
// UNIFIED EXPORT FUNCTION
// =============================================================================
export async function fetchLivePrice(symbol) {
    let priceData = null;
    // 1. Crypto (CoinGecko)
    if (COINGECKO_IDS[symbol]) {
        priceData = await getCoinGeckoPrice(symbol);
    }
    // 2. Bonds (static yields)
    else if (BOND_YIELDS[symbol]) {
        priceData = { price: BOND_YIELDS[symbol], change: 0 };
    }
    // 3. Everything else (stocks/commodities/forex via Yahoo)
    else {
        priceData = await getYahooPrice(symbol);
    }
    // Fallback to zero if all sources failed
    if (!priceData) {
        return {
            price: 0,
            change: 0,
            lastUpdated: new Date().toISOString(),
        };
    }
    return {
        price: priceData.price,
        change: priceData.change,
        lastUpdated: new Date().toISOString(),
    };
}
