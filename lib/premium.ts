export type WisdomTier = 'seeker' | 'student' | 'disciple';

export interface TierConfig {
  name:            string;
  label:           string;
  price:           string;
  rishisVisible:   number;
  dailyStockLimit: number | null;
  features:        string[];
}

export const TIER_CONFIG: Record<WisdomTier, TierConfig> = {
  seeker: {
    name:            'Seeker',
    label:           'Seeker',
    price:           'Free',
    rishisVisible:   5,
    dailyStockLimit: 5,
    features: [
      'top 5 rishi scores',
      'basic consensus view',
      'screener access',
    ],
  },
  student: {
    name:            'Student',
    label:           'Student',
    price:           '499/year',
    rishisVisible:   20,
    dailyStockLimit: null,
    features: [
      'all 20 rishis',
      'unlimited stock views',
      'portfolio tracking',
      'investment journal',
      'wisdom sidebar',
      'philosophy radar',
    ],
  },
  disciple: {
    name:            'Disciple',
    label:           'Disciple',
    price:           '1,999/year',
    rishisVisible:   20,
    dailyStockLimit: null,
    features: [
      'all 20 rishis',
      'unlimited stock views',
      'portfolio tracking',
      'investment journal',
      'wisdom sidebar',
      'philosophy radar',
      'historical backtesting',
      'custom rishi blends',
      'knowledge graph',
      'rishi dialogue system',
      'advanced lens insights',
    ],
  },
};

// ── DEVELOPER MODE ──────────────────────────────────────────────
const DEVELOPER_MODE = true;

export function getCurrentTier(): WisdomTier {
  if (DEVELOPER_MODE) return 'disciple';
  if (typeof window === 'undefined') return 'seeker';
  try {
    const stored = localStorage.getItem('rishi_tier_v1');
    if (stored && ['seeker', 'student', 'disciple'].includes(stored)) {
      return stored as WisdomTier;
    }
  } catch {}
  return 'seeker';
}

export function setTier(tier: WisdomTier): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('rishi_tier_v1', tier); } catch {}
}

export function getRishisVisible(tier?: WisdomTier): number {
  if (DEVELOPER_MODE) return 20;
  const t = tier ?? getCurrentTier();
  return TIER_CONFIG[t].rishisVisible;
}

export function canViewStock(tier?: WisdomTier): boolean {
  if (DEVELOPER_MODE) return true;
  if (typeof window === 'undefined') return true;
  const t = tier ?? getCurrentTier();
  const limit = TIER_CONFIG[t].dailyStockLimit;
  if (limit === null) return true;
  try {
    const today = new Date().toDateString();
    const key   = `stock_views_${today}`;
    const views = parseInt(localStorage.getItem(key) || '0', 10);
    if (views >= limit) return false;
    localStorage.setItem(key, (views + 1).toString());
    return true;
  } catch { return true; }
}

export function canAccess(feature: string, tier?: WisdomTier): boolean {
  if (DEVELOPER_MODE) return true;
  const t        = tier ?? getCurrentTier();
  const features = TIER_CONFIG[t].features;
  return features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
}

export function isPremium(tier?: WisdomTier): boolean {
  if (DEVELOPER_MODE) return true;
  const t = tier ?? getCurrentTier();
  return t === 'student' || t === 'disciple';
}

export function isDisciple(tier?: WisdomTier): boolean {
  if (DEVELOPER_MODE) return true;
  const t = tier ?? getCurrentTier();
  return t === 'disciple';
}

export function resetDailyLimit(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toDateString();
    localStorage.removeItem(`stock_views_${today}`);
  } catch {}
}

export function getViewsRemaining(): number {
  if (DEVELOPER_MODE) return 999;
  if (typeof window === 'undefined') return 5;
  const tier  = getCurrentTier();
  const limit = TIER_CONFIG[tier].dailyStockLimit;
  if (limit === null) return 999;
  try {
    const today = new Date().toDateString();
    const key   = `stock_views_${today}`;
    const views = parseInt(localStorage.getItem(key) || '0', 10);
    return Math.max(0, limit - views);
  } catch { return 5; }
}
