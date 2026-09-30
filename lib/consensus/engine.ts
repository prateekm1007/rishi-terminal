import { Stock, ConsensusResult, RishiScore } from "./types";
import { runAllScorers }   from "./orchestrator";
import { weightedAverage } from "./weights";

/**
 * Core-fundamental fields that must be finite and not all-zero for a record
 * to count as complete data (remediation T11.4). price/mktcap are excluded:
 * a dead ticker can still carry a stale price while every fundamental is 0.
 */
const CORE_FUNDAMENTALS: Array<keyof Stock> = [
  "pe", "roe", "ocf", "rev", "revcagr", "epscagr",
  "opm", "roce", "de", "fcf", "bvps", "promo",
];

export function assessDataQuality(stock: Stock): "OK" | "INCOMPLETE" {
  const vals = CORE_FUNDAMENTALS.map(k => stock[k]);
  // Any non-finite core field -> unusable record.
  if (vals.some(v => !Number.isFinite(v))) return "INCOMPLETE";
  // A record where revenue, cash flows, book value, ROCE and promoter
  // holding are ALL zero carries no real fundamentals (dead/placeholder
  // ticker) even if a couple of leftover fields hold stub values — T11.4.
  const FUNDAMENTALS: Array<keyof Stock> = ["rev", "ocf", "fcf", "bvps", "roce", "promo"];
  if (FUNDAMENTALS.every(k => stock[k] === 0)) return "INCOMPLETE";
  return "OK";
}

function categorize(score: number): string {
  if (score >= 85) return "Legendary Compounder";
  if (score >= 75) return "High Conviction Quality";
  if (score >= 65) return "Classic Value Opportunity";
  if (score >= 55) return "Balanced Risk-Reward";
  if (score >= 45) return "Speculative with Merit";
  if (score >= 35) return "High Philosophical Conflict";
  return "Avoid - Low Rishi Conviction";
}

function analyzeTension(scores: RishiScore[]): { label: string; spread: number } {
  const vals = scores
    .map(s => s.score)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  if (vals.length < 2) return { label: "Insufficient Data", spread: 0 };
  const spread = Math.max(...vals) - Math.min(...vals);
  let label: string;
  if      (spread < 20) label = "Strong Consensus";
  else if (spread < 40) label = "Mild Disagreement";
  else if (spread < 60) label = "Moderate Disagreement";
  else if (spread < 80) label = "Significant Disagreement";
  else                  label = "Sharp Division";
  return { label, spread };
}

/**
 * Core consensus engine.
 * Pure function - same input always produces same output.
 * No side effects, no async, no randomness.
 *
 * T11: `consensus` is `null` ("Insufficient Data") when fewer than
 * MIN_VALID_SCORERS returned finite scores — the UI renders "—" and every
 * ranking sorts nulls last. Never NaN, never coerced to 0.
 */
export function buildConsensus(stock: Stock): ConsensusResult {
  const scores    = runAllScorers(stock);
  const consensus = weightedAverage(scores);
  const { label: tension, spread: tensionSpread } = analyzeTension(scores);
  const finiteScores = scores.filter(s => s.score !== null);

  return {
    asset:         stock,
    scores,
    consensus,
    category:      consensus === null ? "Insufficient Data" : categorize(consensus),
    dataQuality:   assessDataQuality(stock),
    tension,
    tensionSpread,
    weightedBy:    "Rishi Merit System v1",
    topBull:       finiteScores[0] ?? scores[0],
    topBear:       finiteScores[finiteScores.length - 1] ?? scores[scores.length - 1],
  };
}
