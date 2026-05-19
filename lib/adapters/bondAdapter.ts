import type { UniversalAsset } from "@/lib/types/asset";

export interface Bond {
  symbol:       string;
  name:         string;
  issuer:       string;
  type:         "G-Sec" | "SDL" | "Corporate" | "T-Bill" | "US-Treasury";
  country:      string;
  maturityYears: number;
  maturityDate: string;
  coupon:       number;
  couponRate:   number;
  ytm:          number;
  price:        number;
  duration:     number;
  riskRating:   string;
  rating:       string;
  spread:       number;
}

export function adaptBond(bond: Bond): UniversalAsset {
  return {
    symbol:    bond.symbol,
    name:      bond.name,
    category:  "bond",
    // In bonds, we treat "price" in UI as YTM (yield)
    price:     bond.ytm,
    change24h: 0,
    metadata: {
      // IMPORTANT: consensus engine expects these
      symbol:    bond.symbol,
      price:     bond.ytm,
      change24h: 0,

      issuer:       bond.issuer,
      type:         bond.type,
      country:      bond.country,
      maturityYears: bond.maturityYears,
      maturityDate: bond.maturityDate,
      coupon:       bond.coupon,
      couponRate:   bond.couponRate,
      ytm:          bond.ytm,
      marketPrice:  bond.price,
      duration:     bond.duration,
      riskRating:   bond.riskRating,
      rating:       bond.rating,
      spread:       bond.spread,
    },
  };
}