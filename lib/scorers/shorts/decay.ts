import 'server-only';

import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";
import { getShortPillarWeight } from "../config";

// Round 20 (qvps-short-v2, contract A1.1): resolvable inputs expanded —
// debtToEquity (leverage) and revenueCAGR3Y (revenue decay) now score, at
// the product's declared trigger cutoffs (D/E > 2x / 3x, CAGR < 0 / < -5).
// Cutoffs unchanged elsewhere; points rescaled so the resolvable-input
// worst case expresses the declared range. debtEbitda and altmanZScore
// remain null-gated for when their data resolves (D1-04/D1-05).

export function scoreFundamentalDecay(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const weight = getShortPillarWeight("fundamentalDecay");
  let score = 0;

  if (m.roe != null) {
    const v = safeNum(m.roe);
    if (v < 8)       { score += 30; redFlags.push({ label: "ROE < 8% — value destruction", severity: "critical", penalty: 0 }); }
    else if (v < 12) { score += 18; signals.push({ label: "Low ROE", value: v + "%", impact: "negative", strength: "moderate" }); }
  }

  if (m.fcfMargin != null && safeNum(m.fcfMargin) < 0) {
    score += 25;
    redFlags.push({ label: "Negative FCF (" + m.fcfMargin + "%) — cash burn confirmed", severity: "critical", penalty: 0 });
  }

  if (m.debtToEquity != null) {
    const v = safeNum(m.debtToEquity);
    if (v > 3)      { score += 20; redFlags.push({ label: "D/E > 3x — over-leveraged balance sheet", severity: "critical", penalty: 0 }); }
    else if (v > 2) { score += 12; signals.push({ label: "Debt/Equity", value: v.toFixed(1) + "x", impact: "negative", strength: "moderate" }); }
  }

  if (m.revenueCAGR3Y != null) {
    const v = safeNum(m.revenueCAGR3Y);
    if (v < -5)     { score += 20; redFlags.push({ label: "Revenue CAGR < -5% — structural decay", severity: "major", penalty: 0 }); }
    else if (v < 0) { score += 12; signals.push({ label: "Revenue CAGR", value: v.toFixed(1) + "%", impact: "negative", strength: "moderate" }); }
  }

  if (m.opm != null && safeNum(m.opm) < 8) {
    score += 15;
    signals.push({ label: "OPM < 8%", value: m.opm + "% — thin margin business", impact: "negative", strength: "strong" });
  }

  if (m.debtEbitda != null) {
    const v = safeNum(m.debtEbitda);
    if (v > 5)      { score += 20; redFlags.push({ label: "Debt/EBITDA > 5x — over-leveraged", severity: "critical", penalty: 0 }); }
    else if (v > 3) { score += 12; signals.push({ label: "Debt/EBITDA", value: v.toFixed(1) + "x", impact: "negative", strength: "moderate" }); }
  }

  if (m.altmanZScore != null && safeNum(m.altmanZScore) < 1.8) {
    score += 15;
    redFlags.push({ label: "Altman Z-Score < 1.8 — financial distress zone", severity: "critical", penalty: 0 });
  }

  return { id: "fundamentalDecay", name: "Fundamental Decay", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.8, signals, redFlags };
}
