// ============================================================
// GAMIFICATION SYSTEM
// Streaks, levels, badges, daily ritual
// ============================================================

export interface UserProgress {
  userId:          string;
  level:           EnlightenmentLevel;
  xp:              number;
  streak:          number;
  lastVisit:       string;
  totalPredictions: number;
  correctPredictions: number;
  badges:          Badge[];
  alphaScore:      number;
}

export type EnlightenmentLevel =
  | "Seeker"        // 0-999 XP
  | "Apprentice"    // 1000-2999 XP
  | "Practitioner"  // 3000-6999 XP
  | "Rishi"         // 7000-14999 XP
  | "Maharishi";    // 15000+ XP

export interface Badge {
  id:          string;
  name:        string;
  emoji:       string;
  description: string;
  earnedAt:    string;
  rarity:      "common" | "rare" | "legendary";
}

export interface DailyRitual {
  date:       string;
  longPick:   { symbol: string; score: number; reason: string };
  shortPick:  { symbol: string; score: number; reason: string };
  wisdom:     { quote: string; author: string };
  completed:  boolean;
}

// ── XP System ──────────────────────────────────────────────────

export function getXPForAction(action: string): number {
  const XP_TABLE: Record<string, number> = {
    daily_visit:          10,
    view_stock:           5,
    add_watchlist:        15,
    make_prediction:      25,
    correct_prediction:   100,
    chat_with_rishi:      20,
    build_fno_strategy:   30,
    complete_daily_ritual: 50,
    streak_7:             150,
    streak_30:            500,
    streak_100:           2000,
  };
  return XP_TABLE[action] ?? 0;
}

export function getLevelFromXP(xp: number): EnlightenmentLevel {
  if (xp >= 15000) return "Maharishi";
  if (xp >= 7000)  return "Rishi";
  if (xp >= 3000)  return "Practitioner";
  if (xp >= 1000)  return "Apprentice";
  return "Seeker";
}

export function getXPForNextLevel(currentXP: number): number {
  const level = getLevelFromXP(currentXP);
  const THRESHOLDS: Record<EnlightenmentLevel, number> = {
    Seeker: 1000, Apprentice: 3000, Practitioner: 7000,
    Rishi: 15000, Maharishi: 99999,
  };
  return THRESHOLDS[level];
}

// ── Streak System ──────────────────────────────────────────────

export function updateStreak(lastVisit: string): { newStreak: number; bonusXP: number } {
  const today = new Date().toDateString();
  const last  = new Date(lastVisit).toDateString();

  if (today === last) return { newStreak: 0, bonusXP: 0 };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (last === yesterdayStr) {
    const newStreak = (parseInt(localStorage.getItem("streak") || "0") + 1);
    const bonusXP = newStreak % 7 === 0 ? 150 : newStreak % 30 === 0 ? 500 : 0;
    return { newStreak, bonusXP };
  }

  return { newStreak: 1, bonusXP: 0 };
}

// ── Badge System ───────────────────────────────────────────────

export const ALL_BADGES: Badge[] = [
  {
    id: "first_visit", name: "First Step", emoji: "🚶",
    description: "Visited Rishi Terminal for the first time",
    earnedAt: "", rarity: "common",
  },
  {
    id: "week_streak", name: "Dedicated Seeker", emoji: "🔥",
    description: "Maintained 7-day streak",
    earnedAt: "", rarity: "rare",
  },
  {
    id: "month_streak", name: "Rishi Discipline", emoji: "🧘",
    description: "Maintained 30-day streak",
    earnedAt: "", rarity: "legendary",
  },
  {
    id: "perfect_week", name: "Oracle", emoji: "🔮",
    description: "7/7 correct predictions in a week",
    earnedAt: "", rarity: "legendary",
  },
  {
    id: "fno_master", name: "Options Architect", emoji: "🎯",
    description: "Built 50 F&O strategies",
    earnedAt: "", rarity: "rare",
  },
  {
    id: "chat_addict", name: "Wisdom Seeker", emoji: "💬",
    description: "Chatted with Rishis 100 times",
    earnedAt: "", rarity: "common",
  },
  {
    id: "alpha_positive", name: "Market Beater", emoji: "📈",
    description: "Personal Alpha > Nifty for 3 months",
    earnedAt: "", rarity: "legendary",
  },
];

export function checkBadgeEarned(userId: string, action: string, progress: UserProgress): Badge | null {
  if (action === "daily_visit" && progress.streak === 7) {
    return ALL_BADGES.find(b => b.id === "week_streak")!;
  }
  if (action === "daily_visit" && progress.streak === 30) {
    return ALL_BADGES.find(b => b.id === "month_streak")!;
  }
  if (action === "make_prediction" && progress.correctPredictions === 7) {
    return ALL_BADGES.find(b => b.id === "perfect_week")!;
  }
  return null;
}

// ── Daily Ritual Generator ────────────────────────────────────

export function generateDailyRitual(date: string): DailyRitual {
  const LONG_PICKS = [
    { symbol:"TCS",    score:88, reason:"Consistent ROE 48%, zero debt, world-class capital allocation" },
    { symbol:"INFY",   score:85, reason:"Strong FCF generation, margin expansion, sector tailwinds" },
    { symbol:"TITAN",  score:82, reason:"Brand moat, pricing power, Damani-approved compounder" },
    { symbol:"DMART",  score:90, reason:"Legendary business model, disciplined expansion, founder-led" },
  ];

  const SHORT_PICKS = [
    { symbol:"ZOMATO",   score:72, reason:"Negative FCF, PE > 300x, no clear path to profitability" },
    { symbol:"PAYTM",    score:81, reason:"Regulatory risk, cash burn, valuation disconnect" },
    { symbol:"ADANIENT", score:78, reason:"Elevated valuation, governance concerns, leverage" },
  ];

  const WISDOM_QUOTES = [
    { quote:"The stock market is a device for transferring money from the impatient to the patient.", author:"Warren Buffett" },
    { quote:"Risk comes from not knowing what you're doing.", author:"Warren Buffett" },
    { quote:"In the short run, the market is a voting machine. In the long run, it's a weighing machine.", author:"Benjamin Graham" },
    { quote:"The four most dangerous words in investing: this time it's different.", author:"John Templeton" },
    { quote:"If you can't find anything in the market worth buying, the market is probably fairly priced.", author:"Howard Marks" },
  ];

  const longIdx = (new Date(date).getDate()) % LONG_PICKS.length;
  const shortIdx = (new Date(date).getDate() + 1) % SHORT_PICKS.length;
  const wisdomIdx = (new Date(date).getDate() + 2) % WISDOM_QUOTES.length;

  return {
    date,
    longPick:  LONG_PICKS[longIdx],
    shortPick: SHORT_PICKS[shortIdx],
    wisdom:    WISDOM_QUOTES[wisdomIdx],
    completed: false,
  };
}

// ── LocalStorage Helpers ───────────────────────────────────────

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return getDefaultProgress();
  try {
    const stored = localStorage.getItem("rishi_progress");
    if (stored) return JSON.parse(stored);
  } catch {}
  return getDefaultProgress();
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("rishi_progress", JSON.stringify(progress));
  } catch {}
}

function getDefaultProgress(): UserProgress {
  return {
    userId: "guest",
    level: "Seeker",
    xp: 0,
    streak: 0,
    lastVisit: new Date().toISOString(),
    totalPredictions: 0,
    correctPredictions: 0,
    badges: [],
    alphaScore: 0,
  };
}

export function awardXP(amount: number): void {
  const progress = loadProgress();
  progress.xp += amount;
  progress.level = getLevelFromXP(progress.xp);
  saveProgress(progress);
}