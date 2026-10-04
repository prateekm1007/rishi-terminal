/**
 * X3-05 (Round 14 A6) — screener engine benchmark.
 *
 * Roadmap acceptance (verbatim):
 *   npx tsx scripts/benchScreener.ts --universe   # -> p95 < 500 ms (PROPOSED)
 *
 * Runs representative queries (the docs' examples plus progressively
 * larger boolean expressions) against the full 916-stock slim index,
 * measures per-query wall time over many iterations, and prints the
 * median / p95 / max. Exit code 1 if p95 exceeds 500 ms.
 */
import { getSlimIndex } from '../lib/scoring/slimIndex';
import { parseQuery } from '../lib/screener/parser';
import { filterRows } from '../lib/screener/engine';

const BUDGET_MS = 500;
const ITERATIONS = 200;

const QUERIES = [
  'pe > 0 and roe > 15',
  'sector = "Banking" and de < 1',
  'consensus is not null and consensus >= 75',
  'mktcap > 10000 and revcagr > 10',
  'pe > 0 or roe > 15 or de < 1 or mktcap > 5000',
  '(pe > 0 and roe > 15) or (consensus is not null and consensus >= 75 and de < 0.5)',
];

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--universe')) {
    console.error('usage: npx tsx scripts/benchScreener.ts --universe');
    process.exit(2);
  }

  const rows = getSlimIndex();
  console.log(`[benchScreener] universe=${rows.length} iterations/query=${ITERATIONS}`);

  let worstP95 = 0;
  for (const q of QUERIES) {
    const parsed = parseQuery(q);
    if (!parsed.ok) {
      console.error(`[benchScreener] FIXTURE BUG — query does not parse: ${q} (${parsed.error.message})`);
      process.exit(2);
    }
    // warmup (JIT + cache)
    for (let i = 0; i < 20; i++) filterRows(parsed.node, rows);

    const samples: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const out = filterRows(parsed.node, rows);
      const dt = performance.now() - t0;
      if (out.length === 0 && i === 0) {
        console.error(`[benchScreener] FIXTURE BUG — query matches nothing: ${q}`);
        process.exit(2);
      }
      samples.push(dt);
    }
    samples.sort((a, b) => a - b);
    const median = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    const max = samples[samples.length - 1];
    worstP95 = Math.max(worstP95, p95);
    console.log(
      `[benchScreener] ${q.padEnd(72)} median=${median.toFixed(3)}ms p95=${p95.toFixed(3)}ms max=${max.toFixed(3)}ms`,
    );
  }

  console.log(`[benchScreener] worst p95 = ${worstP95.toFixed(3)} ms (budget ${BUDGET_MS} ms)`);
  if (worstP95 >= BUDGET_MS) {
    console.error('[benchScreener] FAIL: p95 budget exceeded');
    process.exit(1);
  }
  console.log('[benchScreener] PASS');
}

main().catch((e) => {
  console.error('[benchScreener] crashed:', e);
  process.exit(2);
});
