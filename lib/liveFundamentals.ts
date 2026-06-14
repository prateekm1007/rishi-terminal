// lib/liveFundamentals.ts
// Aggregates live fundamentals from multiple sources
// Primary: Screener.in, Fallback: NSE + Yahoo, Cache: localStorage (client) or file (server)

import { fetchScreenerFundamentals, fetchScreenerQuarterly, fetchScreenerShareholding } from "./scrapers/screener";
import { fetchLiveFundamentals as fetchYahooNseFundamentals } from "./nse/fundamentals";

export interface FullFundamentals {
  symbol: string;
  pe: number;
  eps: number;
  marketCap: number;
  roe: number;
  roce: number;
  bookValue: number;
  dividendYield: number;
  faceValue: number;
  debtToEquity: number;
  opm: number;
  revCagr3y: number;
  epsCagr: number;
  promoterHolding: number;
  fcf: number;
  roa: number;
  lastUpdated: string;
  source: "screener" | "yahoo+nse" | "static";
}

export interface QuarterlyData {
  symbol: string;
  quarters: { period: string; revenue: number; netProfit: number; opm: number }[];
  source: "screener" | "generated";
}

export interface ShareholdingData {
  symbol: string;
  history: { period: string; promoter: number; fii: number; dii: number; public: number }[];
  source: "screener" | "generated";
}

let cachedFundamentals: Map<string, FullFundamentals> | null = null;

export async function fetchFullFundamentals(symbol: string): Promise<FullFundamentals | null> {
  // Try Screener.in first
  try {
    const screenerData = await fetchScreenerFundamentals(symbol);
    if (screenerData && screenerData.pe > 0) {
      return {
        symbol,
        pe: screenerData.pe,
        eps: 0,
        marketCap: screenerData.marketCap,
        roe: screenerData.roe,
        roce: screenerData.roce,
        bookValue: screenerData.bookValue,
        dividendYield: 0,
        faceValue: 10,
        debtToEquity: screenerData.debtToEquity,
        opm: screenerData.opm,
        revCagr3y: screenerData.revCagr3y,
        epsCagr: screenerData.epsCagr,
        promoterHolding: screenerData.promoterHolding,
        fcf: screenerData.fcf,
        roa: screenerData.roa,
        lastUpdated: new Date().toISOString(),
        source: "screener",
      };
    }
  } catch (e) {
    console.warn(`[Fundamentals] Screener.in failed for ${symbol}:`, e);
  }

  // Fallback: Yahoo + NSE
  try {
    const yahooData = await fetchYahooNseFundamentals(symbol);
    if (yahooData && yahooData.pe > 0) {
      return {
        symbol,
        pe: yahooData.pe,
        eps: yahooData.eps,
        marketCap: yahooData.marketCap,
        roe: yahooData.roe,
        roce: yahooData.roce,
        bookValue: yahooData.bookValue,
        dividendYield: yahooData.dividendYield,
        faceValue: yahooData.faceValue,
        debtToEquity: 0,
        opm: 0,
        revCagr3y: 0,
        epsCagr: 0,
        promoterHolding: 0,
        fcf: 0,
        roa: 0,
        lastUpdated: new Date().toISOString(),
        source: "yahoo+nse",
      };
    }
  } catch (e) {
    console.warn(`[Fundamentals] Yahoo+NSE failed for ${symbol}:`, e);
  }

  return null;
}

export async function fetchLiveQuarterly(symbol: string): Promise<QuarterlyData | null> {
  try {
    const screenerData = await fetchScreenerQuarterly(symbol);
    if (screenerData && screenerData.quarters.length > 0) {
      return {
        symbol,
        quarters: screenerData.quarters,
        source: "screener",
      };
    }
  } catch (e) {
    console.warn(`[Quarterly] Screener.in failed for ${symbol}:`, e);
  }

  return null;
}

export async function fetchLiveShareholding(symbol: string): Promise<ShareholdingData | null> {
  try {
    const screenerData = await fetchScreenerShareholding(symbol);
    if (screenerData && screenerData.history.length > 0) {
      return {
        symbol,
        history: screenerData.history,
        source: "screener",
      };
    }
  } catch (e) {
    console.warn(`[Shareholding] Screener.in failed for ${symbol}:`, e);
  }

  return null;
}