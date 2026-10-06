// Round 20 (direction 17): Short Radar latency — pure server-side
// computation, no provider/model calls added. Reports cold and warm
// timings of the exact dashboard path (computeShortRadar(3)).
//
// Run: npx tsx --conditions react-server scripts/shortRadarTiming.ts

import { computeShortRadar } from "@/lib/scoring/rankings";
import { clearScoreCache } from "@/lib/scorers/rishiScoreV2";

function once(label: string): number {
  const t0 = performance.now();
  const out = computeShortRadar(3);
  const t1 = performance.now();
  console.log(`${label}: ${out.map((c) => c.symbol).join(",")} in ${(t1 - t0).toFixed(2)} ms`);
  return t1 - t0;
}

// Cold: clear the QVPS memo cache + fresh resolution each run.
const colds: number[] = [];
for (let i = 0; i < 10; i++) {
  clearScoreCache();
  colds.push(once(`cold  run ${i + 1}`));
}
// Warm: cache intact between runs.
const warms: number[] = [];
for (let i = 0; i < 10; i++) {
  warms.push(once(`warm  run ${i + 1}`));
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`median cold: ${med(colds).toFixed(2)} ms | median warm: ${med(warms).toFixed(2)} ms`);
