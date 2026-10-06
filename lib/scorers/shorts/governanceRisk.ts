import 'server-only';

import { StockMetrics, PillarScore, Signal, RedFlag, clamp, safeNum } from "../types";
import { getShortPillarWeight } from "../config";

// Round 20 (qvps-short-v2, contract A1.1): promoterHolding skin-in-game
// now scores via piecewise normalization anchored at the declared
// reference points — score = clamp((40 - promo) * 2.5, 0, 100):
// promo >= 40 -> 0, 25 -> 37.5, 15 -> 62.5, 0 -> 100. Pledge, accounting
// flags and related-party remain null-gated for when their data resolves.

export function scoreGovernanceRisk(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const weight = getShortPillarWeight("governanceRisk");
  let score = 0;

  if (m.promoterHolding != null) {
    const v = safeNum(m.promoterHolding);
    const skinInGame = clamp((40 - v) * 2.5, 0, 100);
    if (skinInGame > 0) {
      score += skinInGame;
      if (v < 15) {
        redFlags.push({ label: "Promoter holding < 15% — minimal skin-in-game", severity: "critical", penalty: 0 });
      } else if (v < 25) {
        redFlags.push({ label: "Promoter holding < 25% — weak skin-in-game", severity: "major", penalty: 0 });
      } else {
        signals.push({ label: "Promoter Holding", value: v + "% — below the 40% comfort mark", impact: "negative", strength: "moderate" });
      }
    }
  }

  if (m.promoterPledge != null) {
    const v = safeNum(m.promoterPledge);
    if (v > 40)      { score += 35; redFlags.push({ label: "Promoter Pledge > 40% — margin call risk", severity: "critical", penalty: 0 }); }
    else if (v > 20) { score += 22; redFlags.push({ label: "Promoter Pledge > 20% — significant risk", severity: "major", penalty: 0 }); }
    else if (v > 10) { score += 10; signals.push({ label: "Promoter Pledge", value: v + "%", impact: "negative", strength: "moderate" }); }
  }

  if (m.accountingFlags != null) {
    const v = safeNum(m.accountingFlags);
    if (v >= 3)      { score += 30; redFlags.push({ label: v + " accounting flags — Chanos-level concern", severity: "critical", penalty: 0 }); }
    else if (v >= 1) { score += 12; signals.push({ label: "Accounting Flags", value: v + " detected", impact: "negative", strength: "moderate" }); }
  }

  if (m.relatedPartyPct != null && safeNum(m.relatedPartyPct) > 20) {
    score += 20;
    redFlags.push({ label: "Related party > 20% of revenue", severity: "critical", penalty: 0 });
  }

  return { id: "governanceRisk", name: "Governance & Fraud Risk", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.75, signals, redFlags };
}

export function scoreMoatDestruction(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const weight = getShortPillarWeight("moatDestruction");
  let score = 0;

  if (m.usfdaWarnings != null) {
    const v = safeNum(m.usfdaWarnings);
    if (v >= 3)     { score += 35; redFlags.push({ label: v + " USFDA Form 483s — severe regulatory risk", severity: "critical", penalty: 0 }); }
    else if (v >= 1){ score += 18; signals.push({ label: "USFDA Warnings", value: v + " warning(s)", impact: "negative", strength: "strong" }); }
  }

  if (m.chinaApiDependence != null && safeNum(m.chinaApiDependence) > 60) {
    score += 25;
    signals.push({ label: "China API Dependence", value: m.chinaApiDependence + "% — supply chain vulnerability", impact: "negative", strength: "strong" });
  }

  if (m.dpcoRisk != null && safeNum(m.dpcoRisk) > 60) {
    score += 20;
    signals.push({ label: "DPCO Price Control Risk", value: m.dpcoRisk + "/100", impact: "negative", strength: "moderate" });
  }

  if (m.patentCliffRisk != null && safeNum(m.patentCliffRisk) > 60) {
    score += 20;
    redFlags.push({ label: "Patent cliff risk > 60 — revenue erosion incoming", severity: "major", penalty: 0 });
  }

  return { id: "moatDestruction", name: "Moat Destruction", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.75, signals, redFlags };
}

export function scoreGrowthMirage(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const weight = getShortPillarWeight("growthMirage");
  let score = 0;

  if (m.debtorDays != null && safeNum(m.debtorDays) > 120) {
    score += 30;
    redFlags.push({ label: "Debtor days > 120 — channel stuffing / revenue recognition risk", severity: "major", penalty: 0 });
  }

  if (m.cashConversion != null && safeNum(m.cashConversion) < 0.5) {
    score += 25;
    signals.push({ label: "Cash Conversion", value: (m.cashConversion * 100).toFixed(0) + "% — earnings quality concern", impact: "negative", strength: "strong" });
  }

  if (m.inventoryDays != null && safeNum(m.inventoryDays) > 150) {
    score += 20;
    signals.push({ label: "Inventory Days", value: m.inventoryDays + " — working capital deterioration", impact: "negative", strength: "moderate" });
  }

  return { id: "growthMirage", name: "Growth Mirage", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.65, signals, redFlags };
}

export function scoreCatalyst(m: StockMetrics): PillarScore {
  const signals: Signal[]  = [];
  const redFlags: RedFlag[] = [];
  const weight = getShortPillarWeight("catalyst");
  // Round 20 (D2 repair): the constant base of 20 was removed — a term
  // identical for every stock carries no information and only offset the
  // score. The pillar now starts at 0 and scores only resolvable signals.
  let score = 0;

  if (m.shortInterest != null && safeNum(m.shortInterest) > 10) {
    score += 25;
    signals.push({ label: "Short Interest", value: m.shortInterest + "% of float", impact: "negative", strength: "strong" });
  }

  if (m.above200DMA === false) {
    score += 20;
    signals.push({ label: "Below 200 DMA", value: "Bearish structure confirmed", impact: "negative", strength: "moderate" });
  }

  if (m.rsi != null && safeNum(m.rsi) < 40) {
    score -= 10;
    signals.push({ label: "RSI Low", value: m.rsi.toFixed(0) + " — could mean exhaustion", impact: "neutral", strength: "weak" });
  }

  return { id: "catalyst", name: "Catalyst & Timing", score: clamp(score, 0, 100), weight, weighted: clamp(score, 0, 100) * weight, confidence: 0.7, signals, redFlags };
}
