// ============================================================
// F&O STRATEGY ENGINE
// Calculates payoff, Greeks, breakevens for multi-leg strategies
// ============================================================

export type OptionType   = "CALL" | "PUT";
export type OptionAction = "BUY"  | "SELL";

export interface OptionLeg {
  id:      string;
  action:  OptionAction;
  type:    OptionType;
  strike:  number;
  expiry:  string;
  premium: number;
  lots:    number;
  lotSize: number;   // India: NIFTY=50, BANKNIFTY=15, etc.
  iv?:     number;   // Implied volatility %
  delta?:  number;
  gamma?:  number;
  theta?:  number;
  vega?:   number;
}

export interface PayoffPoint {
  spot:   number;
  pnl:    number;
}

export interface StrategyResult {
  name:        string;
  legs:        OptionLeg[];
  payoff:      PayoffPoint[];
  maxProfit:   number | null;   // null = unlimited
  maxLoss:     number | null;   // null = unlimited
  breakevens:  number[];
  netPremium:  number;          // positive = credit, negative = debit
  netDelta:    number;
  netGamma:    number;
  netTheta:    number;
  netVega:     number;
  popEstimate: number;          // Probability of Profit %
  riskReward:  number | null;   // maxProfit / maxLoss
  margin:      number;          // estimated margin required
}

export interface StrategyTemplate {
  id:          string;
  name:        string;
  category:    "bullish" | "bearish" | "neutral" | "speculative";
  description: string;
  rishiTag?:   string;
  maxRisk:     "defined" | "undefined";
  buildLegs:   (spot: number, lotSize: number) => Partial<OptionLeg>[];
}

// ── LOT SIZES (India) ──────────────────────────────────────────

export const LOT_SIZES: Record<string, number> = {
  NIFTY:    50,
  NIFTY50:  50,
  BANKNIFTY: 15,
  BANK_NIFTY: 15,
  FINNIFTY: 40,
  RELIANCE: 250,
  TCS:      150,
  INFY:     300,
  HDFCBANK: 550,
  ICICIBANK: 700,
  SBIN:     1500,
  TATAMOTORS: 1100,
  DEFAULT:  100,
};

export function getLotSize(symbol: string): number {
  return LOT_SIZES[symbol.toUpperCase()] ?? LOT_SIZES.DEFAULT;
}

// ── STRATEGY TEMPLATES ─────────────────────────────────────────

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "bull_call_spread",
    name: "Bull Call Spread",
    category: "bullish",
    description: "Buy lower strike call, sell higher strike call. Defined risk, defined reward.",
    rishiTag: "Jhunjhunwala Approved",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"BUY",  type:"CALL", strike: Math.round(spot/100)*100,       lots:1, lotSize:ls },
      { action:"SELL", type:"CALL", strike: Math.round(spot/100)*100 + 200,  lots:1, lotSize:ls },
    ],
  },
  {
    id: "bear_put_spread",
    name: "Bear Put Spread",
    category: "bearish",
    description: "Buy higher strike put, sell lower strike put. Defined risk short setup.",
    rishiTag: "Chanos Bear Framework",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"BUY",  type:"PUT", strike: Math.round(spot/100)*100,       lots:1, lotSize:ls },
      { action:"SELL", type:"PUT", strike: Math.round(spot/100)*100 - 200,  lots:1, lotSize:ls },
    ],
  },
  {
    id: "iron_condor",
    name: "Iron Condor",
    category: "neutral",
    description: "Sell OTM call spread + sell OTM put spread. Maximum credit strategy.",
    rishiTag: "Damani Conservative",
    maxRisk: "defined",
    buildLegs: (spot, ls) => {
      const atm = Math.round(spot / 100) * 100;
      return [
        { action:"SELL", type:"PUT",  strike: atm - 200, lots:1, lotSize:ls },
        { action:"BUY",  type:"PUT",  strike: atm - 400, lots:1, lotSize:ls },
        { action:"SELL", type:"CALL", strike: atm + 200, lots:1, lotSize:ls },
        { action:"BUY",  type:"CALL", strike: atm + 400, lots:1, lotSize:ls },
      ];
    },
  },
  {
    id: "long_straddle",
    name: "Long Straddle",
    category: "speculative",
    description: "Buy ATM call + ATM put. Profits from big moves in either direction.",
    rishiTag: "Event Play — Jhunjhunwala Style",
    maxRisk: "defined",
    buildLegs: (spot, ls) => {
      const atm = Math.round(spot / 100) * 100;
      return [
        { action:"BUY", type:"CALL", strike: atm, lots:1, lotSize:ls },
        { action:"BUY", type:"PUT",  strike: atm, lots:1, lotSize:ls },
      ];
    },
  },
  {
    id: "short_strangle",
    name: "Short Strangle",
    category: "neutral",
    description: "Sell OTM call + OTM put. Profit from time decay in range-bound markets.",
    rishiTag: "Chanos Short Vol",
    maxRisk: "undefined",
    buildLegs: (spot, ls) => {
      const atm = Math.round(spot / 100) * 100;
      return [
        { action:"SELL", type:"CALL", strike: atm + 300, lots:1, lotSize:ls },
        { action:"SELL", type:"PUT",  strike: atm - 300, lots:1, lotSize:ls },
      ];
    },
  },
  {
    id: "covered_call",
    name: "Covered Call",
    category: "neutral",
    description: "Hold underlying + sell OTM call. Income generation on existing position.",
    rishiTag: "Buffett Owner Earnings",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"SELL", type:"CALL", strike: Math.round(spot/100)*100 + 200, lots:1, lotSize:ls },
    ],
  },
  {
    id: "cash_secured_put",
    name: "Cash-Secured Put",
    category: "bullish",
    description: "Sell ATM/OTM put with cash collateral. Buffett's favorite entry method.",
    rishiTag: "Buffett Entry Method",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"SELL", type:"PUT", strike: Math.round(spot/100)*100 - 100, lots:1, lotSize:ls },
    ],
  },
  {
    id: "butterfly",
    name: "Butterfly Spread",
    category: "neutral",
    description: "Buy 1 ITM + sell 2 ATM + buy 1 OTM. Profit if stock pins at ATM.",
    rishiTag: "Munger Defined Risk",
    maxRisk: "defined",
    buildLegs: (spot, ls) => {
      const atm = Math.round(spot / 100) * 100;
      return [
        { action:"BUY",  type:"CALL", strike: atm - 200, lots:1, lotSize:ls },
        { action:"SELL", type:"CALL", strike: atm,         lots:2, lotSize:ls },
        { action:"BUY",  type:"CALL", strike: atm + 200, lots:1, lotSize:ls },
      ];
    },
  },
  {
    id: "long_call",
    name: "Long Call",
    category: "bullish",
    description: "Buy OTM call. Maximum leverage bullish bet.",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"BUY", type:"CALL", strike: Math.round(spot/100)*100 + 100, lots:1, lotSize:ls },
    ],
  },
  {
    id: "long_put",
    name: "Long Put",
    category: "bearish",
    description: "Buy OTM put. Defined-risk bearish bet or portfolio hedge.",
    rishiTag: "Chanos Hedge",
    maxRisk: "defined",
    buildLegs: (spot, ls) => [
      { action:"BUY", type:"PUT", strike: Math.round(spot/100)*100 - 100, lots:1, lotSize:ls },
    ],
  },
];

// ── BLACK-SCHOLES APPROXIMATION ────────────────────────────────
// Simplified for UI purposes — not for live trading

function normCDF(x: number): number {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741;
  const a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x/2) / Math.sqrt(2*Math.PI);
  return 0.5 * (1 + sign * (2*y-1));
}

export function estimateGreeks(leg: OptionLeg, spot: number, daysToExpiry: number): Partial<OptionLeg> {
  const iv = (leg.iv ?? 20) / 100;
  const T  = daysToExpiry / 365;
  const r  = 0.065; // India risk-free rate
  const S  = spot;
  const K  = leg.strike;

  if (T <= 0 || iv <= 0 || S <= 0 || K <= 0) {
    return { delta:0, gamma:0, theta:0, vega:0 };
  }

  const d1 = (Math.log(S/K) + (r + iv*iv/2)*T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);

  const nd1  = normCDF(d1);
  const nd1n = (1/Math.sqrt(2*Math.PI)) * Math.exp(-d1*d1/2);
  const nd2  = normCDF(d2);

  let delta: number, theta: number;

  if (leg.type === "CALL") {
    delta = nd1;
    theta = (-(S * nd1n * iv) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r*T) * nd2) / 365;
  } else {
    delta = nd1 - 1;
    theta = (-(S * nd1n * iv) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r*T) * normCDF(-d2)) / 365;
  }

  const gamma = nd1n / (S * iv * Math.sqrt(T));
  const vega  = S * nd1n * Math.sqrt(T) / 100;

  const sign = leg.action === "BUY" ? 1 : -1;
  const size = leg.lots * leg.lotSize;

  return {
    delta: sign * delta * size,
    gamma: sign * gamma * size,
    theta: sign * theta * size,
    vega:  sign * vega  * size,
  };
}

// ── PAYOFF CALCULATOR ──────────────────────────────────────────

export function calculateLegPnL(leg: OptionLeg, spot: number): number {
  const intrinsic = leg.type === "CALL"
    ? Math.max(0, spot - leg.strike)
    : Math.max(0, leg.strike - spot);

  const pnlPerLot = leg.action === "BUY"
    ? intrinsic - leg.premium
    : leg.premium - intrinsic;

  return pnlPerLot * leg.lots * leg.lotSize;
}

export function calculatePayoff(legs: OptionLeg[], spot: number): number {
  return legs.reduce((total, leg) => total + calculateLegPnL(leg, spot), 0);
}

export function buildPayoffCurve(legs: OptionLeg[], spot: number): PayoffPoint[] {
  const range   = spot * 0.25;
  const minSpot = Math.max(1, spot - range);
  const maxSpot = spot + range;
  const steps   = 100;
  const stepSize = (maxSpot - minSpot) / steps;

  const points: PayoffPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = minSpot + i * stepSize;
    points.push({ spot: s, pnl: calculatePayoff(legs, s) });
  }
  return points;
}

// ── BREAKEVEN FINDER ───────────────────────────────────────────

export function findBreakevens(payoff: PayoffPoint[]): number[] {
  const breakevens: number[] = [];
  for (let i = 1; i < payoff.length; i++) {
    const prev = payoff[i-1];
    const curr = payoff[i];
    if ((prev.pnl < 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl < 0)) {
      // Linear interpolation
      const t = -prev.pnl / (curr.pnl - prev.pnl);
      breakevens.push(Math.round(prev.spot + t * (curr.spot - prev.spot)));
    }
  }
  return breakevens;
}

// ── STRATEGY ANALYZER ─────────────────────────────────────────

export function analyzeStrategy(legs: OptionLeg[], spot: number, name: string): StrategyResult {
  if (!legs.length) {
    return {
      name, legs, payoff: [], maxProfit: 0, maxLoss: 0,
      breakevens: [], netPremium: 0, netDelta: 0, netGamma: 0,
      netTheta: 0, netVega: 0, popEstimate: 50, riskReward: null, margin: 0,
    };
  }

  const payoff = buildPayoffCurve(legs, spot);
  const pnls   = payoff.map(p => p.pnl);

  const maxPnl = Math.max(...pnls);
  const minPnl = Math.min(...pnls);

  // Determine if bounded
  const firstPnl = pnls[0];
  const lastPnl  = pnls[pnls.length - 1];
  const isLeftBounded  = Math.abs(firstPnl - pnls[1]) < 1;
  const isRightBounded = Math.abs(lastPnl - pnls[pnls.length-2]) < 1;

  const maxProfit = isRightBounded && isLeftBounded ? maxPnl : null;
  const maxLoss   = isRightBounded && isLeftBounded ? minPnl : null;

  // Net premium
  const netPremium = legs.reduce((s, l) => {
    const val = l.premium * l.lots * l.lotSize;
    return s + (l.action === "SELL" ? val : -val);
  }, 0);

  // Greeks (simplified — day 0 approximation)
  const daysToExpiry = 15;
  let netDelta = 0, netGamma = 0, netTheta = 0, netVega = 0;

  for (const leg of legs) {
    const g = estimateGreeks(leg, spot, daysToExpiry);
    netDelta += g.delta ?? 0;
    netGamma += g.gamma ?? 0;
    netTheta += g.theta ?? 0;
    netVega  += g.vega  ?? 0;
  }

  const breakevens  = findBreakevens(payoff);
  const profitCount = pnls.filter(p => p > 0).length;
  const popEstimate = Math.round((profitCount / pnls.length) * 100);

  const riskReward = maxProfit != null && maxLoss != null && maxLoss < 0
    ? Math.round((maxProfit / Math.abs(maxLoss)) * 10) / 10
    : null;

  // Margin estimate (simplified)
  const sellLegs = legs.filter(l => l.action === "SELL");
  const margin   = sellLegs.reduce((s, l) => s + l.strike * l.lots * l.lotSize * 0.12, 0);

  return {
    name, legs, payoff, maxProfit, maxLoss, breakevens,
    netPremium, netDelta, netGamma, netTheta, netVega,
    popEstimate, riskReward, margin,
  };
}

// ── RISHI FIT SCORE ────────────────────────────────────────────

export function getRishiFitScore(rishiId: string, result: StrategyResult): number {
  const isDefined    = result.maxLoss != null;
  const isCredit     = result.netPremium > 0;
  const isHighTheta  = result.netTheta > 0;
  const isNeutral    = result.popEstimate > 60;

  switch (rishiId) {
    case "damani":
      // Loves defined risk, credit, high theta
      return Math.min(100, 40 + (isDefined?25:0) + (isCredit?20:0) + (isHighTheta?15:0));
    case "buffett":
      // Only likes cash-secured puts and covered calls
      const isSingleSellLeg = result.legs.length === 1 && result.legs[0].action === "SELL";
      return isSingleSellLeg ? 85 : isDefined ? 45 : 20;
    case "jhunjhunwala":
      // Loves big bets and event plays
      const isBigBet = result.legs.some(l => l.action === "BUY");
      return Math.min(100, 50 + (isBigBet?30:0) + (isDefined?20:0));
    case "munger":
      // Defined risk only, skeptical of all options
      return isDefined ? 55 : 15;
    case "chanos":
      // Bearish structures
      const isBearish = result.legs.some(l => l.type === "PUT" && l.action === "BUY");
      return Math.min(100, 40 + (isBearish?40:0) + (isDefined?20:0));
    case "lynch":
      // Growth calls
      const isBullCall = result.legs.some(l => l.type === "CALL" && l.action === "BUY");
      return Math.min(100, 45 + (isBullCall?35:0) + (isDefined?20:0));
    case "soros":
      // Macro / volatility plays
      return Math.min(100, 50 + (isNeutral?20:0) + 30);
    default:
      return 50;
  }
}