// Short Radar BEFORE-state probe (founder directions 2026-10-06, item 3):
// reproduces the exact live ranking path (computeShortRadar) and dumps
// per-candidate pillar contributions so the structural audit is grounded
// in the real model output, not code reading alone.
//
// Run: npx tsx scripts/shortRadarProbe.ts

import { computeShortRadar, shortFlags } from "@/lib/scoring/rankings";
import { resolveStockMetrics, calculateQvps } from "@/lib/scoring";
import { STOCKS } from "@/data/stocks";

const radar = computeShortRadar(3);
console.log("=== computeShortRadar(3) — the exact dashboard path ===");
for (const c of radar) {
  console.log(
    `${c.symbol}  score=${c.shortScore.toFixed(2)}  flags=${c.flagCount}  reason="${c.reason}"`,
  );
}

console.log("\n=== pillar contributions for each radar candidate ===");
for (const c of radar) {
  const resolved = resolveStockMetrics(c.symbol);
  if (!resolved) continue;
  // Bypass the 5-minute cache so provenance-affecting edits are visible.
  const qvps = calculateQvps(resolved.metrics, "SHORT", false);
  console.log(`\n${c.symbol} (finalScore ${qvps.finalScore.toFixed(2)}, totalWeighted ${qvps.totalWeighted.toFixed(2)}, trendMult ${qvps.trendMultiplier})`);
  for (const p of qvps.pillars) {
    console.log(
      `  ${p.id.padEnd(20)} score=${p.score.toFixed(1).padStart(5)}  weight=${p.weight}  weighted=${p.weighted.toFixed(2)}`,
    );
  }
}

console.log("\n=== structural audit: which SHORT pillar inputs exist in resolved metrics ===");
const sample = resolveStockMetrics(radar[0]?.symbol ?? "RELIANCE");
if (sample) {
  const m = sample.metrics as unknown as Record<string, unknown>;
  const shortInputs = [
    "pe", "pb", "evSales", "pegRatio", "rsi",
    "roe", "fcfMargin", "debtEbitda", "opm", "altmanZScore",
    "promoterPledge", "accountingFlags", "relatedPartyPct",
    "usfdaWarnings", "chinaApiDependence", "dpcoRisk", "patentCliffRisk",
    "debtorDays", "cashConversion", "inventoryDays",
    "shortInterest", "above200DMA",
  ];
  for (const k of shortInputs) {
    console.log(`  ${k.padEnd(20)} = ${m[k] === undefined ? "ABSENT (pillar input dead)" : String(m[k])}`);
  }
}

console.log("\n=== trigger-flag census across the whole seed universe ===");
const flagCounts = new Map<string, number>();
let nWithTwoPlus = 0;
for (const s of Object.values(STOCKS)) {
  const flags = shortFlags(s);
  if (flags.length >= 2) nWithTwoPlus++;
  for (const f of flags) flagCounts.set(f.key, (flagCounts.get(f.key) ?? 0) + 1);
}
for (const [k, v] of [...flagCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(12)} ${v}`);
}
console.log(`  stocks with >=2 flags: ${nWithTwoPlus} / ${Object.keys(STOCKS).length}`);
