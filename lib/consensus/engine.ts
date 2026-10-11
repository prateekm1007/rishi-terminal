import 'server-only';

import { Stock, ConsensusResult, RishiScore } from "./types";
import { runAllScorers, type ScoringContext }   from "./orchestrator";
import { weightedAverage } from "./weights";
import { dispersion } from "./dispersion";
import {
  dataQualityFromSeedStock,
  type DataQuality,
} from "../dataQuality";

/**
 * Core consensus engine.
 *
 * Round-46 P0-1: the former assessDataQuality ("OK" | "INCOMPLETE", T11.4
 * + the round-5 impossibility rules) is FOLDED into the closed four-value
 * dataQuality derivation (lib/dataQuality.ts) — same rules, the
 * founder-audit vocabulary, one derivation for every entry path. The
 * engine labels its input honestly (dataQuality) but does NOT gate the
 * number: the verdict gate lives on THE scoring surface (getStockScore),
 * so engine-level tests keep exercising the math while every product
 * path is gated identically.
 */

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
export function buildConsensus(stock: Stock, ctx?: ScoringContext): ConsensusResult {
  const scores    = runAllScorers(stock, ctx);
  const consensus = weightedAverage(scores);
  const { label: tension, spread: tensionSpread } = analyzeTension(scores);
  const finiteScores = scores.filter(s => s.score !== null);
  // S2-06: the whole-panel disagreement metric (docs/methodology/
  // dispersion.md) — population σ over the valid verdicts, null below
  // 2 valid (one voice is not agreement).
  const panelDispersion = dispersion(scores.map(s => s.score));
  // P0-1: the caller may DECLARE the derived provenance (the resolved
  // path — it knows the per-field sources); the bare seed record derives
  // its own (always seed or missing — the dataset is placeholder).
  const dataQuality: DataQuality = ctx?.dataQuality ?? dataQualityFromSeedStock(stock);

  return {
    asset:         stock,
    scores,
    consensus,
    category:      consensus === null ? "Insufficient Data" : categorize(consensus),
    dataQuality,
    tension,
    tensionSpread,
    dispersion:    panelDispersion,
    weightedBy:    "Rishi Merit System v1",
    topBull:       finiteScores[0] ?? scores[0],
    topBear:       finiteScores[finiteScores.length - 1] ?? scores[scores.length - 1],
  };
}
