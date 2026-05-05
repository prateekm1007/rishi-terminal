import { Stock } from '../types';
import { RishiScore } from '../consensus/types';

export interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
  addedDate: string;
  notes?: string;
}

export interface CustomRishiWeight {
  name: string;
  weight: number;
  reason?: string;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  customWeights: CustomRishiWeight[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'rishi_portfolio_v1';

/**
 * Load portfolio from localStorage (client-side only)
 */
export function loadPortfolio(): Portfolio {
  if (typeof window === 'undefined') {
    return getEmptyPortfolio();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getEmptyPortfolio();
    return JSON.parse(stored);
  } catch {
    return getEmptyPortfolio();
  }
}

/**
 * Save portfolio to localStorage
 */
export function savePortfolio(portfolio: Portfolio): void {
  if (typeof window === 'undefined') return;

  portfolio.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

/**
 * Get empty portfolio structure
 */
function getEmptyPortfolio(): Portfolio {
  const now = new Date().toISOString();
  return {
    holdings: [],
    customWeights: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Add holding to portfolio
 */
export function addHolding(holding: PortfolioHolding): void {
  const portfolio = loadPortfolio();
  const existing = portfolio.holdings.findIndex(h => h.symbol === holding.symbol);

  if (existing >= 0) {
    // Update existing holding (average price recalculation)
    const old = portfolio.holdings[existing];
    const totalShares = old.shares + holding.shares;
    const totalValue = (old.shares * old.avgPrice) + (holding.shares * holding.avgPrice);
    portfolio.holdings[existing] = {
      ...old,
      shares: totalShares,
      avgPrice: totalValue / totalShares,
      notes: holding.notes || old.notes,
    };
  } else {
    portfolio.holdings.push(holding);
  }

  savePortfolio(portfolio);
}

/**
 * Remove holding from portfolio
 */
export function removeHolding(symbol: string): void {
  const portfolio = loadPortfolio();
  portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol);
  savePortfolio(portfolio);
}

/**
 * Set custom Rishi weight
 */
export function setCustomWeight(name: string, weight: number, reason?: string): void {
  const portfolio = loadPortfolio();
  const existing = portfolio.customWeights.findIndex(w => w.name === name);

  if (existing >= 0) {
    portfolio.customWeights[existing] = { name, weight, reason };
  } else {
    portfolio.customWeights.push({ name, weight, reason });
  }

  savePortfolio(portfolio);
}

/**
 * Remove custom weight (revert to default)
 */
export function removeCustomWeight(name: string): void {
  const portfolio = loadPortfolio();
  portfolio.customWeights = portfolio.customWeights.filter(w => w.name !== name);
  savePortfolio(portfolio);
}

/**
 * Get effective weight for a Rishi (custom or default)
 */
export function getEffectiveWeight(name: string, defaultWeight: number, customWeights: CustomRishiWeight[]): number {
  const custom = customWeights.find(w => w.name === name);
  return custom ? custom.weight : defaultWeight;
}

/**
 * Calculate portfolio metrics
 */
export function calculatePortfolioMetrics(holdings: PortfolioHolding[], stocks: Record<string, Stock>) {
  let totalInvested = 0;
  let totalCurrent = 0;

  for (const h of holdings) {
    const stock = stocks[h.symbol];
    if (!stock) continue;

    totalInvested += h.shares * h.avgPrice;
    totalCurrent += h.shares * stock.price;
  }

  const totalGainLoss = totalCurrent - totalInvested;
  const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return {
    totalInvested,
    totalCurrent,
    totalGainLoss,
    totalGainLossPct,
    holdingsCount: holdings.length,
  };
}