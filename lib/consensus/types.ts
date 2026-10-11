import { Stock, RishiScore } from "../types";
import type { DataQuality } from "../dataQuality";

export type { Stock, RishiScore };

export interface ConsensusResult {
  asset: Stock;
  scores: RishiScore[];
  /** null = fewer than MIN_VALID_SCORERS produced finite scores
   *  ("Insufficient Data") — display as "—", sort last, never coerce to 0. */
  consensus: number | null;
  category: string;
  /** The closed P0-1 vocabulary — live | delayed | seed | missing
   *  (founder audit 2026-10-11). Derived from per-field provenance on the
   *  resolved path, from the bare seed record otherwise; replaces the
   *  former OK | INCOMPLETE pair. Verdicts are allowed only on live and
   *  delayed records — the gate itself lives on getStockScore. */
  dataQuality: DataQuality;
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