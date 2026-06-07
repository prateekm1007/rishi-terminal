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
  { symbol: 'MATIC', name: 'Polygon', emoji: '⬡', price: 0.88, marketCap: 8800000000, volume24h: 580000000, change24h: 3.5, change7d: 18.2, rsi: 70, macd: 'BULLISH', moving200d: 0.72, fromAth: -65.8, sector: 'Layer 2' },
  { symbol: 'LINK', name: 'Chainlink', emoji: '🔗', price: 28.5, marketCap: 18000000000, volume24h: 950000000, change24h: 2.1, change7d: 9.8, rsi: 61, macd: 'BULLISH', moving200d: 22, fromAth: -42.5, sector: 'Oracle' },
  { symbol: 'UNI', name: 'Uniswap', emoji: '🦄', price: 15.2, marketCap: 11500000000, volume24h: 380000000, change24h: 1.5, change7d: 7.2, rsi: 59, macd: 'NEUTRAL', moving200d: 12.8, fromAth: -55.2, sector: 'DeFi' },
  { symbol: 'AAVE', name: 'Aave', emoji: '👻', price: 285, marketCap: 4200000000, volume24h: 320000000, change24h: 4.2, change7d: 14.5, rsi: 66, macd: 'BULLISH', moving200d: 220, fromAth: -38.5, sector: 'DeFi' },
  { symbol: 'MKR', name: 'Maker', emoji: '🏦', price: 2850, marketCap: 2650000000, volume24h: 180000000, change24h: 2.8, change7d: 10.2, rsi: 63, macd: 'BULLISH', moving200d: 2400, fromAth: -45.2, sector: 'DeFi' },
];

export const FEAR_GREED_INDEX = {
  value: 68,
  label: 'Greed',
  previousDay: 65,
  previousWeek: 58,
  previousMonth: 52,
};

export const MARKET_DOMINANCE = {
  btc: 58.2,
  eth: 18.5,
  bnb: 3.8,
  others: 19.5,
};

export function getCryptoMetrics() {
  const totalMarketCap = CRYPTO_ASSETS.reduce((sum, c) => sum + c.marketCap, 0);
  const totalVolume = CRYPTO_ASSETS.reduce((sum, c) => sum + c.volume24h, 0);
  const avgChange24h = CRYPTO_ASSETS.reduce((sum, c) => sum + c.change24h, 0) / CRYPTO_ASSETS.length;
  const avgRSI = Math.round(CRYPTO_ASSETS.reduce((sum, c) => sum + c.rsi, 0) / CRYPTO_ASSETS.length);
  const gainers = CRYPTO_ASSETS.filter(c => c.change24h > 0).length;
  const losers = CRYPTO_ASSETS.filter(c => c.change24h < 0).length;
  const sentiment = avgRSI >= 60 ? 'BULLISH' : avgRSI >= 40 ? 'NEUTRAL' : 'BEARISH';
  
  return { totalMarketCap, totalVolume, avgChange24h, avgRSI, gainers, losers, sentiment };
}