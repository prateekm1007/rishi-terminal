import { TIER_LIMITS } from "./types";
import { getUserTier, getViewTracker, setViewTracker, resetViewTrackerIfNeeded } from "./storage";

// 🔓 DEVELOPER MODE — FORCE PREMIUM
const DEV_MODE = true;

export function canViewDeepDive(): boolean {
  if (DEV_MODE) return true;
  
  const tier = getUserTier();
  if (tier === "premium") return true;

  resetViewTrackerIfNeeded();
  const tracker = getViewTracker();
  const limit = TIER_LIMITS.free.deepDiveViewsPerDay;

  return tracker.count < limit;
}

export function recordDeepDiveView(): void {
  if (DEV_MODE) return; // Don't count in dev mode
  
  const tier = getUserTier();
  if (tier === "premium") return;

  resetViewTrackerIfNeeded();
  const tracker = getViewTracker();
  tracker.count += 1;
  setViewTracker(tracker);
}

export function getViewsRemaining(): number {
  if (DEV_MODE) return Infinity;
  
  const tier = getUserTier();
  if (tier === "premium") return Infinity;

  resetViewTrackerIfNeeded();
  const tracker = getViewTracker();
  const limit = TIER_LIMITS.free.deepDiveViewsPerDay;

  return Math.max(0, limit - tracker.count);
}

export function getRishisVisible(): number {
  if (DEV_MODE) return Infinity;
  
  const tier = getUserTier();
  return TIER_LIMITS[tier].rishisVisible;
}

export function isPremium(): boolean {
  if (DEV_MODE) return true;
  return getUserTier() === "premium";
}