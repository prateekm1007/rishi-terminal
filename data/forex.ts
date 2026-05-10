export interface ForexPair {
  symbol:         string;
  name:           string;
  pair:           string;
  base:           string;
  quote:          string;
  baseCurrency:   string;
  quoteCurrency:  string;
  rate:           number;
  spotRate:       number;
  bid:            number;
  ask:            number;
  spread:         number;
  change:         number;
  changePct:      number;
  change24h:      number;
  high52w:        number;
  low52w:         number;
  volatility:     number;
  volume24h:      number;
  forward1M:      number;
  forward3M:      number;
  forward6M:      number;
  forward1Y:      number;
  forward12M:     number;
  pppRate:        number;
  pppValue:       number;
  liquidity:      string;
  interestDiff: {
    base:  number;
    quote: number;
    diff:  number;
  };
}

function makePair(
  symbol: string, name: string, pair: string,
  base: string, quote: string,
  rate: number, change: number, changePct: number,
  high52w: number, low52w: number, volatility: number,
  volume24h: number, spread: number,
  forward1M: number, forward3M: number, forward6M: number, forward1Y: number,
  pppRate: number,
  baseRate: number, quoteRate: number
): ForexPair {
  return {
    symbol, name, pair, base, quote,
    baseCurrency: base,
    quoteCurrency: quote,
    rate,
    spotRate: rate,
    bid: rate - spread / 2,
    ask: rate + spread / 2,
    spread,
    change, changePct,
    change24h: changePct,
    high52w, low52w, volatility,
    volume24h,
    forward1M, forward3M, forward6M, forward1Y,
    forward12M: forward1Y,
    pppRate, pppValue: pppRate,
    liquidity: volume24h > 5e9 ? 'HIGH' : volume24h > 2e9 ? 'MEDIUM' : 'LOW',
    interestDiff: {
      base:  baseRate,
      quote: quoteRate,
      diff:  baseRate - quoteRate,
    },
  };
}

export const FOREX_PAIRS: ForexPair[] = [
  makePair('EURUSD',  'Euro / US Dollar',                'EUR/USD', 'EUR', 'USD', 1.0850,  0.0015, 0.14,  1.1250, 0.9850, 4.2, 7200000000,  0.0002, 1.0860, 1.0880, 1.0910, 1.0950, 1.05,   4.50, 5.50),
  makePair('GBPUSD',  'British Pound / US Dollar',       'GBP/USD', 'GBP', 'USD', 1.2680,  0.0028, 0.22,  1.3500, 1.2000, 5.1, 4800000000,  0.0003, 1.2695, 1.2725, 1.2770, 1.2840, 1.22,   5.25, 5.50),
  makePair('JPYUSD',  'Japanese Yen / US Dollar',        'JPY/USD', 'JPY', 'USD', 0.0067, -0.00005,-0.75, 0.0072, 0.0062, 6.8, 5600000000,  0.00001,0.00671,0.00673,0.00677,0.00682,0.0071, 0.10, 5.50),
  makePair('USDINR',  'US Dollar / Indian Rupee',        'USD/INR', 'USD', 'INR', 83.45,  -0.18,  -0.21,  88.50,  80.20,  3.5, 3200000000,  0.05,   83.60,  83.90,  84.30,  85.10,  65.00,  5.50, 6.50),
  makePair('EURINR',  'Euro / Indian Rupee',             'EUR/INR', 'EUR', 'INR', 90.55,   0.02,   0.02,  98.00,  85.00,  4.1, 1800000000,  0.08,   90.80,  91.20,  91.80,  92.60,  72.00,  4.50, 6.50),
  makePair('GBPINR',  'British Pound / Indian Rupee',    'GBP/INR', 'GBP', 'INR', 105.80,  0.08,   0.08,  115.00, 100.50, 4.8, 1200000000,  0.10,  106.10, 106.70, 107.40, 108.60, 82.00,  5.25, 6.50),
  makePair('JPYINR',  'Japanese Yen / Indian Rupee',     'JPY/INR', 'JPY', 'INR', 0.5585,  0.0012, 0.22,  0.6200, 0.5000, 5.2,  800000000,  0.001,  0.5595, 0.5615, 0.5640, 0.5690, 0.55,   0.10, 6.50),
  makePair('AUDUSD',  'Australian Dollar / US Dollar',   'AUD/USD', 'AUD', 'USD', 0.6650,  0.0018, 0.27,  0.7100, 0.6200, 4.5, 2600000000,  0.0002, 0.6658, 0.6672, 0.6694, 0.6730, 0.64,   4.35, 5.50),
  makePair('NZDUSD',  'New Zealand Dollar / US Dollar',  'NZD/USD', 'NZD', 'USD', 0.6050,  0.0025, 0.42,  0.6500, 0.5700, 5.0, 1400000000,  0.0003, 0.6058, 0.6072, 0.6090, 0.6120, 0.58,   5.50, 5.50),
  makePair('CHFUSD',  'Swiss Franc / US Dollar',         'CHF/USD', 'CHF', 'USD', 1.1250, -0.0020,-0.18,  1.1800, 1.0500, 3.8, 2000000000,  0.0002, 1.1262, 1.1286, 1.1322, 1.1380, 1.08,   1.75, 5.50),
];

export const FOREX_MAJORS   = FOREX_PAIRS.filter(f => ['EURUSD','GBPUSD','JPYUSD'].includes(f.symbol));
export const FOREX_EMERGING = FOREX_PAIRS.filter(f => ['USDINR','EURINR','GBPINR','JPYINR'].includes(f.symbol));
export const FOREX_CROSSES  = FOREX_PAIRS.filter(f => !['EURUSD','GBPUSD','JPYUSD','USDINR','EURINR','GBPINR','JPYINR'].includes(f.symbol));
