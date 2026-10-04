import 'server-only';

import { Stock, RishiScore } from "./types";
import { clamp } from "../utils";

import { scoreBuffett }       from "../scorers/buffett";
import { scoreGraham }        from "../scorers/graham";
import { scoreLynch }         from "../scorers/lynch";
import { scoreDamani }        from "../scorers/damani";
import { scoreJhunjhunwala }  from "../scorers/jhunjhunwala";
import { scoreMunger }        from "../scorers/munger";
import { scorePabrai }        from "../scorers/pabrai";
import { scoreHowardMarks }   from "../scorers/howardmarks";
import { scoreSethKlarman }   from "../scorers/sethklarman";
import { scoreKacholia }      from "../scorers/kacholia";
import { scoreKedia }         from "../scorers/kedia";
import { scorePorinju }       from "../scorers/porinju";
import { scoreRaamdeo }       from "../scorers/raamdeo";
import { scoreNemish }        from "../scorers/nemish";
import { scoreBasant }        from "../scorers/basant";
import { scorePhilipFisher }  from "../scorers/philipfisher";
import { scoreGreenblatt }    from "../scorers/greenblatt";
import { scoreJohnTempleton } from "../scorers/templeton";
import { scoreWalterSchloss } from "../scorers/schloss";
import { scoreSoros }         from "../scorers/soros";

type ScorerFn = (s: Stock, ctx?: ScoringContext) => RishiScore;

/**
 * X6 (Round 13) — the Y4 placeholder-zero contract at the scoring
 * boundary.
 *
 * `unknownFields` names Stock fields whose current value is a PLACEHOLDER
 * UNKNOWN, not an observation. Two contracts meet here:
 *   - Y4 (Round 12): a SEED-sourced 0 is the June placeholder for
 *     "unknown" — it is not an observation of zero.
 *   - G5 (audit 2026-10-02): a LIVE-sourced 0 IS a real observation
 *     (a debt-free company has D/E = 0; a stagnant year has EPS CAGR 0)
 *     and must score.
 * The resolver (`lib/scoring` getStockScore) builds the precise set from
 * per-field provenance; a BARE Stock input (every current bare caller
 * passes a seed record) defaults to seed semantics — all zero fields are
 * placeholder unknowns (`seedScoringContext`).
 */
export interface ScoringContext {
  readonly unknownFields: ReadonlySet<string>;
}

/** Seed semantics for a bare Stock input: every zero field is a
 *  placeholder unknown (Y4). */
export function seedScoringContext(stock: Stock): ScoringContext {
  const unknownFields = new Set<string>();
  for (const [field, value] of Object.entries(stock)) {
    if (typeof value === "number" && value === 0) unknownFields.add(field);
  }
  return { unknownFields };
}

const SCORER_REGISTRY: ScorerFn[] = [
  scoreBuffett,
  scoreGraham,
  scoreLynch,
  scoreDamani,
  scoreJhunjhunwala,
  scoreMunger,
  scorePabrai,
  scoreHowardMarks,
  scoreSethKlarman,
  scoreSoros,
  scoreKacholia,
  scoreKedia,
  scorePorinju,
  scoreRaamdeo,
  scoreNemish,
  scoreBasant,
  scorePhilipFisher,
  scoreGreenblatt,
  scoreJohnTempleton,
  scoreWalterSchloss,
];

export const TOTAL_RISHIS = SCORER_REGISTRY.length;

export function runAllScorers(stock: Stock, ctx: ScoringContext = seedScoringContext(stock)): RishiScore[] {
  return SCORER_REGISTRY
    .map(fn => {
      const result = fn(stock, ctx);
      // T11: score may be null ("insufficient data") — never clamp NaN through.
      return {
        ...result,
        score: result.score === null ? null : clamp(result.score),
      };
    })
    // Nulls always sort last regardless of direction.
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
}