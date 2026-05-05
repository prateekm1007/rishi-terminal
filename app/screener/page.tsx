import { STOCKS } from "../../data/stocks";
import { StockTable } from "../../components/screener/StockTable";

export const metadata = {
  title: "Stock Screener — Rishi Terminal",
  description: "Browse and analyze 100+ Indian stocks through 19 Rishi perspectives",
};

export default function ScreenerPage() {
  const stockList = Object.values(STOCKS);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--text-muted)", marginBottom: 16, letterSpacing: 2 }}>
            <a href="/" style={{ color: "var(--accent-gold)", textDecoration: "none" }}>RISHI TERMINAL</a>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>SCREENER</span>
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 42, color: "var(--text-primary)", letterSpacing: 2, marginBottom: 8, lineHeight: 1.1 }}>
                Stock Screener
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 480, lineHeight: 1.6 }}>
                {stockList.length} Indian stocks analyzed through 19 Rishi perspectives. Click any stock for full philosophical deep-dive.
              </p>
            </div>

            {/* Stats Card */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)", borderRadius: 12, padding: "16px 24px", minWidth: 160 }}>
              <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--text-muted)", letterSpacing: 2, marginBottom: 8 }}>TOTAL COVERAGE</div>
              <div style={{ fontSize: 48, fontFamily: "JetBrains Mono", fontWeight: 700, color: "var(--accent-gold)", lineHeight: 1 }}>
                {stockList.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>NSE + BSE Stocks</div>
            </div>
          </div>

          {/* Quick Stat Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { label: "Strong Buy",  count: stockList.filter(s => s.pe > 0 && s.roe > 15).length,    color: "var(--accent-green)", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
              { label: "High Growth", count: stockList.filter(s => s.epscagr > 15).length,            color: "#60a5fa",             bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.2)" },
              { label: "Value Plays", count: stockList.filter(s => s.pe < 20 && s.pe > 0).length,     color: "var(--accent-gold)",  bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
              { label: "Large Cap",   count: stockList.filter(s => s.mktcap > 100000).length,          color: "#c084fc",             bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.2)" },
              { label: "High ROE",    count: stockList.filter(s => s.roe > 25).length,                 color: "var(--accent-green)", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
              { label: "Debt-Free",   count: stockList.filter(s => s.de < 0.3).length,                color: "#f472b6",             bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)" },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  background: stat.bg,
                  border:     `1px solid ${stat.border}`,
                  borderRadius: 10,
                  padding:    "12px 16px",
                }}
              >
                <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--text-muted)", marginBottom: 4, letterSpacing: 1 }}>
                  {stat.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontFamily: "JetBrains Mono", fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 24px" }}>
        <StockTable stocks={stockList} />
      </div>

    </main>
  );
}