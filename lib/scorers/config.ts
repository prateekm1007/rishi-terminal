// ============================================================
// RISHI SCORE v2.0 — CENTRAL SCORING CONFIGURATION
// Change weights here — no other files need touching
// ============================================================

export interface PillarConfig {
  id:          string;
  name:        string;
  weight:      number;   // Must sum to 1.0 per mode
  description: string;
  enabled:     boolean;
}

// ── LONG MODE PILLARS (weights must sum to 1.0) ───────────────

export const LONG_PILLARS: PillarConfig[] = [
  {
    id:          "businessQuality",
    name:        "Business Quality",
    weight:      0.25,
    description: "ROE, ROCE, FCF, OPM, Piotroski, Working Capital",
    enabled:     true,
  },
  {
    id:          "valuation",
    name:        "Valuation & MOS",
    weight:      0.22,
    description: "PE, PB, EV/EBITDA, PEG, Dividend Yield",
    enabled:     true,
  },
  {
    id:          "growth",
    name:        "Growth Sustainability",
    weight:      0.18,
    description: "Revenue CAGR, EPS CAGR, Debt-Funded Growth Penalty",
    enabled:     true,
  },
  {
    id:          "moat",
    name:        "Economic Moat",
    weight:      0.15,
    description: "Sector Moat, ROE Premium, Pricing Power, Promoter Confidence",
    enabled:     true,
  },
  {
    id:          "governance",
    name:        "Management & Governance",
    weight:      0.12,
    description: "Pledge, Related Party, Accounting Flags, Interest Coverage",
    enabled:     true,
  },
  {
    id:          "sentiment",
    name:        "Sentiment & Catalyst",
    weight:      0.08,
    description: "RSI, FII/DII, 200DMA, Volume Trend",
    enabled:     true,
  },
];

// ── SHORT MODE PILLARS (weights must sum to 1.0) ──────────────

export const SHORT_PILLARS: PillarConfig[] = [
  {
    id:          "overvaluation",
    name:        "Overvaluation & Froth",
    weight:      0.25,
    description: "PE vs Sector, PB Extreme, EV/Sales vs Margins, PEG Excess",
    enabled:     true,
  },
  {
    id:          "fundamentalDecay",
    name:        "Fundamental Decay",
    weight:      0.22,
    description: "Declining ROE/ROCE, Negative FCF, Rising Debt, Altman Z-Score",
    enabled:     true,
  },
  {
    id:          "governanceRisk",
    name:        "Governance & Fraud Risk",
    weight:      0.20,
    description: "High Pledge, Related Party, Accounting Flags, Insider Selling",
    enabled:     true,
  },
  {
    id:          "moatDestruction",
    name:        "Moat Destruction",
    weight:      0.18,
    description: "USFDA Warnings, China API, DPCO Risk, Patent Cliff, Competition",
    enabled:     true,
  },
  {
    id:          "growthMirage",
    name:        "Growth Mirage",
    weight:      0.10,
    description: "Channel Stuffing, Revenue Recognition, Working Capital Deterioration",
    enabled:     true,
  },
  {
    id:          "catalyst",
    name:        "Catalyst & Timing",
    weight:      0.05,
    description: "Short Interest, Event Risk, Technical Breakdown",
    enabled:     true,
  },
];

// ── CONVICTION THRESHOLDS ─────────────────────────────────────

export const LONG_CONVICTION_THRESHOLDS = {
  LEGENDARY:       90,
  HIGH_CONVICTION: 80,
  STRONG:          70,
  WATCHLIST:       60,
  NEUTRAL:         50,
  AVOID:           0,
} as const;

export const SHORT_CONVICTION_THRESHOLDS = {
  LEGENDARY_SHORT:       85,
  HIGH_CONVICTION_SHORT: 75,
  TACTICAL_SHORT:        65,
  DANGEROUS_SHORT:       0,
} as const;

// ── SECTOR BENCHMARKS ─────────────────────────────────────────

export const SECTOR_BENCHMARKS_CONFIG = {
  IT:       { avgPE: 28, avgROE: 32, avgOPM: 24, avgDebt: 0.1, avgGrowth: 14 },
  Banking:  { avgPE: 16, avgROE: 14, avgOPM: 35, avgDebt: 8.0, avgGrowth: 12 },
  Pharma:   { avgPE: 32, avgROE: 16, avgOPM: 20, avgDebt: 0.5, avgGrowth: 10 },
  FMCG:     { avgPE: 45, avgROE: 38, avgOPM: 22, avgDebt: 0.2, avgGrowth: 10 },
  Auto:     { avgPE: 22, avgROE: 18, avgOPM: 14, avgDebt: 0.8, avgGrowth: 12 },
  Energy:   { avgPE: 18, avgROE: 14, avgOPM: 18, avgDebt: 1.2, avgGrowth: 8  },
  Infra:    { avgPE: 20, avgROE: 12, avgOPM: 16, avgDebt: 2.0, avgGrowth: 14 },
  Metals:   { avgPE: 12, avgROE: 16, avgOPM: 18, avgDebt: 1.0, avgGrowth: 6  },
  Realty:   { avgPE: 30, avgROE: 10, avgOPM: 28, avgDebt: 1.5, avgGrowth: 18 },
  Telecom:  { avgPE: 35, avgROE: 8,  avgOPM: 32, avgDebt: 3.0, avgGrowth: 8  },
  Consumer: { avgPE: 40, avgROE: 28, avgOPM: 18, avgDebt: 0.3, avgGrowth: 12 },
  Default:  { avgPE: 25, avgROE: 16, avgOPM: 18, avgDebt: 1.0, avgGrowth: 10 },
} as const;

export type SectorKey = keyof typeof SECTOR_BENCHMARKS_CONFIG;

export function getSectorBenchmark(sector: string) {
  return SECTOR_BENCHMARKS_CONFIG[sector as SectorKey] ?? SECTOR_BENCHMARKS_CONFIG.Default;
}

// ── VALIDATE WEIGHTS ──────────────────────────────────────────
// Call this in dev to catch config errors early

export function validateWeights(): void {
  const longSum  = LONG_PILLARS.filter(p => p.enabled).reduce((s, p) => s + p.weight, 0);
  const shortSum = SHORT_PILLARS.filter(p => p.enabled).reduce((s, p) => s + p.weight, 0);

  const longOk  = Math.abs(longSum  - 1.0) < 0.001;
  const shortOk = Math.abs(shortSum - 1.0) < 0.001;

  if (!longOk)  console.error("[RishiScore] LONG weights sum to",  longSum.toFixed(3),  "— must be 1.000");
  if (!shortOk) console.error("[RishiScore] SHORT weights sum to", shortSum.toFixed(3), "— must be 1.000");
  if (longOk && shortOk) console.log("[RishiScore] ✅ All weights valid");
}
