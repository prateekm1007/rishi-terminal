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
  /** null = the scorer had insufficient data (documented, never NaN) — T11. */
  score: number | null;
  /** S2-05: the scorer's PRE-ROUND weighted sum of its pillars — the
   *  quantity `score` is Math.round of. Published so the page's breakdown
   *  is the ACTUAL arithmetic (sum of contributions reproduces this
   *  within 1e-6, pinned by test/scoring.explain.test.ts). Optional at
   *  the type level only because non-consensus asset scorers (crypto,
   *  bonds, forex teasers) do not carry it; the 20 consensus scorers
   *  MUST (the gate enforces it). */
  scoreRaw?: number | null;
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
  /** null = fewer than MIN_VALID_SCORERS produced finite scores
   *  ("Insufficient Data") — display as "—", sort last, never coerce to 0. */
  consensus: number | null;
  category: string;
  /** OK | INCOMPLETE — all-zero/non-finite core fundamentals — T11.4. */
  dataQuality: 'OK' | 'INCOMPLETE';
  tension: string;
  tensionSpread: number;
  weightedBy: string;
  topBull: RishiScore;
  topBear: RishiScore;
}