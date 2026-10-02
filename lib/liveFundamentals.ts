// lib/liveFundamentals.ts
// Aggregates live fundamentals from multiple sources
// Primary: Screener.in, Fallback: NSE + Yahoo, Cache: localStorage (client) or file (server)

import { fetchScreenerFundamentals, fetchScreenerQuarterly, fetchScreenerShareholding } from "./scrapers/screener";
import { fetchLiveFundamentals as fetchYahooNseFundamentals } from "./nse/fundamentals";

export interface FullFundamentals {
  symbol: string;
  /** Rule 16 (Coder Directions §9 sweep): every observation field is
   *  `number | null` — a field no upstream parsed/reported is null, never a
   *  sentinel 0. A fabricated 0 was ADMITTED by the resolver's G5
   *  admissibility table (roe/opm/revcagr/bvps treat genuine zero as a real
   *  observation) and overrode the seed baseline with an invented value;
   *  null keeps the seed exactly as "missing" must. */
  pe: number | null;
  eps: number | null;
  /** Market capitalisation in ₹ crore — the /api/fundamentals contract
   *  unit (H3, audit 2026-10-01). Screener.in reports Cr directly; the
   *  Yahoo/NSE raw values (₹ absolute) are normalised below. */
  marketCap: number | null;
  roe: number | null;
  roce: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  faceValue: number;
  /** Null when no upstream exposes a D/E (H4/T11: unparseable is null,
   *  never a constant and never 0 — 0 would claim "debt-free"). */
  debtToEquity: number | null;
  opm: number | null;
  revCagr3y: number | null;
  epsCagr: number | null;
  promoterHolding: number | null;
  fcf: number | null;
  roa: number | null;
  /** Provider observation time when the upstream DISCLOSED one, else null
   *  (audit 2026-10-02 P0 — never the fetch time: that fabricated provider
   *  provenance end-to-end, from this module through resolveStockMetrics'
   *  asOf and the AI evidence ids). Neither screener.in nor the Yahoo+NSE
   *  fallback discloses a fundamentals observation timestamp today, so the
   *  honest value on both paths is null. */
  lastUpdated: string | null;
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

const cachedFundamentals: Map<string, FullFundamentals> | null = null;

export async function fetchFullFundamentals(symbol: string): Promise<FullFundamentals | null> {
  // Try Screener.in first
  try {
    const screenerData = await fetchScreenerFundamentals(symbol);
    if (screenerData && screenerData.pe !== null && screenerData.pe > 0) {
      return {
        symbol,
        pe: screenerData.pe,
        // screener.in pages we parse expose no EPS — null, never 0.
        eps: null,
        marketCap: screenerData.marketCap,
        roe: screenerData.roe,
        roce: screenerData.roce,
        bookValue: screenerData.bookValue,
        // Not on the parsed ratio block — null, never 0 (Rule 16).
        dividendYield: null,
        faceValue: 10,
        debtToEquity: screenerData.debtToEquity,
        opm: screenerData.opm,
        revCagr3y: screenerData.revCagr3y,
        epsCagr: screenerData.epsCagr,
        promoterHolding: screenerData.promoterHolding,
        fcf: screenerData.fcf,
        roa: screenerData.roa,
        // Screener.in discloses no observation timestamp on the pages we
        // parse — null, never the fetch time (audit 2026-10-02 P0).
        lastUpdated: null,
        source: "screener",
      };
    }
  } catch (e) {
    console.warn(`[Fundamentals] Screener.in failed for ${symbol}:`, e);
  }

  // Fallback: Yahoo + NSE
  try {
    const yahooData = await fetchYahooNseFundamentals(symbol);
    if (yahooData && yahooData.pe !== null && yahooData.pe > 0) {
      return {
        symbol,
        pe: yahooData.pe,
        eps: yahooData.eps,
        // H3: Yahoo (stats.marketCap.raw) and NSE (price × issued shares)
        // report ₹ ABSOLUTE; the contract unit is ₹ crore (what Screener.in
        // and the seed baseline use), so normalise here at the boundary.
        marketCap: yahooData.marketCap !== null ? yahooData.marketCap / 10000000 : null,
        roe: yahooData.roe,
        roce: yahooData.roce,
        bookValue: yahooData.bookValue,
        dividendYield: yahooData.dividendYield,
        faceValue: yahooData.faceValue,
        // H4: the Yahoo+NSE fallback exposes no D/E — null (unknown), not 0
        // (which would fabricate a debt-free balance sheet).
        debtToEquity: null,
        // These modules expose no OPM/CAGR/shareholding/FCF/ROA — null
        // (Rule 16: the seed baseline survives via the resolver's pick(),
        // a sentinel 0 was overriding it through G5's finite rules).
        opm: null,
        revCagr3y: null,
        epsCagr: null,
        promoterHolding: null,
        fcf: null,
        roa: null,
        // Yahoo quoteSummary / NSE quote-equity expose no fundamentals
        // observation time in the modules we consume — null, never `now`
        // (audit 2026-10-02 P0).
        lastUpdated: null,
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