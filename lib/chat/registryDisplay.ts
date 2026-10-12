// lib/chat/registryDisplay.ts — the CLIENT-SAFE persona projection.
//
// GENERATED from lib/chat/registry.ts by scripts/splitPersonaRegistry.mts
// (Coder Directions G10, audit 2026-10-02): the client import graph may
// carry ONLY rendering fields — never the model-prompt, scoring-parameter
// or entitlement-internals fields (the test pins this token-free too). The
// server authority stays in lib/chat/registry.ts, which imports THIS module
// for the display data — one authored source per field class:
//   display fields  → HERE (this file, the only authored copy)
//   authority fields→ lib/chat/registry.ts
// Drift between the projection and the registry is impossible to merge:
// test/persona.clientProjection.test.ts pins this mirror field-exact
// against CANONICAL_PERSONAS and fails the build on any mismatch.

export type PersonaDisplay = {
  id: string;
  name: string;
  fullName: string;
  emoji: string;
  color?: string;
  rank?: "Legend" | "Master";
  philosophy: string;
  label?: string;
  bio?: string;
  formula?: string;
  bestFor?: string[];
  // P0-7 (round 47): the quote field is REMOVED — no attributed
  // quotations of real persons render anywhere (founder order).
  // Rishi decision (founder, 12 Oct 2026): chanos-only flag, projected
  // so the roster can mark the chat-only card without touching authority.
  chatOnly?: boolean;
  famousPicks?: string[];
  category?: string;
  origin?: string;
};

export const PERSONA_DISPLAY: PersonaDisplay[] =
[
  {
    "id": "jhunjhunwala",
    "name": "Jhunjhunwala",
    "fullName": "Rakesh Jhunjhunwala",
    "emoji": "🦁",
    "color": "#F59E0B",
    "rank": "Legend",
    "philosophy": "Bold conviction betting on India growth. Comfortable with volatility for multibagger potential.",
    "label": "Conviction Multibagger",
    "bio": "Big Bull of India. Concentrated bets on high-growth companies with deep conviction.",
    "formula": "P/CF (25%) + Growth (25%) + Quality (20%) + Conviction (20%) + Sentiment (10%)",
    "bestFor": [
      "Growth",
      "Multi-Year",
      "Large Cap"
    ],
    "famousPicks": [
      "Titan",
      "Star Health",
      "Crisil"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "damani",
    "name": "Damani",
    "fullName": "Radhakishan Damani",
    "emoji": "🧘",
    "color": "#D4AF37",
    "rank": "Legend",
    "philosophy": "Conservative compounder. Fortress balance sheets. Margin of safety in every position.",
    "label": "Zero-Debt Fortress",
    "bio": "DMart founder. Obsessed with debt-free businesses and consistent cash flows.",
    "formula": "Zero-Debt (30%) + ROCE (25%) + Cash Flow (20%) + Moat (15%) + Management (10%)",
    "bestFor": [
      "Defensive",
      "Debt-Free",
      "Quality"
    ],
    "famousPicks": [
      "DMart",
      "VST Industries"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "kacholia",
    "name": "Kacholia",
    "fullName": "Ashish Kacholia",
    "emoji": "🦋",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "High promoter ownership plus accelerating FCF equals real wealth creation.",
    "label": "Whale Small-Cap Hunter",
    "bio": "Finds small-cap multibaggers before the mainstream discovers them.",
    "formula": "Promoter (30%) + FCF (25%) + ROCE (20%) + Size (15%) + Momentum (10%)",
    "bestFor": [
      "Small Cap",
      "Hidden Gems",
      "Multibagger"
    ],
    "famousPicks": [
      "Vaibhav Global",
      "Newgen Software"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "kedia",
    "name": "Kedia",
    "fullName": "Vijay Kedia",
    "emoji": "😊",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Small, Manageable, Innovative, Listed, Emerging - the perfect multibagger.",
    "label": "SMILE Formula",
    "bio": "Created the SMILE framework. Patient long-term approach to emerging businesses.",
    "formula": "Small (20%) + Manageable (20%) + Innovation (20%) + Listing Premium (20%) + Emerging (20%)",
    "bestFor": [
      "SMILE",
      "Mid Cap",
      "Emerging"
    ],
    "famousPicks": [
      "Cera Sanitaryware",
      "Atul Auto"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "porinju",
    "name": "Veliyath",
    "fullName": "Porinju Veliyath",
    "emoji": "🔥",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Maximum pessimism is where mispricing lives. Contrarian patience creates real alpha.",
    "label": "Contrarian Deep Value",
    "bio": "Finds value in beaten-down stocks others have abandoned. Specializes in turnarounds.",
    "formula": "Contrarian (30%) + Management (25%) + Undervalue (25%) + Catalyst (20%)",
    "bestFor": [
      "Deep Value",
      "Turnarounds",
      "Contrarian"
    ],
    "famousPicks": [
      "Stove Kraft",
      "Geojit Financial"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "raamdeo",
    "name": "Agrawal",
    "fullName": "Raamdeo Agrawal",
    "emoji": "⚖️",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Quality, Growth, Longevity, Price - the four pillars of wealth creation.",
    "label": "QGLP Framework",
    "bio": "Co-founder of Motilal Oswal. Developed QGLP framework for compounding businesses.",
    "formula": "Quality (30%) + Growth (25%) + Longevity (25%) + Price (20%)",
    "bestFor": [
      "Compounders",
      "Quality Growth",
      "QGLP"
    ],
    "famousPicks": [
      "Page Industries",
      "Eicher Motors"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "nemish",
    "name": "Shah",
    "fullName": "Nemish Shah",
    "emoji": "📈",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Consistency beats excitement. Boring businesses compound into fortunes.",
    "label": "Steady Compounder",
    "bio": "Boring, steady businesses that compound for decades. Consistency over excitement.",
    "formula": "EPS Growth (35%) + Debt-Free (30%) + Management Quality (20%) + Valuation (15%)",
    "bestFor": [
      "Multi-Year Hold",
      "Boring Business",
      "Compounder"
    ],
    "famousPicks": [
      "V-Guard Industries"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "basant",
    "name": "Maheshwari",
    "fullName": "Basant Maheshwari",
    "emoji": "🛒",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "India is consuming more every year. Invest in this unstoppable wave.",
    "label": "Consumption Growth",
    "bio": "Focuses on India consumption growth megatrend. Early identifier of consumer stocks.",
    "formula": "Consumer Theme (30%) + Revenue Growth (25%) + Margins (25%) + PE Premium (20%)",
    "bestFor": [
      "Consumption",
      "Growth",
      "India Theme"
    ],
    "famousPicks": [
      "Berger Paints",
      "HDFC Bank"
    ],
    "category": "Stock",
    "origin": "Bharat"
  },
  {
    "id": "buffett",
    "name": "Buffett",
    "fullName": "Warren Buffett",
    "emoji": "🎩",
    "color": "#22C55E",
    "rank": "Legend",
    "philosophy": "Economic moats. Owner earnings. Business quality trumps market timing.",
    "label": "Quality Moat",
    "bio": "Oracle of Omaha. Seeks durable competitive advantages and exceptional management.",
    "formula": "ROE (30%) + Economic Moat (25%) + Earnings Power (20%) + Management (15%) + Price (10%)",
    "bestFor": [
      "Quality",
      "Multi-Year",
      "Moat"
    ],
    "famousPicks": [
      "Coca-Cola",
      "Apple",
      "American Express"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "graham",
    "name": "Graham",
    "fullName": "Benjamin Graham",
    "emoji": "📚",
    "color": "#D4AF37",
    "rank": "Legend",
    "philosophy": "A significant discount to intrinsic value is the entry criterion. Mr. Market is your servant, not master.",
    "label": "Deep Value",
    "bio": "Father of value investing. Margin of safety is his central concept.",
    "formula": "NCAV (40%) + P/E Below Market (25%) + Low Debt (20%) + Earnings Stability (15%)",
    "bestFor": [
      "Deep Value",
      "Asset Plays",
      "Safety"
    ],
    "famousPicks": [
      "GEICO"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "lynch",
    "name": "Lynch",
    "fullName": "Peter Lynch",
    "emoji": "🚀",
    "color": "#06B6D4",
    "rank": "Legend",
    "philosophy": "GARP (Growth at Reasonable Price). Accessible investments. Sector specialist knowledge.",
    "label": "GARP",
    "bio": "Fidelity Magellan fund manager. 29% annual returns for 13 years. Champion of retail investors.",
    "formula": "PEG Ratio (30%) + Earnings Growth (25%) + FCF (20%) + Category (15%) + Story (10%)",
    "bestFor": [
      "GARP",
      "Growth",
      "Consumer"
    ],
    "famousPicks": [
      "Dunkin Donuts",
      "Chrysler"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "munger",
    "name": "Munger",
    "fullName": "Charlie Munger",
    "emoji": "🦉",
    "color": "#8B5CF6",
    "rank": "Legend",
    "philosophy": "Inversion thinking. Mistake avoidance. Multidisciplinary approach.",
    "label": "Mental Models",
    "bio": "Buffett partner. Inversion, latticework of mental models, and multidisciplinary thinking.",
    "formula": "Circle of Competence (30%) + Inversion (25%) + Quality Business (25%) + Fair Price (20%)",
    "bestFor": [
      "Quality",
      "Mental Models",
      "Multi-Year"
    ],
    "famousPicks": [
      "Costco",
      "Berkshire Hathaway"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "greenblatt",
    "name": "Greenblatt",
    "fullName": "Joel Greenblatt",
    "emoji": "✨",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Good businesses at cheap prices. Be systematic and trust the process.",
    "label": "Magic Formula",
    "bio": "Created the Magic Formula. Systematic combination of high ROC and high earnings yield.",
    "formula": "Return on Capital (50%) + Earnings Yield (50%)",
    "bestFor": [
      "Systematic",
      "Quant",
      "Value"
    ],
    "famousPicks": [
      "Various - systematic approach"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "pabrai",
    "name": "Pabrai",
    "fullName": "Mohnish Pabrai",
    "emoji": "🎯",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Heads I win, tails I do not lose much. Clone shamelessly from the best.",
    "label": "Dhandho Cloner",
    "bio": "Clones the best ideas from the best investors. Dhandho framework - high upside, low downside.",
    "formula": "Clone Score (30%) + Owner-Operator (25%) + Downside Protection (25%) + Upside (20%)",
    "bestFor": [
      "Cloning",
      "Asymmetric",
      "Value"
    ],
    "famousPicks": [
      "Fiat Chrysler",
      "Rain Industries"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "philipfisher",
    "name": "Fisher",
    "fullName": "Philip Fisher",
    "emoji": "🔬",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Outstanding companies with outstanding management. Hold forever.",
    "label": "Scuttlebutt Growth",
    "bio": "Pioneer of growth investing. Deep qualitative research through scuttlebutt method.",
    "formula": "Management Quality (25%) + R&D Strength (25%) + Revenue Growth (25%) + Margins (25%)",
    "bestFor": [
      "Growth",
      "Quality Management",
      "Multi-Year"
    ],
    "famousPicks": [
      "Motorola",
      "Texas Instruments"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "howardmarks",
    "name": "Marks",
    "fullName": "Howard Marks",
    "emoji": "🔄",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Others' fear and greed create the mispricing. The most important thing is risk.",
    "label": "Risk Cycle",
    "bio": "Oaktree Capital founder. Market cycle expert. Understanding risk is his superpower.",
    "formula": "Cycle Position (30%) + Margin of Safety (25%) + Risk Asymmetry (25%) + Sentiment (20%)",
    "bestFor": [
      "Cycle",
      "Contrarian",
      "Risk Management"
    ],
    "famousPicks": [
      "Distressed debt",
      "High yield bonds"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "sethklarman",
    "name": "Klarman",
    "fullName": "Seth Klarman",
    "emoji": "🛡️",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Protect the downside and the upside takes care of itself.",
    "label": "Asymmetric Safety",
    "bio": "Baupost Group founder. Downside protection obsessed. The most secretive great investor.",
    "formula": "Downside Protection (40%) + Asymmetric Return (30%) + Margin of Safety (15%) + Catalyst (15%)",
    "bestFor": [
      "Defensive",
      "Asymmetric",
      "Deep Value"
    ],
    "famousPicks": [
      "Distressed assets",
      "Special situations"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "templeton",
    "name": "Templeton",
    "fullName": "John Templeton",
    "emoji": "🌏",
    "color": "#D4AF37",
    "rank": "Legend",
    "philosophy": "The best time to invest is at maximum pessimism. Look everywhere globally.",
    "label": "Maximum Pessimism",
    "bio": "Global value investor pioneer. Buys at the point of maximum pessimism worldwide.",
    "formula": "Pessimism Score (35%) + Global Discount (30%) + Quality Business (20%) + Catalyst (15%)",
    "bestFor": [
      "Contrarian",
      "Global",
      "Deep Value"
    ],
    "famousPicks": [
      "Japan 1980s",
      "Various global bargains"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "schloss",
    "name": "Schloss",
    "fullName": "Walter Schloss",
    "emoji": "💎",
    "color": "#D4AF37",
    "rank": "Master",
    "philosophy": "Cheapness with wide diversification, then patience.",
    "label": "Cigar Butt",
    "bio": "Graham student. 16%+ annual returns for 45+ years. Pure statistical value investor.",
    "formula": "Price-to-Book (40%) + Zero Debt (30%) + Insider Buying (20%) + Low PE (10%)",
    "bestFor": [
      "Deep Value",
      "Low Risk",
      "Diversified"
    ],
    "famousPicks": [
      "Statistically cheap stocks"
    ],
    "category": "Stock",
    "origin": "Global"
  },
  {
    "id": "chanos",
    "name": "Chanos",
    "fullName": "Jim Chanos",
    "emoji": "🐻",
    "color": "#EF4444",
    "rank": "Master",
    "philosophy": "Forensic accounting. Overvaluation focus. Narrative vs reality.",
    "label": "Forensic Analyst",
    "bio": "Forensic accountant who built his name shorting Enron. Finds where the narrative diverges from the numbers.",
    "formula": "Overvaluation (25%) + Deteriorating Fundamentals (25%) + Accounting Red Flags (25%) + Catalyst Timing (25%)",
    "bestFor": [
      "Deterioration Reads",
      "Forensic",
      "Skepticism"
    ],
    "famousPicks": [
      "Enron (short)"
    ],
    "category": "Stock",
    "origin": "Global",
    "chatOnly": true
  },
  {
    "id": "soros",
    "name": "Soros",
    "fullName": "George Soros",
    "emoji": "🌊",
    "color": "#A78BFA",
    "rank": "Master",
    "philosophy": "Reflexivity. Macro overlay. Trend following with macro conviction.",
    "label": "Reflexivity Macro",
    "bio": "The reflexivist. Trades macro inflections where price action feeds back into fundamentals.",
    "formula": "Macro Cycle (20%) + Reflexivity (20%) + Policy Shift (20%) + Trend Stage (20%) + Capital Flows (20%)",
    "bestFor": [
      "Macro",
      "Trends",
      "Currencies"
    ],
    "famousPicks": [
      "British Pound (1992 short)"
    ],
    "category": "Stock",
    "origin": "Global"
  }
];
