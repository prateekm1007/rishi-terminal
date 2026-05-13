import type { UniversalAsset } from "../types/asset";

export function adaptBond(bond: any): UniversalAsset {
  return {
    symbol:    bond.symbol,
    name:      bond.name,
    category:  'bond',
    price:     bond.ytm ?? bond.price ?? 0,
    change24h: bond.change24h ?? 0,
    sector:    bond.type,
    exchange:  bond.country ?? 'India',
    metadata:  bond,
  };
}