// ============================================================
// RISHI SCORE v2.0 — CORE TYPES & UTILITIES
// All scorers import from here — single source of truth
// ============================================================

export type ScoreMode = "LONG" | "SHORT";

export type ConvictionBand =
  | "LEGENDARY" | "HIGH_CONVICTION" | "STRONG"
  | "WATCHLIST"  | "NEUTRAL"         | "AVOID"
  | "LEGENDARY_SHORT" | "HIGH_CONVICTION_SHORT"
  | "TACTICAL_SHORT"  | "DANGEROUS_SHORT";

export type Grade =
  | "Legendary" | "Outstanding" | "Excellent"
  | "Good"      | "Fair"        | "Speculative" | "Avoid";

// ── Stock Metrics (Input) ─────────────────────────────────────

export interface StockMetrics {
  symbol:              string;
  name:                string;
  sector:              string;
  industry?:           string;

  // Valuation
  pe:                  number;
  pb:                  number;
  evEbitda?:           number;
  pegRatio?:           number;
  evSales?:            number;
  dividendYield?:      number;
  marketCap?:          number;

  // Profitability
  roe:                 number;
  roce?:               number;
  opm?:                number;
  npm?:                number;
  fcfMargin?:          number;
  grossMargin?:        number;

  // Growth
  revenueCAGR3Y?:      number;
  revenueCAGR5Y?:      number;
  epsCAGR3Y?:          number;
  epsCAGR5Y?:          number;

  // Balance Sheet
  debtToEquity?:       number;
  currentRatio?:       number;
  interestCoverage?:   number;
  debtEbitda?:         number;

  // Governance
  promoterHolding?:    number;
  promoterPledge?:     number;
  fiiHolding?:         number;
  diiHolding?:         number;
  insiderBuying?:      boolean;
  relatedPartyPct?:    number;
  accountingFlags?:    number;

  // Quality
  piotroskiScore?:     number;
  altmanZScore?:       number;
  debtorDays?:         number;
  inventoryDays?:      number;
  cashConversion?:     number;

  // Technical
  rsi?:                number;
  above52WHigh?:       boolean;
  above200DMA?:        boolean;
  volumeTrend?:        "increasing" | "decreasing" | "stable";

  // Short-Specific
  usfdaWarnings?:      number;
  shortInterest?:      number;
  chinaApiDependence?: number;
  dpcoRisk?:           number;
  patentCliffRisk?:    number;

  // Macro
  betaToNifty?:        number;
  correlationToSector?: number;
}

// ── Pillar Output ─────────────────────────────────────────────

export interface Signal {
  label:    string;
  value:    string | number;
  impact:   "positive" | "negative" | "neutral";
  strength: "strong" | "moderate" | "weak";
}

export interface RedFlag {
  label:    string;
  severity: "critical" | "major" | "minor";
  penalty:  number;
}

export interface PillarScore {
  id:         string;
  name:       string;
  score:      number;
  weight:     number;
  weighted:   number;
  confidence: number;
  signals:    Signal[];
  redFlags:   RedFlag[];
}

// ── Final Score Output ────────────────────────────────────────

export interface RishiScoreResult {
  symbol:          string;
  mode:            ScoreMode;
  timestamp:       string;

  finalScore:      number;
  conviction:      ConvictionBand;
  grade:           Grade;
  action:          ActionType;

  pillars:         PillarScore[];
  totalWeighted:   number;
  trendMultiplier: number;
  sectorAdj:       number;
  confidence:      number;
  dataQuality:     "HIGH" | "MEDIUM" | "LOW";

  headline:        string;
  commentary:      string;

  // Short-specific
  shortSqueezeRisk?:  "HIGH" | "MEDIUM" | "LOW";
  liquidityRisk?:     "HIGH" | "MEDIUM" | "LOW";
  blackSwanRisk?:     "HIGH" | "MEDIUM" | "LOW";

  // Deterministic commentary key (for caching/consistency)
  commentaryKey:   string;
}

export type ActionType =
  | "STRONG_BUY" | "BUY" | "HOLD"
  | "REDUCE"     | "SELL"
  | "SHORT"      | "STRONG_SHORT";

// ── Sector Benchmark ──────────────────────────────────────────

export interface SectorBenchmark {
  avgPE:     number;
  avgROE:    number;
  avgOPM:    number;
  avgDebt:   number;
  avgGrowth: number;
}

// ── Pure Utility Functions ────────────────────────────────────

export function clamp(val: number, min: number, max: number): number {
  if (isNaN(val) || !isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function normalize(val: number, bad: number, good: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  if (good === bad) return 50;
  const raw = (val - bad) / (good - bad) * 100;
  return clamp(raw, 0, 100);
}

export function safeNum(val: number | undefined | null, fallback = 0): number {
  if (val == null || isNaN(val) || !isFinite(val)) return fallback;
  return val;
}

export function getConviction(score: number, mode: ScoreMode): ConvictionBand {
  if (mode === "LONG") {
    if (score >= 90) return "LEGENDARY";
    if (score >= 80) return "HIGH_CONVICTION";
    if (score >= 70) return "STRONG";
    if (score >= 60) return "WATCHLIST";
    if (score >= 50) return "NEUTRAL";
    return "AVOID";
  }
  if (score >= 85) return "LEGENDARY_SHORT";
  if (score >= 75) return "HIGH_CONVICTION_SHORT";
  if (score >= 65) return "TACTICAL_SHORT";
  return "DANGEROUS_SHORT";
}

export function getGrade(score: number): Grade {
  if (score >= 90) return "Legendary";
  if (score >= 80) return "Outstanding";
  if (score >= 70) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 40) return "Speculative";
  return "Avoid";
}

export function getAction(score: number, mode: ScoreMode): ActionType {
  if (mode === "LONG") {
    if (score >= 85) return "STRONG_BUY";
    if (score >= 70) return "BUY";
    if (score >= 55) return "HOLD";
    if (score >= 40) return "REDUCE";
    return "SELL";
  }
  if (score >= 80) return "STRONG_SHORT";
  return "SHORT";
}

// ── Deterministic Commentary Key ─────────────────────────────
// Replaces Math.random() — same inputs always produce same key

export function buildCommentaryKey(
  score:      number,
  conviction: ConvictionBand,
  mode:       ScoreMode,
  topFlag:    string
): string {
  const bucket = Math.floor(score / 10) * 10;
  const flagHash = topFlag.length % 4;
  return mode + "_" + conviction + "_" + bucket + "_" + flagHash;
}

// ── Data Quality ──────────────────────────────────────────────

export function getDataQuality(m: StockMetrics): "HIGH" | "MEDIUM" | "LOW" {
  const coreFields = [
    m.roe, m.roce, m.fcfMargin, m.opm,
    m.pe,  m.pb,   m.revenueCAGR3Y, m.epsCAGR3Y,
    m.promoterHolding, m.debtToEquity,
  ];
  const filled = coreFields.filter(f => f != null && !isNaN(f as number)).length;
  const pct    = filled / coreFields.length;
  if (pct >= 0.8) return "HIGH";
  if (pct >= 0.5) return "MEDIUM";
  return "LOW";
}

// ── Short Risk Flags ──────────────────────────────────────────

export function getShortRiskFlags(m: StockMetrics) {
  const squeezeRisk = safeNum(m.shortInterest) > 15 ? "HIGH" :
                      safeNum(m.shortInterest) > 8  ? "MEDIUM" : "LOW";

  const liquidityRisk = safeNum(m.marketCap, 999999) < 2000  ? "HIGH" :
                        safeNum(m.marketCap, 999999) < 10000 ? "MEDIUM" : "LOW";

  const blackSwanRisk = safeNum(m.betaToNifty, 1) > 2   ? "HIGH" :
                        safeNum(m.betaToNifty, 1) > 1.3 ? "MEDIUM" : "LOW";

  return { squeezeRisk, liquidityRisk, blackSwanRisk } as const;
}