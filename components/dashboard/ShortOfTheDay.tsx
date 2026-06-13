"use client";

import { useMemo } from "react";
import Link from "next/link";
import { calculateRishiScore } from "@/lib/scorers/rishiScoreV2";
import { STOCKS } from "@/data/stocks";
import type { StockMetrics } from "@/lib/scorers/types";
import { useFundamentals } from '@/hooks/useFundamentals';

const C = {
  red: "#EF4444",
  amber: "#F59E0B",
  text: "#F8FAFC",
  textSec: "#94A3B8",
  textMuted: "#64748B",
};

export default function ShortOfTheDay() {
  const shortOfDay = useMemo(() => {
    const candidates = Object.values(STOCKS).slice(0, 50);
    
    const scored = candidates.map(s => {
      const metrics: StockMetrics = {
        symbol: s.symbol, name: s.name, sector: s.sector,
        pe: s.pe, pb: (s.price / s.bvps), roe: s.roe, roce: s.roce,
        opm: s.opm, debtToEquity: s.de, revenueCAGR3Y: s.revcagr,
        epsCAGR3Y: s.epscagr, promoterHolding: s.promo,
        marketCap: s.mktcap, fcfMargin: (s.fcf / s.rev) * 100,
      };
      const result = calculateRishiScore(metrics, "SHORT", false);
      return { stock: s, shortScore: result.finalScore, conviction: result.conviction, headline: result.headline };
    });

    scored.sort((a, b) => b.shortScore - a.shortScore);
    return scored[0];
  }, []);
  const symbol = shortOfDay?.stock?.symbol ?? Object.keys(STOCKS)[0] ?? 'TCS';
  const { fundamentals } = useFundamentals(symbol);

  if (!shortOfDay) return null;

  const { stock, shortScore, conviction, headline } = shortOfDay;
  const scoreColor = shortScore >= 85 ? C.red : shortScore >= 75 ? "#F97316" : C.amber;

  return (
    <Link href={`/stock/${stock.symbol}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(17,24,39,0.9))",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: "20px", padding: "24px",
        cursor: "pointer", transition: "all 0.2s ease",
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.5)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(239,68,68,0.25)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: C.red, letterSpacing: "0.12em", marginBottom: "6px" }}>
              🔴 SHORT OF THE DAY
            </div>
            <div style={{ fontSize: "22px", fontWeight: 900, color: C.text, fontFamily: "JetBrains Mono, monospace" }}>
              {stock.symbol}
            </div>
            <div style={{ fontSize: "13px", color: C.textMuted, marginTop: "4px" }}>
              {stock.name} · {stock.sector}
            </div>
          </div>
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "14px", padding: "10px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "10px", color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Short Score
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: scoreColor, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>
              {shortScore.toFixed(0)}
            </div>
          </div>
        </div>

        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
          borderLeft: "3px solid " + C.red, borderRadius: "0 10px 10px 0",
          padding: "12px 14px", fontSize: "13px", color: C.textSec,
          lineHeight: 1.7, fontStyle: "italic", marginBottom: "16px",
        }}>
          "{headline}"
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "P/E", value: (fundamentals?.pe ?? stock.pe).toFixed(1) + "x" },
            { label: "D/E", value: stock.de.toFixed(2) + "x" },
            { label: "ROE", value: (fundamentals?.roe ?? stock.roe).toFixed(1) + "%" },
            { label: "Conviction", value: conviction.replace(/_/g, " ").slice(0, 12) },
          ].map(m => (
            <div key={m.label} style={{
              background: "rgba(31,41,59,0.6)", border: "1px solid rgba(51,65,85,0.4)",
              borderRadius: "8px", padding: "10px", textAlign: "center",
            }}>
              <div style={{ fontSize: "10px", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                {m.label}
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: C.text, fontFamily: "JetBrains Mono, monospace" }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "16px", textAlign: "right", fontSize: "12px", color: C.amber, fontWeight: 600 }}>
          View Full Short Thesis →
        </div>
      </div>
    </Link>
  );
}
