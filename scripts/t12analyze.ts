/** T12 analysis: dump normalized-name duplicate groups with their records. */
import { STOCKS } from "../data/stocks";

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]/g, "");
}

const groups: Record<string, Array<{ symbol: string; name: string; sector: string; price: number; mktcap: number; rev: number; pe: number; roe: number; promo: number; bvps: number }>> = {};

for (const s of Object.values(STOCKS) as any[]) {
  const key = normalize(s.name);
  (groups[key] ??= []).push({
    symbol: s.symbol, name: s.name, sector: s.sector,
    price: s.price, mktcap: s.mktcap, rev: s.rev,
    pe: s.pe, roe: s.roe, promo: s.promo, bvps: s.bvps,
  });
}

const dups = Object.entries(groups).filter(([, g]) => g.length > 1);
console.log("duplicate groups:", dups.length);
for (const [, g] of dups) {
  console.log("\n== " + g[0].name);
  for (const e of g) {
    console.log(`  ${e.symbol.padEnd(12)} ${e.sector.padEnd(14)} price=${e.price} mktcap=${e.mktcap} rev=${e.rev} pe=${e.pe} roe=${e.roe} promo=${e.promo} bvps=${e.bvps}`);
  }
}
