// A1 helper: list the gzip size of every script tag the stock page
// actually loads (same measurement as scripts/bundleBudget.ts, but
// per-chunk, to find split targets).
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const html = readFileSync(".next/server/app/stock/SBIN.html", "utf8");
const srcs = [
  ...new Set(
    [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+?\.js)"/g)].map(m => m[1]),
  ),
];
let total = 0;
const rows = [];
for (const src of srcs) {
  const p = join(".next/static", src.split("/_next/static/")[1]);
  const kb = gzipSync(readFileSync(p)).length / 1024;
  total += kb;
  rows.push([kb, src.split("/").pop()]);
}
rows.sort((a, b) => b[0] - a[0]);
for (const [kb, name] of rows) console.log(`${kb.toFixed(1).padStart(8)} kB  ${name}`);
console.log(`${total.toFixed(1).padStart(8)} kB  TOTAL (${srcs.length} scripts)`);
