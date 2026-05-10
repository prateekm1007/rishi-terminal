"use client";

import Link from "next/link";

const FEATURES = [
  {
    href:  "/fno/builder",
    icon:  "🎯",
    title: "Strategy Builder",
    desc:  "Build multi-leg options strategies with live payoff charts, Greeks, and Rishi wisdom.",
    tag:   "Core Feature",
    color: "#D4AF37",
  },
  {
    href:  "/fno/builder",
    icon:  "🧘",
    title: "Rishi Advisor",
    desc:  "Get contextual F&O advice from Jhunjhunwala, Damani, Buffett, Munger, Chanos, Lynch & Soros.",
    tag:   "7 Rishis",
    color: "#8B5CF6",
  },
  {
    href:  "/fno/builder",
    icon:  "📊",
    title: "Payoff Chart",
    desc:  "Interactive P&L curve showing max profit, max loss, and breakeven points at expiry.",
    tag:   "Visual",
    color: "#22C55E",
  },
  {
    href:  "/screener",
    icon:  "🔴",
    title: "Short Radar",
    desc:  "Rishi Score Short Mode identifies structural short candidates with high conviction.",
    tag:   "Short Selling",
    color: "#EF4444",
  },
];

const STRATEGIES = [
  { name:"Iron Condor",        category:"Neutral",     tag:"Damani Conservative", risk:"Defined"   },
  { name:"Bull Call Spread",   category:"Bullish",     tag:"Jhunjhunwala Approved",risk:"Defined"  },
  { name:"Cash-Secured Put",   category:"Bullish",     tag:"Buffett Entry Method", risk:"Defined"  },
  { name:"Long Straddle",      category:"Speculative", tag:"Event Play",           risk:"Defined"  },
  { name:"Short Strangle",     category:"Neutral",     tag:"Chanos Short Vol",     risk:"Undefined"},
  { name:"Bear Put Spread",    category:"Bearish",     tag:"Chanos Bear",          risk:"Defined"  },
  { name:"Butterfly Spread",   category:"Neutral",     tag:"Munger Defined Risk",  risk:"Defined"  },
  { name:"Covered Call",       category:"Neutral",     tag:"Buffett Income",       risk:"Defined"  },
];

const CAT_COLORS: Record<string,string> = {
  Neutral:"#F59E0B", Bullish:"#22C55E", Bearish:"#EF4444", Speculative:"#8B5CF6",
};

export default function FnOHubPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#020408 0%,#0A0F1C 40%,#0D1220 100%)",
      fontFamily: "Inter, sans-serif",
      padding: "48px 32px",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ marginBottom: "56px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
          <h1 style={{
            fontFamily: "Cinzel, Georgia, serif",
            fontSize: "40px", fontWeight: 900,
            background: "linear-gradient(135deg,#A88B20,#D4AF37,#A78BFA)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "16px",
          }}>
            F&O Intelligence Suite
          </h1>
          <p style={{ fontSize: "16px", color: "#94A3B8", maxWidth: "560px", margin: "0 auto 32px", lineHeight: 1.8 }}>
            Build options strategies with <span style={{ color: "#D4AF37" }}>Rishi wisdom</span>. Understand your payoff, Greeks, and risk before you execute.
          </p>
          <Link href="/fno/builder" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "14px 32px",
            background: "linear-gradient(135deg,#A88B20,#D4AF37)",
            borderRadius: "12px", color: "#0A0F1C", fontWeight: 800,
            fontSize: "15px", textDecoration: "none",
            boxShadow: "0 4px 24px rgba(212,175,55,0.4)",
          }}>
            🎯 Open Strategy Builder →
          </Link>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px", marginBottom: "56px" }}>
          {FEATURES.map(f => (
            <Link key={f.href + f.title} href={f.href} style={{ textDecoration: "none" }}>
              <div style={{
                background: "rgba(17,24,39,0.85)",
                border: "1px solid rgba(30,41,59,0.8)",
                borderRadius: "16px", padding: "24px",
                transition: "all 0.2s ease", cursor: "pointer",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = f.color + "40";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(30,41,59,0.8)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>{f.icon}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC" }}>{f.title}</span>
                  <span style={{
                    fontSize: "10px", color: f.color, fontWeight: 700,
                    background: f.color + "18", padding: "3px 10px",
                    borderRadius: "10px", border: "1px solid " + f.color + "30",
                  }}>{f.tag}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.7, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Strategy Library */}
        <div>
          <h2 style={{
            fontFamily: "Cinzel, Georgia, serif",
            fontSize: "22px", fontWeight: 700, color: "#F8FAFC",
            marginBottom: "20px",
          }}>
            Strategy Library
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
            {STRATEGIES.map(s => (
              <Link key={s.name} href="/fno/builder" style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(17,24,39,0.7)",
                  border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: "12px", padding: "16px",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = CAT_COLORS[s.category] + "50";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(51,65,85,0.4)";
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC", marginBottom: "6px" }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontSize: "10px", color: CAT_COLORS[s.category], fontWeight: 700,
                    marginBottom: "6px",
                  }}>{s.category}</div>
                  <div style={{ fontSize: "10px", color: "#D4AF37", marginBottom: "4px" }}>
                    🧘 {s.tag}
                  </div>
                  <div style={{
                    fontSize: "10px",
                    color: s.risk === "Defined" ? "#22C55E" : "#EF4444",
                  }}>
                    {s.risk === "Defined" ? "✓" : "⚠"} {s.risk} risk
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}