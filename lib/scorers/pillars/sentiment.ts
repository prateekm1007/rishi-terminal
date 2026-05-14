import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";

export function scoreSentiment(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  let score = 50;

  if (m.rsi != null) {
    const v = safeNum(m.rsi);
    if (v > 80)            { score -= 15; redFlags.push({ label: "RSI > 80 — extreme overbought", severity: "major", penalty: 10 }); }
    else if (v > 70)       { score -= 5;  signals.push({ label: "RSI", value: v.toFixed(0) + " — overbought", impact: "negative", strength: "moderate" }); }
    else if (v >= 50 && v <= 65){ score += 15; signals.push({ label: "RSI", value: v.toFixed(0) + " — healthy momentum", impact: "positive", strength: "strong" }); }
    else if (v < 30)       { score += 10; signals.push({ label: "RSI", value: v.toFixed(0) + " — oversold opportunity", impact: "positive", strength: "moderate" }); }
    else                   { signals.push({ label: "RSI", value: v.toFixed(0) + " — neutral", impact: "neutral", strength: "weak" }); }
  }

  if (m.fiiHolding != null) {
    const v = safeNum(m.fiiHolding);
    if (v > 25)      { score += 12; signals.push({ label: "FII Holding", value: v + "% — strong institutional interest", impact: "positive", strength: "strong" }); }
    else if (v > 10) { score += 6;  signals.push({ label: "FII Holding", value: v + "%", impact: "positive", strength: "moderate" }); }
  }

  if (m.above200DMA === true)  { score += 10; signals.push({ label: "200 DMA", value: "Above — bullish structure", impact: "positive", strength: "moderate" }); }
  if (m.above200DMA === false) { score -= 8;  signals.push({ label: "200 DMA", value: "Below — bearish structure", impact: "negative", strength: "moderate" }); }

  if (m.volumeTrend === "increasing") { score += 8; signals.push({ label: "Volume Trend", value: "Increasing — conviction", impact: "positive", strength: "moderate" }); }
  if (m.volumeTrend === "decreasing") { score -= 5; }

  return {
    id: "sentiment",
    name: "Sentiment & Catalyst",
    score: clamp(score, 0, 100),
    weight: 0.08,
    weighted: clamp(score, 0, 100) * 0.08,
    confidence: 0.75,
    signals,
    redFlags,
  };
}
