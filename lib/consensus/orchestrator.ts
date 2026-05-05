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

type ScorerFn = (s: Stock) => RishiScore;

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

export function runAllScorers(stock: Stock): RishiScore[] {
  return SCORER_REGISTRY
    .map(fn => {
      const result = fn(stock);
      return { ...result, score: clamp(result.score) };
    })
    .sort((a, b) => b.score - a.score);
}