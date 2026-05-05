import { UserTier, ViewTracker } from "./types";

const TIER_KEY = "rishi_user_tier";
const VIEW_TRACKER_KEY = "rishi_view_tracker";

export function getUserTier(): UserTier {
  if (typeof window === "undefined") return "free";
  const stored = localStorage.getItem(TIER_KEY);
  return (stored === "premium" ? "premium" : "free") as UserTier;
}

export function setUserTier(tier: UserTier): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIER_KEY, tier);
}

export function getViewTracker(): ViewTracker {
  if (typeof window === "undefined") {
    return { count: 0, lastResetDate: new Date().toISOString().split("T")[0] };
  }

  const stored = localStorage.getItem(VIEW_TRACKER_KEY);
  if (!stored) {
    return { count: 0, lastResetDate: new Date().toISOString().split("T")[0] };
  }

  try {
    return JSON.parse(stored) as ViewTracker;
  } catch {
    return { count: 0, lastResetDate: new Date().toISOString().split("T")[0] };
  }
}

export function setViewTracker(tracker: ViewTracker): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEW_TRACKER_KEY, JSON.stringify(tracker));
}

export function resetViewTrackerIfNeeded(): void {
  const tracker = getViewTracker();
  const today = new Date().toISOString().split("T")[0];

  if (tracker.lastResetDate !== today) {
    setViewTracker({ count: 0, lastResetDate: today });
  }
}