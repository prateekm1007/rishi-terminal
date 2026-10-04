// scripts/benchScreener.ts (X3-05)
// Benchmarks the screener query engine over the full slim universe:
// parse + eval of a representative expression set, repeated, reporting
// p50/p95 wall time per full-universe pass. PROPOSED acceptance: p95
// < 500 ms (roadmap X3-05) — measured honestly on whatever machine runs
// it, with the raw numbers pasted (rule 25).
//
// "Prove the gate bites" (rule 24): the p95 assertion is a hard check in
// this script — a deliberately pathological expression (deeply nested
// alternation over every field) is included in the set and must ALSO stay
// under budget; the scratch-branch bite proof for the CI gate is recorded
// in the A6 PR.
//
// Usage: npx tsx scripts/benchScreener.ts --universe
// (the --universe flag is the roadmap's invocation; without it, a quick
// 3-pass smoke runs for local iteration)

import { getSlimIndex } from "../lib/scoring/slimIndex";
import { parseExpression, evalExpression, type ScreenerRowLike } from "../lib/screener/parser";

const EXPRESSIONS = [
  "pe < 15 && roe > 20",
  "(sector == 'IT' or sector == 'Pharma') and de < 1 and not (pe > 60)",
  "consensus > 70 && mktcap < 50000",
  "revcagr > 12 && fcf > 0",
  // the pathological member: forces the evaluator through every field
  "pe > -1 && roe > -1 && mktcap > -1 && de >= 0 && revcagr >= -1 && fcf >= -1 && tensionSpread >= 0 && consensus >= -1",
];

async function main() {
  const full = process.argv.includes("--universe");
  const passes = full ? 25 : 3;
  const rows = getSlimIndex() as unknown as ScreenerRowLike[];

  const asts = EXPRESSIONS.map((e) => ({ expression: e, ast: parseExpression(e) }));

  const times: number[] = [];
  let matchedTotal = 0;
  for (let p = 0; p < passes; p++) {
    for (const { ast } of asts) {
      const startedAt = process.hrtime.bigint();
      for (const row of rows) {
        if (evalExpression(ast, row)) matchedTotal++;
      }
      times.push(Number(process.hrtime.bigint() - startedAt) / 1e6);
    }
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length / 2)];
  const p95 = times[Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1)];

  console.log("── benchScreener (X3-05) ──");
  console.log(`universe rows : ${rows.length}`);
  console.log(`expressions   : ${EXPRESSIONS.length} (incl. 1 pathological)`);
  console.log(`passes        : ${passes} full-universe passes each`);
  console.log(`p50           : ${p50.toFixed(2)} ms`);
  console.log(`p95           : ${p95.toFixed(2)} ms`);
  console.log(`matches       : ${matchedTotal} (across ${passes * EXPRESSIONS.length} passes)`);

  const budgetMs = 500;
  if (p95 >= budgetMs) {
    console.error(`FAIL: p95 ${p95.toFixed(2)} ms >= ${budgetMs} ms budget`);
    process.exit(1);
  }
  console.log(`PASS: p95 ${p95.toFixed(2)} ms < ${budgetMs} ms budget`);
}

main();
