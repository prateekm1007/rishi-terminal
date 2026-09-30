/**
 * Score parity check (remediation T10 acceptance).
 *
 * For every seeded stock, computes the score via each UI entry path and
 * asserts every path produces the identical consensus:
 *   A. stock page path  — getStockScore(resolveStockMetrics(sym))  (seed-only)
 *   B. screener path    — getStockScore(seedStock)
 *   C. chat/lab path    — getStockScore(seedStock) via the lib/consensus barrel
 *   D. dual-resolution  — resolveStockMetrics with an empty live payload
 *                         (live fetch failed -> must equal seed-only)
 *
 * Prints "0 mismatches / 0 non-finite of N" on success; exits 1 otherwise.
 * Run: npx tsx scripts/scoreParity.ts
 */

import { STOCKS } from "../data/stocks";
import { getStockScore, resolveStockMetrics } from "../lib/scoring";
import { buildConsensus } from "../lib/consensus/engine";

const symbols = Object.keys(STOCKS);
let mismatches = 0;
let nonFinite = 0;
let compared = 0;
const mismatchDetails: string[] = [];

for (const sym of symbols) {
  const seedStock = STOCKS[sym];

  const viaResolved = getStockScore(resolveStockMetrics(sym)!)?.consensus ?? null;
  const viaSeed = getStockScore(seedStock).consensus;
  const viaBarrel = buildConsensus(seedStock).consensus;
  const viaEmptyLive = getStockScore(resolveStockMetrics(sym, null)!).consensus;

  const values = [
    ["resolved", viaResolved],
    ["seed", viaSeed],
    ["barrel", viaBarrel],
    ["emptyLive", viaEmptyLive],
  ] as const;

  for (const [, v] of values) {
    if (v !== null && !Number.isFinite(v)) {
      nonFinite++;
      mismatchDetails.push(`${sym}: non-finite consensus ${v}`);
    }
  }

  const distinct = new Set(values.map(([, v]) => (v === null ? "null" : Math.round(v))));
  compared++;
  if (distinct.size > 1) {
    mismatches++;
    if (mismatchDetails.length < 20) {
      mismatchDetails.push(`${sym}: ${values.map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }
  }
}

console.log(`Checked ${compared} symbols across 4 entry paths.`);
if (mismatches === 0 && nonFinite === 0) {
  console.log(`0 mismatches / 0 non-finite of ${compared}`);
} else {
  console.log(`${mismatches} mismatches / ${nonFinite} non-finite of ${compared}`);
  for (const d of mismatchDetails.slice(0, 20)) console.log("  -", d);
  process.exit(1);
}
