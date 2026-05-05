export interface IndexData {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  pe?: number;
  pb?: number;
  dividend?: number;
  flag?: string;
}

export const INDIAN_INDEXES: IndexData[] = [
  { symbol: 'NIFTY50',      name: 'Nifty 50',          value: 24850, change: 185,  changePct: 0.75, high52w: 26050, low52w: 21200, pe: 22.5, pb: 3.2, dividend: 1.8, flag: 'IN' },
  { symbol: 'SENSEX',       name: 'BSE Sensex',         value: 81500, change: 550,  changePct: 0.68, high52w: 85200, low52w: 72500, pe: 22.1, pb: 3.1, dividend: 1.9, flag: 'IN' },
  { symbol: 'NIFTYMIDCAP',  name: 'Nifty Midcap 50',   value: 12450, change: 143,  changePct: 1.15, high52w: 13200, low52w: 10500, pe: 24.5, pb: 2.8, dividend: 1.2, flag: 'IN' },
  { symbol: 'NIFTYSMALL',   name: 'Nifty Smallcap 50', value: 18200, change: 280,  changePct: 1.56, high52w: 19500, low52w: 15800, pe: 26.2, pb: 2.5, dividend: 0.9, flag: 'IN' },
  { symbol: 'NIFTYBANK',    name: 'Nifty Bank',         value: 52400, change: 320,  changePct: 0.61, high52w: 55000, low52w: 44500, pe: 14.2, pb: 2.1, dividend: 1.5, flag: 'IN' },
  { symbol: 'NIFTYIT',      name: 'Nifty IT',           value: 38500, change: 480,  changePct: 1.26, high52w: 42000, low52w: 32000, pe: 28.5, pb: 6.5, dividend: 1.1, flag: 'IN' },
];

export const GLOBAL_INDEXES: IndexData[] = [
  { symbol: 'SP500',   name: 'S&P 500',          value: 5850,  change: 45,  changePct: 0.78,  high52w: 6090,  low52w: 5200,  pe: 21.5, pb: 4.2, dividend: 1.4, flag: 'US' },
  { symbol: 'NASDAQ',  name: 'NASDAQ Composite',  value: 18450, change: 225, changePct: 1.22,  high52w: 19500, low52w: 16200, pe: 28.5, pb: 8.2, dividend: 0.6, flag: 'US' },
  { symbol: 'DAX',     name: 'DAX Germany',       value: 18950, change: 85,  changePct: 0.45,  high52w: 20200, low52w: 17500, pe: 14.2, pb: 1.8, dividend: 2.8, flag: 'DE' },
  { symbol: 'FTSE',    name: 'FTSE 100 UK',       value: 8200,  change: 30,  changePct: 0.37,  high52w: 8500,  low52w: 7600,  pe: 12.5, pb: 1.6, dividend: 4.1, flag: 'GB' },
  { symbol: 'NIKKEI',  name: 'Nikkei 225 Japan',  value: 33450, change: 520, changePct: 1.58,  high52w: 35200, low52w: 28500, pe: 15.8, pb: 1.9, dividend: 2.1, flag: 'JP' },
  { symbol: 'HSI',     name: 'Hang Seng HK',      value: 18200, change: -85, changePct: -0.46, high52w: 22700, low52w: 15000, pe: 9.8,  pb: 0.9, dividend: 4.8, flag: 'HK' },
];

export function getIndexBySymbol(symbol: string): IndexData | undefined {
  const all = [...INDIAN_INDEXES, ...GLOBAL_INDEXES];
  return all.find(idx => idx.symbol === symbol.toUpperCase());
}