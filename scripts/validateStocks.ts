// VALIDATE_STOCKS_V1

import { STOCKS } from "../data/stocks";
import {
  buildTickerRegistry,
  registryHealthScore,
} from "../lib/registry/tickerRegistry";

console.log("\nRishi Registry Validation");
console.log("=".repeat(50));

const registry = buildTickerRegistry();

const total = registry.length;
const valid = registry.filter(r => r.valid).length;
const invalid = registry.filter(r => !r.valid).length;

console.log(`Total stocks:   ${total}`);
console.log(`Valid:          ${valid}`);
console.log(`Invalid:        ${invalid}`);
console.log(`Health score:   ${registryHealthScore()}%`);

const warnings = registry.flatMap(r =>
  r.issues.filter(i => i.severity === "warning")
);

const errors = registry.flatMap(r =>
  r.issues.filter(i => i.severity === "error")
);

console.log(`Warnings:       ${warnings.length}`);
console.log(`Errors:         ${errors.length}`);

if (errors.length > 0) {
  console.log("\nERRORS:");
  for (const e of errors.slice(0, 20)) {
    console.log(`  ${e.symbol}: ${e.reason}`);
  }
}

if (warnings.length > 0) {
  console.log("\nWARNINGS:");
  for (const w of warnings.slice(0, 20)) {
    console.log(`  ${w.symbol}: ${w.reason}`);
  }
}

const sectors = new Map<string, number>();

for (const stock of Object.values(STOCKS)) {
  const s = stock.sector || "Unknown";
  sectors.set(s, (sectors.get(s) || 0) + 1);
}

console.log("\nTop sectors:");

Array.from(sectors.entries())
  .sort((a,b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([s,c]) => {
    console.log(`  ${s}: ${c}`);
  });

console.log("\nValidation complete.");