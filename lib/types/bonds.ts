export interface Bond {
  symbol: string;
  name: string;
  type: 'G-Sec' | 'SDL' | 'Corporate' | 'T-Bill';
  issuer: string;
  couponRate: number;
  ytm: number;
  currentYield: number;
  price: number;
  faceValue: number;
  maturityDate: string;
  rating: string;
  duration: number;
  modifiedDuration: number;
  convexity: number;
  volume: number;
  spread: number;
  callDate?: string;
  putDate?: string;
  taxStatus: 'Taxable' | 'Tax-Free';
}

export interface BondScoreComponent {
  label: string;
  v: number;
  wt: number;
  detail: string;
}

export interface BondRishiScore {
  name: string;
  full: string;
  label: string;
  score: number;
  origin: string;
  comps: BondScoreComponent[];
  insight: string;
}

export interface BondConsensusResult {
  asset: Bond;
  scores: BondRishiScore[];
  consensus: number;
  category: string;
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  topBull: BondRishiScore;
  topBear: BondRishiScore;
}