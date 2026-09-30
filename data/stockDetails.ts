// data/stockDetails.ts
// Peer comparison data for stock pages.
//
// The fabricated generators that used to live here (fake analyst ratings
// attributed to real brokerages, random RSI values, and synthetic quarterly
// series) were removed in the 2026-09 remediation. Only `peers` was ever
// consumed (components/stock/StockPageClient.tsx), so only peer data is
// produced now. Quarterly/shareholding/technicals render from the live
// /api/fundamentals and /api/technical endpoints instead.

import { Stock } from '../lib/types';
import { STOCKS } from '../data/stocks';

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

export interface StockDetail {
  peers: PeerStock[];
}

const STOCK_DETAILS_CACHE: Record<string, StockDetail> = {};

export function generateStockDetail(stock: Stock): StockDetail {
  if (STOCK_DETAILS_CACHE[stock.symbol]) {
    return STOCK_DETAILS_CACHE[stock.symbol];
  }

  const allStocks = Object.values(STOCKS);
  const sectorPeers = allStocks.filter(
    (s: any) => s.sector === stock.sector && s.symbol !== stock.symbol
  );

  const peers: PeerStock[] = sectorPeers.slice(0, 5).map((s: any) => ({
    symbol: s.symbol,
    name: s.name,
    price: s.price,
    marketCap: s.mktcap || 0,
    pe: s.pe || 0,
    pb: (s.bvps || 0) > 0 ? Math.round((s.price / s.bvps) * 10) / 10 : 2.5,
    roe: s.roe || 0,
    roce: s.roce || 0,
    debtEquity: s.de || 0,
    revenueGrowth: s.revcagr || 0,
    netProfitMargin: s.opm || 0,
  }));

  const detail: StockDetail = { peers };

  STOCK_DETAILS_CACHE[stock.symbol] = detail;
  return detail;
}
