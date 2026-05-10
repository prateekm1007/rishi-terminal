import { supabase } from './db/supabase';

export interface Holding {
  symbol:   string;
  shares:   number;
  avgPrice: number;
  addedAt:  string;
}

const LS_KEY = 'rishi_portfolio_v1';

export function loadPortfolioLocal(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePortfolioLocal(holdings: Holding[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(holdings)); } catch {}
}

export async function loadPortfolio(userId: string): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('symbol, shares, avg_price, added_at')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map(r => ({
    symbol:   r.symbol,
    shares:   r.shares,
    avgPrice: r.avg_price,
    addedAt:  r.added_at,
  }));
}

export async function saveHolding(userId: string, holding: Holding): Promise<void> {
  const { error } = await supabase
    .from('portfolios')
    .upsert({
      user_id:   userId,
      symbol:    holding.symbol,
      shares:    holding.shares,
      avg_price: holding.avgPrice,
      added_at:  holding.addedAt,
    }, { onConflict: 'user_id,symbol' });

  if (error) throw error;
}

// Aliases for backward compatibility
export const addHolding = saveHolding;

export async function deleteHolding(userId: string, symbol: string): Promise<void> {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol);

  if (error) throw error;
}

export const removeHolding = deleteHolding;

export async function migrateLocalToSupabase(userId: string): Promise<void> {
  const local = loadPortfolioLocal();
  if (local.length === 0) return;

  for (const h of local) {
    await saveHolding(userId, h);
  }

  localStorage.removeItem(LS_KEY);
}

// Stubs for old functions that don't exist yet
export function setCustomWeight(userId: string, symbol: string, weight: number): Promise<void> {
  console.warn('[portfolio] setCustomWeight not yet implemented');
  return Promise.resolve();
}

export function removeCustomWeight(userId: string, symbol: string): Promise<void> {
  console.warn('[portfolio] removeCustomWeight not yet implemented');
  return Promise.resolve();
}

export function calculatePortfolioMetrics(holdings: Holding[], prices: Record<string, number>) {
  const metrics = {
    totalInvested: 0,
    totalCurrent: 0,
    totalPL: 0,
    totalPLPct: 0,
  };

  for (const h of holdings) {
    const livePrice = prices[h.symbol] ?? h.avgPrice;
    metrics.totalInvested += h.shares * h.avgPrice;
    metrics.totalCurrent += h.shares * livePrice;
  }

  metrics.totalPL = metrics.totalCurrent - metrics.totalInvested;
  metrics.totalPLPct = metrics.totalInvested > 0 
    ? (metrics.totalPL / metrics.totalInvested) * 100 
    : 0;

  return metrics;
}

export type Portfolio = Holding[];
