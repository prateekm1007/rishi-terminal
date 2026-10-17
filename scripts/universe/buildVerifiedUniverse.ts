/**
 * Builds data/security-master/universe/ from three inputs, each hashed:
 *   data/security-master/nse_equity_l_2026-10-01.csv  (official NSE list)
 *   data/security-master/populate.sql                 (symbol history)
 *   data/stocks/index.ts                              (product universe)
 * Run: npx tsx --conditions react-server scripts/universe/buildVerifiedUniverse.ts
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { STOCKS } from "../../data/stocks/index";
import {
  classifyUniverse,
  claimableCounts,
  isClaimable,
  type OfficialListingRow,
  type UniverseRow,
} from "../../lib/securityMaster/verifiedUniverse";
import type { SymbolHistoryRow } from "../../lib/db/securityMaster";

const ROOT = process.cwd();
const SM = path.join(ROOT, "data/security-master");
const OUT = path.join(SM, "universe");
const CSV_FILE = "nse_equity_l_2026-10-01.csv";
const OFFICIAL_SOURCE = "nse:equity_l:2026-10-01";

const sha256 = (file: string): string =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** NSE writes listing dates as DD-MMM-YYYY; the artifact uses ISO dates. */
function isoDate(raw: string): string {
  const m = /^(\d{1,2})-([A-Z]{3})-(\d{4})$/.exec(raw.trim().toUpperCase());
  if (!m || !MONTHS[m[2]]) return raw.trim();
  return `${m[3]}-${MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
}

function loadOfficial(): OfficialListingRow[] {
  const [header, ...body] = parseCsv(fs.readFileSync(path.join(SM, CSV_FILE), "utf-8"));
  const col = (name: string): number => {
    const i = header.findIndex((h) => h.trim().toUpperCase() === name);
    if (i < 0) throw new Error(`official CSV has no ${name} column`);
    return i;
  };
  const [cSym, cName, cSeries, cDate, cIsin] = [
    col("SYMBOL"), col("NAME OF COMPANY"), col("SERIES"), col("DATE OF LISTING"), col("ISIN NUMBER"),
  ];
  return body.map((r) => ({
    symbol: r[cSym].trim(),
    name: r[cName].trim(),
    series: r[cSeries].trim(),
    listingDate: isoDate(r[cDate]),
    isin: r[cIsin].trim(),
  }));
}

function loadHistory(): SymbolHistoryRow[] {
  const sql = fs.readFileSync(path.join(SM, "populate.sql"), "utf-8");
  const declared = /-- symbol_history: (\d+) rows/.exec(sql);
  if (!declared) throw new Error("populate.sql does not declare its symbol_history row count");
  const rows: SymbolHistoryRow[] = [];
  const tuple = /\(\s*(NULL|'[^']*')\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(NULL|'[^']*')\s*,\s*(NULL|'[^']*')\s*,\s*'([^']*)'\s*\)/g;
  const unq = (v: string): string | null => (v === "NULL" ? null : v.slice(1, -1));
  for (const m of sql.matchAll(/INSERT INTO public\.symbol_history/g)) {
    const end = sql.indexOf(";", (m.index ?? 0) + m[0].length);
    const block = sql.slice((m.index ?? 0) + m[0].length, end > 0 ? end : undefined);
    for (const t of block.matchAll(tuple)) {
      rows.push({
        isin: unq(t[1]) ?? "",
        exchange: t[2],
        symbol: t[3],
        valid_from: unq(t[4]),
        valid_to: unq(t[5]),
        source: t[6],
      });
    }
  }
  if (rows.length !== Number(declared[1])) {
    throw new Error(`symbol_history parsed ${rows.length} rows, populate.sql declares ${declared[1]}`);
  }
  return rows;
}

function csvEscape(v: string | null): string {
  const s = v ?? "";
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function main(): void {
  const csvPath = path.join(SM, CSV_FILE);
  const csvSha = sha256(csvPath);
  const sources = fs.readFileSync(path.join(SM, "SOURCES.md"), "utf-8");
  if (!sources.includes(csvSha)) {
    throw new Error(`SHA-256 ${csvSha} of ${CSV_FILE} is not recorded in SOURCES.md`);
  }
  const official = loadOfficial();
  const history = loadHistory();
  const products = Object.keys(STOCKS).sort().map((sym) => ({
    symbol: sym,
    name: String((STOCKS as Record<string, { name?: string }>)[sym]?.name ?? ""),
  }));
  const rows: UniverseRow[] = classifyUniverse(
    { products, official, history },
    { officialSource: OFFICIAL_SOURCE },
  ).sort((a, b) => a.productSymbol.localeCompare(b.productSymbol));

  const by: Record<string, number> = {
    VERIFIED_EQ: 0, VERIFIED_OTHER_SERIES: 0, CONFIRMED_RENAME: 0, CANDIDATE_RENAME: 0, UNMATCHED: 0,
  };
  for (const r of rows) by[r.status] += 1;
  const claim = claimableCounts(rows);

  const artifact = {
    schema: "verified-universe/v2",
    policy: {
      decided_by: "founder",
      decided_on: "2026-10-13",
      register: "docs/ROADMAP.md FD-29",
      quotes: ["BE/BZ policy: include with a series label", "Use the verified count"],
      series_policy: "BE and BZ rows are claimed and carry their series label on every row",
      count_policy: "the claim is the verified count; candidate and unmatched rows are never counted",
    },
    sources: {
      official_csv: `data/security-master/${CSV_FILE}`,
      official_csv_sha256: csvSha,
      symbol_history: "data/security-master/populate.sql",
      symbol_history_sha256: sha256(path.join(SM, "populate.sql")),
      product_universe: "data/stocks/index.ts",
      product_universe_sha256: sha256(path.join(ROOT, "data/stocks/index.ts")),
    },
    counts: {
      products: rows.length,
      by_status: by,
      claimable_total: claim.total,
      claimable_eq: claim.eq,
      claimable_other_series: claim.otherSeries,
      claimable_confirmed_renames: claim.confirmedRenames,
      not_claimable: claim.notClaimable,
    },
    rows: rows.map((r) => ({ ...r, claimable: isClaimable(r.status) })),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "verified-universe-2026-10-01.json"), JSON.stringify(artifact, null, 2) + "\n");

  const excluded = rows.filter((r) => r.status === "UNMATCHED" || r.status === "CANDIDATE_RENAME");
  const header = "productSymbol,status,productName,candidateOfficialSymbol,evidenceSource,reason";
  const lines = excluded.map((r) =>
    [r.productSymbol, r.status, r.productName, r.officialSymbol, r.evidenceSource, r.reason]
      .map((v) => csvEscape(v)).join(","),
  );
  fs.writeFileSync(path.join(OUT, "exclusion-log-2026-10-01.csv"), [header, ...lines].join("\n") + "\n");

  console.log(JSON.stringify({ products: rows.length, by_status: by, history_rows: history.length, official_rows: official.length }));
}

main();
