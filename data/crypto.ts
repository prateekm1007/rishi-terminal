export interface CryptoAsset {
  symbol: string;
  name: string;
  emoji: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  rsi: number;
  macd: string;
  moving200d: number;
  fromAth: number;
  sector: string;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: 'BTC', name: 'Bitcoin', emoji: '₿', price: 98500, marketCap: 1950000000000, volume24h: 45000000000, change24h: 2.45, change7d: 8.2, rsi: 62, macd: 'BULLISH', moving200d: 85000, fromAth: -15.2, sector: 'Store of Value' },
  { symbol: 'ETH', name: 'Ethereum', emoji: '⟠', price: 3850, marketCap: 465000000000, volume24h: 22000000000, change24h: 3.1, change7d: 10.5, rsi: 65, macd: 'BULLISH', moving200d: 3200, fromAth: -18.5, sector: 'Smart Contract Platform' },
  { symbol: 'BNB', name: 'Binance Coin', emoji: '🔶', price: 685, marketCap: 98000000000, volume24h: 2800000000, change24h: 1.8, change7d: 5.2, rsi: 58, macd: 'NEUTRAL', moving200d: 580, fromAth: -25.3, sector: 'Exchange Token' },
  { symbol: 'SOL', name: 'Solana', emoji: '◎', price: 245, marketCap: 118000000000, volume24h: 8500000000, change24h: 5.2, change7d: 15.8, rsi: 72, macd: 'BULLISH', moving200d: 180, fromAth: -35.2, sector: 'Smart Contract Platform' },
  { symbol: 'ADA', name: 'Cardano', emoji: '₳', price: 1.15, marketCap: 41000000000, volume24h: 1200000000, change24h: -0.5, change7d: 3.2, rsi: 52, macd: 'NEUTRAL', moving200d: 0.95, fromAth: -62.5, sector: 'Smart Contract Platform' },
  { symbol: 'AVAX', name: 'Avalanche', emoji: '🔺', price: 42, marketCap: 17000000000, volume24h: 850000000, change24h: 2.8, change7d: 12.5, rsi: 68, macd: 'BULLISH', moving200d: 32, fromAth: -48.2, sector: 'Smart Contract Platform' },
  { symbol: 'DOT', name: 'Polkadot', emoji: '⬤', price: 9.8, marketCap: 14500000000, volume24h: 420000000, change24h: 1.2, change7d: 6.5, rsi: 55, macd: 'NEUTRAL', moving200d: 8.5, fromAth: -78.5, sector: 'Interoperability' },
  // Round-5 audit (finding 15): MATIC rebranded to POL (Sep 2024);
  // MKR rebranded to SKY (Sky, formerly MakerDAO). Live layer uses the
  // current CoinGecko ids (polygon-ecosystem-token, sky) — verified.
  { symbol: 'POL', name: 'Polygon', emoji: '⬡', price: 0.107, marketCap: 8800000000, volume24h: 580000000, change24h: 3.5, change7d: 18.2, rsi: 70, macd: 'BULLISH', moving200d: 0.72, fromAth: -65.8, sector: 'Layer 2' },
  { symbol: 'LINK', name: 'Chainlink', emoji: '🔗', price: 28.5, marketCap: 18000000000, volume24h: 950000000, change24h: 2.1, change7d: 9.8, rsi: 61, macd: 'BULLISH', moving200d: 22, fromAth: -42.5, sector: 'Oracle' },
  { symbol: 'UNI', name: 'Uniswap', emoji: '🦄', price: 15.2, marketCap: 11500000000, volume24h: 380000000, change24h: 1.5, change7d: 7.2, rsi: 59, macd: 'NEUTRAL', moving200d: 12.8, fromAth: -55.2, sector: 'DeFi' },
  { symbol: 'AAVE', name: 'Aave', emoji: '👻', price: 285, marketCap: 4200000000, volume24h: 320000000, change24h: 4.2, change7d: 14.5, rsi: 66, macd: 'BULLISH', moving200d: 220, fromAth: -38.5, sector: 'DeFi' },
  { symbol: 'SKY', name: 'Sky (formerly Maker)', emoji: '🏦', price: 0.084, marketCap: 2650000000, volume24h: 180000000, change24h: 2.8, change7d: 10.2, rsi: 63, macd: 'BULLISH', moving200d: 2400, fromAth: -45.2, sector: 'DeFi' },
];

export const FEAR_GREED_INDEX = {
  value: 68,
  label: 'Greed',
  previousDay: 65,
  previousWeek: 58,
  previousMonth: 52,
};

// ── Market dominance — DERIVED from the caps, never typed ─────────────────
// CRYPTO-DOM (founder direction 5a, 2026-10-10): the typed 58.2
// contradicted the dataset's own caps ($1.95T BTC / $2.74865T total =
// 70.96% at 1 dp; the founder's 70.9 used the rounded $2.75T total).
// One source of truth (C4): the caps. The derivation is pinned by
// test/crypto.dominance.test.ts, whose source scan fails on any
// numeric dominance literal in this file.
const TOTAL_MARKET_CAP = CRYPTO_ASSETS.reduce((sum, c) => sum + c.marketCap, 0);

const capOf = (symbol: string) =>
  CRYPTO_ASSETS.find((c) => c.symbol === symbol)?.marketCap ?? 0;

/** An asset's share of the dataset's total market cap, in % at 1 dp. */
export function assetDominance(symbol: string): number {
  return Math.round((capOf(symbol) / TOTAL_MARKET_CAP) * 1000) / 10;
}

export const MARKET_DOMINANCE = {
  btc: assetDominance('BTC'),
  eth: assetDominance('ETH'),
  bnb: assetDominance('BNB'),
  others: Math.round(
    ((TOTAL_MARKET_CAP - capOf('BTC') - capOf('ETH') - capOf('BNB')) /
      TOTAL_MARKET_CAP) *
      1000,
  ) / 10,
};

export function getCryptoMetrics() {
  const totalMarketCap = TOTAL_MARKET_CAP;
  const totalVolume = CRYPTO_ASSETS.reduce((sum, c) => sum + c.volume24h, 0);
  const avgChange24h = CRYPTO_ASSETS.reduce((sum, c) => sum + c.change24h, 0) / CRYPTO_ASSETS.length;
  const avgRSI = Math.round(CRYPTO_ASSETS.reduce((sum, c) => sum + c.rsi, 0) / CRYPTO_ASSETS.length);
  const gainers = CRYPTO_ASSETS.filter(c => c.change24h > 0).length;
  const losers = CRYPTO_ASSETS.filter(c => c.change24h < 0).length;
  const sentiment = avgRSI >= 60 ? 'BULLISH' : avgRSI >= 40 ? 'NEUTRAL' : 'BEARISH';
  
  return { totalMarketCap, totalVolume, avgChange24h, avgRSI, gainers, losers, sentiment };
}

// ── Crypto-Native On-Chain Metrics ──────────────────────────────────────────
export interface CryptoOnChain {
  dominance?: number;        // % of total crypto market cap
  fundingRate?: number;      // 8h perpetual funding rate (%)
  openInterest?: number;     // futures open interest ($B)
  exchangeNetflow?: number;  // 7d net exchange flow (K coins; negative = outflow = bullish)
  mvrv?: number;             // Market Value / Realized Value ratio
  tvl?: number;              // DeFi Total Value Locked ($B)
  activeAddresses?: number;  // daily active addresses (thousands)
}

// On-chain dominance is DERIVED from the caps (CRYPTO-DOM) — the same
// single source of truth as MARKET_DOMINANCE; every other field here is
// the static reference dataset it always was (honestly labeled at the
// rendering sites).
export const CRYPTO_ONCHAIN: Record<string, CryptoOnChain> = {
  BTC:   { dominance: assetDominance('BTC'), fundingRate: 0.012, openInterest: 32.5, exchangeNetflow: -42.0, mvrv: 2.1, activeAddresses: 950 },
  ETH:   { dominance: assetDominance('ETH'), fundingRate: 0.009, openInterest: 14.2, exchangeNetflow: -180.0, mvrv: 1.6, tvl: 58.0, activeAddresses: 480 },
  BNB:   { dominance: assetDominance('BNB'), fundingRate: 0.005, openInterest: 0.9,  exchangeNetflow: 12.0,  mvrv: 1.4, tvl: 5.2,  activeAddresses: 210 },
  SOL:   { dominance: assetDominance('SOL'), fundingRate: 0.021, openInterest: 3.8,  exchangeNetflow: -310.0, mvrv: 2.8, tvl: 9.5,  activeAddresses: 1250 },
  ADA:   { dominance: assetDominance('ADA'), fundingRate: 0.004, openInterest: 0.5,  exchangeNetflow: 45.0,  mvrv: 1.1, tvl: 0.4,  activeAddresses: 65 },
  AVAX:  { dominance: assetDominance('AVAX'), fundingRate: 0.015, openInterest: 0.6,  exchangeNetflow: -22.0, mvrv: 1.3, tvl: 1.3,  activeAddresses: 48 },
  DOT:   { dominance: assetDominance('DOT'), fundingRate: 0.002, openInterest: 0.3,  exchangeNetflow: 18.0,  mvrv: 0.9, tvl: 0.2,  activeAddresses: 32 },
  POL:   { dominance: assetDominance('POL'), fundingRate: 0.011, openInterest: 0.4,  exchangeNetflow: -65.0, mvrv: 1.2, tvl: 0.9,  activeAddresses: 410 },
  LINK:  { dominance: assetDominance('LINK'), fundingRate: 0.008, openInterest: 0.7,  exchangeNetflow: -15.0, mvrv: 1.5, tvl: 0.6,  activeAddresses: 38 },
  UNI:   { dominance: assetDominance('UNI'), fundingRate: 0.006, openInterest: 0.3,  exchangeNetflow: 8.0,   mvrv: 1.2, tvl: 4.8,  activeAddresses: 22 },
  AAVE:  { dominance: assetDominance('AAVE'), fundingRate: 0.014, openInterest: 0.25, exchangeNetflow: -4.5,  mvrv: 1.7, tvl: 11.2, activeAddresses: 9 },
  SKY:   { dominance: assetDominance('SKY'), fundingRate: 0.007, openInterest: 0.1,  exchangeNetflow: -1.2,  mvrv: 1.4, tvl: 5.4,  activeAddresses: 4 },
};