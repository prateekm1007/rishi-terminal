"use client";

import { useState } from "react";
import Link from "next/link";
import { CRYPTO_ASSETS, FEAR_GREED_INDEX, MARKET_DOMINANCE, getCryptoMetrics } from "../../data/crypto";
import { scoreSatoshiBodhi } from "../../lib/scorers/crypto/satoshibodhi";
import { scoreVitalikVeda } from "../../lib/scorers/crypto/vitalikVeda";
import { scoreMichaelSaylor } from "../../lib/scorers/crypto/michaelsaylor";
import { isPremium } from "../../lib/premium";
import { UpgradePrompt } from "../../components/premium/UpgradePrompt";

const CRYPTO_RISHIS = [
  {
    id: "satoshi",
    name: "Satoshi Bodhi",
    emoji: "₿",
    bio: "Sound money maximalist. Bitcoin as the ultimate store of value. Decentralization above all else.",
    quote: "The root problem with conventional currency is all the trust required to make it work.",
    scorer: scoreSatoshiBodhi,
    target: "BTC",
  },
  {
    id: "vitalik",
    name: "Vitalik Veda",
    emoji: "⟠",
    bio: "Protocol fundamentalist. Ethereum as world computer. Scalability, security, decentralization trilemma solver.",
    quote: "Whereas most technologies tend to automate workers, blockchains automate away trust.",
    scorer: scoreVitalikVeda,
    target: "ETH",
  },
  {
    id: "saylor",
    name: "Michael Saylor",
    emoji: "🏛️",
    bio: "Corporate Bitcoin maximalist. Digital property thesis. MicroStrategy Bitcoin treasury architect.",
    quote: "Bitcoin is a bank in cyberspace, run by incorruptible software.",
    scorer: scoreMichaelSaylor,
    target: "BTC",
  },
];

function scoreColor(score: number): string {
  if (score >= 75) return "var(--accent-green)";
  if (score >= 55) return "var(--accent-gold)";
  return "var(--accent-red)";
}

export default function CryptoPage() {
  const [sector, setSector] = useState("All");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const premium = isPremium();
  const metrics = getCryptoMetrics();

  const sectors = ["All", ...Array.from(new Set(CRYPTO_ASSETS.map(c => c.sector)))];
  const filtered = sector === "All" ? CRYPTO_ASSETS : CRYPTO_ASSETS.filter(c => c.sector === sector);
  const fgColor = FEAR_GREED_INDEX.value >= 60 ? "var(--accent-green)" : FEAR_GREED_INDEX.value >= 40 ? "var(--accent-gold)" : "var(--accent-red)";

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, letterSpacing: 1 }}>
            <Link href="/" style={{ color: "var(--accent-gold)" }}>RISHI TERMINAL</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>CRYPTO</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 40 }}>🪙</span>
                <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 36, color: "var(--text-primary)" }}>Crypto Rishis</h1>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.6 }}>
                Satoshi Bodhi · Vitalik Veda · Michael Saylor — three distinct philosophical lenses on digital assets.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper">

        {/* Market Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total Market Cap", value: `$${(metrics.totalMarketCap / 1e12).toFixed(2)}T`, color: "var(--accent-blue)" },
            { label: "24h Volume", value: `$${(metrics.totalVolume / 1e9).toFixed(1)}B`, color: "var(--text-primary)" },
            { label: "Avg RSI", value: metrics.avgRSI.toString(), color: metrics.avgRSI >= 60 ? "var(--accent-green)" : "var(--accent-gold)" },
            { label: "Sentiment", value: metrics.sentiment, color: metrics.sentiment === "BULLISH" ? "var(--accent-green)" : "var(--accent-red)" },
            { label: "BTC Dominance", value: `${MARKET_DOMINANCE.btc}%`, color: "var(--accent-gold)" },
            { label: "Fear & Greed", value: `${FEAR_GREED_INDEX.value}`, color: fgColor },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 1 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Fear & Greed Gauge */}
        <div className="card" style={{ padding: 24, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 4 }}>CRYPTO FEAR & GREED INDEX</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: fgColor }}>{FEAR_GREED_INDEX.value} — {FEAR_GREED_INDEX.label}</div>
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-muted)" }}>
              <span>Yesterday: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousDay}</strong></span>
              <span>Last Week: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousWeek}</strong></span>
              <span>Last Month: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousMonth}</strong></span>
            </div>
          </div>
          <div style={{ position: "relative", height: 20, background: "linear-gradient(90deg, #F4212E 0%, #FFD700 50%, #00BA7C 100%)", borderRadius: 10 }}>
            <div style={{
              position: "absolute", top: "50%",
              left: `calc(${Math.min(95, Math.max(5, FEAR_GREED_INDEX.value))}% - 12px)`,
              transform: "translateY(-50%)",
              width: 24, height: 24,
              background: "var(--bg-primary)",
              border: `3px solid ${fgColor}`,
              borderRadius: "50%",
              boxShadow: `0 0 12px ${fgColor}`,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span>😱 Extreme Fear</span><span>😐 Neutral</span><span>🤑 Extreme Greed</span>
          </div>
        </div>

        {/* Rishi Cards */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 4 }}>CRYPTO PHILOSOPHERS</p>
          <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 26, color: "var(--text-primary)", marginBottom: 24 }}>3 Crypto Rishis</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 48 }}>
          {CRYPTO_RISHIS.map(guru => {
            const asset = CRYPTO_ASSETS.find(c => c.symbol === guru.target);
            if (!asset) return null;
            const result = guru.scorer(asset);
            const isExpanded = expandedCard === guru.id;

            return (
              <div
                key={guru.id}
                className="card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setExpandedCard(isExpanded ? null : guru.id)}
              >
                {/* Accent bar */}
                <div style={{ height: 3, background: "linear-gradient(90deg, var(--accent-blue), var(--accent-gold))" }} />

                {/* Summary Row — always visible */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 40 }}>{guru.emoji}</span>
                    <div>
                      <div style={{ fontFamily: "Cinzel, serif", fontSize: 20, color: "var(--text-primary)", marginBottom: 4, fontWeight: 700 }}>
                        {guru.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {result.label} · {result.origin}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    {/* Score */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor(result.score), lineHeight: 1 }}>
                        {result.score}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/100</div>
                    </div>

                    {/* Mini bar */}
                    <div style={{ width: 100, height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${result.score}%`, background: scoreColor(result.score), borderRadius: 4 }} />
                    </div>

                    {/* Expand arrow */}
                    <div style={{
                      fontSize: 14, color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                    }}>▼</div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-primary)", padding: "24px" }}>

                    {/* Bio + Quote */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>PHILOSOPHY</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{guru.bio}</p>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, borderLeft: "3px solid var(--accent-gold)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>SIGNATURE QUOTE</div>
                        <p style={{ fontSize: 13, color: "var(--accent-gold)", fontStyle: "italic", lineHeight: 1.7 }}>"{guru.quote}"</p>
                      </div>
                    </div>

                    {/* Insight */}
                    <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>CURRENT ANALYSIS</div>
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

        {/* Asset Table */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 4 }}>LIVE PRICES</p>
              <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "var(--text-primary)" }}>All Crypto Assets</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sectors.map(sec => (
                <button key={sec} onClick={() => setSector(sec)} style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 11,
                  fontWeight: sector === sec ? 700 : 400,
                  border: sector === sec ? "none" : "1px solid var(--border-primary)",
                  background: sector === sec ? "var(--accent-blue)" : "var(--bg-card)",
                  color: sector === sec ? "#fff" : "var(--text-muted)",
                }}>{sec}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Asset</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th style={{ textAlign: "right" }}>24h</th>
                  <th style={{ textAlign: "right" }}>7d</th>
                  <th style={{ textAlign: "right" }}>Market Cap</th>
                  <th style={{ textAlign: "right" }}>RSI</th>
                  <th style={{ textAlign: "right" }}>MACD</th>
                  <th style={{ textAlign: "right" }}>200D MA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.symbol}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{c.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{c.symbol}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                      ${c.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: c.change24h >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.change24h >= 0 ? "▲" : "▼"} {Math.abs(c.change24h).toFixed(2)}%
                    </td>
                    <td style={{ textAlign: "right", color: c.change7d >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)" }}>
                      ${(c.marketCap / 1e9).toFixed(1)}B
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: c.rsi >= 70 ? "var(--accent-red)" : c.rsi >= 50 ? "var(--accent-green)" : "var(--accent-gold)" }}>
                      {c.rsi}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        background: c.macd === "BULLISH" ? "rgba(0,186,124,0.15)" : c.macd === "BEARISH" ? "rgba(244,33,46,0.15)" : "rgba(255,215,0,0.15)",
                        color: c.macd === "BULLISH" ? "var(--accent-green)" : c.macd === "BEARISH" ? "var(--accent-red)" : "var(--accent-gold)",
                      }}>{c.macd}</span>
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: c.price > c.moving200d ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.price > c.moving200d ? "▲ ABOVE" : "▼ BELOW"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showUpgrade && <UpgradePrompt reason="locked_feature" onClose={() => setShowUpgrade(false)} />}
    </main>
  );
}