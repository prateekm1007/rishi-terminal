export interface CryptoAsset {
  symbol: string;
  name: string;
  emoji: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  dominance: number;
  rsi: number;
  macd: string;
  moving200d: number;
  ath: number;
  fromAth: number;
  sector: string;
}

export const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol:'BTC', name:'Bitcoin', emoji:'₿', price:98500, change24h:2.45, change7d:8.32, marketCap:1950000000000, volume24h:42000000000, dominance:52.3, rsi:68, macd:'BULLISH', moving200d:89200, ath:108000, fromAth:-8.8, sector:'Store of Value' },
  { symbol:'ETH', name:'Ethereum', emoji:'Ξ', price:3650, change24h:1.82, change7d:5.21, marketCap:438000000000, volume24h:18500000000, dominance:16.8, rsi:65, macd:'BULLISH', moving200d:3420, ath:4878, fromAth:-25.2, sector:'Smart Contract' },
  { symbol:'BNB', name:'BNB', emoji:'🔶', price:625, change24h:0.95, change7d:3.12, marketCap:92000000000, volume24h:2100000000, dominance:3.5, rsi:58, macd:'NEUTRAL', moving200d:588, ath:788, fromAth:-20.7, sector:'Exchange Token' },
  { symbol:'SOL', name:'Solana', emoji:'◎', price:245, change24h:3.21, change7d:12.45, marketCap:85000000000, volume24h:4200000000, dominance:3.2, rsi:72, macd:'BULLISH', moving200d:195, ath:260, fromAth:-5.8, sector:'Smart Contract' },
  { symbol:'XRP', name:'Ripple', emoji:'✕', price:2.85, change24h:-1.23, change7d:2.15, marketCap:155000000000, volume24h:8500000000, dominance:5.9, rsi:52, macd:'NEUTRAL', moving200d:2.42, ath:3.84, fromAth:-25.8, sector:'Payments' },
  { symbol:'ADA', name:'Cardano', emoji:'₳', price:1.12, change24h:0.45, change7d:1.82, marketCap:42000000000, volume24h:1200000000, dominance:1.6, rsi:50, macd:'BEARISH', moving200d:1.05, ath:3.10, fromAth:-63.9, sector:'Smart Contract' },
  { symbol:'DOGE', name:'Dogecoin', emoji:'Ð', price:0.42, change24h:2.15, change7d:15.32, marketCap:62000000000, volume24h:2800000000, dominance:2.4, rsi:75, macd:'BULLISH', moving200d:0.28, ath:0.74, fromAth:-43.2, sector:'Meme' },
  { symbol:'AVAX', name:'Avalanche', emoji:'🔺', price:45.20, change24h:-0.82, change7d:4.21, marketCap:18000000000, volume24h:850000000, dominance:0.7, rsi:48, macd:'NEUTRAL', moving200d:42.15, ath:146, fromAth:-69.0, sector:'Smart Contract' },
  { symbol:'MATIC', name:'Polygon', emoji:'⬟', price:0.98, change24h:1.32, change7d:5.84, marketCap:12000000000, volume24h:450000000, dominance:0.5, rsi:61, macd:'BULLISH', moving200d:0.85, ath:2.92, fromAth:-66.4, sector:'Layer 2' },
  { symbol:'LTC', name:'Litecoin', emoji:'Ł', price:215, change24h:-0.52, change7d:2.15, marketCap:38000000000, volume24h:1200000000, dominance:1.5, rsi:45, macd:'BEARISH', moving200d:198, ath:412, fromAth:-47.8, sector:'Payments' },
  { symbol:'DOT', name:'Polkadot', emoji:'●', price:10.85, change24h:1.12, change7d:6.32, marketCap:16000000000, volume24h:620000000, dominance:0.6, rsi:55, macd:'NEUTRAL', moving200d:9.80, ath:55, fromAth:-80.3, sector:'Interoperability' },
  { symbol:'LINK', name:'Chainlink', emoji:'⬡', price:18.50, change24h:2.85, change7d:9.45, marketCap:11000000000, volume24h:480000000, dominance:0.4, rsi:63, macd:'BULLISH', moving200d:16.20, ath:52.88, fromAth:-65.0, sector:'Oracle' },
];

export const FEAR_GREED_INDEX = {
  value: 72,
  label: 'EXTREME GREED',
  previousDay: 68,
  previousWeek: 45,
  previousMonth: 62,
};

export const MARKET_DOMINANCE = {
  btc: 52.3,
  eth: 16.8,
  bnb: 3.5,
  others: 27.4,
};

export function getCryptoMetrics() {
  const totalMarketCap = CRYPTO_ASSETS.reduce((s, c) => s + c.marketCap, 0);
  const totalVolume = CRYPTO_ASSETS.reduce((s, c) => s + c.volume24h, 0);
  const avgChange24h = CRYPTO_ASSETS.reduce((s, c) => s + c.change24h, 0) / CRYPTO_ASSETS.length;
  const avgRSI = Math.round(CRYPTO_ASSETS.reduce((s, c) => s + c.rsi, 0) / CRYPTO_ASSETS.length);
  const bullish = CRYPTO_ASSETS.filter(c => c.macd === 'BULLISH').length;
  const bearish = CRYPTO_ASSETS.filter(c => c.macd === 'BEARISH').length;
  const neutral = CRYPTO_ASSETS.filter(c => c.macd === 'NEUTRAL').length;
  const sentiment = bullish >= 6 ? 'BULLISH' : bearish >= 6 ? 'BEARISH' : 'NEUTRAL';
  const gainers = CRYPTO_ASSETS.filter(c => c.change24h > 0).length;
  const losers = CRYPTO_ASSETS.filter(c => c.change24h < 0).length;
  return { totalMarketCap, totalVolume, avgChange24h, avgRSI, bullish, bearish, neutral, sentiment, gainers, losers };
}