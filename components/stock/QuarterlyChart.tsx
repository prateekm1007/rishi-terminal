"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type QuarterRow = {
  period: string;
  revenue: number;
  netProfit: number;
  opm: number;
};

interface Props {
  symbol: string;
  refreshMs?: number;
}

const COLORS = {
  revenue: "#D4AF37",
  revenueGlow: "rgba(212,175,55,0.25)",
  profit: "#22C55E",
  profitGlow: "rgba(34,197,94,0.25)",
  opmLine: "#F59E0B",
  cardBg: "rgba(15,23,42,0.6)",
  border: "rgba(255,255,255,0.06)",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
  textAccent: "#D4AF37",
};

function parsePeriodTs(p: string): number {
  const s = (p ?? "").trim();
  const m = s.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return 0;
  const map: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,
    jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
  };
  const mon = map[m[1].toLowerCase()];
  const yr = Number(m[2]);
  if (mon == null || !Number.isFinite(yr)) return 0;
  return new Date(yr, mon, 1).getTime();
}

function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + "L";
  if (abs >= 1000)  return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtPeriod(p: string): string {
  const s = (p ?? "").trim();
  const m = s.match(/^([A-Za-z]{3})\s+(\d{4})$/);
  if (!m) return s;
  return `${m[1]} '${m[2].slice(2)}`;
}

export function QuarterlyChart({ symbol, refreshMs = 3_600_000 }: Props) {
  const [rows, setRows] = useState<QuarterRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/fundamentals?symbol=${encodeURIComponent(symbol)}&type=quarterly`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const q: QuarterRow[] = Array.isArray(json?.quarters) ? json.quarters.slice(-8) : [];
      setRows(q);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshMs);
    return () => clearInterval(id);
  }, [fetchData, refreshMs]);

  // Process data: sort, take latest 8
  const data = useMemo(() => {
    const clean = rows.filter(
      (r): r is QuarterRow =>
        !!r && typeof r.period === "string" && Number.isFinite(r.revenue) && Number.isFinite(r.netProfit)
    );
    const sorted = [...clean].sort((a, b) => parsePeriodTs(a.period) - parsePeriodTs(b.period));
    return sorted.slice(-8);
  }, [rows]);

  const maxRev = useMemo(() => Math.max(1, ...data.map((d) => Math.abs(d.revenue))), [data]);
  const maxNp  = useMemo(() => Math.max(1, ...data.map((d) => Math.abs(d.netProfit))), [data]);

  if (!symbol) return null;

  return (
    <div className="card-sacred p-6" style={{ borderRadius: 16, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, position: "relative" }}>
        <div>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: 1 }}>
            Quarterly Results
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
            {symbol} · Last 8 Quarters
          </div>
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 1,
          padding: "3px 10px", borderRadius: 20,
          background: loading ? "rgba(245,158,11,0.15)" : error ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.12)",
          color: loading ? "#F59E0B" : error ? "#EF4444" : "#22C55E",
          border: `1px solid ${loading ? "rgba(245,158,11,0.3)" : error ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}`,
        }}>
          {loading ? "LOADING…" : error ? "OFFLINE" : "LIVE"}
        </div>
      </div>

      {/* Empty / error fallback */}
      {!loading && !error && data.length === 0 && (
        <div style={{ color: COLORS.textMuted, fontSize: 12, padding: "40px 0", textAlign: "center" }}>No quarterly data available.</div>
      )}

      {/* Bar Graph */}
      {data.length > 0 && (
        <>
          {/* Legend */}
          <div style={{ display: "flex", gap: 24, marginBottom: 14, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.revenue }} />
              Revenue
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.profit }} />
              Net Profit
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 2, borderRadius: 1, background: COLORS.opmLine }} />
              OPM %
            </div>
          </div>

          {/* Chart area */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${data.length}, minmax(50px, 1fr))`,
            gap: 8,
            alignItems: "end",
            height: 220,
            padding: "16px 4px 4px 4px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            background: "rgba(0,0,0,0.15)",
            position: "relative",
          }}>
            {/* OPM reference line at 50% */}
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(245,158,11,0.2)", pointerEvents: "none" }} />

            {data.map((q, idx) => {
              const isHovered = hoveredIdx === idx;
              const revH = Math.max(8, (Math.abs(q.revenue) / maxRev) * 160);
              const npH  = Math.max(4, (Math.abs(q.netProfit) / maxNp) * 120);

              return (
                <div
                  key={q.period}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: "default", position: "relative" }}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div style={{
                      position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                      background: "rgba(15,23,42,0.95)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8,
                      padding: "8px 12px", fontSize: 10, whiteSpace: "nowrap", zIndex: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginBottom: 8,
                    }}>
                      <div style={{ fontWeight: 700, color: COLORS.textAccent, marginBottom: 4 }}>{q.period}</div>
                      <div style={{ color: COLORS.revenue }}>Rev: {q.revenue.toLocaleString("en-IN")}</div>
                      <div style={{ color: COLORS.profit }}>NP: {q.netProfit.toLocaleString("en-IN")}</div>
                      <div style={{ color: COLORS.opmLine, marginTop: 2 }}>OPM: {Number(q.opm ?? 0).toFixed(1)}%</div>
                    </div>
                  )}

                  {/* Bars */}
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "flex-end" }}>
                    {/* Revenue bar */}
                    <div title={`Revenue: ${q.revenue}`} style={{
                      width: 16, height: revH,
                      background: isHovered
                        ? `linear-gradient(180deg, ${COLORS.revenue} 0%, rgba(212,175,55,0.5) 100%)`
                        : `linear-gradient(180deg, ${COLORS.revenue} 0%, rgba(212,175,55,0.35) 100%)`,
                      borderRadius: "4px 4px 0 0",
                      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: isHovered ? `0 0 12px ${COLORS.revenueGlow}` : "none",
                    }} />
                    {/* Profit bar */}
                    <div title={`Net Profit: ${q.netProfit}`} style={{
                      width: 16, height: npH,
                      background: isHovered
                        ? `linear-gradient(180deg, ${COLORS.profit} 0%, rgba(34,197,94,0.4) 100%)`
                        : `linear-gradient(180deg, ${COLORS.profit} 0%, rgba(34,197,94,0.25) 100%)`,
                      borderRadius: "4px 4px 0 0",
                      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: isHovered ? `0 0 12px ${COLORS.profitGlow}` : "none",
                    }} />
                  </div>

                  {/* OPM dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: COLORS.opmLine,
                    margin: "6px auto 0",
                    opacity: isHovered ? 1 : 0.6,
                    transition: "opacity 0.3s",
                  }} />

                  {/* Label */}
                  <div style={{ textAlign: "center", marginTop: 6, fontSize: 9, color: COLORS.textMuted, lineHeight: 1.3, letterSpacing: 0.3 }}>
                    <div style={{ fontFamily: "monospace", fontWeight: isHovered ? 700 : 500, color: isHovered ? COLORS.textPrimary : COLORS.textMuted, fontSize: 10, transition: "color 0.3s" }}>
                      {fmtCompact(q.netProfit)}
                    </div>
                    <div>{fmtPeriod(q.period)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          {data.length >= 2 && (() => {
            const latest = data[data.length - 1];
            const prev = data[data.length - 2];
            const revGrowth = prev.revenue ? ((latest.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100 : 0;
            const profitGrowth = prev.netProfit ? ((latest.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100 : 0;
            return (
              <div style={{
                display: "flex", gap: 24, marginTop: 14, padding: "12px 16px",
                background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${COLORS.border}`,
                fontSize: 11, color: COLORS.textMuted,
              }}>
                <div>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>QoQ Revenue</span>
                  <span style={{ marginLeft: 8, color: revGrowth >= 0 ? "#22C55E" : "#EF4444", fontWeight: 700 }}>
                    {revGrowth >= 0 ? "+" : ""}{revGrowth.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>QoQ Profit</span>
                  <span style={{ marginLeft: 8, color: profitGrowth >= 0 ? "#22C55E" : "#EF4444", fontWeight: 700 }}>
                    {profitGrowth >= 0 ? "+" : ""}{profitGrowth.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>OPM</span>
                  <span style={{ marginLeft: 8, color: COLORS.opmLine, fontWeight: 700 }}>
                    {Number(latest.opm ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

export default QuarterlyChart;