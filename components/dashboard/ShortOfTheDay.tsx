"use client";

import { useMemo } from "react";
import Link from "next/link";
import { calculateRishiScore } from "@/lib/scorers/rishiScoreV2";
import type { StockMetrics } from "@/lib/scorers/types";

// ── Pharma Short Candidates ───────────────────────────────────
// These are example candidates with realistic short thesis metrics

const PHARMA_SHORT_CANDIDATES: StockMetrics[] = [
  {
    symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma",
    pe: 38, pb: 4.8, roe: 14, roce: 12, opm: 22, fcfMargin: 8,
    revenueCAGR3Y: 8, epsCAGR3Y: 6, debtToEquity: 0.3,
    promoterHolding: 54, promoterPledge: 0,
    usfdaWarnings: 2, chinaApiDependence: 55, dpcoRisk: 45,
    patentCliffRisk: 50, accountingFlags: 1,
    rsi: 68, above200DMA: true, marketCap: 180000,
  },
  {
    symbol: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Pharma",
    pe: 18, pb: 2.1, roe: 13, roce: 11, opm: 18, fcfMargin: 5,
    revenueCAGR3Y: 4, epsCAGR3Y: 2, debtToEquity: 0.8,
    promoterHolding: 52, promoterPledge: 5,
    usfdaWarnings: 3, chinaApiDependence: 72, dpcoRisk: 60,
    patentCliffRisk: 65, accountingFlags: 1,
    rsi: 45, above200DMA: false, marketCap: 42000,
  },
  {
    symbol: "GRANULES", name: "Granules India", sector: "Pharma",
    pe: 22, pb: 3.2, roe: 15, roce: 13, opm: 16, fcfMargin: 4,
    revenueCAGR3Y: 6, epsCAGR3Y: 3, debtToEquity: 1.1,
    promoterHolding: 42, promoterPledge: 12,
    usfdaWarnings: 1, chinaApiDependence: 68, dpcoRisk: 70,
    patentCliffRisk: 55, accountingFlags: 2,
    rsi: 52, above200DMA: false, marketCap: 8000,
  },
];

// ── Get Weekly Candidate (rotates weekly) ─────────────────────

function getWeeklyCandidate(): StockMetrics {
  const week = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  return PHARMA_SHORT_CANDIDATES[week % PHARMA_SHORT_CANDIDATES.length];
}

// ── Component ─────────────────────────────────────────────────

export default function ShortOfTheDay() {
  const candidate = useMemo(() => getWeeklyCandidate(), []);
  const result    = useMemo(() => calculateRishiScore(candidate, "SHORT"), [candidate]);

  const scoreColor =
    result.finalScore >= 80 ? "#ef4444" :
    result.finalScore >= 65 ? "#f97316" : "#eab308";

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(15,23,42,0.95))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "20px", padding: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🔴</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#f1f5f9" }}>Short of the Week</span>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>Pharma Sector • Updated Weekly</div>
        </div>
        <div style={{ background: scoreColor + "18", border: "1px solid " + scoreColor + "40", borderRadius: "12px", padding: "6px 14px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: 900, color: scoreColor }}>{result.finalScore.toFixed(0)}</div>
          <div style={{ fontSize: "10px", color: "#64748b" }}>SHORT</div>
        </div>
      </div>

      {/* Stock Identity */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "24px", fontWeight: 900, color: "#f1f5f9" }}>{candidate.symbol}</div>
        <div style={{ fontSize: "14px", color: "#64748b" }}>{candidate.name}</div>
        <div style={{ marginTop: "8px", display: "inline-block", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
          {result.conviction.replace(/_/g, " ")}
        </div>
      </div>

      {/* Key Short Signals */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Short Signals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {result.pillars.flatMap(p => p.redFlags).slice(0, 4).map((flag, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#fca5a5" }}>
              <span style={{ flexShrink: 0, marginTop: "1px" }}>{flag.severity === "critical" ? "🔴" : "🟡"}</span>
              <span>{flag.label}</span>
            </div>
          ))}
          {candidate.usfdaWarnings && candidate.usfdaWarnings > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#fca5a5" }}>
              <span>🔴</span>
              <span>{candidate.usfdaWarnings} USFDA Form 483 warning(s)</span>
            </div>
          )}
          {candidate.chinaApiDependence && candidate.chinaApiDependence > 50 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#fca5a5" }}>
              <span>🟡</span>
              <span>{candidate.chinaApiDependence}% China API dependency</span>
            </div>
          )}
        </div>
      </div>

      {/* Risk Flags */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "18px" }}>
        {[
          { label: "Squeeze", value: result.shortSqueezeRisk },
          { label: "Liquidity", value: result.liquidityRisk },
          { label: "Black Swan", value: result.blackSwanRisk },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center", background: "rgba(15,23,42,0.5)", borderRadius: "10px", padding: "10px 6px" }}>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: value === "HIGH" ? "#f87171" : value === "MEDIUM" ? "#fbbf24" : "#34d399" }}>
              {value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Commentary */}
      <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>
          &ldquo;{result.commentary.substring(0, 200)}...&rdquo;
        </p>
      </div>

      {/* CTA */}
      <Link
        href={"/stock/" + candidate.symbol}
        style={{ display: "block", textAlign: "center", padding: "12px", background: "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", color: "#f87171", fontWeight: 700, fontSize: "14px", textDecoration: "none" }}
      >
        View Full Short Thesis →
      </Link>
    </div>
  );
}