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
    label:            'Student',
    price:           '₹499/year',
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
    price:           '₹1,999/year',
    rishisVisible:   20,
    dailyStockLimit: null,
    features: [
      'all 20 rishis',
      'unlimited stock views',
      'portfolio tracking',
      'investment journal',
      'wisdom sidebar',
      'philosophy radar',
      // Round-5 audit (finding 6): 'historical backtesting',
      // 'custom rishi blends' and 'advanced lens insights' REMOVED —
      // sold features must exist. No such features ship in this product;
      // selling them is a promise the codebase cannot keep.
      'knowledge graph',
      'rishi dialogue system',
    ],
  },
};

// ── TIER MODEL (remediation T6) ─────────────────────────────────
// One tier model: seeker | student | disciple. The authoritative tier is
// stored in public.users and read server-side (lib/auth/session.ts); the
// client obtains it from GET /api/auth/me via hooks/useTier.ts. There is
// deliberately NO localStorage tier and NO developer mode that force-grants
// a paid tier.

export function isPremium(tier: WisdomTier): boolean {
  return tier === 'student' || tier === 'disciple';
}

export function isDisciple(tier: WisdomTier): boolean {
  return tier === 'disciple';
}

export function getRishisVisible(tier: WisdomTier): number {
  return TIER_CONFIG[tier].rishisVisible;
}

export function canAccess(feature: string, tier: WisdomTier): boolean {
  const features = TIER_CONFIG[tier].features;
  return features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
}

// ── ANONYMOUS VIEW COUNTER ──────────────────────────────────────
// Per remediation T6 (6): a client-side daily view counter may remain for
// ANONYMOUS visitors as a soft gate. It is never the gate for signed-in
// tiers — the server decides those.

export function canViewStock(tier?: WisdomTier): boolean {
  // Signed-in tiers: unlimited stock views by tier config (server enforces
  // data-level gates); the soft counter below only applies to anonymous use.
  if (tier && tier !== 'seeker') return true;
  if (typeof window === 'undefined') return true;
  const limit = TIER_CONFIG[tier ?? 'seeker'].dailyStockLimit;
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

export function getViewsRemaining(tier?: WisdomTier): number {
  if (tier && tier !== 'seeker') return 999;
  if (typeof window === 'undefined') return 5;
  const limit = TIER_CONFIG[tier ?? 'seeker'].dailyStockLimit;
  if (limit === null) return 999;
  try {
    const today = new Date().toDateString();
    const key   = `stock_views_${today}`;
    const views = parseInt(localStorage.getItem(key) || '0', 10);
    return Math.max(0, limit - views);
  } catch { return 5; }
}

export function resetDailyLimit(): void {
  if (typeof window === 'undefined') return;
  try {
    const today = new Date().toDateString();
    localStorage.removeItem(`stock_views_${today}`);
  } catch {}
}
