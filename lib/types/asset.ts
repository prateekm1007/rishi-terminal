export interface UniversalAsset {
  // Core identity
  symbol:    string;
  name:      string;
  category:  'stock' | 'crypto' | 'forex' | 'commodity' | 'bond';

  // Core pricing
  price:     number;
  /** Commit L3 (§9): null is a real state — an unobserved 24h change is
   *  unavailability, NEVER a 0.00% fill (rule 16). Consumers must handle
   *  null explicitly. */
  change24h: number | null;

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