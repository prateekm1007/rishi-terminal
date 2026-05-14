import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";

export function scoreFundamentalDecay(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  let score = 0;

  if (m.roe != null) {
    const v = safeNum(m.roe);
    if (v < 8)       { score += 25; redFlags.push({ label: "ROE < 8% — value destruction", severity: "critical", penalty: 0 }); }
    else if (v < 12) { score += 15; signals.push({ label: "Low ROE", value: v + "%", impact: "negative", strength: "moderate" }); }
  }

  if (m.fcfMargin != null && safeNum(m.fcfMargin) < 0) {
    score += 25;
    redFlags.push({ label: "Negative FCF (" + m.fcfMargin + "%) — cash burn confirmed", severity: "critical", penalty: 0 });
  }

  if (m.debtEbitda != null) {
    const v = safeNum(m.debtEbitda);
    if (v > 5)      { score += 20; redFlags.push({ label: "Debt/EBITDA > 5x — over-leveraged", severity: "critical", penalty: 0 }); }
    else if (v > 3) { score += 12; signals.push({ label: "Debt/EBITDA", value: v.toFixed(1) + "x", impact: "negative", strength: "moderate" }); }
  }

  if (m.opm != null && safeNum(m.opm) < 8) {
    score += 15;
    signals.push({ label: "OPM < 8%", value: m.opm + "% — thin margin business", impact: "negative", strength: "strong" });
  }

  if (m.altmanZScore != null && safeNum(m.altmanZScore) < 1.8) {
    score += 15;
    redFlags.push({ label: "Altman Z-Score < 1.8 — financial distress zone", severity: "critical", penalty: 0 });
  }

  return { id: "fundamentalDecay", name: "Fundamental Decay", score: clamp(score, 0, 100), weight: 0.22, weighted: clamp(score, 0, 100) * 0.22, confidence: 0.8, signals, redFlags };
}
