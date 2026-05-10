"use client";

import { useState, useMemo } from "react";
import { RISHI_PERSONALITIES, RishiPersonality, FnOContext } from "@/lib/fno/rishiPrompts";
import { StrategyResult, getRishiFitScore } from "@/lib/fno/strategyEngine";
import { getCurrentTier } from "@/lib/premium";
import { colors, fonts } from "@/lib/design";

interface Props {
  context:  FnOContext;
  strategy: StrategyResult;
}

const TIER_ORDER = { seeker: 0, student: 1, disciple: 2 } as const;

// ── Static Rishi Responses (no API needed) ────────────────────

const RISHI_STATIC_RESPONSES: Record<string, (ctx: FnOContext, result: StrategyResult, fit: number) => string> = {

  jhunjhunwala: (ctx, r, fit) => {
    const isGood = fit >= 65;
    if (!ctx.strategy.legs.length) return "Add some legs first, yaar! Ek bhi position nahi hai abhi.";
    if (ctx.longScore >= 75) {
      return isGood
        ? `Arrey wah! ${ctx.symbol} pe ${r.name} — yeh sahi hai! Long Score ${ctx.longScore}/100 with ${ctx.conviction}. This is exactly the kind of asymmetric setup I love. The Rishi fit is ${fit}/100. Max profit ${r.maxProfit?.toLocaleString() ?? "unlimited"} with defined risk. Samajh rahe ho? Agar stock moves, we win big. Accumulate with conviction — market is giving opportunity!`
        : `${ctx.symbol} fundamentals are strong (${ctx.longScore}/100) but this structure is too conservative for the opportunity, yaar. ${r.name} limits your upside too much. I would go with a more aggressive bull call spread or even a straight long call if the move is coming. Jab conviction hai, toh size bhi hona chahiye!`;
    }
    return `Mixed signals on ${ctx.symbol} — Long ${ctx.longScore}, Short ${ctx.shortScore}. Mujhe yahan pure directional bet nahi lagti. ${r.name} with ${r.popEstimate}% PoP and max loss ${r.maxLoss?.toLocaleString() ?? "unlimited"} — position size carefully. Market is complex here.`;
  },

  damani: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return "No strategy defined. In investing, clarity before action is not optional — it is the discipline.";
    const risk = r.maxLoss != null ? `${Math.abs(r.maxLoss).toLocaleString()}` : "unlimited — which concerns me deeply";
    return `I will begin with the risk, as always. Maximum loss on this ${r.name} is ${risk}. ${fit >= 70 ? "This is acceptable." : "This is NOT acceptable for conservative capital."} The net theta of ${r.netTheta.toFixed(0)}/day ${r.netTheta > 0 ? "works in our favour" : "works against us — time is the enemy here"}. Probability of profit at ${r.popEstimate}% ${r.popEstimate > 60 ? "is reasonable" : "is insufficient for me — I require 65%+ minimum"}. ${fit >= 65 ? "You may proceed with reduced size — 50% of intended position." : "I would not execute this trade in its current form. Restructure to a credit spread with defined risk first."}`;
  },

  buffett: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return "Before we discuss the strategy, tell me — would you be happy to own this business for 10 years?";
    const hasUnlimitedRisk = r.maxLoss === null;
    if (hasUnlimitedRisk) return `I need to be direct with you. This ${r.name} has unlimited risk. Charlie and I have a simple rule — we never enter positions where we cannot calculate the worst case. You might as well be writing insurance without knowing the possible claims. Please restructure to a defined-risk strategy first. Selling puts on ${ctx.symbol} at a price you'd love to own it — now that I can endorse.`;
    return `${ctx.symbol} with a Rishi score of ${ctx.longScore}/100 ${ctx.longScore >= 70 ? "is a business worth knowing" : "needs more work before I'd commit capital"}. This ${r.name} ${fit >= 70 ? "is sensible" : "still worries me"} — the maximum risk is ${Math.abs(r.maxLoss ?? 0).toLocaleString()} and probability of profit is ${r.popEstimate}%. Remember: it's not just about making money. It's about not losing it. ${r.netTheta > 0 ? "At least time is on your side here." : "Time is working against you — that's a bad partnership."}`;
  },

  munger: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return "Invert it. What would make you NOT put this trade on? Start there.";
    const biggestRisk = r.maxLoss === null ? "unlimited downside — the most dangerous words in finance"
      : `${Math.abs(r.maxLoss).toLocaleString()} maximum loss`;
    return `Invert. What kills this ${r.name} trade? ${biggestRisk}. Net Vega of ${r.netVega.toFixed(1)} means ${r.netVega > 0 ? "you're long volatility — you need a big move" : "you're short volatility — you need calm markets"}. The human brain systematically underestimates ${r.netVega < 0 ? "volatility expansion risk" : "time decay"}. ${fit >= 65 ? "The structure is defensible, though I remain skeptical of options generally." : "This structure has at least two ways to lose money simultaneously. That violates first principles."} One final thought: the ${ctx.symbol} Rishi score of ${ctx.longScore}/100 suggests ${ctx.longScore >= 70 ? "a business worth respecting" : "a business with unresolved questions"}. Don't let the option structure distract from that fundamental truth.`;
  },

  chanos: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return "No position yet. In short selling, the setup matters more than the instrument. What's the thesis on this name?";
    const shortView = ctx.shortScore >= 65 ? `Short score of ${ctx.shortScore}/100 — there's a real thesis here` : `Short score only ${ctx.shortScore}/100 — thin short thesis`;
    return `${shortView}. ${ctx.conviction} is the market's view, but what does the accounting say? For this ${r.name}, I note the ${r.netDelta < 0 ? "bearish delta bias — aligned with my view" : "bullish delta — you're fighting the short thesis with a long structure, which seems contradictory"}. Maximum loss ${Math.abs(r.maxLoss ?? 0).toLocaleString() ?? "unlimited"}. ${fit >= 60 ? "The structure has merit for this situation." : "I'd prefer a simple long put for cleaner short exposure."} Remember: overvalued stocks can stay overvalued. Your timing edge comes from identifying the specific catalyst that breaks the narrative. What is yours for ${ctx.symbol}?`;
  },

  lynch: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return `Tell me — can you explain in two sentences why ${ctx.symbol} will be bigger in 5 years? If yes, we can talk strategy.`;
    const isTenbagger = ctx.longScore >= 75;
    return `${isTenbagger ? `${ctx.symbol} has tenbagger characteristics — ${ctx.longScore}/100 Rishi score!` : `${ctx.symbol} is interesting but not a screaming buy at ${ctx.longScore}/100.`} For this ${r.name} — the key question is timing. Options are most powerful when you know the catalyst. Probability of profit at ${r.popEstimate}% ${r.popEstimate >= 60 ? "is solid" : "is a bit low — I like 65%+"}. ${r.maxProfit != null ? `Maximum profit ${r.maxProfit.toLocaleString()} — ${r.riskReward ? "Risk/reward of " + r.riskReward + "x is" : "that's"} ${(r.riskReward ?? 0) >= 2 ? "excellent!" : "acceptable."}` : "Unlimited profit potential — exciting!"} The key question to ask about ${ctx.symbol} is: what specific event in the next 30-60 days will move this stock significantly?`;
  },

  soros: (ctx, r, fit) => {
    if (!ctx.strategy.legs.length) return `The strategy is empty. But before adding legs, tell me — what is the prevailing reflexive narrative around ${ctx.symbol}? The narrative drives the price, not the fundamentals alone.`;
    const regime = ctx.longScore >= 70 ? "boom" : ctx.shortScore >= 65 ? "approaching bust" : "uncertain transition";
    return `${ctx.symbol} appears to be in a ${regime} regime. Reflexivity theory suggests that the current narrative — ${ctx.conviction} — is ${ctx.longScore >= 70 ? "still self-reinforcing, but watch for the moment perception diverges from reality" : "showing early signs of reversal"}. This ${r.name} with ${r.netVega > 0 ? "long volatility bias" : "short volatility bias"} — ${r.netVega > 0 ? "I prefer long volatility at inflection points" : "short volatility works in stable regimes, dangerous at turning points"}. The ${r.popEstimate}% probability of profit is a Gaussian assumption — reality at regime changes is fat-tailed. ${fit >= 60 ? "Proceed, but size for a world where you are wrong." : "I would restructure for better asymmetry."} What would change my view: a shift in the macro regime driving ${ctx.sector} stocks.`;
  },
};

// ── Component ─────────────────────────────────────────────────

export default function RishiStrategyAdvisor({ context, strategy }: Props) {
  const [selectedRishi, setSelectedRishi] = useState("damani");
  const tier = getCurrentTier();

  const availableRishis = useMemo(() =>
    RISHI_PERSONALITIES.filter(r => TIER_ORDER[r.tier] <= TIER_ORDER[tier]),
    [tier]
  );

  const rishi = RISHI_PERSONALITIES.find(r => r.id === selectedRishi)!;

  const fitScore = useMemo(() =>
    getRishiFitScore(selectedRishi, strategy),
    [selectedRishi, strategy]
  );

  const response = useMemo(() => {
    const fn = RISHI_STATIC_RESPONSES[selectedRishi];
    return fn ? fn(context, strategy, fitScore) : "Select a Rishi for wisdom.";
  }, [selectedRishi, context, strategy, fitScore]);

  const fitColor = fitScore >= 70 ? "#22C55E" : fitScore >= 50 ? "#D4AF37" : "#EF4444";

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(17,24,39,0.95), rgba(10,15,28,0.98))",
      border: "1px solid rgba(212,175,55,0.2)",
      borderRadius: "20px",
      overflow: "hidden",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(51,65,85,0.5)",
        background: "rgba(5,8,16,0.6)",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.1em", marginBottom: "4px" }}>
          🧘 WISDOM PANEL
        </div>
        <div style={{ fontSize: "12px", color: "#64748B" }}>
          Select a Rishi for strategy advice
        </div>
      </div>

      {/* Rishi Selector */}
      <div style={{ padding: "12px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {availableRishis.map(r => {
            const fs = getRishiFitScore(r.id, strategy);
            const fc = fs >= 70 ? "#22C55E" : fs >= 50 ? "#D4AF37" : "#EF4444";
            const isSelected = r.id === selectedRishi;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRishi(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "10px",
                  border: isSelected ? "1px solid " + r.color + "60" : "1px solid transparent",
                  background: isSelected ? r.color + "12" : "transparent",
                  cursor: "pointer", transition: "all 0.15s ease", width: "100%",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "12px", fontWeight: 700,
                    color: isSelected ? r.color : "#94A3B8",
                  }}>{r.name}</div>
                  <div style={{ fontSize: "10px", color: "#475569", marginTop: "1px" }}>
                    {r.fnoStyle.slice(0, 32)}…
                  </div>
                </div>
                <div style={{
                  fontSize: "11px", fontWeight: 800,
                  color: fc, flexShrink: 0,
                  fontFamily: "JetBrains Mono, monospace",
                }}>{fs}</div>
              </button>
            );
          })}

          {/* Locked rishis */}
          {RISHI_PERSONALITIES.filter(r => TIER_ORDER[r.tier] > TIER_ORDER[tier]).map(r => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "10px",
              border: "1px solid rgba(51,65,85,0.3)",
              background: "rgba(17,24,39,0.3)", opacity: 0.5,
            }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{r.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>{r.name}</div>
                <div style={{ fontSize: "10px", color: "#334155" }}>🔒 {r.tier} tier</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fit Score */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(51,65,85,0.4)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ fontSize: "11px", color: "#64748B" }}>
          {rishi.emoji} {rishi.name} fit score
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "80px", height: "5px",
            background: "rgba(51,65,85,0.5)", borderRadius: "3px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: fitScore + "%",
              background: fitColor, borderRadius: "3px",
              transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{
            fontSize: "14px", fontWeight: 800, color: fitColor,
            fontFamily: "JetBrains Mono, monospace", minWidth: "32px",
          }}>{fitScore}</span>
        </div>
      </div>

      {/* Response */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
        }}>
          <span style={{ fontSize: "24px" }}>{rishi.emoji}</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: rishi.color }}>
              {rishi.fullName}
            </div>
            <div style={{ fontSize: "10px", color: "#64748B" }}>{rishi.style}</div>
          </div>
        </div>

        <div style={{
          background: "rgba(17,24,39,0.6)",
          border: "1px solid rgba(51,65,85,0.4)",
          borderLeft: "3px solid " + rishi.color,
          borderRadius: "0 12px 12px 0",
          padding: "14px 16px",
          fontSize: "13px",
          color: "#B4BFCD",
          lineHeight: 1.8,
          fontStyle: "italic",
          fontFamily: '"Playfair Display", Georgia, serif',
        }}>
          "{response}"
        </div>

        {/* Ask options */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", marginBottom: "8px", letterSpacing: "0.08em" }}>
            ASK {rishi.name.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              "Is this strategy aligned with your philosophy?",
              "How would you size this position?",
              "What risks am I missing?",
              "Suggest improvements to this structure",
            ].map(q => (
              <button
                key={q}
                style={{
                  textAlign: "left", padding: "8px 12px",
                  background: "rgba(31,41,59,0.5)",
                  border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: "8px", cursor: "pointer",
                  fontSize: "11px", color: "#64748B",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = rishi.color + "60";
                  (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(51,65,85,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#64748B";
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}