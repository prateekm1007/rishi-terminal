import type { UniversalAsset } from '../types/asset';
import { CryptoAsset } from '../../data/crypto';

export function adaptCrypto(crypto: CryptoAsset): UniversalAsset {
  return {
    symbol: crypto.symbol,
    name: crypto.name,
    category: 'crypto',
    price: crypto.price,
    change24h: crypto.change24h,
    metadata: {
      marketCap: crypto.marketCap,
      volume24h: crypto.volume24h,
      circulatingSupply: (crypto as any).circulatingSupply,
      maxSupply: (crypto as any).maxSupply,
      sector: crypto.sector,
      description: (crypto as any).description,
      // Technical data
      rsi: crypto.rsi,
      macd: crypto.macd,
      moving200d: crypto.moving200d,
      fromAth: crypto.fromAth,
      change7d: crypto.change7d
    }
  };
}