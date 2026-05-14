import type { UniversalAsset } from '../types/asset';
import { CryptoAsset } from '../../data/crypto';

export function adaptCrypto(crypto: CryptoAsset): UniversalAsset {
  return {
    symbol: crypto.symbol,
    name: crypto.name,
    category: 'crypto',
    price: crypto.price,
    change24h: crypto.change24h,
    metadata: crypto
  };
}