import { Stock } from '../lib/types';
import { STOCKS } from '../data/stocks';

export interface QuarterlyResult {
  quarter: string;
  revenue: number;
  netProfit: number;
  opm: number;
}

export interface ShareholdingEntry {
  period: string;
  promoter: number;
  fii: number;
  dii: number;
  public: number;
}

export interface PeerStock {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  pe: number;
  pb?: number;
  roe: number;
  roce: number;
  debtEquity: number;
  revenueGrowth: number;
  netProfitMargin: number;
}

export interface AnalystRec {
  firm: string;
  analyst: string;
  rating: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'OUTPERFORM';
  targetPrice: number;
  upside: number;
  date: string;
}

export interface TechnicalData {
  name: string;
  value: string;
  signal: string;
  timeframe: string;
}

export interface StockDetail {
  quarterlyResults: QuarterlyResult[];
  shareholdingHistory: ShareholdingEntry[];
  peers: PeerStock[];
  analystRecs: AnalystRec[];
  technicals: TechnicalData[];
}

// Generate quarterly results
function generateQuarterlyResults(stock: Stock): QuarterlyResult[] {
  const revPerQ = Math.round(stock.rev * 0.25);
  const npPerQ  = Math.round(stock.np  * 0.25);

  return [
    { quarter: 'Q3 FY24', revenue: revPerQ,                          netProfit: npPerQ,                          opm: stock.opm },
    { quarter: 'Q2 FY24', revenue: Math.round(revPerQ * 0.96),       netProfit: Math.round(npPerQ  * 0.92),      opm: Math.round(stock.opm * 0.98) },
    { quarter: 'Q1 FY24', revenue: Math.round(revPerQ * 1.04),       netProfit: Math.round(npPerQ  * 1.08),      opm: Math.round(stock.opm * 1.02) },
    { quarter: 'Q4 FY23', revenue: revPerQ,                          netProfit: npPerQ,                          opm: Math.round(stock.opm * 0.95) },
  ];
}

// Generate shareholding
function generateShareholdingHistory(stock: Stock): ShareholdingEntry[] {
  const promoter = stock.promo;
  return [
    { period: 'Current', promoter,                            fii: 25, dii: 18, public: 100 - promoter                            - 25 - 18 },
    { period: '6M Ago',  promoter: Math.max(0, promoter - 1), fii: 24, dii: 17, public: 100 - Math.max(0, promoter - 1) - 24 - 17 },
    { period: '1Y Ago',  promoter: Math.max(0, promoter - 2), fii: 22, dii: 16, public: 100 - Math.max(0, promoter - 2) - 22 - 16 },
    { period: '2Y Ago',  promoter: Math.max(0, promoter - 4), fii: 20, dii: 15, public: 100 - Math.max(0, promoter - 4) - 20 - 15 },
  ];
}

// Generate realistic peers for any stock -- STOCKS now properly imported
function generatePeers(stock: Stock): PeerStock[] {
  const allStocks  = Object.values(STOCKS);
  const sectorPeers = allStocks.filter(
    (s) => s.sector === stock.sector && s.symbol !== stock.symbol
  );

  if (sectorPeers.length > 0) {
    return sectorPeers.slice(0, 3).map((s) => ({
      symbol:           s.symbol,
      name:             s.name,
      price:            s.price,
      marketCap:        s.mktcap,
      pe:               s.pe,
      pb:               s.bvps > 0 ? Math.round((s.price / s.bvps) * 10) / 10 : 2.5,
      roe:              s.roe,
      roce:             s.roce,
      debtEquity:       s.de,
      revenueGrowth:    s.revcagr,
      netProfitMargin:  s.opm,
    }));
  }

  // Fallback synthetic peers
  return [
    {
      symbol: 'PEER1', name: 'Competitor A',
      price:           Math.round(stock.price   * 1.12),
      marketCap:       Math.round(stock.mktcap  * 0.85),
      pe:              stock.pe + 3,
      pb:              2.8,
      roe:             Math.max(8,  stock.roe   - 3),
      roce:            Math.max(10, stock.roce  - 2),
      debtEquity:      Math.max(0,  stock.de    + 0.3),
      revenueGrowth:   Math.max(5,  stock.revcagr - 3),
      netProfitMargin: Math.max(5,  stock.opm   - 2),
    },
    {
      symbol: 'PEER2', name: 'Competitor B',
      price:           Math.round(stock.price   * 0.92),
      marketCap:       Math.round(stock.mktcap  * 1.15),
      pe:              Math.max(8, stock.pe - 2),
      pb:              1.9,
      roe:             stock.roe      + 4,
      roce:            stock.roce     + 3,
      debtEquity:      Math.max(0, stock.de - 0.2),
      revenueGrowth:   stock.revcagr  + 2,
      netProfitMargin: stock.opm      + 1.5,
    },
    {
      symbol: 'PEER3', name: 'Competitor C',
      price:           Math.round(stock.price  * 1.05),
      marketCap:       Math.round(stock.mktcap * 0.9),
      pe:              stock.pe,
      pb:              2.2,
      roe:             stock.roe,
      roce:            stock.roce,
      debtEquity:      stock.de,
      revenueGrowth:   stock.revcagr,
      netProfitMargin: stock.opm,
    },
  ];
}

// Generate analyst recommendations
function generateAnalystRecs(stock: Stock): AnalystRec[] {
  const target = Math.round(stock.price * (1 + (stock.epscagr || 12) / 100 * 1.8));
  const upside  = ((target - stock.price) / stock.price) * 100;

  const firms    = ['Motilal Oswal', 'ICICI Securities', 'HDFC Securities', 'Nuvama', 'JM Financial', 'Axis Securities'];
  const analysts = ['Nikhil Mathur', 'Pritesh Mehta',   'Amit Hiranandani', 'Anand Shah', 'Ritesh Shah', 'Sumeet Kumar'];

  return [
    { firm: firms[0], analyst: analysts[0], rating: "BUY",  targetPrice: target,                              upside: Math.round(upside         * 10) / 10, date: "2 days ago"   },
    { firm: firms[1], analyst: analysts[1], rating: "BUY",  targetPrice: Math.round(target * 0.97),           upside: Math.round(upside * 0.9   * 10) / 10, date: "1 week ago"   },
    { firm: firms[2], analyst: analysts[2], rating: "BUY",  targetPrice: Math.round(target * 1.04),           upside: Math.round(upside * 1.15  * 10) / 10, date: "3 days ago"   },
    { firm: firms[3], analyst: analysts[3], rating: "HOLD", targetPrice: Math.round(stock.price * 1.08),      upside: Math.round(8.0            * 10) / 10, date: "2 weeks ago"  },
    { firm: firms[4], analyst: analysts[4], rating: "SELL", targetPrice: Math.round(stock.price * 0.92),      upside: Math.round(-8.0           * 10) / 10, date: "4 days ago"   },
  ];
}

function generateTechnicals(stock: Stock): any[] {
  const priceVariation = stock.price * 0.02;
  const sma20 = Math.round(stock.price - priceVariation);
  const sma50 = Math.round(stock.price - priceVariation * 1.5);

  return [
    { name: 'RSI (14)',   value: '62',                                    signal: 'NEUTRAL',                              timeframe: '1D' },
    { name: 'MACD',       value: 'BULLISH',                               signal: 'BUY',                                  timeframe: '1D' },
    { name: 'SMA 20',     value: sma20.toString(),                        signal: stock.price > sma20 ? 'BUY' : 'SELL',   timeframe: '1D' },
    { name: 'SMA 50',     value: sma50.toString(),                        signal: stock.price > sma50 ? 'BUY' : 'SELL',   timeframe: '1D' },
    { name: 'Bollinger',  value: 'NORMAL',                                signal: 'NEUTRAL',                              timeframe: '1D' },
    { name: 'ADX (14)',   value: '28',                                    signal: 'BUY',                                  timeframe: '1D' },
  ];
}

// Module-level cache -- lives for the lifetime of the server process
const STOCK_DETAILS_CACHE: Record<string, StockDetail> = {};

/**
 * Generate complete stock details for ANY stock.
 * Results are cached after first computation -- O(1) on repeat calls.
 */
export function generateStockDetail(stock: Stock): StockDetail {
  if (STOCK_DETAILS_CACHE[stock.symbol]) {
    return STOCK_DETAILS_CACHE[stock.symbol];
  }

  const detail: StockDetail = {
    quarterlyResults: generateQuarterlyResults(stock),
    shareholdingHistory: generateShareholdingHistory(stock),
    peers:               generatePeers(stock),
    analystRecs:         generateAnalystRecs(stock),
    technicals:          generateTechnicals(stock),
  };

  STOCK_DETAILS_CACHE[stock.symbol] = detail;
  return detail;
}
