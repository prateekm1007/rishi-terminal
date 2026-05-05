export interface ForexPair {
  symbol: string;
  name: string;
  baseCurrency: string;
  quoteCurrency: string;
  spotRate: number;
  bid: number;
  ask: number;
  spread: number;
  forward1M: number;
  forward3M: number;
  forward6M: number;
  forward1Y: number;
  volatility: number;
  interestRateDiff: number;
  pppValue: number;
  volume24h: number;
  rbiInterventionLevel?: number;
}

export interface ForexScoreComponent {
  label: string;
  v: number;
  wt: number;
  detail: string;
}

export interface ForexRishiScore {
  name: string;
  full: string;
  label: string;
  score: number;
  origin: string;
  comps: ForexScoreComponent[];
  insight: string;
}

export interface ForexConsensusResult {
  asset: ForexPair;
  scores: ForexRishiScore[];
  consensus: number;
  category: string;
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  topBull: ForexRishiScore;
  topBear: ForexRishiScore;
}