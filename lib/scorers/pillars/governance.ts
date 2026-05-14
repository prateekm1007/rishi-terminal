import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";

export function scoreGovernance(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  let score = 60;

  if (m.promoterPledge != null) {
    const v = safeNum(m.promoterPledge);
    if (v === 0)    { score += 20; signals.push({ label: "Promoter Pledge", value: "0% — zero pledge", impact: "positive", strength: "strong" }); }
    else if (v < 5) { score += 10; signals.push({ label: "Promoter Pledge", value: v + "%", impact: "positive", strength: "moderate" }); }
    else if (v < 10){ score += 2;  signals.push({ label: "Promoter Pledge", value: v + "% — manageable", impact: "neutral", strength: "weak" }); }
    else if (v > 20){ score -= 20; redFlags.push({ label: "Promoter Pledge > 20% — serious margin call risk", severity: "critical", penalty: 20 }); }
    else            { score -= 10; redFlags.push({ label: "Promoter Pledge " + v + "% — elevated risk", severity: "major", penalty: 10 }); }
  }

  if (m.relatedPartyPct != null) {
    const v = safeNum(m.relatedPartyPct);
    if (v > 20)     { score -= 15; redFlags.push({ label: "Related party > 20% of revenue", severity: "critical", penalty: 15 }); }
    else if (v > 10){ score -= 8;  redFlags.push({ label: "Elevated related party transactions", severity: "major", penalty: 8 }); }
    else            { score += 10; signals.push({ label: "Related Party Risk", value: "Low (" + v + "%)", impact: "positive", strength: "moderate" }); }
  }

  if (m.accountingFlags != null) {
    const v = safeNum(m.accountingFlags);
    if (v >= 3)     { score -= 20; redFlags.push({ label: v + " accounting red flags — Chanos-level concern", severity: "critical", penalty: 20 }); }
    else if (v >= 1){ score -= 8;  redFlags.push({ label: "Minor accounting concerns (" + v + " flags)", severity: "minor", penalty: 5 }); }
    else            { score += 5;  signals.push({ label: "Accounting Quality", value: "Clean — no flags", impact: "positive", strength: "moderate" }); }
  }

  if (m.insiderBuying === true) {
    score += 10;
    signals.push({ label: "Insider Activity", value: "Active buying — strong signal", impact: "positive", strength: "strong" });
  }

  if (m.interestCoverage != null) {
    const v = safeNum(m.interestCoverage);
    if (v > 5)     { score += 8;  signals.push({ label: "Interest Coverage", value: v.toFixed(1) + "x — safe", impact: "positive", strength: "strong" }); }
    else if (v < 1.5){ score -= 15; redFlags.push({ label: "Interest coverage < 1.5x — debt distress", severity: "critical", penalty: 15 }); }
  }

  return {
    id: "governance",
    name: "Management & Governance",
    score: clamp(score, 0, 100),
    weight: 0.12,
    weighted: clamp(score, 0, 100) * 0.12,
    confidence: 0.8,
    signals,
    redFlags,
  };
}
