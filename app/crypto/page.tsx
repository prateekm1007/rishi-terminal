"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CRYPTO_ASSETS, FEAR_GREED_INDEX, MARKET_DOMINANCE, getCryptoMetrics } from "../../data/crypto";
import { scoreSatoshiBodhi } from "../../lib/scorers/crypto/satoshibodhi";
import { scoreVitalikVeda } from "../../lib/scorers/crypto/vitalikVeda";
import { scoreMichaelSaylor } from "../../lib/scorers/crypto/michaelsaylor";
import { isPremium } from "../../lib/premium";
import { UpgradePrompt } from "../../components/premium/UpgradePrompt";
import { useLanguage } from "../../lib/language";

const CRYPTO_RISHIS = [
  {
    id: "satoshi",
    name: "Satoshi Bodhi",
    tag: "BTC",
    bio: "Sound money maximalist. Bitcoin as the ultimate store of value. Decentralization above all else.",
    quote: "The root problem with conventional currency is all the trust required to make it work.",
    scorer: scoreSatoshiBodhi,
    target: "BTC",
  },
  {
    id: "vitalik",
    name: "Vitalik Veda",
    tag: "ETH",
    bio: "Protocol fundamentalist. Ethereum as world computer. Scalability, security, decentralization trilemma solver.",
    quote: "Whereas most technologies tend to automate workers, blockchains automate away trust.",
    scorer: scoreVitalikVeda,
    target: "ETH",
  },
  {
    id: "saylor",
    name: "Michael Saylor",
    tag: "MS",
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
  const { t } = useLanguage();
  const router = useRouter();
  const [sector, setSector] = useState("All");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const premium = isPremium();
  const metrics = getCryptoMetrics();

  const sectors = ["All", ...Array.from(new Set(CRYPTO_ASSETS.map(c => c.sector)))];
  const filtered = sector === "All" ? CRYPTO_ASSETS : CRYPTO_ASSETS.filter(c => c.sector === sector);

  const fgValue = FEAR_GREED_INDEX.value;
  const fgColor = fgValue >= 60 ? "var(--accent-green)" : fgValue >= 40 ? "var(--accent-gold)" : "var(--accent-red)";
  const fgLabel = fgValue >= 75 ? t('crypto.extremeGreed') : fgValue >= 55 ? t('crypto.greed') : fgValue >= 45 ? t('crypto.neutral') : fgValue >= 25 ? t('crypto.fear') : t('crypto.extremeFear');

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, letterSpacing: 1, fontFamily: "monospace" }}>
            <Link href="/" style={{ color: "var(--accent-gold)", textDecoration: "none" }}>RISHI TERMINAL</Link>
            {" > "}
            <span>{t('crypto.breadcrumb')}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <div>
              <h1 className="philosophy-heading" style={{ fontSize: 32, color: "var(--accent-gold)", marginBottom: 8 }}>
                {t('crypto.title')}
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 520, lineHeight: 1.6 }}>
                {t('crypto.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper" style={{ padding: "28px 24px" }}>

        {/* Market Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: t('crypto.totalMarketCap'), value: "$" + (metrics.totalMarketCap / 1e12).toFixed(2) + "T", color: "var(--accent-gold)" },
            { label: t('crypto.volume24h'),       value: "$" + (metrics.totalVolume / 1e9).toFixed(1) + "B",     color: "var(--text-primary)" },
            { label: t('crypto.avgRsi'),          value: metrics.avgRSI.toString(),                               color: metrics.avgRSI >= 60 ? "var(--accent-green)" : "var(--accent-gold)" },
            { label: t('crypto.sentiment'),        value: metrics.sentiment,                                       color: metrics.sentiment === "BULLISH" ? "var(--accent-green)" : "var(--accent-red)" },
            { label: t('crypto.btcDominance'),    value: MARKET_DOMINANCE.btc + "%",                             color: "var(--accent-gold)" },
            { label: t('crypto.fearGreed'),     value: fgValue.toString() + " — " + fgLabel,                   color: fgColor },
          ].map(stat => (
            <div key={stat.label} className="card-sacred" style={{ padding: 16 }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 8, letterSpacing: 1 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Fear & Greed Gauge */}
        <div className="card-sacred" style={{ padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 6 }}>{t('crypto.fearGreedIndex')}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: fgColor }}>
                {fgValue} — {fgLabel}
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
              <span>{t('crypto.yesterday')}: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousDay}</strong></span>
              <span>{t('crypto.lastWeek')}: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousWeek}</strong></span>
              <span>{t('crypto.lastMonth')}: <strong style={{ color: "var(--text-primary)" }}>{FEAR_GREED_INDEX.previousMonth}</strong></span>
            </div>
          </div>
          <div style={{ position: "relative", height: 20, background: "linear-gradient(90deg, #F4212E 0%, #FFD700 50%, #00BA7C 100%)", borderRadius: 10 }}>
            <div style={{
              position: "absolute",
              top: "50%",
              left: "calc(" + Math.min(95, Math.max(5, fgValue)) + "% - 12px)",
              transform: "translateY(-50%)",
              width: 24, height: 24,
              background: "var(--bg-primary)",
              border: "3px solid " + fgColor,
              borderRadius: "50%",
              boxShadow: "0 0 12px " + fgColor,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span>{t('crypto.extremeFear')} (0)</span>
            <span>{t('crypto.neutral')} (50)</span>
            <span>{t('crypto.extremeGreed')} (100)</span>
          </div>
        </div>

        {/* Crypto Rishi Cards */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 3, marginBottom: 16, fontFamily: "monospace" }}>
            {t('crypto.cryptoPhilosophers')}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {CRYPTO_RISHIS.map(guru => {
            const asset = CRYPTO_ASSETS.find(c => c.symbol === guru.target);
            if (!asset) return null;
            const result = guru.scorer(asset);
            const isExpanded = expandedCard === guru.id;

            return (
              <div
                key={guru.id}
                className="card-sacred"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setExpandedCard(isExpanded ? null : guru.id)}
              >
                <div style={{ height: 2, background: "linear-gradient(90deg, var(--accent-gold), var(--accent-green))" }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "rgba(255,215,0,0.1)",
                      border: "1px solid rgba(255,215,0,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                      color: "var(--accent-gold)",
                    }}>
                      {guru.tag}
                    </div>
                    <div>
                      <div className="philosophy-heading" style={{ fontSize: 18, color: "var(--text-primary)", marginBottom: 4 }}>
                        {guru.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {result.label} — {result.origin}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "monospace", color: scoreColor(result.score), lineHeight: 1 }}>
                        {result.score}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/100</div>
                    </div>
                    <div style={{ width: 100, height: 6, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: result.score + "%", background: scoreColor(result.score), borderRadius: 4 }} />
                    </div>
                    <div style={{
                      fontSize: 12, color: "var(--text-muted)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                    }}>
                      v
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-primary)", padding: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 10 }}>{t('crypto.about')}</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{guru.bio}</p>
                      </div>
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, borderLeft: "3px solid var(--accent-gold)" }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 10 }}>{t('crypto.signatureQuote')}</div>
                        <p style={{ fontSize: 13, color: "var(--accent-gold)", fontStyle: "italic", lineHeight: 1.7 }}>"{guru.quote}"</p>
                      </div>
                    </div>

                    <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, marginBottom: 20 }}>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 2, marginBottom: 10 }}>{t('crypto.currentAnalysis')}</div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.insight}</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                      {result.comps.map((comp: any) => (
                        <div key={comp.label} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{comp.label}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: scoreColor(comp.v) }}>{comp.v}</span>
                          </div>
                          <div style={{ height: 5, background: "var(--border-primary)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ height: "100%", width: comp.v + "%", background: scoreColor(comp.v), borderRadius: 3 }} />
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 3, fontFamily: "monospace" }}>
            {t('crypto.allCryptoAssets')}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sectors.map(sec => (
              <button key={sec} onClick={() => setSector(sec)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                fontWeight: sector === sec ? 700 : 400,
                border: sector === sec ? "none" : "1px solid var(--border-primary)",
                background: sector === sec ? "var(--accent-gold)" : "var(--bg-card)",
                color: sector === sec ? "#000" : "var(--text-muted)",
                fontFamily: "monospace",
              }}>{sec}</button>
            ))}
          </div>
        </div>

        <div className="card-sacred" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
                  {[t('crypto.asset'), t('crypto.price'), t('crypto.change24h'), t('crypto.change7d'), t('crypto.marketCap'), t('crypto.rsi'), t('crypto.macd'), t('crypto.moving200d')].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? "left" : "right",
                      padding: "12px 16px",
                      fontSize: 9, color: "var(--text-muted)", letterSpacing: 1, fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.symbol}
                    style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.15s" }}
                    onClick={() => router.push("/crypto/" + c.symbol)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,215,0,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "rgba(255,215,0,0.08)",
                          border: "1px solid rgba(255,215,0,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                          color: "var(--accent-gold)", flexShrink: 0,
                        }}>
                          {c.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13 }}>{c.symbol}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontWeight: 700, fontFamily: "monospace", fontSize: 14, color: "var(--text-primary)" }}>
                      ${c.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontWeight: 700, fontFamily: "monospace", color: c.change24h >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.change24h >= 0 ? "+" : ""}{c.change24h.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontFamily: "monospace", color: c.change7d >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.change7d >= 0 ? "+" : ""}{c.change7d.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      ${(c.marketCap / 1e9).toFixed(1)}B
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontWeight: 700, fontFamily: "monospace", color: c.rsi >= 70 ? "var(--accent-red)" : c.rsi >= 50 ? "var(--accent-green)" : "var(--accent-gold)" }}>
                      {c.rsi}
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        background: c.macd === "BULLISH" ? "rgba(0,186,124,0.15)" : c.macd === "BEARISH" ? "rgba(244,33,46,0.15)" : "rgba(255,215,0,0.15)",
                        color: c.macd === "BULLISH" ? "var(--accent-green)" : c.macd === "BEARISH" ? "var(--accent-red)" : "var(--accent-gold)",
                      }}>{c.macd}</span>
                    </td>
                    <td style={{ textAlign: "right", padding: "14px 16px", fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: c.price > c.moving200d ? "var(--accent-green)" : "var(--accent-red)" }}>
                      {c.price > c.moving200d ? t('crypto.above') : t('crypto.below')}
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