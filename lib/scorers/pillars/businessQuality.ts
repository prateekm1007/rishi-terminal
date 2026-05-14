import { StockMetrics, PillarScore, Signal, RedFlag, normalize, clamp, safeNum } from "../types";

export function scoreBusinessQuality(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  let score = 0;
  let filled = 0;
  const total = 6;

  // ROE (25 pts)
  if (m.roe != null) {
    filled++;
    const v = safeNum(m.roe);
    score += normalize(v, 0, 30) * 0.25;
    signals.push({ label: "Return on Equity", value: v + "%", impact: v >= 20 ? "positive" : v >= 12 ? "neutral" : "negative", strength: v >= 25 ? "strong" : "moderate" });
    if (v < 8) redFlags.push({ label: "ROE below 8% — capital inefficiency", severity: "major", penalty: 10 });
  }

  // ROCE (20 pts)
  if (m.roce != null) {
    filled++;
    const v = safeNum(m.roce);
    score += normalize(v, 5, 35) * 0.20;
    signals.push({ label: "ROCE", value: v + "%", impact: v >= 20 ? "positive" : v >= 12 ? "neutral" : "negative", strength: v >= 25 ? "strong" : "moderate" });
    if (v < 10) redFlags.push({ label: "ROCE < 10% — below cost of capital", severity: "major", penalty: 8 });
  }

  // FCF Margin (20 pts)
  if (m.fcfMargin != null) {
    filled++;
    const v = safeNum(m.fcfMargin);
    score += normalize(v, -10, 20) * 0.20;
    signals.push({ label: "FCF Margin", value: v + "%", impact: v >= 10 ? "positive" : v >= 0 ? "neutral" : "negative", strength: v >= 15 ? "strong" : "moderate" });
    if (v < 0) redFlags.push({ label: "Negative FCF — cash burning business", severity: "critical", penalty: 15 });
  }

  // OPM (15 pts)
  if (m.opm != null) {
    filled++;
    const v = safeNum(m.opm);
    score += normalize(v, 5, 30) * 0.15;
    signals.push({ label: "Operating Margin", value: v + "%", impact: v >= 20 ? "positive" : v >= 12 ? "neutral" : "negative", strength: v >= 25 ? "strong" : "moderate" });
  }

  // Piotroski (10 pts)
  if (m.piotroskiScore != null) {
    filled++;
    const v = safeNum(m.piotroskiScore);
    score += (v / 9) * 10;
    signals.push({ label: "Piotroski F-Score", value: v + "/9", impact: v >= 7 ? "positive" : v >= 5 ? "neutral" : "negative", strength: v >= 8 ? "strong" : "moderate" });
    if (v <= 2) redFlags.push({ label: "Piotroski ≤ 2 — fundamental distress", severity: "critical", penalty: 12 });
  }

  // Debtor Days (10 pts)
  if (m.debtorDays != null) {
    filled++;
    const v = safeNum(m.debtorDays);
    score += normalize(v, 120, 30) * 0.10;
    signals.push({ label: "Debtor Days", value: v + " days", impact: v < 45 ? "positive" : v < 90 ? "neutral" : "negative", strength: v < 30 ? "strong" : "moderate" });
    if (v > 120) redFlags.push({ label: "Debtor Days > 120 — revenue quality risk", severity: "major", penalty: 8 });
  }

  const penalty = redFlags.reduce((a, f) => a + f.penalty * 0.5, 0);
  const confidence = filled / total;

  return {
    id: "businessQuality",
    name: "Business Quality",
    score: clamp(score - penalty, 0, 100),
    weight: 0.25,
    weighted: clamp(score - penalty, 0, 100) * 0.25,
    confidence,
    signals,
    redFlags,
  };
}
