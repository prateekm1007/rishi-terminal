export interface Stock {
  symbol: string;
  name: string;
  sector: string;        // CRITICAL - used by scorers and WisdomSidebar
  exchange: string;
  price: number;
  /**
   * P0-2 (founder audit 2026-10-11): null = the value was never observed
   * (placeholder unknown). A P/E of exactly 0 is impossible for
   * profit-makers and undefined for loss-makers, so the placeholder class
   * is null at the data layer — never a typed 0 that scores as a fact.
   */
  pe: number | null;
  /** P0-2: null = placeholder unknown (same class as pe). */
  roe: number | null;
  mktcap: number;
  ocf: number;
  rev: number;
  revcagr: number;
  epscagr: number;
  /**
   * P0-2: null = concept inapplicable for Banking rows (deposits are not
   * corporate debt; the stock page hides D/E for banks) or placeholder
   * unknown. A non-bank 0 is a REAL observation (debt-free, G5).
   */
  opm: number | null;
  roce: number;
  /**
   * P0-2: null = concept inapplicable for Banking rows or placeholder
   * unknown. A non-bank 0 is a REAL observation (debt-free, G5).
   */
  de: number | null;
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
    /** ENG-1b (founder order 2026-10-12): null = the pillar abstains —
     *  its inputs were not observed, so it contributes no value and its
     *  weight is excluded from the aggregation (renormalized, never
     *  zero-filled). The detail says why ('not assessed'). Consumers must
     *  null-guard: never Math.round/sort-compare a null v. */
    v: number | null;
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
  /** S2-06: the disagreement metric — population σ of the valid verdicts
   *  (docs/methodology/dispersion.md). null when fewer than 2 verdicts
   *  are valid: one voice is not agreement, and 0 would pretend it is. */
  dispersion: number | null;
  weightedBy: string;
  topBull: RishiScore;
  topBear: RishiScore;
}