export interface UniversalAsset {
  // Core identity
  symbol:    string;
  name:      string;
  category:  'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';

  // Core pricing
  price:     number;
  change24h: number;

  // Optional display fields
  // (present on some asset types, accessed via optional chaining)
  sector?:    string;
  exchange?:  string;

  // Convenience fields used by assetContext + adapters
  marketCap?:  number;
  volume24h?:  number;
  volatility?: number;

  // All asset-class-specific data lives here
  metadata?: Record<string, any>;
}