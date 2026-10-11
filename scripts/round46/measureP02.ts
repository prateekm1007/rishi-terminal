import { STOCKS } from "../../data/stocks";
import { buildConsensus } from "../../lib/consensus/engine";
import { runAllScorers, seedScoringContext } from "../../lib/consensus/orchestrator";
import { MIN_VALID_SCORERS } from "../../lib/consensus/weights";

let evaluable = 0;
const total = Object.keys(STOCKS).length;
const nullsByScorer = new Map<string, number>();
for (const s of Object.values(STOCKS)) {
  const scores = runAllScorers(s, seedScoringContext(s));
  const valid = scores.filter(r => r.score !== null).length;
  if (valid >= MIN_VALID_SCORERS && buildConsensus(s).consensus !== null) evaluable++;
  for (const r of scores) {
    if (r.score === null) nullsByScorer.set(r.name, (nullsByScorer.get(r.name) ?? 0) + 1);
  }
}
console.log("stocks:", total, "| evaluable (quorum + finite consensus):", evaluable);
console.log("nulls per scorer:", [...nullsByScorer.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" "));
