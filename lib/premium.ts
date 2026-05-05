export type WisdomTier = 'seeker' | 'student' | 'disciple';

export interface TierConfig {
  name: string;
  label: string;
  price: string;
  priceNum: number;
  color: string;
  features: string[];
  rishisVisible: number;
  dailyViews: number | null;
  hasJournal: boolean;
  hasBacktest: boolean;
  hasCustomBlend: boolean;
  hasKnowledgeGraph: boolean;
}

export const TIER_CONFIG: Record<WisdomTier, TierConfig> = {
  seeker: {
    name: 'seeker',
    label: 'Seeker',
    price: 'Free',
    priceNum: 0,
    color: '#71767B',
    features: [
      '5 stock analyses per day',
      'Top 5 Rishi scores visible',
      'Basic consensus score',
      'Screener access',
    ],
    rishisVisible: 5,
    dailyViews: 5,
    hasJournal: false,
    hasBacktest: false,
    hasCustomBlend: false,
    hasKnowledgeGraph: false,
  },
  student: {
    name: 'student',
    label: 'Student',
    price: 'Rs 499/year',
    priceNum: 499,
    color: '#FFD700',
    features: [
      'Unlimited stock analyses',
      'All 20 Rishi scores visible',
      'Investment Journal',
      'Portfolio tracking',
      'Wisdom sidebar',
      'Historical parallels',
    ],
    rishisVisible: 20,
    dailyViews: null,
    hasJournal: true,
    hasBacktest: false,
    hasCustomBlend: false,
    hasKnowledgeGraph: false,
  },
  disciple: {
    name: 'disciple',
    label: 'Disciple',
    price: 'Rs 1,999/year',
    priceNum: 1999,
    color: '#C084FC',
    features: [
      'Everything in Student',
      'Custom Rishi blend creation',
      'Historical backtesting (2018-2025)',
      'Rishi Knowledge Graph',
      'Priority support',
      'Early access to new Rishis',
    ],
    rishisVisible: 20,
    dailyViews: null,
    hasJournal: true,
    hasBacktest: true,
    hasCustomBlend: true,
    hasKnowledgeGraph: true,
  },
};

const STORAGE_KEY = 'rishi_tier_v1';

export function getCurrentTier(): WisdomTier {
  if (typeof window === 'undefined') return 'seeker';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'student' || stored === 'disciple') return stored;
  return 'seeker';
}

export function setTier(tier: WisdomTier): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, tier);
}

export function getTierConfig(tier: WisdomTier): TierConfig {
  return TIER_CONFIG[tier];
}

export function canAccess(feature: keyof TierConfig, tier: WisdomTier): boolean {
  return !!TIER_CONFIG[tier][feature];
}

// Daily view tracking
const VIEW_KEY = 'rishi_views_v1';

export function getViewsToday(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    if (!stored) return 0;
    const data = JSON.parse(stored);
    const today = new Date().toDateString();
    if (data.date !== today) return 0;
    return data.count || 0;
  } catch {
    return 0;
  }
}

export function incrementViews(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toDateString();
    const views = getViewsToday();
    localStorage.setItem(VIEW_KEY, JSON.stringify({ date: today, count: views + 1 }));
  } catch {}
}

export function canViewStock(tier: WisdomTier): boolean {
  const config = TIER_CONFIG[tier];
  if (config.dailyViews === null) return true;
  return getViewsToday() < config.dailyViews;
}

// Legacy compat
export function getRishisVisible(): number {
  const tier = getCurrentTier();
  return TIER_CONFIG[tier].rishisVisible;
}

export function isPremium(): boolean {
  const tier = getCurrentTier();
  return tier === 'student' || tier === 'disciple';
}