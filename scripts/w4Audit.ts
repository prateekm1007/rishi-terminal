/**
 * W4 independent audit (founder round-10 review, directions 9-13) — run
 * on the REBASED tree. Measures, per scorer, across the canonical
 * 916-stock universe:
 *   - sd, %<=5, %>=95 (the W4 gate quantities — reproduces the reported
 *     figures);
 *   - degenerate-denominator incidence: bvps<=0, tl<=0, ncav<=0 rows;
 *   - what the OLD (pre-W4) Soros code scored the ncav<=0 rows (verifies
 *     or refutes the "scored them 100" comment claim);
 *   - the exact Pabrai Clone saturation point (verifies or refutes the
 *     "100 from 70%" comment claim).
 */
import 'server-only';
import { STOCKS } from '../data/stocks/index';
import { scorePabrai } from '../lib/scorers/pabrai';
import { scorePorinju } from '../lib/scorers/porinju';
import { scoreSoros } from '../lib/scorers/soros';
import { scoreGreenblatt } from '../lib/scorers/greenblatt';
import { clamp } from '../lib/utils';
import type { Stock } from '../lib/types';

const universe = Object.values(STOCKS);
console.log(`universe size: ${universe.length}`);

// ── 1. The claimed incidence numbers ─────────────────────────────────
let bvpsLE0 = 0, tlLE0 = 0, ncavLE0 = 0;
const ncavRows: Array<{ sym: string; oldSorosReflex: number; price: number }> = [];
for (const s of universe) {
  if (s.bvps <= 0) bvpsLE0++;
  if (s.tl <= 0) tlLE0++;
  const ncav = (s.ca - s.tl) / s.sh;
  if (ncav <= 0) {
    ncavLE0++;
    // the OLD pre-W4 Soros code path: ptn = price / max(1, ncav) = price
    const ptn = s.price / Math.max(1, ncav);
    const oldReflex = clamp(ptn < 1 ? 100 : ptn < 2 ? 75 : ptn < 3 ? 50 : Math.max(0, 100 - ptn * 15));
    ncavRows.push({ sym: s.symbol, oldSorosReflex: oldReflex, price: s.price });
  }
}
console.log(`\nDegenerate-denominator incidence (claimed: bvps<=0: 0, tl<=0: 0, ncav<=0: 37):`);
console.log(`  bvps<=0: ${bvpsLE0}`);
console.log(`  tl<=0:   ${tlLE0}`);
console.log(`  ncav<=0: ${ncavLE0}`);
const oldReflexValues = [...new Set(ncavRows.map((r) => r.oldSorosReflex))];
console.log(`  OLD pre-W4 Soros Reflexivity for those rows: distinct values = ${JSON.stringify(oldReflexValues)} (the branch's comment claims they were ALL 100)`);
console.log(`  sample: ${JSON.stringify(ncavRows.slice(0, 5))}`);

// ── 2. The Pabrai Clone saturation point ─────────────────────────────
const cloneAt = (promo: number) => clamp(35 + (promo - 35) * (100 / 35));
let sat = 100;
for (let p = 35; p <= 100; p += 0.05) {
  if (cloneAt(p) >= 100) { sat = p; break; }
}
console.log(`\nPabrai Clone ramp saturation (comment claims "100 from 70%"):`);
console.log(`  exact saturation point: ${sat.toFixed(2)}% promoter`);
console.log(`  clone(50)=${cloneAt(50).toFixed(1)} clone(57.75)=${cloneAt(57.75).toFixed(1)} clone(60)=${cloneAt(60).toFixed(1)} clone(70)=${cloneAt(70).toFixed(1)}`);

// ── 3. Distribution figures (the reported numbers to reproduce) ──────
function stats(name: string, vals: number[]) {
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  const pctLE5 = (vals.filter((v) => v <= 5).length / n) * 100;
  const pctGE95 = (vals.filter((v) => v >= 95).length / n) * 100;
  console.log(`  ${name.padEnd(12)} sd=${sd.toFixed(2).padStart(6)}  <=5: ${pctLE5.toFixed(1)}%  >=95: ${pctGE95.toFixed(1)}%`);
  return { sd, pctLE5, pctGE95 };
}

console.log(`\nPer-scorer distributions on the rebased tree (all 916):`);
const scorers: Array<[string, (s: Stock) => { score: number | null }]> = [
  ['Pabrai', scorePabrai],
  ['Porinju', scorePorinju],
  ['Soros', scoreSoros],
  ['Greenblatt', scoreGreenblatt],
];
const offenders: string[] = [];
for (const [name, fn] of scorers) {
  const vals = universe.map((s) => fn(s).score).filter((v): v is number => typeof v === 'number');
  const r = stats(name, vals);
  const exempt = name === 'Greenblatt'; // documented allow-list
  if (!exempt) {
    if (r.sd < 8) offenders.push(`${name}: sd ${r.sd.toFixed(2)} < 8`);
    if (r.pctLE5 > 20) offenders.push(`${name}: ${r.pctLE5.toFixed(1)}% <= 5`);
    if (r.pctGE95 > 20) offenders.push(`${name}: ${r.pctGE95.toFixed(1)}% >= 95`);
  }
}
console.log(`\nW4 gate (sd>=8, <=20% at <=5, <=20% at >=95, Greenblatt allow-listed):`);
console.log(offenders.length === 0 ? '  PASS (no offenders)' : `  FAIL: ${offenders.join('; ')}`);
