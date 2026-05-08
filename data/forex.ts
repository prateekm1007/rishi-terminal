export interface ForexPair {
  symbol: string;
  name: string;
  pair: string;
  base: string;
  quote: string;
  rate: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  volatility: number;
}

export const FOREX_PAIRS: ForexPair[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', pair: 'EUR/USD', base: 'EUR', quote: 'USD', rate: 1.0850, change: 0.0015, changePct: 0.14, high52w: 1.1250, low52w: 0.9850, volatility: 4.2 },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', pair: 'GBP/USD', base: 'GBP', quote: 'USD', rate: 1.2680, change: 0.0028, changePct: 0.22, high52w: 1.3500, low52w: 1.2000, volatility: 5.1 },
  { symbol: 'JPYUSD', name: 'Japanese Yen / US Dollar', pair: 'JPY/USD', base: 'JPY', quote: 'USD', rate: 0.0067, change: -0.00005, changePct: -0.75, high52w: 0.0072, low52w: 0.0062, volatility: 6.8 },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', pair: 'USD/INR', base: 'USD', quote: 'INR', rate: 83.45, change: -0.18, changePct: -0.21, high52w: 88.50, low52w: 80.20, volatility: 3.5 },
  { symbol: 'EURINR', name: 'Euro / Indian Rupee', pair: 'EUR/INR', base: 'EUR', quote: 'INR', rate: 90.55, change: 0.02, changePct: 0.02, high52w: 98.00, low52w: 85.00, volatility: 4.1 },
  { symbol: 'GBPINR', name: 'British Pound / Indian Rupee', pair: 'GBP/INR', base: 'GBP', quote: 'INR', rate: 105.80, change: 0.08, changePct: 0.08, high52w: 115.00, low52w: 100.50, volatility: 4.8 },
  { symbol: 'JPYINR', name: 'Japanese Yen / Indian Rupee', pair: 'JPY/INR', base: 'JPY', quote: 'INR', rate: 0.5585, change: 0.0012, changePct: 0.22, high52w: 0.6200, low52w: 0.5000, volatility: 5.2 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', pair: 'AUD/USD', base: 'AUD', quote: 'USD', rate: 0.6650, change: 0.0018, changePct: 0.27, high52w: 0.7100, low52w: 0.6200, volatility: 4.5 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', pair: 'NZD/USD', base: 'NZD', quote: 'USD', rate: 0.6050, change: 0.0025, changePct: 0.42, high52w: 0.6500, low52w: 0.5700, volatility: 5.0 },
  { symbol: 'CHFUSD', name: 'Swiss Franc / US Dollar', pair: 'CHF/USD', base: 'CHF', quote: 'USD', rate: 1.1250, change: -0.0020, changePct: -0.18, high52w: 1.1800, low52w: 1.0500, volatility: 3.8 },
];

export const FOREX_MAJORS = FOREX_PAIRS.filter(f => ['EURUSD', 'GBPUSD', 'JPYUSD'].includes(f.symbol));
export const FOREX_EMERGING = FOREX_PAIRS.filter(f => ['USDINR', 'EURINR', 'GBPINR', 'JPYINR'].includes(f.symbol));
export const FOREX_CROSSES = FOREX_PAIRS.filter(f => !['EURUSD', 'GBPUSD', 'JPYUSD', 'USDINR', 'EURINR', 'GBPINR', 'JPYINR'].includes(f.symbol));