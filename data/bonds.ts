export interface Bond {
  symbol:      string;
  name:        string;
  issuer:      string;
  type:        'G-Sec' | 'SDL' | 'Corporate' | 'T-Bill' | 'US-Treasury';
  country:     string;
  maturityYears: number;
  maturityDate:  string;
  coupon:      number;
  couponRate:  number;
  ytm:         number;
  price:       number;
  duration:    number;
  riskRating:  string;
  rating:      string;
  spread:      number;
}

export const BONDS: Bond[] = [
  // FD-15 (founder order 2026-10-11): the numeric fields below (ytm, price,
  // duration, spread) and the rating/riskRating markers are the STATIC
  // REFERENCE dataset that feeds the FD-12 heuristic scorers and the detail
  // pages — they are UNVERIFIED and never render as data on the bonds list
  // page. The list page renders value/unit/source/as-of/state through the
  // sourced-rows contract; unsourced values render "—". Ratings have no
  // cleared source (SOV marks a sovereign obligation, not a CRA rating;
  // corporate AA/AA+ are illustrative) — the page's rating column shows "—".
  { symbol: 'IN6YS',           name: 'India 6Y G-Sec',                  issuer: 'Govt of India',     type: 'G-Sec',        country: 'India', maturityYears: 6,    maturityDate: '2032-01-15', coupon: 6.80, couponRate: 6.80, ytm: 6.95, price: 99.50,  duration: 5.2,  riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'IN10YS',          name: 'India 10Y G-Sec',                 issuer: 'Govt of India',     type: 'G-Sec',        country: 'India', maturityYears: 10,   maturityDate: '2036-04-15', coupon: 7.10, couponRate: 7.10, ytm: 7.08, price: 101.20, duration: 8.5,  riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'IN15YS',          name: 'India 15Y G-Sec',                 issuer: 'Govt of India',     type: 'G-Sec',        country: 'India', maturityYears: 15,   maturityDate: '2041-06-15', coupon: 7.25, couponRate: 7.25, ytm: 7.18, price: 102.10, duration: 12.8, riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'IN2YS',           name: 'India 2Y G-Sec',                  issuer: 'Govt of India',     type: 'G-Sec',        country: 'India', maturityYears: 2,    maturityDate: '2028-01-15', coupon: 6.50, couponRate: 6.50, ytm: 6.94, price: 98.80,  duration: 1.9,  riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'MAHARASHTRA_SDL', name: 'Maharashtra SDL 10Y',             issuer: 'Govt of Maharashtra', type: 'SDL',        country: 'India', maturityYears: 10,   maturityDate: '2036-03-20', coupon: 7.45, couponRate: 7.45, ytm: 7.52, price: 98.50,  duration: 8.2,  riskRating: 'SOV', rating: 'SOV', spread: 44  },
  { symbol: 'KARNATAKA_SDL',   name: 'Karnataka SDL 10Y',               issuer: 'Govt of Karnataka', type: 'SDL',        country: 'India', maturityYears: 10,   maturityDate: '2036-04-15', coupon: 7.40, couponRate: 7.40, ytm: 7.48, price: 98.70,  duration: 8.3,  riskRating: 'SOV',  rating: 'SOV',  spread: 40  },
  { symbol: 'TAMIL_NADU_SDL',  name: 'Tamil Nadu SDL 10Y',              issuer: 'Govt of Tamil Nadu', type: 'SDL',        country: 'India', maturityYears: 10,   maturityDate: '2036-05-10', coupon: 7.35, couponRate: 7.35, ytm: 7.45, price: 99.00,  duration: 8.1,  riskRating: 'SOV', rating: 'SOV', spread: 37  },
  { symbol: 'RELIANCE_CORP',   name: 'Reliance Corporate Bond 10Y',     issuer: 'Reliance Industries', type: 'Corporate', country: 'India', maturityYears: 10,   maturityDate: '2036-02-28', coupon: 8.25, couponRate: 8.25, ytm: 8.35, price: 97.80,  duration: 7.9,  riskRating: 'AA',  rating: 'AA',  spread: 127 },
  { symbol: 'HDFC_CORP',       name: 'HDFC Bank Corporate Bond 10Y',    issuer: 'HDFC Bank',         type: 'Corporate',  country: 'India', maturityYears: 10,   maturityDate: '2036-03-15', coupon: 7.95, couponRate: 7.95, ytm: 8.05, price: 98.50,  duration: 8.0,  riskRating: 'AA+', rating: 'AA+', spread: 97  },
  { symbol: 'TATACAP_CORP',   name: 'Tata Capital NCD 7Y',             issuer: 'Tata Capital Financial Services',       type: 'Corporate',  country: 'India', maturityYears: 7,    maturityDate: '2033-01-20', coupon: 7.50, couponRate: 7.50, ytm: 7.60, price: 99.20,  duration: 6.2,  riskRating: 'AA+', rating: 'AA+', spread: 52  },
  { symbol: 'US2Y',            name: 'US Treasury 2Y',                  issuer: 'US Treasury',       type: 'US-Treasury', country: 'USA', maturityYears: 2,    maturityDate: '2028-01-15', coupon: 4.35, couponRate: 4.35, ytm: 4.42, price: 100.50, duration: 1.95, riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'US5Y',            name: 'US Treasury 5Y',                  issuer: 'US Treasury',       type: 'US-Treasury', country: 'USA', maturityYears: 5,    maturityDate: '2031-01-15', coupon: 4.10, couponRate: 4.10, ytm: 4.28, price: 101.20, duration: 4.65, riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'US10Y',           name: 'US Treasury 10Y',                 issuer: 'US Treasury',       type: 'US-Treasury', country: 'USA', maturityYears: 10,   maturityDate: '2036-01-15', coupon: 4.15, couponRate: 4.15, ytm: 4.42, price: 101.80, duration: 9.20, riskRating: 'SOV', rating: 'SOV', spread: 0   },
  { symbol: 'US30Y',           name: 'US Treasury 30Y',                 issuer: 'US Treasury',       type: 'US-Treasury', country: 'USA', maturityYears: 30,   maturityDate: '2056-01-15', coupon: 4.45, couponRate: 4.45, ytm: 4.68, price: 102.50, duration: 20.50, riskRating: 'SOV', rating: 'SOV', spread: 0  },
  // round5: IN91DTB removed — matured 2026-08-15
  { symbol: 'IN182DTB',        name: 'India T-Bill 182D',               issuer: 'Govt of India',     type: 'T-Bill',     country: 'India', maturityYears: 0.5,  maturityDate: '2026-11-15', coupon: 0,    couponRate: 0,    ytm: 6.85, price: 96.82,  duration: 0.5,  riskRating: 'SOV', rating: 'SOV', spread: 0   },
  // round5: US3MTB removed — matured 2026-08-15
];


export function getBondBySymbol(symbol: string): Bond | undefined {
  return BONDS.find(b => b?.symbol && symbol && b.symbol.toUpperCase() === symbol.toUpperCase());
}

// ── FD-15 (founder order 2026-10-11, item 3): the bonds page's source routing.
//
// "Bonds: take G-secs, T-bills and repo from RBI DBIE, the single macro
//  source named in the licensing review." G-secs, T-bills and the repo
//  rate are ROUTED to RBI DBIE — the values render "—" until the first
//  verified DBIE observation lands (sandbox egress to rbi.org.in answers
//  418 to non-browser clients; the licensing review records "first
//  fetches founder-side, no unverified loader ships" — rule 20). SDLs,
//  corporates and US rows have NO cleared source yet: "—" with
//  "no source until a source is cleared" (SDL inclusion under DBIE is a
//  founder call — flagged in the FD-15 PR thread).
export const BOND_ROW_SOURCE: Record<Bond['type'] | 'Repo', string | null> = {
  'G-Sec': 'RBI DBIE',
  'T-Bill': 'RBI DBIE',
  'Repo': 'RBI DBIE',
  'SDL': null,
  'Corporate': null,
  'US-Treasury': null,
};

/** The RBI policy repo rate — a POLICY RATE, not a tradable instrument:
 *  no detail page, no seed numbers, nothing but the DBIE routing. The
 *  bonds list page renders it with value "—" until DBIE wiring lands. */
export interface RepoRow {
  symbol: 'REPO';
  name: string;
  type: 'Repo';
}

export const REPO_ROW: RepoRow = {
  symbol: 'REPO',
  name: 'RBI Repo Rate (policy)',
  type: 'Repo',
};