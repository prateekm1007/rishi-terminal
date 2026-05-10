"use client";

import { useState, useMemo, useEffect } from "react";
import { calculateRishiScore } from "@/lib/scorers/rishiScoreV2";
import { getScoreColors, colors, fonts, shadows } from "@/lib/design";
import type { StockMetrics, RishiScoreResult, ScoreMode, PillarScore } from "@/lib/scorers/types";

function getConvictionLabel(c: string): string {
  const m: Record<string,string> = {
    LEGENDARY:"🌟 Legendary", HIGH_CONVICTION:"💎 High Conviction",
    STRONG:"✅ Strong", WATCHLIST:"👁 Watchlist",
    NEUTRAL:"➡️ Neutral", AVOID:"🚫 Avoid",
    LEGENDARY_SHORT:"🔥 Legendary Short",
    HIGH_CONVICTION_SHORT:"⚡ High Conviction Short",
    TACTICAL_SHORT:"🎯 Tactical Short",
    DANGEROUS_SHORT:"⚠️ Dangerous Short",
  };
  return m[c] ?? c;
}

function ScoreGauge({ score, mode }: { score: number; mode: ScoreMode }) {
  const [displayScore, setDisplayScore] = useState(0);
  const { primary, glow } = getScoreColors(score, mode);
  const r      = 62;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (displayScore / 100) * circ;
  const isLeg  = score >= 90 && mode === "LONG";
  const isShortLeg = score >= 85 && mode === "SHORT";

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const startTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(eased * score);
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [score]);

  const strokeId = "gauge-gradient-" + mode + "-" + Math.random().toString(36).substr(2,9);
  const glowId = "glow-" + Math.random().toString(36).substr(2,9);

  return (
    <div style={{ position:"relative", width:"180px", height:"180px", margin:"0 auto" }}>
      <svg width="180" height="180" style={{ transform:"rotate(-90deg)", overflow:"visible" }}>
        <defs>
          <linearGradient id={strokeId} x1="0%" y1="0%" x2="100%" y2="100%">
            {isLeg ? (
              <><stop offset="0%" stopColor="#A88B20"/><stop offset="50%" stopColor="#D4AF37"/><stop offset="100%" stopColor="#8B5CF6"/></>
            ) : isShortLeg ? (
              <><stop offset="0%" stopColor="#DC2626"/><stop offset="50%" stopColor="#EF4444"/><stop offset="100%" stopColor="#F97316"/></>
            ) : (
              <><stop offset="0%" stopColor={primary}/><stop offset="100%" stopColor={primary}/></>
            )}
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feFlood floodColor={primary} floodOpacity="0.4"/>
            <feComposite in2="blur" operator="in"/>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(30,41,59,0.6)" strokeWidth="10"/>
        <circle cx="90" cy="90" r={r+8} fill="none" stroke={isLeg || isShortLeg ? primary : "transparent"} strokeWidth="1" opacity="0.3" className={isLeg || isShortLeg ? "glow-ring" : ""}/>
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={"url(#" + strokeId + ")"}
          strokeWidth="14"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          filter={isLeg || isShortLeg ? "url(#" + glowId + ")" : "none"}
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:"44px", fontWeight:900, color: primary, lineHeight:1, fontFamily: fonts.serif, letterSpacing:"-0.02em" }} className="count-up">
          {displayScore.toFixed(0)}
        </div>
        <div style={{ fontSize:"11px", color: colors.textMuted, fontFamily: fonts.mono, marginTop:"4px", fontWeight:600 }}>/ 100</div>
      </div>
    </div>
  );
}

function PillarBar({ pillar, mode, index }: { pillar: PillarScore; mode: ScoreMode; index: number }) {
  const { primary } = getScoreColors(pillar.score, mode);
  return (
    <div style={{ marginBottom:"16px" }} className={"stagger-" + (index + 1)}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
        <span style={{ fontSize:"12px", fontWeight:600, color: colors.textSecondary, fontFamily: fonts.sans, letterSpacing:"0.005em" }}>{pillar.name}</span>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ fontSize:"10px", color: colors.textGhost, fontFamily: fonts.mono, fontWeight:500 }}>×{pillar.weight.toFixed(2)}</span>
          <span style={{ fontSize:"15px", fontWeight:800, color: primary, fontFamily: fonts.mono, minWidth:"32px", textAlign:"right" }}>{pillar.score.toFixed(0)}</span>
        </div>
      </div>
      <div className="pillar-bar-track">
        <div className="pillar-bar-fill" style={{ width: pillar.score + "%", background: "linear-gradient(90deg, " + primary + ", " + primary + "99)" }} />
      </div>
      {pillar.redFlags.filter(f => f.severity === "critical").map((f, i) => (
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"7px", fontSize:"11px", color:"#FCA5A5", marginTop:"6px", lineHeight:1.5 }}>
          <span className="flag-critical" style={{ flexShrink:0, fontSize:"13px" }}>🔴</span>
          <span style={{ fontWeight:500 }}>{f.label}</span>
        </div>
      ))}
      {pillar.redFlags.filter(f => f.severity === "major").map((f, i) => (
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"7px", fontSize:"11px", color:"#FCD34D", marginTop:"5px", lineHeight:1.5 }}>
          <span style={{ flexShrink:0, fontSize:"13px" }}>🟡</span>
          <span style={{ fontWeight:400 }}>{f.label}</span>
        </div>
      ))}
    </div>
  );
}

function RiskChip({ label, level }: { label: string; level?: string }) {
  const color = level === "HIGH" ? colors.red : level === "MEDIUM" ? colors.amber : colors.green;
  return (
    <div style={{ textAlign:"center", background: colors.bgSurface, border:"1px solid " + colors.border, borderRadius:"12px", padding:"14px 10px", transition:"all 0.2s" }}>
      <div style={{ fontSize:"10px", color: colors.textMuted, marginBottom:"6px", fontFamily: fonts.sans, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>{label}</div>
      <div style={{ fontSize:"13px", fontWeight:800, color, fontFamily: fonts.mono, background: color+"18", padding:"3px 10px", borderRadius:"20px", display:"inline-block", border:"1px solid " + color + "33" }}>{level ?? "—"}</div>
    </div>
  );
}

interface Props {
  metrics:     StockMetrics;
  defaultMode?: ScoreMode;
}

export default function RishiScoreDual({ metrics, defaultMode = "LONG" }: Props) {
  const [mode, setMode] = useState<ScoreMode>(defaultMode);

  const result: RishiScoreResult = useMemo(
    () => calculateRishiScore(metrics, mode),
    [metrics, mode]
  );

  const { primary, label: convLabel } = getScoreColors(result.finalScore, mode);
  const isShort = mode === "SHORT";
  const isLeg   = result.conviction === "LEGENDARY" || result.conviction === "LEGENDARY_SHORT";

  return (
    <div style={{
      background:   "linear-gradient(135deg, rgba(17,24,39,0.92) 0%, rgba(10,15,28,0.96) 100%)",
      border:       "1px solid " + (isLeg ? colors.goldBorderActive : colors.borderGold),
      borderRadius: "28px",
      padding:      "32px",
      maxWidth:     "540px",
      boxShadow:    isLeg ? shadows.gold : "0 12px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      position:     "relative",
      overflow:     "hidden",
    }}>

      {isLeg && (
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 50% 0%, rgba(212,175,55,0.06), transparent 60%)", pointerEvents:"none", borderRadius:"28px" }} />
      )}

      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"32px" }}>
          <div>
            <div style={{ fontFamily: fonts.serif, fontSize:"20px", fontWeight:700, color: colors.gold, letterSpacing:"0.05em", marginBottom:"4px" }}>RISHI SCORE</div>
            <div style={{ fontSize:"11px", color: colors.textMuted, fontFamily: fonts.mono, fontWeight:500 }}>v2.0 · {result.dataQuality} Data · {metrics.sector}</div>
          </div>

          <div style={{ display:"flex", background:"rgba(5,8,16,0.85)", border:"1px solid " + colors.border, borderRadius:"14px", padding:"4px", gap:"3px", boxShadow:"inset 0 1px 2px rgba(0,0,0,0.2)" }}>
            <button onClick={() => setMode("LONG")}
              style={{ padding:"8px 18px", borderRadius:"11px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"12px", fontFamily: fonts.sans, transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                background: mode === "LONG" ? "linear-gradient(135deg,#16A34A,#22C55E)" : "transparent",
                color: mode === "LONG" ? "white" : colors.textMuted,
                boxShadow: mode === "LONG" ? "0 3px 12px rgba(34,197,94,0.4), 0 1px 3px rgba(0,0,0,0.3)" : "none",
                transform: mode === "LONG" ? "scale(1.05)" : "scale(1)",
              }}>
              📈 Long
            </button>
            <button onClick={() => setMode("SHORT")}
              style={{ padding:"8px 18px", borderRadius:"11px", border:"none", cursor:"pointer", fontWeight:700, fontSize:"12px", fontFamily: fonts.sans, transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                background: mode === "SHORT" ? "linear-gradient(135deg,#DC2626,#EF4444)" : "transparent",
                color: mode === "SHORT" ? "white" : colors.textMuted,
                boxShadow: mode === "SHORT" ? "0 3px 12px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.3)" : "none",
                transform: mode === "SHORT" ? "scale(1.05)" : "scale(1)",
              }}>
              📉 Short
            </button>
          </div>
        </div>

        <div style={{ textAlign:"center", marginBottom:"32px" }} className="animate-entrance">
          <ScoreGauge score={result.finalScore} mode={mode} />
          <div style={{ marginTop:"18px" }}>
            <div style={{ fontSize:"18px", fontWeight:800, color: primary, marginBottom:"5px", letterSpacing:"0.01em" }}>
              {getConvictionLabel(result.conviction)}
            </div>
            <div style={{ fontSize:"12px", color: colors.textMuted, fontFamily: fonts.mono, fontWeight:500, letterSpacing:"0.02em" }}>
              {result.grade} · {result.action.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        <div style={{
          background:   isShort ? "linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.03))" : "linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.03))",
          border:       "1px solid " + (isShort ? "rgba(239,68,68,0.25)" : colors.goldBorder),
          borderRadius: "14px",
          padding:      "16px 18px",
          marginBottom: "28px",
          boxShadow:    "inset 0 1px 2px rgba(0,0,0,0.1)",
        }}>
          <p style={{ fontSize:"13px", fontWeight:600, color: colors.textSecondary, lineHeight:1.6, margin:0, fontFamily: fonts.sans }}>
            {result.headline}
          </p>
        </div>

        <div style={{ marginBottom:"28px" }}>
          <div style={{ fontSize:"10px", fontWeight:700, color: colors.textGhost, marginBottom:"16px", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily: fonts.sans }}>
            Pillar Breakdown
          </div>
          {result.pillars.map((p, i) => <PillarBar key={i} pillar={p} mode={mode} index={i} />)}
        </div>

        {isShort && (
          <div style={{ marginBottom:"28px" }}>
            <div style={{ fontSize:"10px", fontWeight:700, color: colors.textGhost, marginBottom:"14px", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily: fonts.sans }}>
              Short Risk Assessment
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px" }}>
              <RiskChip label="Squeeze"    level={result.shortSqueezeRisk} />
              <RiskChip label="Liquidity"  level={result.liquidityRisk}    />
              <RiskChip label="Black Swan" level={result.blackSwanRisk}    />
            </div>
          </div>
        )}

        <div className="divider-gold" style={{ marginBottom:"24px" }} />

        <div>
          <div style={{ fontSize:"11px", fontWeight:700, color: colors.gold, marginBottom:"12px", letterSpacing:"0.12em", fontFamily: fonts.sans }}>🧘 RISHI COMMENTARY</div>
          <div className="commentary-box" style={{ fontSize:"13.5px", lineHeight:1.9, color:"#B4BFCD" }}>
            &ldquo;{result.commentary}&rdquo;
          </div>
        </div>

        <div style={{ marginTop:"18px", display:"flex", justifyContent:"space-between", fontSize:"11px", color: colors.textGhost, fontFamily: fonts.mono, fontWeight:500 }}>
          <span>Confidence: {(result.confidence * 100).toFixed(0)}%</span>
          <span>{new Date(result.timestamp).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}