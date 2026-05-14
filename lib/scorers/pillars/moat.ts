import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";
import { getSectorBenchmark } from "../config";

const STRONG_MOAT = ["IT", "FMCG", "Consumer"];
const WEAK_MOAT   = ["Metals", "Realty", "Infra", "Telecom"];

export function scoreMoat(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const bench = getSectorBenchmark(m.sector);
  let score = 50;

  if (STRONG_MOAT.includes(m.sector)) {
    score += 15;
    signals.push({ label: "Sector Moat", value: "Strong (" + m.sector + ")", impact: "positive", strength: "strong" });
  } else if (WEAK_MOAT.includes(m.sector)) {
    score -= 10;
    signals.push({ label: "Sector Moat", value: "Weak (" + m.sector + ")", impact: "negative", strength: "moderate" });
  } else {
    signals.push({ label: "Sector Moat", value: "Moderate (" + m.sector + ")", impact: "neutral", strength: "moderate" });
  }

  if (m.roe != null) {
    const premium = safeNum(m.roe) - bench.avgROE;
    if (premium > 10)      { score += 15; signals.push({ label: "ROE Premium", value: "+" + premium.toFixed(1) + "% vs sector", impact: "positive", strength: "strong" }); }
    else if (premium > 5)  { score += 8;  signals.push({ label: "ROE Premium", value: "+" + premium.toFixed(1) + "% vs sector", impact: "positive", strength: "moderate" }); }
    else if (premium < -5) { score -= 10; redFlags.push({ label: "ROE below sector — moat erosion signal", severity: "major", penalty: 8 }); }
  }

  if (m.opm != null) {
    const premium = safeNum(m.opm) - bench.avgOPM;
    if (premium > 8)      { score += 12; signals.push({ label: "OPM Premium (Pricing Power)", value: "+" + premium.toFixed(1) + "%", impact: "positive", strength: "strong" }); }
    else if (premium < -5){ score -= 8; }
  }

  if (m.promoterHolding != null) {
    const v = safeNum(m.promoterHolding);
    if (v > 60)      { score += 8; signals.push({ label: "Promoter Conviction", value: v + "% holding", impact: "positive", strength: "strong" }); }
    else if (v < 30) { score -= 5; signals.push({ label: "Low Promoter Holding", value: v + "%", impact: "negative", strength: "moderate" }); }
  }

  return {
    id: "moat",
    name: "Economic Moat",
    score: clamp(score, 0, 100),
    weight: 0.15,
    weighted: clamp(score, 0, 100) * 0.15,
    confidence: 0.7,
    signals,
    redFlags,
  };
}
