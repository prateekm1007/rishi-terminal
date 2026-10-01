/**
 * T12 consolidation: rebuild data/stocks/index.ts with duplicate rows merged.
 *
 * Decisions (per group): the row whose symbol is the currently trading NSE
 * symbol survives; the removed row becomes an alias in
 * lib/registry/tickerAliases.json. When the survivor's fundamentals are
 * template placeholders (mktcap = price*500/1000, rev 50000, pe 28, promo 45,
 * bvps 250 — the seed-generator defaults) and the removed row carries
 * specific values, the specific values are copied field-by-field (0-values
 * are never copied over real numbers).
 *
 * Run: npx tsx scripts/t12consolidate.ts   (writes data/stocks/index.ts)
 */
import * as fs from "fs";
import * as path from "path";
import { STOCKS } from "../data/stocks";
import aliases from "../lib/registry/tickerAliases.json";

type Stock = typeof STOCKS[string];

const aliasMap: Record<string, string> = Object.fromEntries(
  Object.entries(aliases).filter(([k]) => !k.startsWith("$")),
);

// Rows that must not exist in a listed-equities registry:
// - LAKSHVILAS: Lakshmi Vilas Bank merged into DBS Bank India (Nov 2020); delisted.
// - LENTRA (LENTECHNOO): Lentra AI is a PRIVATE company (tracxn/hiive) — no NSE listing.
// - XPRESSBEES: not NSE-listed (no symbol exists); row carried no data.
const REMOVE_ROWS = new Set(["LAKSHVILAS", "LENTECHNOO", "XPRESSBEES"]);

/**
 * Reconstructed fundamentals for real listed companies whose seed rows were
 * all-zero (T12). Sources: public market data (moneycontrol/sharekhan/
 * trendlyne/univest searches, Sep 2026) + company filings; documented in the
 * PR table. Balance-sheet detail not in the sources is derived conservatively
 * (sh = mktcap/price; ocf = np + dep; ca/tl from sector-typical turns) and is
 * flagged for founder review. Data stays labelled seed (SEED_STATUS='placeholder').
 */
const RECONSTRUCTED: Record<string, Partial<Stock>> = {
  PVRINOX: {
    price: 1071, pe: 0, roe: -22, mktcap: 10282, ocf: 1100, rev: 6646,
    revcagr: 22, epscagr: 0, opm: 22, roce: 8, de: 1.6, fcf: -350,
    promo: 27.7, ca: 1900, tl: 8200, sh: 9.6, np: -153, dep: 950,
    capex: 1450, bvps: 400,
  },
  CHEMPLASTS: {
    price: 192, pe: 0, roe: -28, mktcap: 2719, ocf: 300, rev: 4800,
    revcagr: 2, epscagr: -40, opm: 8, roce: 4, de: 1.9, fcf: -80,
    promo: 51.6, ca: 1400, tl: 3600, sh: 14.2, np: -1003, dep: 340,
    capex: 380, bvps: 180,
  },
  STLTECH: {
    price: 119, pe: 62, roe: 10, mktcap: 5473, ocf: 120, rev: 600,
    revcagr: 12, epscagr: -18, opm: 12, roce: 5, de: 0.8, fcf: 30,
    promo: 61.2, ca: 900, tl: 1100, sh: 46, np: 88, dep: 110,
    capex: 90, bvps: 120,
  },
  WEBSOL: {
    price: 885, pe: 41, roe: 14, mktcap: 3170, ocf: 160, rev: 420,
    revcagr: 45, epscagr: 60, opm: 45, roce: 16, de: 0.4, fcf: 60,
    promo: 64.3, ca: 320, tl: 480, sh: 3.58, np: 77, dep: 60,
    capex: 100, bvps: 240,
  },
  NTPCGREEN: {
    price: 115, pe: 85, roe: 5, mktcap: 96600, ocf: 2600, rev: 2400,
    revcagr: 25, epscagr: 18, opm: 60, roce: 6, de: 4.5, fcf: 800,
    promo: 89, ca: 2000, tl: 30000, sh: 840, np: 210, dep: 1900,
    capex: 5000, bvps: 24,
  },
};

function isTemplateField(s: Stock, field: keyof Stock): boolean {
  const v = s[field] as number;
  if (typeof v !== "number") return false;
  switch (field) {
    case "mktcap":
      return v === (s.price as number) * 1000 || v === (s.price as number) * 500;
    case "rev":    return v === 50000;
    case "pe":     return v === 28;
    case "promo":  return v === 45;
    case "bvps":   return v === 250;
    default:       return false;
  }
}

const NUMERIC_FIELDS: Array<keyof Stock> = [
  "price", "pe", "roe", "mktcap", "ocf", "rev", "revcagr", "epscagr",
  "opm", "roce", "de", "fcf", "promo", "ca", "tl", "sh", "np", "dep",
  "capex", "bvps",
];

const stocks: Record<string, Stock> = { ...STOCKS };

// 1. Drop rows that were removed / renamed away
for (const [oldSym, canonical] of Object.entries(aliasMap)) {
  if (stocks[oldSym] && oldSym !== canonical) delete stocks[oldSym];
}
for (const dead of REMOVE_ROWS) delete stocks[dead];

// 2. Field-merge: survivors adopt specific values from their removed donors
//    where the survivor carried template values.
for (const [oldSym, canonical] of Object.entries(aliasMap)) {
  const donor = (STOCKS as Record<string, Stock>)[oldSym];
  const survivor = stocks[canonical];
  if (!donor || !survivor) continue;
  for (const f of NUMERIC_FIELDS) {
    if (!isTemplateField(survivor, f)) continue;
    const dv = donor[f] as number;
    const sv = survivor[f] as number;
    if (typeof dv === "number" && dv !== 0 && dv !== sv && !isTemplateField(donor, f)) {
      (survivor as unknown as Record<string, number>)[f] = dv;
    }
  }
}

// 2b. Reconstruct real-but-empty rows (see RECONSTRUCTED above)
for (const [sym, patch] of Object.entries(RECONSTRUCTED)) {
  const row = stocks[sym];
  if (!row) continue;
  Object.assign(row as unknown as Record<string, unknown>, patch);
}

// 3. Name corrections for rows that are different companies with a wrong
//    name field (T12 "different companies" decision).
if (stocks["DATAMATICS"]) stocks["DATAMATICS"].name = "Datamatics Global Services";

// 4. Serialize deterministically, one entry per line.
function fmtNum(n: number): string {
  return Number.isFinite(n) ? String(n) : "0";
}
const lines: string[] = [
  "import { Stock } from '../../lib/types';",
  "",
  "// Remediation R1: seed data honesty. Every value in STOCKS is a static",
  "// placeholder with NO provable capture date; UI renders SeedDataBanner",
  "// wherever seed-derived numbers appear and never claims an as-of date.",
  "export type SeedStatus = 'placeholder' | 'sourced';",
  "export const SEED_STATUS: SeedStatus = 'placeholder';",
  "export const SEED_CAPTURED_AT: string | null = null;",
  "export const SEED_DISCLAIMER = 'Illustrative sample data \\u2014 not current, not investment advice.';",
  "",
  "// Consolidated seed registry (remediation T12): duplicate/renamed rows were",
  "// merged; old symbols resolve via lib/registry/tickerAliases.json.",
  "export const STOCKS: Record<string, Stock> = {",
];

const keys = Object.keys(stocks).sort();
for (const sym of keys) {
  const s = stocks[sym];
  const fields = [
    `symbol: ${JSON.stringify(s.symbol)}`,
    `name: ${JSON.stringify(s.name)}`,
    `sector: ${JSON.stringify(s.sector)}`,
    `exchange: ${JSON.stringify(s.exchange)}`,
    ...NUMERIC_FIELDS.map(f => `${f}: ${fmtNum(s[f] as number)}`),
  ];
  lines.push(`  ${JSON.stringify(sym)}: { ${fields.join(", ")} },`);
}
lines.push("};");
lines.push("");

const out = path.resolve(__dirname, "..", "data", "stocks", "index.ts");
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`wrote ${out}: ${keys.length} stocks (was ${Object.keys(STOCKS).length}), ${Object.keys(aliasMap).length} aliases, removed ${REMOVE_ROWS.size} dead rows`);
