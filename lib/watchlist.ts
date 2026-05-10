import { supabase } from './db/supabase';

export interface WatchItem {
  symbol:  string;
  notes:   string;
  addedAt: string;
}

const LS_KEY = 'rishi_watchlist_v1';

export function loadWatchlistLocal(): WatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveWatchlistLocal(items: WatchItem[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
}

export async function loadWatchlist(userId: string): Promise<WatchItem[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('symbol, notes, added_at')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map(r => ({
    symbol:  r.symbol,
    notes:   r.notes ?? '',
    addedAt: r.added_at,
  }));
}

export async function addToWatchlist(userId: string, item: WatchItem): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .upsert({
      user_id:  userId,
      symbol:   item.symbol,
      notes:    item.notes,
      added_at: item.addedAt,
    }, { onConflict: 'user_id,symbol' });

  if (error) throw error;
}

export async function removeFromWatchlist(userId: string, symbol: string): Promise<void> {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol);

  if (error) throw error;
}

export async function migrateWatchlistToSupabase(userId: string): Promise<void> {
  const local = loadWatchlistLocal();
  if (local.length === 0) return;
  for (const item of local) await addToWatchlist(userId, item);
  localStorage.removeItem(LS_KEY);
  console.log('[Watchlist] Migrated', local.length, 'items to Supabase');
}
