"use client";

import { useState } from "react";
import Link from "next/link";
import { COMMODITIES } from "../../data/markets";
import { scoreJimRogers } from "../../lib/scorers/commodity/jimrogers";
import { scoreRickRule } from "../../lib/scorers/commodity/rickrule";
import { scoreDanielYergin } from "../../lib/scorers/commodity/danielyergin";
import { isPremium } from "../../lib/premium";
import { UpgradePrompt } from "../../components/premium/UpgradePrompt";

const COMMODITY_RISHIS = [
  {
    id: "jimrogers",
    name: "Jim Rogers",
    emoji: "ðŸŒ¾",
    bio: "Co-founded Quantum Fund with Soros. Predicted the 2000s commodities supercycle. Author of Hot Commodities. Believes in owning physical assets over paper.",
    quote: "Buy commodities. Buy them and put them away.",
    scorer: scoreJimRogers,
    target: "GOLD",
  },
  {
    id: "rickrule",
    name: "Rick Rule",
    emoji: "ðŸ¥‡",
    bio: "Legendary resource sector investor. CEO of Sprott. Gold as savings, silver as speculation. Most people are speculating in gold when they should be saving in it.",
    quote: "Gold is money. Everything else is credit.",
    scorer: scoreRickRule,
    target: "SILVER",
  },
  {
    id: "yergin",
    name: "Daniel Yergin",
    emoji: "ðŸ›¢ï¸",
    bio: "Pulitzer Prize-winning energy historian. Author of The Prize. VP at S&P Global. Energy transition and geopolitical oil expert.",
    quote: "Oil is the lifeblood of the industrial civilization.",
    scorer: scoreDanielYergin,
    target: "WTI",
  },
];

function scoreColor(score: number): string {
  if (score >= 75) return "var(--accent-green)";
  if (score >= 55) return "var(--accent-gold)";
  return "var(--accent-red)";
}

export default function CommoditiesPage() {
  const [category, setCategory] = useState("All");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const premium = isPremium();

  const categories = ["All", ...Array.from(new Set(COMMODITIES.map(c => c.category)))];
  const filtered = category === "All" ? COMMODITIES : COMMODITIES.filter(c => c.category === category);

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, letterSpacing: 1 }}>
            <Link href="/" style={{ color: "var(--accent-gold)" }}>RISHI TERMINAL</Link>
            <span style={{ margin: "0 8px" }}>â€º</span>
            <span>COMMODITIES</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 40 }}>âš’ï¸</span>
                <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 36, color: "var(--text-primary)" }}>Commodity Rishis</h1>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.6 }}>
                Jim Rogers Â· Rick Rule Â· Daniel Yergin â€” supercycles, precious metals, and energy geopolitics.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper">

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Gold Spot", value: "$2,650/oz", color: "var(--accent-gold)" },
            { label: "Silver Spot", value: "$32.5/oz", color: "#94A3B8" },
            { label: "Crude WTI", value: "$72.5/bbl", color: "var(--accent-blue)" },
            { label: "Tracked", value: `${COMMODITIES.length} assets`, color: "var(--accent-green)" },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 1 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Rishi Cards */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 4 }}>COMMODITY PHILOSOPHERS</p>
          <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 26, color: "var(--text-primary)", marginBottom: 24 }}>3 Commodity Rishis</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
          {COMMODITY_RISHIS.map(guru => {
            const commodity = COMMODITIES.find(c => c.symbol === guru.target);
            if (!commodity) return null;
            const result = guru.scorer(commodity);
            const isExpanded = expandedCard === guru.id;

            return (
              <div
                key={guru.id}
                className="card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setExpandedCard(isExpanded ? null : guru.id)}
              >
                {/* Accent bar */}
                <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent-gold), var(--accent-green))" }} />

                {/* Summary Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 40 }}>{guru.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "Cinzel, serif", fontSize: 20, color: "var(--text-primary)", marginBottom: 4, fontWeight: 700 }}>
                        {guru.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {result.label} Â· {result.origin} Â· analyzing {commodity.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor(result.score), lineHeight: 1 }}>
                        {result.score}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/100</div>
                    </div>
                    <div style={{ width: 100, height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${result.score}%`, background: scoreColor(result.score), borderRadius: 4 }} />
                    </div>
                    <div style={{
                      fontSize: 14, color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                    }}>â–¼</div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-primary)", padding: 24 }}>

                    {/* Bio + Quote */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>ABOUT</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{guru.bio}</p>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, borderLeft: "3px solid var(--accent-gold)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>SIGNATURE QUOTE</div>
                        <p style={{ fontSize: 14, color: "var(--accent-gold)", fontStyle: "italic", lineHeight: 1.7 }}>"{guru.quote}"</p>
                      </div>
                    </div>

                    {/* Current Analysis */}
                    <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>CURRENT ANALYSIS â€” {commodity.name} at {commodity.price}{commodity.unit}</div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.insight}</p>
                    </div>

                    {/* Score Components */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                      {result.comps.map(comp => (
                        <div key={comp.label} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{comp.label}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor(comp.v) }}>{comp.v}</span>
                          </div>
                          <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ height: "100%", width: `${comp.v}%`, background: scoreColor(comp.v), borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{comp.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Commodity Table */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 4 }}>LIVE PRICES</p>
              <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "var(--text-primary)" }}>All Commodities</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 11,
                  fontWeight: category === cat ? 700 : 400,
                  border: category === cat ? "none" : "1px solid var(--border-primary)",
                  background: category === cat ? "var(--accent-gold)" : "var(--bg-card)",
                  color: category === cat ? "#000" : "var(--text-muted)",
                }}>{cat}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Commodity</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>Change</th>
                  <th style={{ textAlign: "right" }}>52W Low</th>
                  <th style={{ textAlign: "right" }}>52W High</th>
                  <th style={{ textAlign: "right" }}>52W Position</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const range = c.high52w - c.low52w;
                  const position = range > 0 ? ((c.price - c.low52w) / range) * 100 : 50;
                  return (
                    <tr key={c.symbol} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => window.location.href = `/commodities/${c.symbol}`}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{c.emoji}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.symbol} · {c.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace", fontSize: 14 }}>
                        {c.price.toLocaleString("en-US")}<span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.unit}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: c.changePct >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                        {c.changePct >= 0 ? "▲" : "▼"} {Math.abs(c.changePct).toFixed(2)}%
                      </td>
                      <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                        {c.low52w.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                        {c.high52w.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${position}%`, borderRadius: 3,
                              background: position >= 70 ? "var(--accent-green)" : position >= 30 ? "var(--accent-gold)" : "var(--accent-red)",
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 32, textAlign: "right" }}>
                            {position.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showUpgrade && <UpgradePrompt reason="locked_feature" onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}