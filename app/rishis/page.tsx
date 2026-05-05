"use client";

import { useState } from "react";
import Link from "next/link";

type Category = "All" | "Stock" | "Crypto" | "Commodity" | "Forex";

const ALL_RISHIS = [
  // ─── STOCK RISHIS — BHARAT ───
  {
    id: "jhunjhunwala", name: "Rakesh Jhunjhunwala", emoji: "🦁",
    category: "Stock", origin: "Bharat", tier: "Legend",
    label: "Conviction Multibagger",
    bio: "Big Bull of India. Concentrated bets on high-growth companies with deep conviction.",
    philosophy: "Buy right, sit tight. India's growth story is just beginning.",
    formula: "P/CF (25%) + Growth (25%) + Quality (20%) + Conviction (20%) + Sentiment (10%)",
    bestFor: ["Growth", "Long Term", "Large Cap"],
    quote: "I am a firm believer in the India story.",
    famousPicks: ["Titan", "Star Health", "Crisil"],
  },
  {
    id: "damani", name: "Radhakishan Damani", emoji: "🏰",
    category: "Stock", origin: "Bharat", tier: "Legend",
    label: "Zero-Debt Fortress",
    bio: "DMart founder. Obsessed with debt-free businesses and consistent cash flows.",
    philosophy: "Debt-free means never bankrupt. Cash is king.",
    formula: "Zero-Debt (30%) + ROCE (25%) + Cash Flow (20%) + Moat (15%) + Management (10%)",
    bestFor: ["Defensive", "Debt-Free", "Quality"],
    quote: "Never invest in a business you cannot understand.",
    famousPicks: ["DMart", "VST Industries"],
  },
  {
    id: "kacholia", name: "Ashish Kacholia", emoji: "🐋",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "Whale Small-Cap Hunter",
    bio: "Finds small-cap multibaggers before the mainstream discovers them.",
    philosophy: "High promoter ownership plus accelerating FCF equals real wealth creation.",
    formula: "Promoter (30%) + FCF (25%) + ROCE (20%) + Size (15%) + Momentum (10%)",
    bestFor: ["Small Cap", "Hidden Gems", "Multibagger"],
    quote: "Small caps with high promoter holding are where real wealth is created.",
    famousPicks: ["Vaibhav Global", "Newgen Software"],
  },
  {
    id: "kedia", name: "Vijay Kedia", emoji: "😊",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "SMILE Formula",
    bio: "Created the SMILE framework. Patient long-term approach to emerging businesses.",
    philosophy: "Small, Manageable, Innovative, Listed, Emerging — the perfect multibagger.",
    formula: "Small (20%) + Manageable (20%) + Innovation (20%) + Listing Premium (20%) + Emerging (20%)",
    bestFor: ["SMILE", "Mid Cap", "Emerging"],
    quote: "Market transfers money from the impatient to the patient.",
    famousPicks: ["Cera Sanitaryware", "Atul Auto"],
  },
  {
    id: "porinju", name: "Porinju Veliyath", emoji: "🔍",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "Contrarian Deep Value",
    bio: "Finds value in beaten-down stocks that others have abandoned. Specializes in turnarounds.",
    philosophy: "Buy when there is maximum pessimism. Contrarian investing creates real alpha.",
    formula: "Contrarian (30%) + Management (25%) + Undervalue (25%) + Catalyst (20%)",
    bestFor: ["Deep Value", "Turnarounds", "Contrarian"],
    quote: "The best investments come with maximum pessimism.",
    famousPicks: ["Stove Kraft", "Geojit Financial"],
  },
  {
    id: "raamdeo", name: "Raamdeo Agrawal", emoji: "⚖️",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "QGLP Framework",
    bio: "Co-founder of Motilal Oswal. Developed QGLP framework for compounding businesses.",
    philosophy: "Quality, Growth, Longevity, Price — the four pillars of wealth creation.",
    formula: "Quality (30%) + Growth (25%) + Longevity (25%) + Price (20%)",
    bestFor: ["Compounders", "Quality Growth", "QGLP"],
    quote: "Quality plus Growth plus Longevity at Right Price is the mantra.",
    famousPicks: ["Page Industries", "Eicher Motors"],
  },
  {
    id: "nemish", name: "Nemish Shah", emoji: "📈",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "Steady Compounder",
    bio: "Boring, steady businesses that compound for decades. Consistency over excitement.",
    philosophy: "Consistency beats excitement. Boring businesses compound into fortunes.",
    formula: "EPS Growth (35%) + Debt-Free (30%) + Management Quality (20%) + Valuation (15%)",
    bestFor: ["Long Hold", "Boring Business", "Compounder"],
    quote: "Boring businesses compound into fortunes over decades.",
    famousPicks: ["V-Guard Industries"],
  },
  {
    id: "basant", name: "Basant Maheshwari", emoji: "🛒",
    category: "Stock", origin: "Bharat", tier: "Master",
    label: "Consumption Growth",
    bio: "Focuses on India's consumption growth megatrend. Early identifier of consumer stocks.",
    philosophy: "India is consuming more every year. Invest in this unstoppable wave.",
    formula: "Consumer Theme (30%) + Revenue Growth (25%) + Margins (25%) + PE Premium (20%)",
    bestFor: ["Consumption", "Growth", "India Theme"],
    quote: "The Indian consumption story is just beginning.",
    famousPicks: ["Berger Paints", "HDFC Bank"],
  },
  // ─── STOCK RISHIS — GLOBAL ───
  {
    id: "buffett", name: "Warren Buffett", emoji: "🍎",
    category: "Stock", origin: "Global", tier: "Legend",
    label: "Quality Moat",
    bio: "Oracle of Omaha. Seeks durable competitive advantages and exceptional management.",
    philosophy: "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    formula: "ROE (30%) + Economic Moat (25%) + Earnings Power (20%) + Management (15%) + Price (10%)",
    bestFor: ["Quality", "Long Term", "Moat"],
    quote: "Wonderful company at fair price beats fair company at wonderful price.",
    famousPicks: ["Coca-Cola", "Apple", "American Express"],
  },
  {
    id: "graham", name: "Benjamin Graham", emoji: "📚",
    category: "Stock", origin: "Global", tier: "Legend",
    label: "Deep Value",
    bio: "Father of value investing. Margin of safety is his central concept.",
    philosophy: "Buy at a significant discount to intrinsic value. Mr. Market is your servant, not master.",
    formula: "NCAV (40%) + P/E Below Market (25%) + Low Debt (20%) + Earnings Stability (15%)",
    bestFor: ["Deep Value", "Asset Plays", "Safety"],
    quote: "Margin of safety is the central concept of investment.",
    famousPicks: ["GEICO"],
  },
  {
    id: "lynch", name: "Peter Lynch", emoji: "📈",
    category: "Stock", origin: "Global", tier: "Legend",
    label: "GARP",
    bio: "Fidelity Magellan fund — 29% annual returns for 13 years. Champion of retail investors.",
    philosophy: "Invest in what you know. Growth at a reasonable price.",
    formula: "PEG Ratio (30%) + Earnings Growth (25%) + FCF (20%) + Category (15%) + Story (10%)",
    bestFor: ["GARP", "Growth", "Consumer"],
    quote: "Invest in what you know.",
    famousPicks: ["Dunkin Donuts", "Chrysler"],
  },
  {
    id: "munger", name: "Charlie Munger", emoji: "🧠",
    category: "Stock", origin: "Global", tier: "Legend",
    label: "Mental Models",
    bio: "Buffett's partner. Inversion, latticework of mental models, and multidisciplinary thinking.",
    philosophy: "Invert, always invert. The key to success is avoiding stupidity, not seeking brilliance.",
    formula: "Circle of Competence (30%) + Inversion (25%) + Quality Business (25%) + Fair Price (20%)",
    bestFor: ["Quality", "Mental Models", "Long Term"],
    quote: "Invert, always invert.",
    famousPicks: ["Costco", "Berkshire Hathaway"],
  },
  {
    id: "greenblatt", name: "Joel Greenblatt", emoji: "✨",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Magic Formula",
    bio: "Created the Magic Formula. Systematic combination of high ROC and high earnings yield.",
    philosophy: "Good businesses at cheap prices. Be systematic and trust the process.",
    formula: "Return on Capital (50%) + Earnings Yield (50%)",
    bestFor: ["Systematic", "Quant", "Value"],
    quote: "Figure out the value of something and then pay a lot less for it.",
    famousPicks: ["Various — systematic approach"],
  },
  {
    id: "pabrai", name: "Mohnish Pabrai", emoji: "🎯",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Dhandho Cloner",
    bio: "Clones the best ideas from the best investors. Dhandho framework — high upside, low downside.",
    philosophy: "Heads I win, tails I don't lose much. Clone shamelessly from the best.",
    formula: "Clone Score (30%) + Owner-Operator (25%) + Downside Protection (25%) + Upside (20%)",
    bestFor: ["Cloning", "Asymmetric", "Value"],
    quote: "Heads I win, tails I don't lose much.",
    famousPicks: ["Fiat Chrysler", "Rain Industries"],
  },
  {
    id: "philipfisher", name: "Philip Fisher", emoji: "🔬",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Scuttlebutt Growth",
    bio: "Pioneer of growth investing. Deep qualitative research through scuttlebutt method.",
    philosophy: "Outstanding companies with outstanding management. Hold forever.",
    formula: "Management Quality (25%) + R&D Strength (25%) + Revenue Growth (25%) + Margins (25%)",
    bestFor: ["Growth", "Quality Management", "Long Term"],
    quote: "The person with the right information beats the person with the right advice.",
    famousPicks: ["Motorola", "Texas Instruments"],
  },
  {
    id: "howardmarks", name: "Howard Marks", emoji: "🔄",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Risk Cycle",
    bio: "Oaktree Capital founder. Market cycle expert. Understanding risk is his superpower.",
    philosophy: "Buy when others are scared, sell when others are greedy. Most important thing is risk.",
    formula: "Cycle Position (30%) + Margin of Safety (25%) + Risk Asymmetry (25%) + Sentiment (20%)",
    bestFor: ["Cycle", "Contrarian", "Risk Management"],
    quote: "Most people try to find good assets. I try to find good risk/reward.",
    famousPicks: ["Distressed debt", "High yield bonds"],
  },
  {
    id: "sethklarman", name: "Seth Klarman", emoji: "🛡️",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Asymmetric Safety",
    bio: "Baupost Group founder. Downside protection obsessed. The most secretive great investor.",
    philosophy: "Protect the downside and the upside takes care of itself.",
    formula: "Downside Protection (40%) + Asymmetric Return (30%) + Margin of Safety (15%) + Catalyst (15%)",
    bestFor: ["Defensive", "Asymmetric", "Deep Value"],
    quote: "The best returns come from situations where downside is minimal.",
    famousPicks: ["Distressed assets", "Special situations"],
  },
  {
    id: "templeton", name: "John Templeton", emoji: "🌍",
    category: "Stock", origin: "Global", tier: "Legend",
    label: "Maximum Pessimism",
    bio: "Global value investor pioneer. Buys at the point of maximum pessimism worldwide.",
    philosophy: "The best time to invest is at maximum pessimism. Look everywhere globally.",
    formula: "Pessimism Score (35%) + Global Discount (30%) + Quality Business (20%) + Catalyst (15%)",
    bestFor: ["Contrarian", "Global", "Deep Value"],
    quote: "The best time to buy is at the point of maximum pessimism.",
    famousPicks: ["Japan 1980s", "Various global bargains"],
  },
  {
    id: "schloss", name: "Walter Schloss", emoji: "💎",
    category: "Stock", origin: "Global", tier: "Master",
    label: "Cigar Butt",
    bio: "Graham student. 16%+ annual returns for 45 years. Pure statistical value investor.",
    philosophy: "Buy cheap, diversify widely, and wait for less cheap.",
    formula: "Price-to-Book (40%) + Zero Debt (30%) + Insider Buying (20%) + Low PE (10%)",
    bestFor: ["Deep Value", "Low Risk", "Diversified"],
    quote: "We buy cheap stocks and wait for them to become less cheap.",
    famousPicks: ["Statistically cheap stocks"],
  },
  // ─── CRYPTO RISHIS ───
  {
    id: "satoshi", name: "Satoshi Bodhi", emoji: "₿",
    category: "Crypto", origin: "Digital", tier: "Legend",
    label: "Sound Money Maximalist",
    bio: "Pseudonymous Bitcoin creator. Sound money as the foundation of human freedom. 21 million cap, decentralization above all.",
    philosophy: "Remove trust from money. Decentralized, permissionless, finite digital gold.",
    formula: "200D MA (25%) + ATH Proximity (20%) + RSI (20%) + MACD (15%) + Adoption (20%)",
    bestFor: ["Bitcoin", "Store of Value", "Long Term"],
    quote: "The root problem with conventional currency is all the trust required to make it work.",
    famousPicks: ["Bitcoin (BTC)"],
  },
  {
    id: "vitalik", name: "Vitalik Veda", emoji: "⟠",
    category: "Crypto", origin: "Digital", tier: "Legend",
    label: "Protocol Fundamentalist",
    bio: "Ethereum co-creator. World computer vision. Scalability trilemma researcher. EIP author.",
    philosophy: "Ethereum as global settlement layer. Scalability, security, decentralization — all three.",
    formula: "Network Health (25%) + 7D Growth (20%) + RSI (20%) + MACD (15%) + On-Chain Activity (20%)",
    bestFor: ["Ethereum", "Smart Contracts", "DeFi"],
    quote: "Whereas most technologies automate workers, blockchains automate trust.",
    famousPicks: ["Ethereum (ETH)", "Layer 2 protocols"],
  },
  {
    id: "saylor", name: "Michael Saylor", emoji: "🏛️",
    category: "Crypto", origin: "Digital", tier: "Master",
    label: "Corporate Bitcoin Treasury",
    bio: "MicroStrategy CEO. Converted corporate treasury to Bitcoin. Digital property thesis architect.",
    philosophy: "Bitcoin is digital energy. The only logical corporate reserve asset.",
    formula: "Accumulation Signal (25%) + Conviction Heat (20%) + Institutional Flow (25%) + MACD (15%) + Recovery (15%)",
    bestFor: ["Bitcoin", "Corporate Treasury", "Long Term"],
    quote: "Bitcoin is a bank in cyberspace, run by incorruptible software.",
    famousPicks: ["Bitcoin (BTC)"],
  },
  // ─── COMMODITY RISHIS ───
  {
    id: "jimrogers", name: "Jim Rogers", emoji: "🌾",
    category: "Commodity", origin: "Global", tier: "Legend",
    label: "Commodities Supercycle",
    bio: "Co-founded Quantum Fund with Soros. Predicted the 2000s commodities supercycle. Author of Hot Commodities.",
    philosophy: "Commodities are the one asset class that always comes back. Own physical assets.",
    formula: "Bull Market Proximity (30%) + Momentum (25%) + Supercycle Position (25%) + Price Strength (20%)",
    bestFor: ["Commodities", "Inflation Hedge", "Macro"],
    quote: "Buy commodities. Buy them and put them away.",
    famousPicks: ["Gold", "Silver", "Agricultural commodities"],
  },
  {
    id: "rickrule", name: "Rick Rule", emoji: "🥇",
    category: "Commodity", origin: "Global", tier: "Master",
    label: "Precious Metals Strategist",
    bio: "Legendary resource sector investor. Gold as savings, silver as speculation. CEO of Sprott.",
    philosophy: "Most people speculate in gold. You should save in gold.",
    formula: "Metal Premium (30%) + Volatility Momentum (25%) + Cycle Position (25%) + Breakout Signal (20%)",
    bestFor: ["Gold", "Silver", "Precious Metals"],
    quote: "Gold is money. Everything else is credit.",
    famousPicks: ["Physical gold", "Silver", "Mining stocks"],
  },
  {
    id: "yergin", name: "Daniel Yergin", emoji: "🛢️",
    category: "Commodity", origin: "Global", tier: "Master",
    label: "Energy Geopolitics Expert",
    bio: "Pulitzer Prize winner. Author of The Prize (oil history). VP at S&P Global. Energy transition analyst.",
    philosophy: "Energy security is national security. Geopolitics drives oil prices as much as supply/demand.",
    formula: "Global Demand (30%) + Momentum (25%) + Energy Cycle (25%) + Geopolitical Risk (20%)",
    bestFor: ["Crude Oil", "Energy", "Geopolitics"],
    quote: "Oil is the lifeblood of the industrial civilization.",
    famousPicks: ["Crude oil", "LNG", "Energy transition"],
  },
  // ─── FOREX / MACRO RISHIS ───
  {
    id: "soros", name: "George Soros", emoji: "🌀",
    category: "Forex", origin: "Global", tier: "Legend",
    label: "Reflexivity & Macro",
    bio: "Broke the Bank of England. Reflexivity theory pioneer. Quantum Fund co-founder with Rogers.",
    philosophy: "Markets are always wrong. Reflexivity creates self-reinforcing boom-bust cycles.",
    formula: "Momentum (35%) + Reflexivity Trigger (30%) + Trend Strength (20%) + Macro Position (15%)",
    bestFor: ["Forex", "Macro", "Crisis Trades"],
    quote: "It's not whether you're right or wrong, but how much money you make when right.",
    famousPicks: ["GBP short 1992", "Asian crisis trades"],
  },
  {
    id: "druckenmiller", name: "Stanley Druckenmiller", emoji: "📡",
    category: "Forex", origin: "Global", tier: "Legend",
    label: "Top-Down Macro + Timing",
    bio: "Worked with Soros on GBP trade. 30 years of 30%+ returns. No losing year ever recorded.",
    philosophy: "Risk/reward above all. When you're right, bet heavy. Don't fight the Fed.",
    formula: "Macro Momentum (30%) + Asymmetric Setup (30%) + Risk/Reward (25%) + Cycle Position (15%)",
    bestFor: ["Macro", "Timing", "Asymmetric Bets"],
    quote: "The key is not being right, but sizing up when you are right.",
    famousPicks: ["GBP 1992", "Tech bubble short", "Various macro"],
  },
  {
    id: "dalio", name: "Ray Dalio", emoji: "⚙️",
    category: "Forex", origin: "Global", tier: "Legend",
    label: "All Weather Principles",
    bio: "Bridgewater founder. All Weather portfolio architect. Principles author. Debt cycle expert.",
    philosophy: "Diversify across uncorrelated return streams. Understand debt cycles.",
    formula: "Portfolio Balance (30%) + Diversification Value (25%) + Debt Cycle Signal (25%) + Range Position (20%)",
    bestFor: ["Macro", "Diversification", "All Weather"],
    quote: "He who lives by the crystal ball will eat shattered glass.",
    famousPicks: ["All Weather Portfolio", "Gold allocation"],
  },
  {
    id: "ptj", name: "Paul Tudor Jones", emoji: "⚡",
    category: "Forex", origin: "Global", tier: "Legend",
    label: "Macro + Technical Trader",
    bio: "Market Wizard. Predicted 1987 crash. Elliott Wave + macro combination. Tudor Investment Corp.",
    philosophy: "Technical analysis confirms macro thesis. Price is the ultimate truth.",
    formula: "Technical Setup (35%) + Price Momentum (30%) + Breakout Signal (20%) + 52W Position (15%)",
    bestFor: ["Technical", "Macro", "Trend Trading"],
    quote: "The secret to being successful is to have an insatiable desire to learn.",
    famousPicks: ["1987 crash short", "Various macro trends"],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Stock: "var(--accent-gold)",
  Crypto: "var(--accent-blue)",
  Commodity: "#f97316",
  Forex: "#a78bfa",
};

const TIER_STYLES: Record<string, { bg: string; color: string }> = {
  Legend: { bg: "rgba(255,215,0,0.15)", color: "#FFD700" },
  Master: { bg: "rgba(29,155,240,0.15)", color: "var(--accent-blue)" },
  Specialist: { bg: "rgba(113,118,123,0.15)", color: "var(--text-muted)" },
};

export default function RishisPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = ALL_RISHIS.filter(r => {
    const matchesCategory = activeCategory === "All" || r.category === activeCategory;
    const matchesSearch = search === "" ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.bio.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const counts = {
    All: ALL_RISHIS.length,
    Stock: ALL_RISHIS.filter(r => r.category === "Stock").length,
    Crypto: ALL_RISHIS.filter(r => r.category === "Crypto").length,
    Commodity: ALL_RISHIS.filter(r => r.category === "Commodity").length,
    Forex: ALL_RISHIS.filter(r => r.category === "Forex").length,
  };

  return (
    <main className="page-container">

      {/* Header */}
      <div className="page-header">
        <div className="content-wrapper">
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, letterSpacing: 1 }}>
            <Link href="/" style={{ color: "var(--accent-gold)" }}>RISHI TERMINAL</Link>
            <span style={{ margin: "0 8px" }}>›</span>
            <span>ALL RISHIS</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 40 }}>🧘</span>
                <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 36, color: "var(--text-primary)" }}>The Rishis</h1>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.6 }}>
                {ALL_RISHIS.length} investment legends across Stocks, Crypto, Commodities, and Forex.
                Each Rishi brings a unique philosophical lens to market analysis.
              </p>
            </div>

            {/* Count Cards */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(Object.entries(counts) as [Category, number][]).filter(([k]) => k !== "All").map(([cat, count]) => (
                <div key={cat} className="card" style={{ padding: "12px 20px", textAlign: "center", cursor: "pointer", borderColor: activeCategory === cat ? CATEGORY_COLORS[cat] : undefined }}
                  onClick={() => setActiveCategory(cat)}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: CATEGORY_COLORS[cat] }}>{count}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{cat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Search + Filter */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search Rishis..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: "10px 16px", borderRadius: 8, fontSize: 13,
                background: "var(--bg-card)", border: "1px solid var(--border-primary)", color: "var(--text-primary)",
              }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["All", "Stock", "Crypto", "Commodity", "Forex"] as Category[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: activeCategory === cat ? 700 : 400,
                    border: activeCategory === cat ? "none" : "1px solid var(--border-primary)",
                    background: activeCategory === cat ? (cat === "All" ? "var(--accent-gold)" : CATEGORY_COLORS[cat]) : "var(--bg-card)",
                    color: activeCategory === cat ? (cat === "All" ? "#000" : "#fff") : "var(--text-muted)",
                  }}
                >
                  {cat} ({counts[cat]})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="content-wrapper">

        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
          Showing <strong style={{ color: "var(--accent-gold)" }}>{filtered.length}</strong> Rishis
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(rishi => {
            const isExpanded = expandedId === rishi.id;
            const catColor = CATEGORY_COLORS[rishi.category];
            const tierStyle = TIER_STYLES[rishi.tier] || TIER_STYLES.Specialist;

            return (
              <div
                key={rishi.id}
                className="card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : rishi.id)}
              >
                {/* Top accent bar */}
                <div style={{ height: 3, background: catColor }} />

                {/* Summary Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 32 }}>{rishi.emoji}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "Cinzel, serif", fontSize: 17, color: "var(--text-primary)", fontWeight: 600 }}>{rishi.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: tierStyle.bg, color: tierStyle.color, fontWeight: 700 }}>
                          {rishi.tier}
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${catColor}20`, color: catColor, fontWeight: 600 }}>
                          {rishi.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{rishi.label} · {rishi.origin}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {rishi.bestFor.map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-muted)" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: 16, color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-primary)", padding: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>

                      {/* Bio */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>BIOGRAPHY</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{rishi.bio}</p>
                      </div>

                      {/* Philosophy */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>PHILOSOPHY</div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{rishi.philosophy}</p>
                      </div>

                      {/* Quote */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18, borderLeft: `4px solid ${catColor}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>SIGNATURE QUOTE</div>
                        <p style={{ fontSize: 14, color: catColor, fontStyle: "italic", lineHeight: 1.7 }}>"{rishi.quote}"</p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

                      {/* Formula */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>SCORING FORMULA</div>
                        <p style={{ fontSize: 12, color: catColor, lineHeight: 1.8, fontFamily: "JetBrains Mono" }}>{rishi.formula}</p>
                      </div>

                      {/* Famous Picks */}
                      <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 18 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 10 }}>FAMOUS PICKS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {rishi.famousPicks.map(pick => (
                            <span key={pick} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}>
                              {pick}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 14 }}>No Rishis match your search</p>
          </div>
        )}

      </div>
    </main>
  );
}