export interface Bond {
  symbol: string;
  name: string;
  type: 'G-Sec' | 'SDL' | 'Corporate' | 'T-Bill' | 'US-Treasury';
  country: string;
  maturityYears: number;
  maturityDate: string;
  coupon: number;
  ytm: number;
  price: number;
  duration: number;
  riskRating: string;
}

export const BONDS: Bond[] = [
  // Indian G-Secs
  { symbol: 'IN6YS', name: 'India 6Y G-Sec', type: 'G-Sec', country: 'India', maturityYears: 6, maturityDate: '2032-01-15', coupon: 6.80, ytm: 6.95, price: 99.50, duration: 5.2, riskRating: 'AAA' },
  { symbol: 'IN10YS', name: 'India 10Y G-Sec', type: 'G-Sec', country: 'India', maturityYears: 10, maturityDate: '2036-04-15', coupon: 7.10, ytm: 7.08, price: 101.20, duration: 8.5, riskRating: 'AAA' },
  { symbol: 'IN15YS', name: 'India 15Y G-Sec', type: 'G-Sec', country: 'India', maturityYears: 15, maturityDate: '2041-06-15', coupon: 7.25, ytm: 7.18, price: 102.10, duration: 12.8, riskRating: 'AAA' },
  { symbol: 'IN2YS', name: 'India 2Y G-Sec', type: 'G-Sec', country: 'India', maturityYears: 2, maturityDate: '2028-01-15', coupon: 6.50, ytm: 6.94, price: 98.80, duration: 1.9, riskRating: 'AAA' },

  // Indian State Development Loans (SDLs)
  { symbol: 'MAHARASHTRA_SDL', name: 'Maharashtra SDL 10Y', type: 'SDL', country: 'India', maturityYears: 10, maturityDate: '2036-03-20', coupon: 7.45, ytm: 7.52, price: 98.50, duration: 8.2, riskRating: 'AA+' },
  { symbol: 'KARNATAKA_SDL', name: 'Karnataka SDL 10Y', type: 'SDL', country: 'India', maturityYears: 10, maturityDate: '2036-04-15', coupon: 7.40, ytm: 7.48, price: 98.70, duration: 8.3, riskRating: 'AA' },
  { symbol: 'TAMIL_NADU_SDL', name: 'Tamil Nadu SDL 10Y', type: 'SDL', country: 'India', maturityYears: 10, maturityDate: '2036-05-10', coupon: 7.35, ytm: 7.45, price: 99.00, duration: 8.1, riskRating: 'AA+' },

  // Corporate Bonds
  { symbol: 'RELIANCE_CORP', name: 'Reliance Corporate Bond 10Y', type: 'Corporate', country: 'India', maturityYears: 10, maturityDate: '2036-02-28', coupon: 8.25, ytm: 8.35, price: 97.80, duration: 7.9, riskRating: 'AA' },
  { symbol: 'HDFC_CORP', name: 'HDFC Bank Corporate Bond 10Y', type: 'Corporate', country: 'India', maturityYears: 10, maturityDate: '2036-03-15', coupon: 7.95, ytm: 8.05, price: 98.50, duration: 8.0, riskRating: 'AA+' },
  { symbol: 'INFOSYS_CORP', name: 'Infosys Corporate Bond 7Y', type: 'Corporate', country: 'India', maturityYears: 7, maturityDate: '2033-01-20', coupon: 7.50, ytm: 7.60, price: 99.20, duration: 6.2, riskRating: 'AA+' },

  // US Treasuries
  { symbol: 'US2Y', name: 'US Treasury 2Y', type: 'US-Treasury', country: 'USA', maturityYears: 2, maturityDate: '2028-01-15', coupon: 4.35, ytm: 4.42, price: 100.50, duration: 1.95, riskRating: 'AAA' },
  { symbol: 'US5Y', name: 'US Treasury 5Y', type: 'US-Treasury', country: 'USA', maturityYears: 5, maturityDate: '2031-01-15', coupon: 4.10, ytm: 4.28, price: 101.20, duration: 4.65, riskRating: 'AAA' },
  { symbol: 'US10Y', name: 'US Treasury 10Y', type: 'US-Treasury', country: 'USA', maturityYears: 10, maturityDate: '2036-01-15', coupon: 4.15, ytm: 4.42, price: 101.80, duration: 9.20, riskRating: 'AAA' },
  { symbol: 'US30Y', name: 'US Treasury 30Y', type: 'US-Treasury', country: 'USA', maturityYears: 30, maturityDate: '2056-01-15', coupon: 4.45, ytm: 4.68, price: 102.50, duration: 20.50, riskRating: 'AAA' },

  // T-Bills
  { symbol: 'IN91DTB', name: 'India T-Bill 91D', type: 'T-Bill', country: 'India', maturityYears: 0.25, maturityDate: '2026-08-15', coupon: 0, ytm: 6.80, price: 98.35, duration: 0.25, riskRating: 'AAA' },
  { symbol: 'IN182DTB', name: 'India T-Bill 182D', type: 'T-Bill', country: 'India', maturityYears: 0.5, maturityDate: '2026-11-15', coupon: 0, ytm: 6.85, price: 96.82, duration: 0.5, riskRating: 'AAA' },
  { symbol: 'US3MTB', name: 'US T-Bill 3M', type: 'T-Bill', country: 'USA', maturityYears: 0.25, maturityDate: '2026-08-15', coupon: 0, ytm: 5.25, price: 98.70, duration: 0.25, riskRating: 'AAA' },
];