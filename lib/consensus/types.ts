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
  weightedBy: string;
  topBull: RishiScore;
  topBear: RishiScore;
}

export interface RishiWeight {
  name: string;
  weight: number;
  tier: "Legend" | "Master" | "Specialist";
}