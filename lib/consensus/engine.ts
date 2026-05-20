import { Stock, ConsensusResult, RishiScore } from "./types";
import { runAllScorers }   from "./orchestrator";
import { weightedAverage } from "./weights";

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
  if (scores.length < 2) return { label: "Insufficient Data", spread: 0 };
  const vals   = scores.map(s => s.score);
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
 */
export function buildConsensus(stock: Stock): ConsensusResult {
  const scores    = runAllScorers(stock);
  const consensus = weightedAverage(scores);
  const { label: tension, spread: tensionSpread } = analyzeTension(scores);

  return {
    asset:         stock,
    scores,
    consensus,
    category:      categorize(consensus),
    tension,
    tensionSpread,
    weightedBy:    "Rishi Merit System v1",
    topBull:       scores[0],
    topBear:       scores[scores.length - 1],
  };
}