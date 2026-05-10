"use client";

import { useState, useMemo, useCallback } from "react";
import {
  OptionLeg, StrategyResult, StrategyTemplate,
  STRATEGY_TEMPLATES, getLotSize, analyzeStrategy,
} from "@/lib/fno/strategyEngine";
import { FnOContext } from "@/lib/fno/rishiPrompts";
import RishiStrategyAdvisor from "@/components/fno/RishiStrategyAdvisor";
import PayoffChart from "@/components/fno/PayoffChart";

// ── Constants ─────────────────────────────────────────────────

const UNDERLYINGS = [
  { symbol:"NIFTY",     name:"Nifty 50",       spot:24200, sector:"Index",   longScore:72, shortScore:42 },
  { symbol:"BANKNIFTY", name:"Bank Nifty",      spot:51800, sector:"Banking", longScore:68, shortScore:48 },
  { symbol:"TCS",       name:"TCS",             spot:3840,  sector:"IT",      longScore:88, shortScore:24 },
  { symbol:"RELIANCE",  name:"Reliance Inds.",  spot:2920,  sector:"Energy",  longScore:76, shortScore:34 },
  { symbol:"INFY",      name:"Infosys",         spot:1720,  sector:"IT",      longScore:82, shortScore:28 },
  { symbol:"HDFCBANK",  name:"HDFC Bank",       spot:1680,  sector:"Banking", longScore:74, shortScore:38 },
  { symbol:"ADANIENT",  name:"Adani Enterprises",spot:2560, sector:"Infra",   longScore:42, shortScore:78 },
  { symbol:"ZOMATO",    name:"Zomato",          spot:224,   sector:"Consumer",longScore:38, shortScore:72 },
];

const C = {
  bg:          "#020408",
  bgCard:      "rgba(17,24,39,0.85)",
  border:      "rgba(30,41,59,0.8)",
  borderGold:  "rgba(212,175,55,0.2)",
  gold:        "#D4AF37",
  green:       "#22C55E",
  red:         "#EF4444",
  amber:       "#F59E0B",
  purple:      "#8B5CF6",
  text:        "#F8FAFC",
  textSec:     "#94A3B8",
  textMuted:   "#64748B",
};

let legCounter = 0;
function newId() { return "leg_" + (++legCounter); }

// ── Leg Editor ────────────────────────────────────────────────

function LegEditor({
  leg, spot, onUpdate, onRemove,
}: {
  leg: OptionLeg;
  spot: number;
  onUpdate: (id: string, changes: Partial<OptionLeg>) => void;
  onRemove: (id: string) => void;
}) {
  const pnlColor = leg.action === "BUY" ? C.green : C.red;

  return (
    <div style={{
      background: leg.action === "BUY" ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
      border: "1px solid " + (leg.action === "BUY" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"),
      borderRadius: "12px", padding: "14px 16px", marginBottom: "10px",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 40px", gap: "10px", alignItems: "center" }}>

        {/* Action */}
        <div>
          <label style={{ fontSize: "10px", color: C.textMuted, display: "block", marginBottom: "4px" }}>ACTION</label>
          <select
            value={leg.action}
            onChange={e => onUpdate(leg.id, { action: e.target.value as any })}
            style={{
              width: "100%", background: "rgba(5,8,16,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              color: pnlColor, padding: "7px 10px", fontSize: "13px", fontWeight: 700,
            }}
          >
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label style={{ fontSize: "10px", color: C.textMuted, display: "block", marginBottom: "4px" }}>TYPE</label>
          <select
            value={leg.type}
            onChange={e => onUpdate(leg.id, { type: e.target.value as any })}
            style={{
              width: "100%", background: "rgba(5,8,16,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              color: C.text, padding: "7px 10px", fontSize: "13px",
            }}
          >
            <option value="CALL">CALL</option>
            <option value="PUT">PUT</option>
          </select>
        </div>

        {/* Strike */}
        <div>
          <label style={{ fontSize: "10px", color: C.textMuted, display: "block", marginBottom: "4px" }}>STRIKE</label>
          <input
            type="number"
            value={leg.strike}
            step={50}
            onChange={e => onUpdate(leg.id, { strike: Number(e.target.value) })}
            style={{
              width: "100%", background: "rgba(5,8,16,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              color: C.text, padding: "7px 10px", fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Premium */}
        <div>
          <label style={{ fontSize: "10px", color: C.textMuted, display: "block", marginBottom: "4px" }}>PREMIUM </label>
          <input
            type="number"
            value={leg.premium}
            step={1}
            onChange={e => onUpdate(leg.id, { premium: Number(e.target.value) })}
            style={{
              width: "100%", background: "rgba(5,8,16,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              color: C.text, padding: "7px 10px", fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Lots */}
        <div>
          <label style={{ fontSize: "10px", color: C.textMuted, display: "block", marginBottom: "4px" }}>LOTS</label>
          <input
            type="number"
            value={leg.lots}
            min={1}
            onChange={e => onUpdate(leg.id, { lots: Number(e.target.value) })}
            style={{
              width: "100%", background: "rgba(5,8,16,0.8)",
              border: "1px solid rgba(51,65,85,0.6)", borderRadius: "8px",
              color: C.text, padding: "7px 10px", fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Remove */}
        <button
          onClick={() => onRemove(leg.id)}
          style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px", color: C.red, cursor: "pointer",
            padding: "8px", fontSize: "14px", lineHeight: 1,
          }}
        >✕</button>
      </div>

      {/* P&L per lot preview */}
      <div style={{ marginTop: "8px", fontSize: "11px", color: C.textMuted }}>
        Lot size: {leg.lotSize} × {leg.lots} lots = {leg.lots * leg.lotSize} units ·
        Premium value: {(leg.premium * leg.lots * leg.lotSize).toLocaleString()}
      </div>
    </div>
  );
}

// ── Metric Chip ────────────────────────────────────────────────

function MetricChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(17,24,39,0.6)", border: "1px solid rgba(51,65,85,0.4)",
      borderRadius: "10px", padding: "12px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: "10px", color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 800, color: color ?? C.text, fontFamily: "JetBrains Mono, monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────

export default function FnOBuilderPage() {
  const [selectedUnderlying, setSelectedUnderlying] = useState(UNDERLYINGS[0]);
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [strategyName, setStrategyName] = useState("Custom Strategy");
  const [activeTab, setActiveTab] = useState<"builder"|"templates">("builder");

  const spot     = selectedUnderlying.spot;
  const lotSize  = getLotSize(selectedUnderlying.symbol);

  const result: StrategyResult = useMemo(
    () => analyzeStrategy(legs, spot, strategyName),
    [legs, spot, strategyName]
  );

  const fnoContext: FnOContext = useMemo(() => ({
    symbol:     selectedUnderlying.symbol,
    name:       selectedUnderlying.name,
    sector:     selectedUnderlying.sector,
    longScore:  selectedUnderlying.longScore,
    shortScore: selectedUnderlying.shortScore,
    conviction: selectedUnderlying.longScore >= 80 ? "HIGH CONVICTION LONG"
               : selectedUnderlying.longScore >= 65 ? "STRONG"
               : selectedUnderlying.shortScore >= 65 ? "BEARISH"
               : "NEUTRAL",
    headline: `Rishi scores ${selectedUnderlying.symbol} ${selectedUnderlying.longScore}/100 Long · ${selectedUnderlying.shortScore}/100 Short`,
    strategy: {
      name:        result.name,
      legs:        result.legs.map(l => ({
        action:  l.action, type: l.type, strike: l.strike,
        expiry:  l.expiry, premium: l.premium, lots: l.lots,
      })),
      netDelta:    result.netDelta,
      netTheta:    result.netTheta,
      netVega:     result.netVega,
      netGamma:    result.netGamma,
      maxProfit:   result.maxProfit,
      maxLoss:     result.maxLoss,
      breakevens:  result.breakevens,
      popEstimate: result.popEstimate,
    },
  }), [selectedUnderlying, result]);

  const addLeg = useCallback(() => {
    const atm = Math.round(spot / 100) * 100;
    const newLeg: OptionLeg = {
      id: newId(), action: "BUY", type: "CALL",
      strike: atm, expiry: "2025-01-30",
      premium: 50, lots: 1, lotSize,
    };
    setLegs(prev => [...prev, newLeg]);
  }, [spot, lotSize]);

  const updateLeg = useCallback((id: string, changes: Partial<OptionLeg>) => {
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...changes, lotSize } : l));
  }, [lotSize]);

  const removeLeg = useCallback((id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id));
  }, []);

  const applyTemplate = useCallback((tpl: StrategyTemplate) => {
    const rawLegs = tpl.buildLegs(spot, lotSize);
    const atm = Math.round(spot / 100) * 100;
    const expiry = "2025-01-30";
    const newLegs: OptionLeg[] = rawLegs.map(l => ({
      id:      newId(),
      action:  l.action   ?? "BUY",
      type:    l.type     ?? "CALL",
      strike:  l.strike   ?? atm,
      expiry:  l.expiry   ?? expiry,
      premium: l.premium  ?? Math.round(spot * 0.015),
      lots:    l.lots     ?? 1,
      lotSize: l.lotSize  ?? lotSize,
    }));
    setLegs(newLegs);
    setStrategyName(tpl.name);
    setActiveTab("builder");
  }, [spot, lotSize]);

  const clearLegs = useCallback(() => setLegs([]), []);

  const profitColor = (result.maxProfit ?? 0) > 0 ? C.green : C.textMuted;
  const lossColor   = (result.maxLoss   ?? 0) < 0 ? C.red   : C.textMuted;

  const CATEGORY_COLORS: Record<string, string> = {
    bullish: C.green, bearish: C.red, neutral: C.amber, speculative: C.purple,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#020408 0%,#0A0F1C 40%,#0D1220 100%)",
      fontFamily: "Inter, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        background: "rgba(5,8,16,0.9)",
        borderBottom: "1px solid rgba(212,175,55,0.12)",
        padding: "20px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{
            fontFamily: "Cinzel, Georgia, serif",
            fontSize: "24px", fontWeight: 900,
            background: "linear-gradient(135deg,#A88B20,#D4AF37,#A78BFA)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: 0, letterSpacing: "0.02em",
          }}>
            🎯 F&O Strategy Builder
          </h1>
          <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "4px" }}>
            Build strategies. Get Rishi wisdom. Understand your risk.
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {["builder", "templates"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: "8px 18px", borderRadius: "10px",
                border: activeTab === tab ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(51,65,85,0.4)",
                background: activeTab === tab ? "rgba(212,175,55,0.1)" : "transparent",
                color: activeTab === tab ? C.gold : C.textMuted,
                cursor: "pointer", fontSize: "13px", fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {tab === "builder" ? "⚙️ Builder" : "📋 Templates"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box" }}>

        {/* ── LEFT PANEL ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Underlying Selector */}
          <div style={{
            background: C.bgCard, border: "1px solid " + C.border,
            borderRadius: "16px", padding: "20px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: "14px" }}>
              SELECT UNDERLYING
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {UNDERLYINGS.map(u => {
                const isSelected = u.symbol === selectedUnderlying.symbol;
                const scoreColor = u.longScore >= 75 ? C.green : u.longScore >= 60 ? C.amber : C.red;
                return (
                  <button
                    key={u.symbol}
                    onClick={() => { setSelectedUnderlying(u); setLegs([]); }}
                    style={{
                      padding: "8px 14px", borderRadius: "10px",
                      border: isSelected ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(51,65,85,0.4)",
                      background: isSelected ? "rgba(212,175,55,0.08)" : "rgba(17,24,39,0.5)",
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 700, color: isSelected ? C.gold : C.text, fontFamily: "JetBrains Mono, monospace" }}>
                      {u.symbol}
                    </div>
                    <div style={{ fontSize: "10px", color: scoreColor, marginTop: "2px", fontWeight: 600 }}>
                      {u.longScore}/100 · {u.spot.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: "16px", padding: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: "16px" }}>
                STRATEGY TEMPLATES
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {STRATEGY_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      textAlign: "left", padding: "14px 16px",
                      background: "rgba(17,24,39,0.6)",
                      border: "1px solid rgba(51,65,85,0.4)",
                      borderRadius: "12px", cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = CATEGORY_COLORS[tpl.category] + "60";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(31,41,59,0.6)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(51,65,85,0.4)";
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(17,24,39,0.6)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: C.text }}>{tpl.name}</span>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, color: CATEGORY_COLORS[tpl.category],
                        background: CATEGORY_COLORS[tpl.category] + "18",
                        padding: "2px 8px", borderRadius: "10px", flexShrink: 0,
                        border: "1px solid " + CATEGORY_COLORS[tpl.category] + "30",
                      }}>{tpl.category}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.5, marginBottom: "6px" }}>
                      {tpl.description}
                    </div>
                    {tpl.rishiTag && (
                      <div style={{ fontSize: "10px", color: C.gold }}>🧘 {tpl.rishiTag}</div>
                    )}
                    <div style={{
                      fontSize: "10px", marginTop: "6px",
                      color: tpl.maxRisk === "defined" ? C.green : C.red,
                    }}>
                      {tpl.maxRisk === "defined" ? "✓ Defined risk" : "⚠ Undefined risk"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Builder Tab */}
          {activeTab === "builder" && (
            <>
              {/* Leg Editor */}
              <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: "16px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em" }}>
                      STRATEGY LEGS
                    </div>
                    <input
                      value={strategyName}
                      onChange={e => setStrategyName(e.target.value)}
                      style={{
                        background: "transparent", border: "none", outline: "none",
                        fontSize: "16px", fontWeight: 700, color: C.text,
                        marginTop: "4px", width: "240px",
                      }}
                      placeholder="Strategy name..."
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={clearLegs}
                      style={{
                        padding: "8px 14px", borderRadius: "8px",
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        color: C.red, cursor: "pointer", fontSize: "12px", fontWeight: 600,
                      }}
                    >Clear</button>
                    <button
                      onClick={addLeg}
                      style={{
                        padding: "8px 18px", borderRadius: "8px",
                        background: "linear-gradient(135deg,#A88B20,#D4AF37)",
                        border: "none", color: "#0A0F1C",
                        cursor: "pointer", fontSize: "13px", fontWeight: 700,
                      }}
                    >+ Add Leg</button>
                  </div>
                </div>

                {legs.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    border: "2px dashed rgba(51,65,85,0.4)", borderRadius: "12px",
                    color: C.textMuted,
                  }}>
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>No legs yet</div>
                    <div style={{ fontSize: "12px" }}>Click "+ Add Leg" or choose a template</div>
                  </div>
                ) : (
                  legs.map(leg => (
                    <LegEditor
                      key={leg.id}
                      leg={leg}
                      spot={spot}
                      onUpdate={updateLeg}
                      onRemove={removeLeg}
                    />
                  ))
                )}
              </div>

              {/* Metrics */}
              <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: "16px" }}>
                  STRATEGY METRICS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                  <MetricChip
                    label="Max Profit"
                    value={result.maxProfit != null ? "" + result.maxProfit.toLocaleString() : "∞"}
                    color={profitColor}
                  />
                  <MetricChip
                    label="Max Loss"
                    value={result.maxLoss != null ? "" + Math.abs(result.maxLoss).toLocaleString() : "∞"}
                    color={lossColor}
                  />
                  <MetricChip
                    label="PoP"
                    value={result.popEstimate + "%"}
                    color={result.popEstimate >= 60 ? C.green : C.amber}
                  />
                  <MetricChip
                    label="R/R"
                    value={result.riskReward != null ? result.riskReward + "x" : "—"}
                    color={C.textSec}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                  <MetricChip label="Net Delta"  value={result.netDelta.toFixed(0)}  color={result.netDelta > 0 ? C.green : C.red} />
                  <MetricChip label="Net Theta"  value={"" + result.netTheta.toFixed(0) + "/d"} color={result.netTheta > 0 ? C.green : C.red} />
                  <MetricChip label="Net Vega"   value={result.netVega.toFixed(0)}   color={C.purple} />
                  <MetricChip label="Net Credit" value={"" + result.netPremium.toLocaleString()} color={result.netPremium > 0 ? C.green : C.red} />
                </div>

                {result.breakevens.length > 0 && (
                  <div style={{
                    background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)",
                    borderRadius: "10px", padding: "12px 16px",
                    fontSize: "13px", color: C.textSec,
                  }}>
                    <span style={{ color: C.gold, fontWeight: 700 }}>Breakevens: </span>
                    {result.breakevens.map(b => "" + b.toLocaleString()).join(" · ")}
                  </div>
                )}
              </div>

              {/* Payoff Chart */}
              <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: "16px" }}>
                  PAYOFF AT EXPIRY
                </div>
                <PayoffChart
                  payoff={result.payoff}
                  breakevens={result.breakevens}
                  spotPrice={spot}
                  maxProfit={result.maxProfit}
                  maxLoss={result.maxLoss}
                />
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL — Rishi Advisor ──────────────────── */}
        <div style={{ position: "sticky", top: "24px", height: "calc(100vh - 120px)", overflowY: "auto" }}>
          <RishiStrategyAdvisor context={fnoContext} strategy={result} />
        </div>

      </div>
    </div>
  );
}