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
  /** R15-E: a missing or placeholder-zero P/E is MISSING data — it renders
   *  as "—" (rule 16: null is a real value; the seed's 73 `pe: 0` rows are
   *  placeholders, and "0.00x" is the Y4-forbidden placeholder-zero shape). */
  pe: number | null;
  /** R15-E: computed from price/bvps ONLY when both inputs are valid; the
   *  old `: 2.5` fallback was a fabricated plausible guess (rule 4). */
  pb?: number | null;
  /** R15-E: placeholder-zero ROE (57 seed rows, several provably
   *  inconsistent with their recorded np) renders as "—", not "0.00%". */
  roe: number | null;
  roce: number;
  debtEquity: number;
  revenueGrowth: number;
  netProfitMargin: number;
}

export interface StockDetail {
  peers: PeerStock[];
}

const STOCK_DETAILS_CACHE: Record<string, StockDetail> = {};

/** R15-E: the single peer-row mapper (rule 14 — one source of truth),
 *  exported so the null semantics are unit-testable without the registry.
 *  Root-cause fix for the remaining null→0 paths in the peer data
 *  boundary (founder Round-15 §8): missing/placeholder values stay null
 *  and every consumer renders "—"; nothing is coerced to 0, and nothing
 *  plausible is invented when an input is missing. Debt-to-equity keeps
 *  its zero: 0 is a REAL D/E (zero-debt companies), not a placeholder. */
export function toPeerRow(s: {
  symbol: string;
  name: string;
  price: number;
  mktcap: number;
  pe: number;
  bvps: number;
  roe: number;
  roce: number;
  de: number;
  revcagr: number;
  opm: number;
}): PeerStock {
  return {
    symbol: s.symbol,
    name: s.name,
    price: s.price,
    marketCap: s.mktcap || 0,
    pe: typeof s.pe === 'number' && s.pe > 0 ? s.pe : null,
    pb:
      typeof s.bvps === 'number' && s.bvps > 0 && typeof s.price === 'number' && s.price > 0
        ? Math.round((s.price / s.bvps) * 10) / 10
        : null,
    roe: typeof s.roe === 'number' && s.roe !== 0 ? s.roe : null,
    roce: s.roce || 0,
    debtEquity: s.de || 0,
    revenueGrowth: s.revcagr || 0,
    netProfitMargin: s.opm || 0,
  };
}

export function generateStockDetail(stock: Stock): StockDetail {
  if (STOCK_DETAILS_CACHE[stock.symbol]) {
    return STOCK_DETAILS_CACHE[stock.symbol];
  }

  const allStocks = Object.values(STOCKS);
  const sectorPeers = allStocks.filter(
    (s: any) => s.sector === stock.sector && s.symbol !== stock.symbol
  );

  const peers: PeerStock[] = sectorPeers.slice(0, 5).map((s: any) => toPeerRow(s));

  const detail: StockDetail = { peers };

  STOCK_DETAILS_CACHE[stock.symbol] = detail;
  return detail;
}
