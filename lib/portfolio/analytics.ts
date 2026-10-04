/**
 * X3-07 (Round 14 A6): portfolio analytics over imported positions.
 *
 * Inputs: the imported positions + the current portfolio value expressed
 * as a dated flow set (the caller supplies the current market value —
 * seed prices are placeholders, so value comes from the live quote
 * layer or the user's own statement, never from the seed dataset).
 *
 * Outputs: XIRR (null when uncomputable — Constitution 16), sector
 * exposure (share of invested value per sector; unknown sector = the
 * 'UNMAPPED' bucket, reported, never guessed), and concentration
 * (largest holding weight, top-10 weight, HHI).
 */
import { xirr, type DatedFlow } from './xirr';
import type { ParsedPosition } from './csvImport';

export interface SectorExposureRow {
  sector: string;
  invested: number;
  weight: number;
}

export interface Concentration {
  /** Invested value of the single largest position / total invested. */
  largestWeight: number;
  /** Sum of the 10 largest weights. */
  top10Weight: number;
  /** Herfindahl-Hirschman index over position weights (0..1). */
  hhi: number;
  positionsCount: number;
}

export interface PortfolioAnalytics {
  totalInvested: number;
  xirr: number | null;
  sectors: SectorExposureRow[];
  concentration: Concentration;
}

/** Sector lookup the caller injects (slim index keyed by symbol). */
export interface SectorLookup {
  (symbol: string): { sector: string; consensus: number | null } | null;
}

const UNMAPPED = 'UNMAPPED';

export function analyzePortfolio(
  positions: ParsedPosition[],
  currentValues: Map<string, number>,
  sectorOf: SectorLookup,
  valuationAt: number,
): PortfolioAnalytics {
  let totalInvested = 0;
  const investedBySymbol = new Map<string, number>();
  for (const p of positions) {
    const invested = p.quantity * p.avgPrice;
    if (!Number.isFinite(invested) || invested < 0) continue;
    totalInvested += invested;
    investedBySymbol.set(p.symbol, (investedBySymbol.get(p.symbol) ?? 0) + invested);
  }

  // --- Sector exposure ---
  const sectorInvested = new Map<string, number>();
  for (const p of positions) {
    const invested = p.quantity * p.avgPrice;
    if (!Number.isFinite(invested) || invested < 0) continue;
    const info = sectorOf(p.symbol);
    const sector = info?.sector ?? UNMAPPED;
    sectorInvested.set(sector, (sectorInvested.get(sector) ?? 0) + invested);
  }
  const sectors: SectorExposureRow[] = [...sectorInvested.entries()]
    .map(([sector, invested]) => ({
      sector,
      invested,
      weight: totalInvested > 0 ? invested / totalInvested : 0,
    }))
    .sort((a, b) => b.invested - a.invested);

  // --- Concentration ---
  const weights = [...investedBySymbol.values()]
    .map((v) => (totalInvested > 0 ? v / totalInvested : 0))
    .sort((a, b) => b - a);
  const hhi = weights.reduce((acc, w) => acc + w * w, 0);
  const concentration: Concentration = {
    largestWeight: weights[0] ?? 0,
    top10Weight: weights.slice(0, 10).reduce((a, b) => a + b, 0),
    hhi,
    positionsCount: positions.length,
  };

  // --- XIRR: dated flows from buy dates (when present) + today's value ---
  const flows: DatedFlow[] = [];
  for (const p of positions) {
    const invested = p.quantity * p.avgPrice;
    if (!Number.isFinite(invested) || invested <= 0) continue;
    const dateStr = p.firstBuyDate ?? p.lastBuyDate;
    // No date in the file: the flow cannot participate in XIRR (a guessed
    // date would fabricate timing). Those positions still count toward
    // invested/sector/concentration above.
    if (!dateStr) continue;
    const at = Date.parse(dateStr);
    if (!Number.isFinite(at)) continue;
    flows.push({ amount: -invested, at });
  }
  for (const [symbol, value] of currentValues) {
    if (!Number.isFinite(value)) continue;
    const pos = positions.find((p) => p.symbol === symbol);
    if (!pos) continue;
    // value realized today (or at the valuation date)
    flows.push({ amount: value, at: valuationAt });
  }
  // Partial sells are not representable in the holdings-CSV grammar; the
  // caller passes realized-sale flows separately when it has them.
  const rate = flows.length >= 2 ? xirr(flows) : null;

  return { totalInvested, xirr: rate, sectors, concentration };
}

/** ISO yyyy-mm-dd for a UTC timestamp (deterministic formatting). */
export function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
