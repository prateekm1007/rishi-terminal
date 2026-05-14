const crypto = {
  symbol: 'BTC',
  name: 'Bitcoin',
  price: 98500,
  change24h: 2.45,
  marketCap: 1950000000000,
  volume24h: 45000000000,
  change7d: 8.2,
  rsi: 62,
  macd: 'BULLISH',
  moving200d: 85000,
  fromAth: -15.2,
  sector: 'Store of Value'
};

// Simulate adapter
const adapted = {
  symbol: crypto.symbol,
  name: crypto.name,
  category: 'crypto',
  price: crypto.price,
  change24h: crypto.change24h,
  metadata: crypto
};

console.log('Adapted:', JSON.stringify(adapted, null, 2));
console.log('Metadata exists?', adapted.metadata !== undefined);
console.log('Metadata has RSI?', adapted.metadata.rsi !== undefined);