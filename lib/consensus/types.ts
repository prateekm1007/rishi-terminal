import { Stock, RishiScore } from "../types";

export type { Stock, RishiScore };

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

export interface RishiWeight {
  name: string;
  weight: number;
  tier: "Legend" | "Master" | "Specialist";
}