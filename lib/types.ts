export interface Stock {
  symbol: string;
  name: string;
  sector: string;        // CRITICAL - used by scorers and WisdomSidebar
  exchange: string;
  price: number;
  pe: number;
  roe: number;
  mktcap: number;
  ocf: number;
  rev: number;
  revcagr: number;
  epscagr: number;
  opm: number;
  roce: number;
  de: number;
  fcf: number;
  promo: number;
  ca: number;
  tl: number;
  sh: number;
  np: number;
  dep: number;
  capex: number;
  bvps: number;
}

export interface RishiScore {
  name: string;
  full: string;
  label: string;
  score: number;
  origin: 'Global' | 'India' | 'Bharat' | 'Crypto' | 'Commodity' | 'Forex/Macro';
  comps: Array<{
    label: string;
    v: number;
    wt: number;
    detail: string;
  }>;
  insight: string;
}

export interface ConsensusResult {
  asset: Stock;
  scores: RishiScore[];
  consensus: number;
  category: string;
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  topBull: RishiScore;
  topBear: RishiScore;
}