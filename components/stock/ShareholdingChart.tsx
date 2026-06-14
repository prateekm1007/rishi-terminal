"use client";

import { useEffect, useState } from "react";

interface Props {
  symbol: string;
  refreshMs?: number;
}

type HoldingRow = {
  period: string;
  promoter: number;
  fii: number;
  dii: number;
  public: number;
};

const COLORS = {
  promoter: "#10B981",
  fii: "#3B82F6",
  dii: "#F59E0B",
  public: "#71717A",
  cardBg: "rgba(15,23,42,0.6)",
  border: "rgba(255,255,255,0.06)",
  textPrimary: "#F8FAFC",
  textMuted: "#94A3B8",
};

export function ShareholdingChart({ symbol, refreshMs = 3_600_000 }: Props) {
  const [history, setHistory] = useState<HoldingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      if (!symbol) return;
      try {
        if (mounted) setLoading(true);
        const res = await fetch(
          `/api/fundamentals?symbol=${encodeURIComponent(symbol)}&type=shareholding`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const h: HoldingRow[] = Array.isArray(json?.history) ? json.history.slice(-8) : [];
        if (mounted) {
          setHistory(h);
          setError(null);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    const id = setInterval(fetchData, refreshMs);
    return () => { mounted = false; clearInterval(id); };
  }, [symbol, refreshMs]);

  const latest = history.length > 0 ? history[history.length - 1] : null;

  if (!symbol) return null;

  return (
    <div className="card-sacred p-6" style={{ borderRadius: 16, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, letterSpacing: 1 }}>
            Shareholding Pattern
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>
            {latest ? `As of ${latest.period}` : symbol}
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

      {!loading && !error && !latest && (
        <div style={{ color: COLORS.textMuted, fontSize: 12, padding: "40px 0", textAlign: "center" }}>No shareholding data available.</div>
      )}

      {latest && (
        <>
          <div style={{ height: 36, display: "flex", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            {[
              { label: "Promoter", value: latest.promoter, color: COLORS.promoter },
              { label: "FII", value: latest.fii, color: COLORS.fii },
              { label: "DII", value: latest.dii, color: COLORS.dii },
              { label: "Public", value: latest.public, color: COLORS.public },
            ].map((seg) => (
              <div
                key={seg.label}
                title={`${seg.label}: ${seg.value.toFixed(1)}%`}
                style={{
                  width: `${Math.max(1, seg.value)}%`,
                  background: seg.color,
                  transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: 0.5,
                  minWidth: seg.value > 3 ? undefined : 0,
                }}
              >
                {seg.value > 12 ? `${seg.value.toFixed(0)}%` : ""}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Promoter", value: latest.promoter, color: COLORS.promoter },
              { label: "FII", value: latest.fii, color: COLORS.fii },
              { label: "DII", value: latest.dii, color: COLORS.dii },
              { label: "Public", value: latest.public, color: COLORS.public },
            ].map((d) => (
              <div
                key={d.label}
                style={{
                  padding: "10px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 8,
                  border: `1px solid ${COLORS.border}`, textAlign: "center",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, margin: "0 auto 6px" }} />
                <div style={{ fontSize: 9, color: COLORS.textMuted, marginBottom: 2 }}>{d.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: COLORS.textPrimary }}>
                  {d.value.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {history.length > 1 && (
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, marginBottom: 8, letterSpacing: 1 }}>
                PROMOTER HOLDING TREND
              </div>
              <div style={{ display: "flex", alignItems: "end", gap: 6, height: 48 }}>
                {history.slice(-8).map((h, i) => {
                  const minP = Math.min(...history.map((x) => x.promoter));
                  const maxP = Math.max(...history.map((x) => x.promoter));
                  const range = maxP - minP || 1;
                  const ht = 4 + ((h.promoter - minP) / range) * 40;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                      <div style={{ fontSize: 8, color: COLORS.textMuted, fontWeight: 600 }}>
                        {h.promoter.toFixed(1)}%
                      </div>
                      <div style={{
                        width: "100%", height: ht,
                        background: `linear-gradient(180deg, ${COLORS.promoter} 0%, rgba(16,185,129,0.3) 100%)`,
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.5s cubic-bezier(0.4,0,0.2,1)",
                      }} />
                      <div style={{ fontSize: 7, color: COLORS.textMuted }}>
                        {h.period.split(" ").pop()?.slice(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
            {latest.promoter > 50
              ? "✓ Strong promoter confidence in business"
              : latest.promoter > 30
              ? "→ Balanced institutional + promoter mix"
              : "⚠ Dispersed ownership — monitor insider buying"}
            {" · "}
            {latest.fii > latest.dii ? "FII dominant" : "DII holding strong"}
          </div>
        </>
      )}
    </div>
  );
}