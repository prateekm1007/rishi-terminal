import { StockMetrics, PillarScore, Signal, RedFlag, normalize, clamp, safeNum } from "../types";

export function scoreGrowth(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  let score = 0;
  let filled = 0;
  const total = 4;

  if (m.revenueCAGR3Y != null) {
    filled++;
    const v = safeNum(m.revenueCAGR3Y);
    score += normalize(v, -5, 25) * 0.30;
    signals.push({ label: "Revenue CAGR 3Y", value: v + "%", impact: v > 15 ? "positive" : v > 5 ? "neutral" : "negative", strength: v > 20 ? "strong" : "moderate" });
    if (v < 0) redFlags.push({ label: "Negative revenue growth 3Y", severity: "critical", penalty: 15 });
  }

  if (m.epsCAGR3Y != null) {
    filled++;
    const v = safeNum(m.epsCAGR3Y);
    score += normalize(v, -10, 30) * 0.30;
    signals.push({ label: "EPS CAGR 3Y", value: v + "%", impact: v > 15 ? "positive" : v > 5 ? "neutral" : "negative", strength: v > 25 ? "strong" : "moderate" });
  }

  if (m.revenueCAGR5Y != null) {
    filled++;
    const v = safeNum(m.revenueCAGR5Y);
    score += normalize(v, -5, 20) * 0.20;
    signals.push({ label: "Revenue CAGR 5Y", value: v + "%", impact: v > 12 ? "positive" : "neutral", strength: "moderate" });
  }

  if (m.debtToEquity != null) {
    filled++;
    const de = safeNum(m.debtToEquity);
    score += normalize(de, 3, 0) * 0.20;
    if (de > 2 && safeNum(m.revenueCAGR3Y) > 15) {
      redFlags.push({ label: "High-leverage-funded growth — quality concern", severity: "major", penalty: 10 });
    }
    signals.push({ label: "Debt / Equity", value: de.toFixed(1) + "x", impact: de < 0.5 ? "positive" : de < 1.5 ? "neutral" : "negative", strength: de < 0.3 ? "strong" : "moderate" });
  }

  const penalty = redFlags.reduce((a, f) => a + f.penalty * 0.5, 0);

  return {
    id: "growth",
    name: "Growth Sustainability",
    score: clamp(score - penalty, 0, 100),
    weight: 0.18,
    weighted: clamp(score - penalty, 0, 100) * 0.18,
    confidence: filled / total,
    signals,
    redFlags,
  };
}