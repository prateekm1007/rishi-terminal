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
import { scoreNemish } from '../lib/scorers/nemish';
import { clamp } from '../lib/utils';
import type { Stock } from '../lib/types';

/** X6 (Round 13): the distribution gate as an importable pure unit.
 *
 * Two founder corrections shape this gate:
 *   1. The Greenblatt allow-list REASON is corrected: the low pile (26.9%
 *      of the universe at score <= 5 on the current seed) reflects the
 *      PLACEHOLDER SEED's earnings values — the seed np fields are June
 *      placeholders, so np/mktcap lands near zero for a large block of
 *      symbols and the score pins low. It is NOT a property of the
 *      scorer, and the old blanket wording ("documented allow-list")
 *      hid that.
 *   2. The at-bounds criterion tightens from 20% to 15%: a scorer whose
 *      share of scores sits at its own bounds (<= 5 or >= 95) above 15%
 *      is an offender. Measured on the current seed, Nemish carries 18.8%
 *      at >= 95 (the founder cited ~19%) — the honest gate NAMES it
 *      instead of passing.
 * The Greenblatt exemption covers ONLY its documented low-pile side; the
 * >= 95 side stays gated for every scorer. */
export interface DistributionStats {
  name: string;
  sd: number;
  pctLE5: number;
  pctGE95: number;
}

export interface GateVerdict {
  pass: boolean;
  offenders: string[];
  exemptReason: string | null;
}

export const GREENBLATT_LOW_PILE_REASON =
  'allow-listed: the low pile reflects the placeholder seed\'s earnings values (June np placeholders), not a scorer property';

export function evaluateDistributionGate(s: DistributionStats): GateVerdict {
  const offenders: string[] = [];
  const exemptLowPile = s.name === 'Greenblatt';
  if (s.sd < 8) offenders.push(`${s.name}: sd ${s.sd.toFixed(2)} < 8`);
  if (exemptLowPile) {
    if (s.pctGE95 > 15) offenders.push(`${s.name}: ${s.pctGE95.toFixed(1)}% >= 95 (above the 15% bound)`);
    return {
      pass: offenders.length === 0,
      offenders,
      exemptReason: offenders.length === 0 ? GREENBLATT_LOW_PILE_REASON : null,
    };
  }
  if (s.pctLE5 > 15) offenders.push(`${s.name}: ${s.pctLE5.toFixed(1)}% <= 5 (above the 15% bound)`);
  if (s.pctGE95 > 15) offenders.push(`${s.name}: ${s.pctGE95.toFixed(1)}% >= 95 (above the 15% bound)`);
  return { pass: offenders.length === 0, offenders, exemptReason: null };
}

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
  ['Nemish', scoreNemish], // X6: the founder's citation (19% at >= 95) requires Nemish in the measured set
];
const offenders: string[] = [];
const verdicts: GateVerdict[] = [];
for (const [name, fn] of scorers) {
  const vals = universe.map((s) => fn(s).score).filter((v): v is number => typeof v === 'number');
  const r = stats(name, vals);
  const v = evaluateDistributionGate({ name, sd: r.sd, pctLE5: r.pctLE5, pctGE95: r.pctGE95 });
  verdicts.push(v);
  offenders.push(...v.offenders);
}
console.log(`\nX6 gate (sd>=8, <=15% at <=5, <=15% at >=95; Greenblatt low pile allow-listed with the corrected placeholder-seed reason):`);
for (const [name, v] of (scorers.map(([n]) => n)).map((n, i) => [n, verdicts[i]] as const)) {
  if (v.exemptReason) console.log(`  ${name}: ${v.exemptReason}`);
}
console.log(offenders.length === 0 ? '  PASS (no offenders)' : `  NAMED OFFENDERS: ${offenders.join('; ')}`);
