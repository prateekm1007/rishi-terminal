export interface Stock {
  symbol: string;
  name: string;
  sector: string;
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

export interface ScoreComponent {
  label: string;
  v: number;
  wt: number;
  detail: string;
}

export interface RishiScore {
  name: string;
  full: string;
  label: string;
  score: number;
  origin: string;
  comps: ScoreComponent[];
  insight: string;
}
