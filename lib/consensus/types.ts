import { Stock, RishiScore } from "../types";

export type { Stock, RishiScore };

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

export interface RishiWeight {
  name: string;
  weight: number;
  tier: "Legend" | "Master" | "Specialist";
}