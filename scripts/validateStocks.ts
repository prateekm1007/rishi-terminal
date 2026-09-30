// VALIDATE_STOCKS_V2 (remediation T12)
//
// CI gate for ticker/data integrity. Fails (exit 1) on:
//   - duplicate symbols
//   - duplicate normalized company names not covered by the alias map
//   - non-finite numeric fields
//   - price <= 0
//   - all-zero fundamentals (dead/placeholder records)
//   - |ROE| > 150 (NESTLEIND ROE=110 is verified-real and whitelisted)
//   - missing SEED_AS_OF
//
// Run: npx tsx scripts/validateStocks.ts

import { STOCKS, SEED_AS_OF } from "../data/stocks";
import {
  buildTickerRegistry,
  registryHealthScore,
  TICKER_ALIASES,
  normalizeTicker,
  resolveTickerSymbol,
} from "../lib/registry/tickerRegistry";

let failures = 0;
const problems: string[] = [];
const warn = (msg: string) => console.log("  WARN  " + msg);
const fail = (msg: string) => {
  failures++;
  problems.push(msg);
  console.log("  FAIL  " + msg);
};

console.log("\nRishi Registry Validation (T12 gates)");
console.log("=".repeat(50));

const registry = buildTickerRegistry();
const total = registry.length;
const valid = registry.filter(r => r.valid).length;

console.log(`Total stocks:   ${total}`);
console.log(`Valid:          ${valid}`);
console.log(`Health score:   ${registryHealthScore()}%`);

// ── 1. Missing asOf ────────────────────────────────────────────
console.log("\n[1] Seed snapshot date (asOf)");
if (!SEED_AS_OF || !/^\d{4}-\d{2}-\d{2}$/.test(SEED_AS_OF)) {
  fail("SEED_AS_OF missing or not an ISO date in data/stocks/index.ts");
} else {
  console.log(`  OK    SEED_AS_OF = ${SEED_AS_OF}`);
}

// ── 2. Duplicate symbols ──────────────────────────────────────
console.log("\n[2] Duplicate symbols");
const symbols = Object.keys(STOCKS);
const dupSymbols = symbols.filter((s, i) => symbols.indexOf(s) !== i);
if (dupSymbols.length > 0) {
  fail(`duplicate symbols: ${dupSymbols.slice(0, 10).join(", ")}`);
} else {
  console.log("  OK    none");
}

// ── 3. Duplicate normalized names not covered by the alias map ─
console.log("\n[3] Duplicate normalized company names");
{
  const byName = new Map<string, string[]>();
  for (const [sym, s] of Object.entries(STOCKS)) {
    const key = normalizeTicker(s.name);
    const list = byName.get(key) ?? [];
    list.push(sym);
    byName.set(key, list);
  }
  const dupGroups = [...byName.entries()].filter(([, g]) => g.length > 1);
  for (const [nameKey, group] of dupGroups) {
    // A group is acceptable when all members are aliases of one canonical row
    const resolved = new Set(group.map(sym => resolveTickerSymbol(sym)));
    if (resolved.size > 1) {
      fail(`unresolved duplicate name group [${nameKey}]: ${group.join(", ")}`);
    } else {
      warn(`name group shares a canonical symbol via aliases: ${group.join(", ")}`);
    }
  }
  if (dupGroups.length === 0) console.log("  OK    none");
}

// ── 4. Numeric sanity ─────────────────────────────────────────
console.log("\n[4] Numeric fields (finite, price > 0)");
const NUMERIC_FIELDS = [
  "price", "pe", "roe", "mktcap", "ocf", "rev", "revcagr", "epscagr",
  "opm", "roce", "de", "fcf", "promo", "ca", "tl", "sh", "np", "dep",
  "capex", "bvps",
] as const;
let nonFiniteCount = 0;
let badPriceCount = 0;
let allZeroCount = 0;
let highRoeCount = 0;
const ROE_WHITELIST: Record<string, number> = {
  // NESTLEIND ROE=110 verified against screener.in (high ROE from small
  // equity base + treasury operations) — explicitly whitelisted, T12.
  NESTLEIND: 110,
};
for (const [sym, s] of Object.entries(STOCKS)) {
  for (const f of NUMERIC_FIELDS) {
    const v = s[f] as number;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      if (nonFiniteCount < 10) fail(`${sym}.${f} is not finite: ${String(v)}`);
      nonFiniteCount++;
    }
  }
  if (!(s.price > 0) && badPriceCount < 10) {
    fail(`${sym}.price must be > 0, got ${s.price}`);
    badPriceCount++;
  } else if (!(s.price > 0)) {
    badPriceCount++;
  }
  // all-zero fundamentals = dead ticker (T11/T12)
  const zeroFund = ["rev", "ocf", "fcf", "bvps", "roce", "promo"] as const;
  if (zeroFund.every(k => (s[k] as number) === 0)) {
    if (allZeroCount < 10) fail(`${sym}: all-zero fundamentals (dead/placeholder ticker)`);
    allZeroCount++;
  }
  const roe = Math.abs(s.roe);
  if (roe > 150 && ROE_WHITELIST[sym] !== s.roe) {
    if (highRoeCount < 10) fail(`${sym}: |ROE|=${roe} > 150 and not whitelisted`);
    highRoeCount++;
  }
}
if (nonFiniteCount === 0) console.log("  OK    all numeric fields finite");
if (badPriceCount === 0) console.log("  OK    all prices > 0");
if (allZeroCount === 0) console.log("  OK    no all-zero fundamental records");
if (highRoeCount === 0) console.log("  OK    |ROE| within 150 (whitelisted: " + Object.keys(ROE_WHITELIST).join(", ") + ")");

// ── 5. Alias map integrity ────────────────────────────────────
console.log("\n[5] Alias map");
{
  let aliasIssues = 0;
  for (const [oldSym, canonical] of Object.entries(TICKER_ALIASES)) {
    if (!STOCKS[canonical]) {
      fail(`alias ${oldSym} -> ${canonical}: canonical symbol missing from registry`);
      aliasIssues++;
    }
    if (STOCKS[oldSym]) {
      fail(`alias ${oldSym} -> ${canonical}: old symbol still present as its own row`);
      aliasIssues++;
    }
  }
  if (aliasIssues === 0) {
    console.log(`  OK    ${Object.keys(TICKER_ALIASES).length} aliases all resolve, none shadow live rows`);
  }
}

console.log("\nSector summary:");
const sectors = new Map<string, number>();
for (const stock of Object.values(STOCKS)) {
  const s = stock.sector || "Unknown";
  sectors.set(s, (sectors.get(s) || 0) + 1);
}
Array.from(sectors.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([s, c]) => console.log(`  ${s}: ${c}`));

if (failures > 0) {
  console.log(`\nValidation FAILED with ${failures} problem(s).`);
  process.exit(1);
}
console.log("\nValidation complete — all T12 gates passed.");
