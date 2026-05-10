"use client";

import { useMemo } from "react";

interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
}

interface Props {
  holdings: Holding[];
  prices: Record<string, { price: number }>;
}

const SECTOR_MAP: Record<string, string> = {
  TCS:"IT", INFY:"IT", WIPRO:"IT", HCLTECH:"IT", TECHM:"IT", LTIM:"IT", PERSISTENT:"IT",
  RELIANCE:"Energy", ONGC:"Energy", NTPC:"Energy", POWERGRID:"Energy", COALINDIA:"Energy",
  HDFCBANK:"Banking", ICICIBANK:"Banking", SBIN:"Banking", KOTAKBANK:"Banking", AXISBANK:"Banking",
  INDUSINDBK:"Banking", BANDHANBNK:"Banking", FEDERALBNK:"Banking",
  TITAN:"Consumer", HINDUNILVR:"FMCG", ITC:"FMCG", NESTLEIND:"FMCG", BRITANNIA:"FMCG", DABUR:"FMCG",
  MARUTI:"Auto", TATAMOTORS:"Auto", BAJAJ_AUTO:"Auto", EICHERMOT:"Auto", HEROMOTOCO:"Auto",
  SUNPHARMA:"Pharma", DRREDDY:"Pharma", CIPLA:"Pharma", DIVISLAB:"Pharma", AUROPHARMA:"Pharma",
  LT:"Infra", ADANIPORTS:"Infra", ULTRACEMCO:"Cement", GRASIM:"Cement", AMBUJACEM:"Cement",
  TATASTEEL:"Metals", JSWSTEEL:"Metals", HINDALCO:"Metals", SAIL:"Metals",
  ASIANPAINT:"Consumer", PIDILITIND:"Consumer", HAVELLS:"Consumer",
  BHARTIARTL:"Telecom", BAJFINANCE:"NBFC", BAJAJFINSV:"NBFC", HDFCLIFE:"Insurance", SBILIFE:"Insurance",
};

const STRESS_SCENARIOS = [
  { label: "2008 Global Crisis", drawdown: -52, color: "#EF4444" },
  { label: "2020 COVID Crash", drawdown: -38, color: "#F59E0B" },
  { label: "2022 Rate Hike Cycle", drawdown: -18, color: "#F59E0B" },
  { label: "IT Sector -30%", drawdown: -30, color: "#EF4444", sector: "IT" },
];

const SECTOR_COLORS: Record<string, string> = {
  IT: "#6366F1", Banking: "#22C55E", Energy: "#F59E0B", FMCG: "#EC4899",
  Auto: "#14B8A6", Pharma: "#8B5CF6", Infra: "#F97316", Metals: "#64748B",
  Consumer: "#06B6D4", Telecom: "#84CC16", NBFC: "#10B981", Insurance: "#A78BFA",
  Cement: "#FB923C", Other: "#475569",
};

export default function PortfolioXRay({ holdings, prices }: Props) {
  const analysis = useMemo(() => {
    if (holdings.length === 0) return null;

    let totalValue = 0;
    let totalCost = 0;
    const sectorMap = new Map<string, { value: number; count: number; symbols: string[] }>();

    holdings.forEach(h => {
      const price = prices[h.symbol]?.price ?? h.avgPrice;
      const value = price * h.shares;
      const cost = h.avgPrice * h.shares;
      totalValue += value;
      totalCost += cost;

      const sector = SECTOR_MAP[h.symbol] ?? "Other";
      const existing = sectorMap.get(sector) ?? { value: 0, count: 0, symbols: [] };
      sectorMap.set(sector, {
        value: existing.value + value,
        count: existing.count + 1,
        symbols: [...existing.symbols, h.symbol],
      });
    });

    const sectorAllocation = Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector,
        value: data.value,
        count: data.count,
        symbols: data.symbols,
        pct: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        color: SECTOR_COLORS[sector] ?? SECTOR_COLORS.Other,
      }))
      .sort((a, b) => b.value - a.value);

    const stressTests = STRESS_SCENARIOS.map(sc => {
      let projected = totalValue;
      if (sc.sector) {
        const sectAlloc = sectorAllocation.find(s => s.sector === sc.sector);
        if (sectAlloc) {
          const sectValue = sectAlloc.value;
          projected = totalValue - sectValue * Math.abs(sc.drawdown / 100);
        }
      } else {
        projected = totalValue * (1 + sc.drawdown / 100);
      }
      return {
        ...sc,
        projectedValue: projected,
        loss: projected - totalValue,
      };
    });

    const marginOfSafety = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    const top3Pct = sectorAllocation.slice(0, 3).reduce((s, a) => s + a.pct, 0);
    const hhi = sectorAllocation.reduce((s, a) => s + Math.pow(a.pct / 100, 2), 0);
    const diversificationScore = Math.round((1 - hhi) * 100);

    return { totalValue, totalCost, marginOfSafety, sectorAllocation, stressTests, top3Pct, diversificationScore };
  }, [holdings, prices]);

  if (!analysis) {
    return (
      <div style={{
        textAlign: "center", padding: "60px 20px",
        color: "#64748B", fontSize: "14px",
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
        <div>Add holdings to see your Portfolio X-Ray</div>
      </div>
    );
  }

  const mosColor = analysis.marginOfSafety >= 20 ? "#22C55E"
    : analysis.marginOfSafety >= 0 ? "#F59E0B" : "#EF4444";

  const concColor = analysis.top3Pct > 70 ? "#EF4444"
    : analysis.top3Pct > 50 ? "#F59E0B" : "#22C55E";

  const card = (children: React.ReactNode) => (
    <div style={{
      background: "rgba(17,24,39,0.85)",
      border: "1px solid rgba(30,41,59,0.8)",
      borderRadius: "16px", padding: "24px",
    }}>
      {children}
    </div>
  );

  const sectionLabel = (text: string) => (
    <div style={{
      fontSize: "11px", fontWeight: 700, color: "#64748B",
      letterSpacing: "0.1em", marginBottom: "16px",
    }}>
      {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Summary Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        {/* Margin of Safety */}
        {card(
          <>
            {sectionLabel("💎 MARGIN OF SAFETY")}
            <div style={{ fontSize: "36px", fontWeight: 900, color: mosColor, fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>
              {analysis.marginOfSafety >= 0 ? "+" : ""}{analysis.marginOfSafety.toFixed(1)}%
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              {analysis.marginOfSafety >= 30 ? "✅ Excellent — well below intrinsic value"
                : analysis.marginOfSafety >= 15 ? "✓ Good — moderate safety margin"
                : analysis.marginOfSafety >= 0 ? "⚠ Fair — limited margin of safety"
                : "🔴 Underwater — portfolio in loss"}
            </div>
            <div style={{ marginTop: "12px", height: "8px", background: "rgba(51,65,85,0.5)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: Math.min(100, Math.abs(analysis.marginOfSafety)) + "%",
                background: mosColor, borderRadius: "4px",
                transition: "width 0.8s ease",
              }} />
            </div>
          </>
        )}

        {/* Concentration Risk */}
        {card(
          <>
            {sectionLabel("🎯 CONCENTRATION RISK")}
            <div style={{ fontSize: "36px", fontWeight: 900, color: concColor, fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>
              {analysis.top3Pct.toFixed(1)}%
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              Top 3 sectors · {analysis.top3Pct > 70 ? "⚠ High concentration risk"
                : analysis.top3Pct > 50 ? "⚠ Moderate concentration"
                : "✅ Well diversified"}
            </div>
            <div style={{ marginTop: "12px", height: "8px", background: "rgba(51,65,85,0.5)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: analysis.top3Pct + "%",
                background: concColor, borderRadius: "4px",
              }} />
            </div>
          </>
        )}

        {/* Diversification Score */}
        {card(
          <>
            {sectionLabel("🌐 DIVERSIFICATION SCORE")}
            <div style={{ fontSize: "36px", fontWeight: 900, color: analysis.diversificationScore > 60 ? "#22C55E" : analysis.diversificationScore > 40 ? "#F59E0B" : "#EF4444", fontFamily: "JetBrains Mono, monospace", marginBottom: "8px" }}>
              {analysis.diversificationScore}/100
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              {analysis.diversificationScore > 70 ? "Excellent diversification"
                : analysis.diversificationScore > 50 ? "Moderate diversification"
                : "Concentrated portfolio"}
            </div>
            <div style={{ marginTop: "12px", height: "8px", background: "rgba(51,65,85,0.5)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: analysis.diversificationScore + "%",
                background: analysis.diversificationScore > 60 ? "#22C55E" : "#F59E0B",
                borderRadius: "4px",
              }} />
            </div>
          </>
        )}
      </div>

      {/* Sector Breakdown */}
      {card(
        <>
          {sectionLabel("📊 SECTOR ALLOCATION")}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {analysis.sectorAllocation.map(sa => (
              <div key={sa.sector} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "12px 16px", borderRadius: "10px",
                background: "rgba(31,41,59,0.5)",
                border: "1px solid rgba(51,65,85,0.3)",
              }}>
                <div style={{
                  width: "10px", height: "10px", borderRadius: "50%",
                  background: sa.color, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>
                    {sa.sector}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                    {sa.count} stock{sa.count > 1 ? "s" : ""} · {sa.symbols.join(", ")}
                  </div>
                </div>
                <div style={{ width: "140px" }}>
                  <div style={{ height: "6px", background: "rgba(51,65,85,0.5)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: sa.pct + "%",
                      background: sa.color, borderRadius: "3px",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace", minWidth: "52px", textAlign: "right" }}>
                  {sa.pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "JetBrains Mono, monospace", minWidth: "100px", textAlign: "right" }}>
                  {sa.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Stress Testing */}
      {card(
        <>
          {sectionLabel("🔬 STRESS TEST SCENARIOS")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {analysis.stressTests.map(st => (
              <div key={st.label} style={{
                padding: "16px 18px", borderRadius: "12px",
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: st.color, marginBottom: "8px" }}>
                  {st.label}
                </div>
                <div style={{ fontSize: "13px", color: "#94A3B8", marginBottom: "10px" }}>
                  Drawdown: <span style={{ fontWeight: 700 }}>{st.drawdown}%</span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>
                  Portfolio value:
                </div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC", fontFamily: "JetBrains Mono, monospace" }}>
                  {st.projectedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: st.color, fontFamily: "JetBrains Mono, monospace", marginTop: "4px" }}>
                  Loss: {Math.abs(st.loss).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: "16px", padding: "14px 16px", borderRadius: "10px",
            background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)",
            fontSize: "12px", color: "#94A3B8", lineHeight: 1.6,
          }}>
            💡 <strong style={{ color: "#D4AF37" }}>Rishi Insight:</strong> Based on historical Indian market drawdowns. Actual impact depends on your sector mix and individual stock quality. Stress tests assume correlated sell-offs.
          </div>
        </>
      )}

    </div>
  );
}