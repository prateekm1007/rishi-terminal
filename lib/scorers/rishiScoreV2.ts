// ============================================================
// RISHI SCORE v2.0 — MASTER ENGINE
// Uses config registry — add pillars without touching this file
// ============================================================

import {
  StockMetrics, RishiScoreResult, ScoreMode, PillarScore,
  clamp, getConviction, getGrade, getAction,
  getDataQuality, getShortRiskFlags, buildCommentaryKey,
} from "./types";

import { scoreBusinessQuality } from "./pillars/businessQuality";
import { scoreValuation }       from "./pillars/valuation";
import { scoreGrowth }          from "./pillars/growth";
import { scoreMoat }            from "./pillars/moat";
import { scoreGovernance }      from "./pillars/governance";
import { scoreSentiment }       from "./pillars/sentiment";

import { scoreOvervaluation }   from "./shorts/overvaluation";
import { scoreFundamentalDecay } from "./shorts/decay";
import {
  scoreGovernanceRisk,
  scoreMoatDestruction,
  scoreGrowthMirage,
  scoreCatalyst,
} from "./shorts/governanceRisk";

import { generateCommentary, generateHeadline } from "./commentary";

// ── Simple in-memory cache ────────────────────────────────────

const scoreCache = new Map<string, { result: RishiScoreResult; ts: number }>();
const CACHE_TTL  = 5 * 60 * 1000; // 5 minutes

function getCacheKey(symbol: string, mode: ScoreMode): string {
  return symbol + "_" + mode;
}

// ── Trend Multiplier ─────────────────────────────────────────

function getTrendMultiplier(m: StockMetrics, mode: ScoreMode): number {
  const growthAccel = (m.revenueCAGR3Y ?? 0) > (m.revenueCAGR5Y ?? 0);
  const marginOk    = (m.opm ?? 0) > 15;
  const pioBig      = (m.piotroskiScore ?? 0) >= 7;

  if (mode === "LONG") {
    let mult = 1.0;
    if (growthAccel) mult += 0.04;
    if (marginOk)    mult += 0.03;
    if (pioBig)      mult += 0.04;
    return clamp(mult, 0.88, 1.12);
  } else {
    let mult = 1.0;
    if (!growthAccel) mult += 0.04;
    if (!marginOk)    mult += 0.03;
    return clamp(mult, 0.88, 1.12);
  }
}

// ── MAIN CALCULATE FUNCTION ───────────────────────────────────

export function calculateRishiScore(
  metrics:     StockMetrics,
  mode:        ScoreMode = "LONG",
  useCache:    boolean   = true,
): RishiScoreResult {

  // Cache check
  if (useCache) {
    const key    = getCacheKey(metrics.symbol, mode);
    const cached = scoreCache.get(key);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return cached.result;
    }
  }

  // ── Score all pillars ───────────────────────────────────────

  let pillars: PillarScore[];

  if (mode === "LONG") {
    pillars = [
      scoreBusinessQuality(metrics),
      scoreValuation(metrics),
      scoreGrowth(metrics),
      scoreMoat(metrics),
      scoreGovernance(metrics),
      scoreSentiment(metrics),
    ];
  } else {
    pillars = [
      scoreOvervaluation(metrics),
      scoreFundamentalDecay(metrics),
      scoreGovernanceRisk(metrics),
      scoreMoatDestruction(metrics),
      scoreGrowthMirage(metrics),
      scoreCatalyst(metrics),
    ];
  }

  // ── Aggregate ───────────────────────────────────────────────

  const totalWeighted    = pillars.reduce((s, p) => s + p.weighted, 0);
  const trendMultiplier  = getTrendMultiplier(metrics, mode);
  const sectorAdj        = 0; // Reserved for future sector data
  const rawScore         = totalWeighted * trendMultiplier + sectorAdj;
  const finalScore       = clamp(rawScore, 0, 100);

  const conviction  = getConviction(finalScore, mode);
  const grade       = getGrade(finalScore);
  const action      = getAction(finalScore, mode);
  const dataQuality = getDataQuality(metrics);
  const confidence  = pillars.reduce((s, p) => s + p.confidence, 0) / pillars.length;

  // Deterministic commentary key
  const topFlag      = pillars.flatMap(p => p.redFlags)[0]?.label ?? "none";
  const commentaryKey = buildCommentaryKey(finalScore, conviction, mode, topFlag);

  // Short risk flags
  const shortRisks = mode === "SHORT" ? getShortRiskFlags(metrics) : null;

  const result: RishiScoreResult = {
    symbol:          metrics.symbol,
    mode,
    timestamp:       new Date().toISOString(),
    finalScore,
    conviction,
    grade,
    action,
    pillars,
    totalWeighted,
    trendMultiplier,
    sectorAdj,
    confidence,
    dataQuality,
    commentaryKey,
    headline:        "",
    commentary:      "",
    ...(shortRisks ? {
      shortSqueezeRisk: shortRisks.squeezeRisk,
      liquidityRisk:    shortRisks.liquidityRisk,
      blackSwanRisk:    shortRisks.blackSwanRisk,
    } : {}),
  };

  result.commentary = generateCommentary(result, metrics);
  result.headline   = generateHeadline(result, metrics);

  // Cache result
  if (useCache) {
    scoreCache.set(getCacheKey(metrics.symbol, mode), { result, ts: Date.now() });
  }

  return result;
}

// ── Dual Score ────────────────────────────────────────────────

export function calculateDualScore(metrics: StockMetrics): {
  long:  RishiScoreResult;
  short: RishiScoreResult;
} {
  return {
    long:  calculateRishiScore(metrics, "LONG"),
    short: calculateRishiScore(metrics, "SHORT"),
  };
}

// ── Quick Score (from basic stock data) ───────────────────────

export function quickScore(stock: {
  symbol: string;
  name:   string;
  sector: string;
  pe:     number;
  pb:     number;
  roe:    number;
  [key: string]: any;
}): RishiScoreResult {
  return calculateRishiScore(stock as StockMetrics, "LONG");
}

// ── Clear Cache ───────────────────────────────────────────────

export function clearScoreCache(): void {
  scoreCache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return { size: scoreCache.size, keys: Array.from(scoreCache.keys()) };
}