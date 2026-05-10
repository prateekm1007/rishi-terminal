// ============================================================
// RISHI COMMENTARY ENGINE
// Generates philosophical commentary in the voice of legends
// ============================================================

import { RishiScoreResult, StockMetrics, ScoreMode } from "./types";

// ── Long Commentary Templates ────────────────────────────────

const LEGENDARY_LONG = [
  "As Jhunjhunwala would say — this is a business that earns the right to grow. The numbers do not lie: capital allocation is exceptional, the moat is widening, and the promoters have meaningful skin in the game. At current valuations, this stock offers what every serious investor seeks — a margin of safety with a growth kicker.",
  "Damani would recognise this pattern immediately. A consumer franchise with pricing power, consistent return on capital, and conservative management. These businesses, bought patiently, create generational wealth. The market has not yet fully appreciated what the next decade holds.",
];

const HIGH_CONVICTION_LONG = [
  "This stock passes Buffett's primary filter — it is a good business at a fair price. The competitive position is defensible, free cash flow is real and growing, and the balance sheet is clean. The investor who buys quality and waits is almost always rewarded.",
  "Lynch would classify this as a stalwart with growth characteristics. Revenue visibility is high, the sector tailwind is structural, and the management has proven it can allocate capital wisely. Patience here will likely be well-rewarded.",
];

const STRONG_LONG = [
  "A solid business with identifiable advantages. The fundamentals are sound, valuation is reasonable, and the growth trajectory is believable. Not without risk, but the risk-reward is tilted favourably for the long-term investor.",
];

const WATCHLIST_LONG = [
  "Worthy of a watchlist position. The business quality is reasonable, but valuation or governance concerns warrant patience. A better entry point, or evidence of improving fundamentals, would make this significantly more compelling.",
];

const AVOID_LONG = [
  "The numbers tell a cautionary tale. Capital efficiency is poor, the balance sheet is stressed, and the valuation offers no margin of safety. As Graham would remind us — the first rule of investing is: do not lose money. This situation makes that principle difficult to uphold.",
];

// ── Short Commentary Templates ───────────────────────────────

const LEGENDARY_SHORT = [
  "This is a Chanos-grade short thesis. The combination of peak-cycle valuation, deteriorating fundamentals, aggressive accounting, and governance concerns creates a setup where multiple things need to go right for the bulls — and only one needs to go wrong. The margin of safety for shorts is wide.",
  "Burry would recognise this structure. The market is pricing in a version of the future that the current operating reality does not support. When the narrative collides with the fundamentals, the adjustment is typically violent. The short thesis here is not speculative — it is anchored in the numbers.",
];

const HIGH_CONVICTION_SHORT = [
  "A high-conviction short with clear catalysts. Overvaluation is extreme, the competitive position is eroding, and the promoter's actions suggest they know more than they are communicating to the market. Einhorn would call this a 'show me' situation — and the showing is not going well.",
];

const TACTICAL_SHORT = [
  "A tactical short opportunity based on valuation excess and near-term catalyst risk. Not a structural thesis, but the risk-reward for a short position is attractive in the current context. Position sizing should be conservative given liquidity and potential squeeze risk.",
];

// ── Commentary Generator ─────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCommentary(result: RishiScoreResult, metrics: StockMetrics): string {
  const { conviction, mode, finalScore } = result;

  if (mode === "LONG") {
    if (conviction === "LEGENDARY")        return pick(LEGENDARY_LONG);
    if (conviction === "HIGH_CONVICTION")  return pick(HIGH_CONVICTION_LONG);
    if (conviction === "STRONG")           return pick(STRONG_LONG);
    if (conviction === "WATCHLIST")        return pick(WATCHLIST_LONG);
    return pick(AVOID_LONG);
  } else {
    if (conviction === "LEGENDARY_SHORT")       return pick(LEGENDARY_SHORT);
    if (conviction === "HIGH_CONVICTION_SHORT") return pick(HIGH_CONVICTION_SHORT);
    return pick(TACTICAL_SHORT);
  }
}

export function generateHeadline(result: RishiScoreResult, metrics: StockMetrics): string {
  const { conviction, mode, finalScore } = result;
  const s = finalScore.toFixed(0);
  const sym = metrics.symbol;

  if (mode === "LONG") {
    if (conviction === "LEGENDARY")       return sym + " scores " + s + "/100 — A rare, legendary long opportunity";
    if (conviction === "HIGH_CONVICTION") return sym + " scores " + s + "/100 — High conviction buy";
    if (conviction === "STRONG")          return sym + " scores " + s + "/100 — Strong fundamental case";
    if (conviction === "WATCHLIST")       return sym + " scores " + s + "/100 — Add to watchlist, await better entry";
    if (conviction === "NEUTRAL")         return sym + " scores " + s + "/100 — Hold, mixed signals";
    return sym + " scores " + s + "/100 — Avoid: significant concerns";
  } else {
    if (conviction === "LEGENDARY_SHORT")       return sym + " short scores " + s + "/100 — Legendary short thesis";
    if (conviction === "HIGH_CONVICTION_SHORT") return sym + " short scores " + s + "/100 — High conviction short";
    return sym + " short scores " + s + "/100 — Tactical short opportunity";
  }
}