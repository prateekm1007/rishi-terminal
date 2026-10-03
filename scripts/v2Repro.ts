// V2 reproduction — run the REAL scorers over the FULL universe and print:
//  1. Greenblatt score distribution (mean, sd, min, max, % at <= 5)
//  2. Greenblatt inputs (np, mktcap, derived ROC/EY) for 5 sampled stocks,
//     with the arithmetic shown so the <= 5 result is explainable
//  3. The distribution table for every scorer (the /tmp/dist.ts logic)
//  4. Tension spread + "Sharp Division" share across the universe
import 'server-only';
import { STOCKS } from '../data/stocks/index';
import { runAllScorers } from '../lib/consensus/orchestrator';
import { buildConsensus } from '../lib/consensus/engine';

const stocks = Object.values(STOCKS);
console.log(`universe size: ${stocks.length}`);

// ── 1+3. per-scorer distribution table ──────────────────────────────
type Row = { name: string; n: number; mean: number; sd: number; min: number; p25: number; p50: number; p75: number; max: number; pctLE5: number; pctGE95: number; pctOutside5to95: number; nulls: number };
const table: Row[] = [];
const perStockScores = new Map<string, number[]>(); // symbol -> finite scores

for (const s of stocks) {
  const scores = runAllScorers(s);
  for (const sc of scores) {
    if (!table.find((r) => r.name === sc.name)) {
      table.push({ name: sc.name, n: 0, mean: 0, sd: 0, min: 0, p25: 0, p50: 0, p75: 0, max: 0, pctLE5: 0, pctGE95: 0, pctOutside5to95: 0, nulls: 0 });
    }
  }
  for (const sc of scores) {
    const row = table.find((r) => r.name === sc.name)!;
    if (sc.score === null || !Number.isFinite(sc.score)) { row.nulls += 1; continue; }
    row.n += 1;
    row.mean += sc.score;
    row.min = row.n === 1 ? sc.score : Math.min(row.min, sc.score);
    row.max = Math.max(row.max, sc.score);
    if (!perStockScores.has(s.symbol)) perStockScores.set(s.symbol, []);
    perStockScores.get(s.symbol)!.push(sc.score);
  }
}

for (const row of table) {
  const vals: number[] = [];
  for (const s of stocks) {
    const sc = runAllScorers(s).find((x) => x.name === row.name)!;
    if (sc.score !== null && Number.isFinite(sc.score)) vals.push(sc.score);
  }
  vals.sort((a, b) => a - b);
  const n = vals.length;
  row.mean = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
  row.sd = n > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - row.mean) ** 2, 0) / (n - 1)) : 0;
  row.p25 = n ? vals[Math.floor(0.25 * (n - 1))] : 0;
  row.p50 = n ? vals[Math.floor(0.50 * (n - 1))] : 0;
  row.p75 = n ? vals[Math.floor(0.75 * (n - 1))] : 0;
  row.pctLE5 = n ? (vals.filter((v) => v <= 5).length / n) * 100 : 0;
  row.pctGE95 = n ? (vals.filter((v) => v >= 95).length / n) * 100 : 0;
  row.pctOutside5to95 = n ? (vals.filter((v) => v < 5 || v > 95).length / n) * 100 : 0;
}

console.table(table.map(({ name, n, nulls, mean, sd, min, p25, p50, p75, max, pctLE5, pctGE95, pctOutside5to95 }) => ({
  name, n, nulls, mean: +mean.toFixed(2), sd: +sd.toFixed(2), min, p25, p50, p75, max,
  'pct<=5': +pctLE5.toFixed(1), 'pct>=95': +pctGE95.toFixed(1), 'pct outside 5-95': +pctOutside5to95.toFixed(1),
})));

// ── 2. Greenblatt inputs for 5 sampled stocks ───────────────────────
console.log('\n── Greenblatt inputs for 5 stocks (deterministic sample: first, last, +3 spread across mktcap) ──');
const sorted = [...stocks].sort((a, b) => b.mktcap - a.mktcap);
const sample = [stocks[0], stocks[Math.floor(stocks.length / 4)], sorted[0], stocks[Math.floor(stocks.length / 2)], stocks[stocks.length - 1]];
const seen = new Set<string>();
for (const s of sample) {
  if (seen.has(s.symbol)) continue;
  seen.add(s.symbol);
  const rocCap = s.mktcap > 0 ? s.mktcap * 0.6 : 0;
  const roc = s.np / rocCap * 100;
  const ey = s.np / s.mktcap * 100;
  const rocS = Math.min(100, roc >= 25 ? 100 : roc * 4);
  const eyS = Math.min(100, ey >= 10 ? 100 : ey * 10);
  const total = rocS * 0.5 + eyS * 0.5;
  const g = runAllScorers(s).find((x) => x.name === 'Greenblatt')!;
  console.log(
    `${s.symbol.padEnd(12)} np=${String(s.np).padStart(8)} mktcap=${String(s.mktcap).padStart(10)}` +
    ` | ROC = np/(0.6*mktcap) = ${roc.toFixed(3)}% -> rocS=${rocS.toFixed(1)}` +
    ` | EY = np/mktcap = ${ey.toFixed(3)}% -> eyS=${eyS.toFixed(1)}` +
    ` | engine total=${total.toFixed(1)} | scorer.score=${g.score} | comps=[${g.comps.map((c) => `${c.label}=${c.v}`).join(', ')}]`
  );
}

// ── 4. tension spread / Sharp Division ──────────────────────────────
let spreadGE90 = 0; let spreadGE80 = 0; let counted = 0; let insufficient = 0;
const spreadHist: Record<string, number> = { '<20 Strong Consensus': 0, '20-39 Mild': 0, '40-59 Moderate': 0, '60-79 Significant': 0, '>=80 Sharp Division': 0 };
for (const s of stocks) {
  const c = buildConsensus(s);
  if (c.consensus === null) { insufficient += 1; continue; }
  counted += 1;
  const sp = c.tensionSpread;
  if (sp >= 90) spreadGE90 += 1;
  if (sp >= 80) spreadGE80 += 1;
  if (sp < 20) spreadHist['<20 Strong Consensus'] += 1;
  else if (sp < 40) spreadHist['20-39 Mild'] += 1;
  else if (sp < 60) spreadHist['40-59 Moderate'] += 1;
  else if (sp < 80) spreadHist['60-79 Significant'] += 1;
  else spreadHist['>=80 Sharp Division'] += 1;
}
console.log(`\nuniverse=${stocks.length} scored=${counted} insufficient=${insufficient}`);
console.log(`spread >= 80 (Sharp Division+): ${(spreadGE80 / counted * 100).toFixed(1)}%`);
console.log(`spread >= 90:                   ${(spreadGE90 / counted * 100).toFixed(1)}%`);
for (const [k, v] of Object.entries(spreadHist)) console.log(`  ${k.padEnd(24)} ${v} (${(v / counted * 100).toFixed(1)}%)`);
