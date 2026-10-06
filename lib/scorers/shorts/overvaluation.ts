import 'server-only';

import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";
import { getSectorBenchmark, getShortPillarWeight } from "../config";

// Round 20 (qvps-short-v2, contract A1.1): cutoffs unchanged, points
// rescaled so this pillar can express its declared 0-100 range from
// resolvable inputs (pe vs sector + pb worst case = 100).

export function scoreOvervaluation(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const bench = getSectorBenchmark(m.sector);
  const weight = getShortPillarWeight("overvaluation");
  let score = 0;

  if (m.pe != null && m.pe > 0) {
    const ratio = safeNum(m.pe) / bench.avgPE;
    if (ratio > 3)       { score += 55; redFlags.push({ label: "PE > 3x sector — extreme froth", severity: "critical", penalty: 0 }); }
    else if (ratio > 2)  { score += 40; redFlags.push({ label: "PE > 2x sector — significant overvaluation", severity: "major", penalty: 0 }); }
    else if (ratio > 1.5){ score += 25; }
    signals.push({ label: "P/E vs Sector", value: m.pe.toFixed(1) + "x (sector: " + bench.avgPE + "x)", impact: ratio > 2 ? "negative" : "neutral", strength: ratio > 3 ? "strong" : "moderate" });
  }

  if (m.pb != null) {
    const v = safeNum(m.pb);
    if (v > 10)     { score += 45; signals.push({ label: "P/B", value: v.toFixed(1) + "x — extreme", impact: "negative", strength: "strong" }); }
    else if (v > 6) { score += 30; signals.push({ label: "P/B", value: v.toFixed(1) + "x — elevated", impact: "negative", strength: "moderate" }); }
  }

  if (m.evSales != null && m.opm != null) {
    if (safeNum(m.evSales) > 8 && safeNum(m.opm) < 10) {
      score += 20;
      redFlags.push({ label: "High EV/Sales (" + m.evSales + "x) + thin margins — overvaluation trap", severity: "critical", penalty: 0 });
    }
  }

  if (m.pegRatio != null && safeNum(m.pegRatio) > 3) {
    score += 15;
    signals.push({ label: "PEG > 3", value: m.pegRatio.toFixed(1) + " — growth fully priced", impact: "negative", strength: "strong" });
  }

  if (m.rsi != null && safeNum(m.rsi) > 75) {
    score += 10;
    signals.push({ label: "RSI Overbought", value: m.rsi.toFixed(0) + " — mean reversion risk", impact: "negative", strength: "moderate" });
  }

  return { id: "overvaluation", name: "Overvaluation & Froth", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.85, signals, redFlags };
}
