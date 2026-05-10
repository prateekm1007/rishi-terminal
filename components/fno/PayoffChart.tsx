"use client";

import { useMemo } from "react";
import { PayoffPoint } from "@/lib/fno/strategyEngine";

interface Props {
  payoff:     PayoffPoint[];
  breakevens: number[];
  spotPrice:  number;
  maxProfit:  number | null;
  maxLoss:    number | null;
}

export default function PayoffChart({ payoff, breakevens, spotPrice, maxProfit, maxLoss }: Props) {
  const { width, height, pad } = { width: 600, height: 280, pad: { t:20, r:20, b:40, l:60 } };
  const innerW = width  - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { minPnl, maxPnl, minSpot, maxSpot, toX, toY, path, zeroY, spotX } = useMemo(() => {
    if (!payoff.length) return { minPnl:0, maxPnl:0, minSpot:0, maxSpot:0, toX:()=>0, toY:()=>0, path:"", zeroY:0, spotX:0 };

    const pnls  = payoff.map(p => p.pnl);
    const spots = payoff.map(p => p.spot);

    const minPnl  = Math.min(...pnls);
    const maxPnl  = Math.max(...pnls);
    const minSpot = Math.min(...spots);
    const maxSpot = Math.max(...spots);

    const pnlRange  = maxPnl - minPnl || 1;
    const spotRange = maxSpot - minSpot || 1;

    const toX = (s: number) => pad.l + ((s - minSpot) / spotRange) * innerW;
    const toY = (p: number) => pad.t + ((maxPnl - p) / pnlRange) * innerH;

    const path = payoff.map((pt, i) =>
      (i === 0 ? "M" : "L") + toX(pt.spot).toFixed(1) + "," + toY(pt.pnl).toFixed(1)
    ).join(" ");

    const zeroY  = toY(0);
    const spotX  = toX(spotPrice);

    return { minPnl, maxPnl, minSpot, maxSpot, toX, toY, path, zeroY, spotX };
  }, [payoff, spotPrice, pad, innerW, innerH]);

  if (!payoff.length) {
    return (
      <div style={{
        height: "200px", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#475569", fontSize: "13px",
        background: "rgba(17,24,39,0.4)", borderRadius: "12px",
      }}>
        Add legs to see payoff chart
      </div>
    );
  }

  const pnlRange = maxPnl - minPnl || 1;

  // Build profit area (above zero)
  const profitPath = payoff
    .filter((_, i) => i === 0 || i === payoff.length - 1 ||
      (payoff[i-1]?.pnl <= 0 && payoff[i].pnl > 0) ||
      (payoff[i-1]?.pnl > 0  && payoff[i].pnl <= 0) ||
      payoff[i].pnl > 0)
    .map((pt, i, arr) => {
      const x = toX(pt.spot).toFixed(1);
      const y = toY(Math.max(0, pt.pnl)).toFixed(1);
      return (i === 0 ? "M" : "L") + x + "," + y;
    }).join(" ");

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }, (_, i) => {
    const pnl = minPnl + (pnlRange * i) / (tickCount - 1);
    return { pnl, y: toY(pnl) };
  });

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const spot = minSpot + (maxSpot - minSpot) * t;
    return { spot, x: toX(spot) };
  });

  const fmt = (n: number) => n >= 1000 || n <= -1000
    ? (n/1000).toFixed(1) + "K"
    : n.toFixed(0);

  return (
    <div style={{ background: "rgba(17,24,39,0.5)", borderRadius: "12px", padding: "12px" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
      >
        {/* Grid lines */}
        {yTicks.map(({ pnl, y }, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={width - pad.r} y2={y}
              stroke="rgba(51,65,85,0.3)" strokeWidth="1" strokeDasharray={pnl === 0 ? "none" : "3,3"} />
            <text x={pad.l - 6} y={y + 4} textAnchor="end"
              fontSize="10" fill={pnl === 0 ? "#64748B" : "#475569"}
              fontFamily="JetBrains Mono, monospace">
              {fmt(pnl)}
            </text>
          </g>
        ))}

        {/* Zero line */}
        <line x1={pad.l} y1={zeroY} x2={width - pad.r} y2={zeroY}
          stroke="rgba(100,116,139,0.6)" strokeWidth="1.5" />

        {/* X ticks */}
        {xTicks.map(({ spot, x }, i) => (
          <g key={i}>
            <line x1={x} y1={pad.t} x2={x} y2={height - pad.b}
              stroke="rgba(51,65,85,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            <text x={x} y={height - pad.b + 14} textAnchor="middle"
              fontSize="10" fill="#475569" fontFamily="JetBrains Mono, monospace">
              {spot >= 1000 ? (spot/1000).toFixed(1)+"K" : spot.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Loss fill */}
        <defs>
          <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="profitFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Payoff line */}
        <path d={path} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current spot line */}
        <line x1={spotX} y1={pad.t} x2={spotX} y2={height - pad.b}
          stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="4,3" />
        <text x={spotX + 4} y={pad.t + 12} fontSize="10" fill="#8B5CF6"
          fontFamily="JetBrains Mono, monospace">Spot</text>

        {/* Breakevens */}
        {breakevens.map((be, i) => {
          const bx = toX(be);
          return (
            <g key={i}>
              <line x1={bx} y1={pad.t} x2={bx} y2={height - pad.b}
                stroke="#F59E0B" strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
              <circle cx={bx} cy={zeroY} r="4" fill="#F59E0B" />
              <text x={bx + 4} y={zeroY - 6} fontSize="9" fill="#F59E0B"
                fontFamily="JetBrains Mono, monospace">
                BE: {be >= 1000 ? (be/1000).toFixed(1)+"K" : be}
              </text>
            </g>
          );
        })}

        {/* Labels */}
        <text x={pad.l + innerW/2} y={height - 2} textAnchor="middle"
          fontSize="10" fill="#334155" fontFamily="Inter, sans-serif">
          Underlying Price ()
        </text>
        <text x={12} y={pad.t + innerH/2} textAnchor="middle"
          fontSize="10" fill="#334155" fontFamily="Inter, sans-serif"
          transform={`rotate(-90, 12, ${pad.t + innerH/2})`}>
          P&L ()
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "8px", flexWrap: "wrap" }}>
        {[
          { color: "#D4AF37", label: "P&L Curve" },
          { color: "#8B5CF6", label: "Current Spot", dash: true },
          { color: "#F59E0B", label: "Breakeven" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "20px", height: "2px",
              background: l.dash ? "none" : l.color,
              borderTop: l.dash ? "2px dashed " + l.color : "none",
            }} />
            <span style={{ fontSize: "10px", color: "#64748B" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}