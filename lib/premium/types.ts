export type UserTier = "free" | "premium";

export interface PremiumLimits {
  deepDiveViewsPerDay: number;
  rishisVisible: number;
  canExportData: boolean;
  hasAIChat: boolean;
  hasAdvancedScreener: boolean;
  hasUnlimitedWatchlist: boolean;
  hasPortfolioAnalyzer: boolean;
}

export interface ViewTracker {
  count: number;
  lastResetDate: string;
}

export const TIER_LIMITS: Record<UserTier, PremiumLimits> = {
  free: {
    deepDiveViewsPerDay: 5,
    rishisVisible: 5,
    canExportData: false,
    hasAIChat: false,
    hasAdvancedScreener: false,
    hasUnlimitedWatchlist: false,
    hasPortfolioAnalyzer: false,
  },
  premium: {
    deepDiveViewsPerDay: Infinity,
    rishisVisible: Infinity,
    canExportData: true,
    hasAIChat: true,
    hasAdvancedScreener: true,
    hasUnlimitedWatchlist: true,
    hasPortfolioAnalyzer: true,
  },
};