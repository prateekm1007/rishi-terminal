"use client";

import { useMemo } from "react";
import { Holding } from "@/lib/types";

interface Props {
  holdings: Holding[];
  prices: Record<string, { price: number }>;
}

interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holdings: number;
}

interface StressTestResult {
  scenario: string;
  year: number;
  drawdown: number;
  projectedValue: number;
  projectedLoss: number;
}

const SECTOR_MAP: Record<string, string> = {
  TCS: "IT", INFY: "IT", WIPRO: "IT", HCLTECH: "IT", TECHM: "IT",
  RELIANCE: "Energy", ONGC: "Energy", NTPC: "Energy", POWERGRID: "Energy",
  HDFCBANK: "Banking", ICICIBANK: "Banking", SBIN: "Banking", KOTAKBANK: "Banking", AXISBANK: "Banking",
  TITAN: "Consumer", HINDUNILVR: "FMCG", ITC: "FMCG", NESTLEIND: "FMCG", BRITANNIA: "FMCG",
  MARUTI: "Auto", TATAMOTORS: "Auto", BAJAJ_AUTO: "Auto", EICHERMOT: "Auto",
  SUNPHARMA: "Pharma", DRREDDY: "Pharma", CIPLA: "Pharma", DIVISLAB: "Pharma",
  LT: "Infra", ADANIPORTS: "Infra", ULTRACEMCO: "Cement", GRASIM: "Cement",
  TATASTEEL: "Metals", JSWSTEEL: "Metals", HINDALCO: "Metals",
};

const STRESS_SCENARIOS: StressTestResult[] = [
  { scenario: "2008 Financial Crisis", year: 2008, drawdown: -52, projectedValue: 0, projectedLoss: 0 },
  { scenario: "2020 COVID Crash", year: 2020, drawdown: -38, projectedValue: 0, projectedLoss: 0 },
  { scenario: "2022 Rate Hike Cycle", year: 2022, drawdown: -18, projectedValue: 0, projectedLoss: 0 },
  { scenario: "Sector Rotation (IT -30%)", year: 2024, drawdown: -30, projectedValue: 0, projectedLoss: 0 },
];

export default function PortfolioXRay({ holdings, prices }: Props) {
  const analysis = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    const sectorMap = new Map<string, { value: number; holdings: number }>();

    holdings.forEach(h => {
      const price = prices[h.symbol]?.price ?? h.avgCost;
      const value = price * h.shares;
      const cost = h.avgCost * h.shares;
      totalValue += value;
      totalCost += cost;

      const sector = SECTOR_MAP[h.symbol] ?? "Other";
      const existing = sectorMap.get(sector) ?? { value: 0, holdings: 0 };
      sectorMap.set(sector, {
        value: existing.value + value,
        holdings: existing.holdings + 1,
      });
    });

    const sectorAllocation: SectorAllocation[] = Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector,
        value: data.value,
        percentage: (data.value / totalValue) * 100,
        holdings: data.holdings,
      }))
      .sort((a, b) => b.value - a.value);

    // Stress testing
    const stressTests = STRESS_SCENARIOS.map(s => {
      let impactedValue = totalValue;
      if (s.scenario.includes("IT")) {
        const itAlloc = sectorAllocation.find(sa => sa.sector === "IT");
        if (itAlloc) {
          impactedValue = totalValue - (itAlloc.value * 0.3);
        }
      } else {
        impactedValue = totalValue * (1 + s.drawdown / 100);
      }
      return {
        ...s,
        projectedValue: impactedValue,
        projectedLoss: impactedValue - totalValue,
      };
    });

    // Margin of Safety
    const marginOfSafety = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    // Concentration risk
    const top3Concentration = sectorAllocation.slice(0, 3).reduce((s, a) => s + a.percentage, 0);

    return {
      totalValue,
      totalCost,
      marginOfSafety,
      sectorAllocation,
      stressTests,
      top3Concentration,
    };
  }, [holdings, prices]);

  const mosColor = analysis.marginOfSafety >= 20 ? "#22C55E" : analysis.marginOfSafety >= 0 ? "#F59E0B" : "#EF4444";
  const concentrationColor = analysis.top3Concentration > 70 ? "#EF4444" : analysis.top3Concentration > 50 ? "#F59E0B" : "#22C55E";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Margin of Safety Meter */}
      <div style={{
        background: "rgba(17,24,39,0.85)", border: "1px solid rgba(30,41,59,0.8)",
        borderRadius: "16px", padding: "24px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: "16px" }}>
          💎 MARGIN OF SAFETY
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: mosColor, fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>
              {analysis.marginOfSafety >= 0 ? "+" : ""}{analysis.marginOfSafety.toFixed(1)}%
            </div>
            <div style={{ fontSize: "12px", color: "#94A3B8" }}>
              Total Unrealized: {(analysis.totalValue - analysis.totalCost).toLocaleString()}
            </div>
          </div>
          <div style={{ width: "200px" }}>
            <div style={{ height: "12px", background: "rgba(51,65,85,0.5)", borderRadius: "6px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: Math.min(100, Math.abs(analysis.marginOfSafety)) + "%",
                background: mosColor,
                borderRadius: "6px",
                transition: "width 0.8s ease",
              }} />
            </div>
            <div style={{ fontSize: "10px", color: "#64748B", marginTop: "6px", textAlign: "center" }}>
              {analysis.marginOfSafety >= 30 ? "Excellent" : analysis.marginOfSafety >= 15 ? "Good" : analysis.marginOfSafety >= 0 ? "Fair" : "Underwater"}
            </div>
          </div>
        </div>
      </div>

      {/* Sector Breakdown */}
      <div style={{
        background: "rgba(17,24,39,0.85)", border: "1px solid rgba(30,41,59,0.8)",
        borderRadius: "16px", padding: "24px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: "16px" }}>
          🎯 SECTOR ALLOCATION
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {analysis.sectorAllocation.map(sa => (
            <div key={sa.sector} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 14px", borderRadius: "10px",
              background: "rgba(31,41,59,0.6)", border: "1px solid rgba(51,65,85,0.4)",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>
                  {sa.sector}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                  {sa.holdings} holdings · {sa.value.toLocaleString()}
                </div>
              </div>
              <div style={{ width: "120px" }}>
                <div style={{ height: "6px", background: "rgba(51,65,85,0.5)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: sa.percentage + "%",
                    background: sa.percentage > 30 ? "#EF4444" : sa.percentage > 20 ? "#F59E0B" : "#22C55E",
                    borderRadius: "3px",
                  }} />
                </div>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace", minWidth: "50px", textAlign: "right" }}>
                {sa.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: "16px", padding: "12px 14px", borderRadius: "10px",
          background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)",
        }}>
          <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
            Top 3 Concentration:
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: concentrationColor, fontFamily: "JetBrains Mono, monospace" }}>
            {analysis.top3Concentration.toFixed(1)}%
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", marginLeft: "8px" }}>
              {analysis.top3Concentration > 70 ? "⚠ High Risk" : analysis.top3Concentration > 50 ? "⚠ Moderate Risk" : "✓ Well Diversified"}
            </span>
          </div>
        </div>
      </div>

      {/* Stress Testing */}
      <div style={{
        background: "rgba(17,24,39,0.85)", border: "1px solid rgba(30,41,59,0.8)",
        borderRadius: "16px", padding: "24px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginBottom: "16px" }}>
          🔬 STRESS TEST SCENARIOS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {analysis.stressTests.map(st => (
            <div key={st.scenario} style={{
              padding: "14px 16px", borderRadius: "10px",
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", marginBottom: "6px" }}>
                {st.scenario}
              </div>
              <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "8px" }}>
                Market Drawdown: {st.drawdown}%
              </div>
              <div style={{ fontSize: "12px", color: "#64748B" }}>
                Projected Value: {st.projectedValue.toLocaleString()}
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#EF4444", fontFamily: "JetBrains Mono, monospace", marginTop: "4px" }}>
                Loss: {Math.abs(st.projectedLoss).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}