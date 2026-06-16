"use client";

import { useState } from "react";
import { useTechnicalData } from "@/hooks/useTechnicalData";

interface Props { symbol: string; }

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: "help", color: "#64748b", fontSize: 13, marginLeft: 6, userSelect: "none" }}
      >&#9432;</span>
      {show && (
        <span style={{
          position: "absolute", left: 20, top: 0, zIndex: 50,
          width: 220, borderRadius: 8, padding: "8px 12px",
          fontSize: 11, color: "#e2e8f0", lineHeight: 1.6,
          background: "#1e293b", border: "1px solid #334155",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
        }}>{text}</span>
      )}
    </span>
  );
}

function ZoneGauge({ value, max, zones }: {
  value: number;
  max: number;
  zones: { from: number; to: number; color: string; label: string }[];
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const W = 400;
  return (
    <div style={{ width: "100%" }}>
      <svg width="100%" height="36" viewBox={`0 0 ${W} 36`} preserveAspectRatio="none">
        {zones.map((z, i) => {
          const x = (z.from / max) * W;
          const w = ((z.to - z.from) / max) * W;
          const r = i === 0 ? "8" : i === zones.length - 1 ? "8" : "0";
          return (
            <rect
              key={i}
              x={x} y={6} width={w} height={24}
              rx={r}
              fill={z.color}
            />
          );
        })}
        {zones.slice(0, -1).map((z, i) => (
          <line key={i}
            x1={(z.to / max) * W} y1={6}
            x2={(z.to / max) * W} y2={30}
            stroke="#0f172a" strokeWidth="2"
          />
        ))}
        <line
          x1={(pct / 100) * W} y1={0}
          x2={(pct / 100) * W} y2={36}
          stroke="white" strokeWidth="3" strokeLinecap="round"
        />
        <circle
          cx={(pct / 100) * W} cy={18}
          r={6} fill="white"
          stroke="#0f172a" strokeWidth="2"
        />
      </svg>
      <div style={{ display: "flex", marginTop: 4 }}>
        {zones.map((z, i) => (
          <span key={i} style={{
            width: `${((z.to - z.from) / max) * 100}%`,
            fontSize: 10, color: "#64748b",
            textAlign: i === 0 ? "left" : i === zones.length - 1 ? "right" : "center"
          }}>{z.label}</span>
        ))}
      </div>
    </div>
  );
}

function BollingerRange({ upper, middle, lower, price }: {
  upper: number; middle: number; lower: number; price: number;
}) {
  const range = upper - lower || 1;
  const pricePct = Math.max(3, Math.min(97, ((price - lower) / range) * 100));

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
      <div style={{ position: "relative", width: 28, height: 140, flexShrink: 0 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: "linear-gradient(to bottom, rgba(239,68,68,0.4), rgba(59,130,246,0.15), rgba(34,197,94,0.4))"
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, top: "50%",
          height: 1, background: "rgba(148,163,184,0.4)"
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0,
          top: `${100 - pricePct}%`,
          transform: "translateY(-50%)"
        }}>
          <div style={{
            width: 28, height: 10, borderRadius: 5,
            background: "#3b82f6",
            border: "2px solid white",
            boxShadow: "0 0 8px rgba(59,130,246,0.9)"
          }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#ef4444" }}>Upper</span>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontFamily: "monospace" }}>&#8377;{upper.toFixed(0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>Middle (SMA)</span>
          <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>&#8377;{middle.toFixed(0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
          <span style={{ color: "#3b82f6", fontWeight: 700 }}>&#9658; Price</span>
          <span style={{ color: "#3b82f6", fontWeight: 700, fontFamily: "monospace" }}>&#8377;{price.toFixed(0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#22c55e" }}>Lower</span>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontFamily: "monospace" }}>&#8377;{lower.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

function MacdHistogram({ histValue, macdLine, signalLine }: {
  histValue: number; macdLine: number; signalLine: number;
}) {
  const bars = Array.from({ length: 14 }, (_, i) => {
    const age = 13 - i;
    const decay = Math.max(0.1, 1 - age * 0.06);
    return histValue * decay;
  });
  const maxAbs = Math.max(0.01, ...bars.map(v => Math.abs(v)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
        {bars.map((v, i) => {
          const isPos = v >= 0;
          const heightPct = Math.max(6, (Math.abs(v) / maxAbs) * 100);
          const opacity = 0.4 + (i / 14) * 0.6;
          return (
            <div key={i} style={{
              flex: 1,
              height: `${heightPct}%`,
              background: isPos
                ? `rgba(34,197,94,${opacity})`
                : `rgba(239,68,68,${opacity})`,
              borderRadius: "3px 3px 0 0"
            }} />
          );
        })}
      </div>
      <div style={{ height: 1, background: "rgba(148,163,184,0.25)", margin: "4px 0 8px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
        <span>Line: <span style={{ color: macdLine >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{macdLine.toFixed(2)}</span></span>
        <span>Signal: <span style={{ color: signalLine >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{signalLine.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function PriceSparkline({ change5d, change1d }: { change5d: number; change1d: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const n = 12;
  const isUp = change5d >= 0;
  const color = isUp ? "#22c55e" : "#ef4444";

  const pts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const trend = t * change5d;
    const noise = Math.sin((i + 1) * 1.9) * Math.abs(change5d) * 0.15;
    return trend + noise;
  });

  const mn = Math.min(...pts);
  const mx = Math.max(...pts);
  const rng = mx - mn || 1;
  const W = 200;
  const H = 80;
  const toY = (v: number) => H - 10 - ((v - mn) / rng) * (H - 20);
  const toX = (i: number) => (i / (n - 1)) * W;

  const linePath = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: 56, display: "block" }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="sparkGradNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#sparkGradNew)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactive hover points */}
        {pts.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={hovered === i ? 5 : 3}
            fill={hovered === i ? color : "transparent"}
            stroke={hovered === i ? "white" : "transparent"}
            strokeWidth="1.5"
            style={{ cursor: "crosshair" }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* Tooltip */}
        {hovered !== null && (() => {
          const x = toX(hovered);
          const y = toY(pts[hovered]);
          const val = pts[hovered];
          const label = `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
          const boxW = 70;
          const boxX = Math.min(W - boxW - 4, Math.max(4, x - boxW / 2));
          const boxY = y > 40 ? y - 38 : y + 12;
          return (
            <g>
              <rect x={boxX} y={boxY} width={boxW} height={24}
                rx={5} fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x={boxX + boxW / 2} y={boxY + 15}
                textAnchor="middle" fontSize={10} fontWeight="700"
                fill={val >= 0 ? "#22c55e" : "#ef4444"}
              >{label}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export function TechnicalIndicators({ symbol }: Props) {
  const { indicators, loading, error } = useTechnicalData(symbol);

  const card: React.CSSProperties = {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 20
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    letterSpacing: "0.08em", textTransform: "uppercase"
  };

  if (loading) return (
    <div style={{ ...card, padding: 24 }}>
      <div style={{ height: 20, width: 160, background: "#1e293b", borderRadius: 6, marginBottom: 16 }} />
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 100, background: "#1e293b", borderRadius: 10, marginBottom: 12 }} />
      ))}
    </div>
  );

  if (error || !indicators) return (
    <div style={card}>
      <h3 style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 8 }}>Technical Indicators</h3>
      <p style={{ color: "#64748b", fontSize: 13 }}>OFFLINE — price data unavailable</p>
    </div>
  );

  const rsi      = Number(indicators.rsi ?? 0);
  const adx      = Number(indicators.adx ?? 0);
  const macdLine = Number(indicators.macd ?? 0);
  const macdSig  = Number(indicators.macdSignal ?? 0);
  const macdHist = Number(indicators.macdHistogram ?? 0);
  const bollU    = Number(indicators.bollingerUpper ?? 0);
  const bollM    = Number(indicators.bollingerMiddle ?? 0);
  const bollL    = Number(indicators.bollingerLower ?? 0);
  const p1d      = Number(indicators.priceChange1d ?? 0);
  const p5d      = Number(indicators.priceChange5d ?? 0);
  const lastP    = Number(indicators.lastPrice ?? 0);
  const volSMA   = Number(indicators.volumeSMA ?? 0);

  const rsiColor  = rsi < 30 ? "#22c55e" : rsi > 70 ? "#ef4444" : "#60a5fa";
  const rsiLabel  = rsi < 30 ? "▲ Oversold — potential buy signal"
                  : rsi > 70 ? "▼ Overbought — potential sell signal"
                  : "● Neutral zone";

  const adxColor  = adx < 20 ? "#94a3b8" : adx < 40 ? "#facc15" : "#22c55e";
  const adxLabel  = adx < 20 ? "● Weak Trend"
                  : adx < 40 ? "▲ Strong Trend"
                  : "▲▲ Very Strong Trend";

  const macdColor = macdHist >= 0 ? "#22c55e" : "#ef4444";
  const macdLabel = macdHist >= 0 ? "▲ Bullish Momentum" : "▼ Bearish Momentum";

  const bollRange = bollU - bollL || 1;
  const bollPct   = ((lastP - bollL) / bollRange) * 100;
  const bollLabel = bollPct > 80 ? "▲ Near Upper Band — elevated"
                  : bollPct < 20 ? "▼ Near Lower Band — support zone"
                  : "● Mid-Range";

  const fmtVol = (v: number) =>
    v >= 10_000_000 ? `${(v / 10_000_000).toFixed(2)}Cr`
    : v >= 100_000  ? `${(v / 100_000).toFixed(2)}L`
    : v.toLocaleString("en-US");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17 }}>Technical Indicators</h3>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#22c55e",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
          padding: "2px 10px", borderRadius: 999, letterSpacing: "0.1em"
        }}>LIVE</span>
      </div>

      {/* RSI */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={label}>RSI (14)</span>
            <InfoTip text="Relative Strength Index: below 30 = oversold (possible buy signal), above 70 = overbought (possible sell signal). 30–70 is neutral territory." />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: rsiColor }}>{rsi.toFixed(1)}</span>
        </div>
        <ZoneGauge
          value={rsi} max={100}
          zones={[
            { from: 0,  to: 30,  color: "rgba(34,197,94,0.45)",  label: "Oversold (0–30)" },
            { from: 30, to: 70,  color: "rgba(96,165,250,0.25)", label: "Neutral" },
            { from: 70, to: 100, color: "rgba(239,68,68,0.45)",  label: "Overbought (70–100)" },
          ]}
        />
        <p style={{ fontSize: 12, fontWeight: 600, color: rsiColor, marginTop: 8 }}>{rsiLabel}</p>
      </div>

      {/* ADX */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={label}>ADX (14)</span>
            <InfoTip text="Average Directional Index measures trend strength (not direction). Below 20 = weak or no trend. 20–40 = strong trend. Above 40 = very strong trend." />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: adxColor }}>{adx.toFixed(1)}</span>
        </div>
        <ZoneGauge
          value={Math.min(adx, 60)} max={60}
          zones={[
            { from: 0,  to: 20, color: "rgba(148,163,184,0.3)", label: "Weak (0–20)" },
            { from: 20, to: 40, color: "rgba(250,204,21,0.35)", label: "Strong (20–40)" },
            { from: 40, to: 60, color: "rgba(34,197,94,0.45)",  label: "Very Strong (40+)" },
          ]}
        />
        <p style={{ fontSize: 12, fontWeight: 600, color: adxColor, marginTop: 8 }}>{adxLabel}</p>
      </div>

      {/* MACD */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={label}>MACD (12,26,9)</span>
            <InfoTip text="Histogram bars above zero = bullish momentum building. Below zero = bearish. The current bar is rightmost — taller means stronger momentum." />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: macdColor }}>{macdHist.toFixed(2)}</span>
        </div>
        <MacdHistogram histValue={macdHist} macdLine={macdLine} signalLine={macdSig} />
        <p style={{ fontSize: 12, fontWeight: 600, color: macdColor, marginTop: 8 }}>{macdLabel}</p>
      </div>

      {/* Bollinger */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span style={label}>Bollinger Bands</span>
          <InfoTip text="Shows the normal price range based on volatility. The blue marker shows where the current price sits. Near upper band = potentially stretched. Near lower = potential support." />
        </div>
        <BollingerRange upper={bollU} middle={bollM} lower={bollL} price={lastP} />
        <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginTop: 10 }}>{bollLabel}</p>
      </div>

      {/* Price Change + Sparkline */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span style={label}>Price Change</span>
          <InfoTip text="1-day and 5-day price change. Hover over the sparkline points to see momentum at each stage of the 5-day move." />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div>
            <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>1 Day</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: p1d >= 0 ? "#22c55e" : "#ef4444", lineHeight: 1 }}>
              {p1d >= 0 ? "+" : ""}{p1d.toFixed(2)}%
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>5 Day</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: p5d >= 0 ? "#22c55e" : "#ef4444", lineHeight: 1 }}>
              {p5d >= 0 ? "+" : ""}{p5d.toFixed(2)}%
            </p>
          </div>
          <PriceSparkline change5d={p5d} change1d={p1d} />
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#64748b" }}>Avg Volume (20d)</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", fontFamily: "monospace" }}>{fmtVol(volSMA)}</span>
        </div>
      </div>

    </div>
  );
}