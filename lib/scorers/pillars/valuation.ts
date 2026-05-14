import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";
import { getSectorBenchmark } from "../config";

export function scoreValuation(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const bench = getSectorBenchmark(m.sector);
  let score = 0;
  let filled = 0;
  const total = 5;

  // PE vs Sector (30 pts)
  if (m.pe != null && m.pe > 0) {
    filled++;
    const ratio = safeNum(m.pe) / bench.avgPE;
    const pts = ratio <= 0.6 ? 30 : ratio <= 0.8 ? 25 : ratio <= 1.0 ? 20 : ratio <= 1.3 ? 12 : ratio <= 1.8 ? 6 : 0;
    score += pts;
    signals.push({ label: "P/E vs Sector", value: m.pe.toFixed(1) + "x (sector: " + bench.avgPE + "x)", impact: ratio <= 0.9 ? "positive" : ratio <= 1.2 ? "neutral" : "negative", strength: ratio <= 0.7 ? "strong" : "moderate" });
    if (m.pe > bench.avgPE * 2) redFlags.push({ label: "P/E > 2x sector average", severity: "major", penalty: 12 });
  }

  // PB (20 pts)
  if (m.pb != null && m.pb > 0) {
    filled++;
    const v   = safeNum(m.pb);
    const pts = v < 1 ? 20 : v < 2 ? 17 : v < 3 ? 13 : v < 5 ? 8 : v < 8 ? 3 : 0;
    score += pts;
    signals.push({ label: "Price to Book", value: v.toFixed(1) + "x", impact: v < 2 ? "positive" : v < 4 ? "neutral" : "negative", strength: v < 1.5 ? "strong" : "moderate" });
    if (v > 8) redFlags.push({ label: "P/B > 8x — priced for perfection", severity: "major", penalty: 10 });
  }

  // EV/EBITDA (20 pts)
  if (m.evEbitda != null && m.evEbitda > 0) {
    filled++;
    const v   = safeNum(m.evEbitda);
    const pts = v < 8 ? 20 : v < 12 ? 16 : v < 18 ? 10 : v < 25 ? 5 : 0;
    score += pts;
    signals.push({ label: "EV/EBITDA", value: v.toFixed(1) + "x", impact: v < 12 ? "positive" : v < 20 ? "neutral" : "negative", strength: v < 10 ? "strong" : "moderate" });
  }

  // PEG (15 pts)
  if (m.pegRatio != null && m.pegRatio > 0) {
    filled++;
    const v   = safeNum(m.pegRatio);
    const pts = v < 0.5 ? 15 : v < 1 ? 12 : v < 1.5 ? 8 : v < 2 ? 4 : 0;
    score += pts;
    signals.push({ label: "PEG Ratio", value: v.toFixed(2), impact: v < 1 ? "positive" : v < 1.5 ? "neutral" : "negative", strength: v < 0.75 ? "strong" : "moderate" });
    if (v > 3) redFlags.push({ label: "PEG > 3 — growth priced in excessively", severity: "major", penalty: 8 });
  }

  // Dividend Yield (15 pts)
  if (m.dividendYield != null) {
    filled++;
    const v   = safeNum(m.dividendYield);
    score += Math.min(v * 3, 15);
    signals.push({ label: "Dividend Yield", value: v.toFixed(1) + "%", impact: v > 2 ? "positive" : "neutral", strength: v > 4 ? "strong" : "moderate" });
  }

  const penalty = redFlags.reduce((a, f) => a + f.penalty * 0.5, 0);

  return {
    id: "valuation",
    name: "Valuation & MOS",
    score: clamp(score - penalty, 0, 100),
    weight: 0.22,
    weighted: clamp(score - penalty, 0, 100) * 0.22,
    confidence: filled / total,
    signals,
    redFlags,
  };
}
