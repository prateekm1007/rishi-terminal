/**
 * populateSecurityMasterImpl — D1-02 population generator.
 *
 * Reads the newest official NSE listing snapshot in data/security-master/,
 * lib/registry/tickerAliases.json and the seed dataset (symbols + names
 * only — never the placeholder numerics), and emits
 * data/security-master/populate.sql: idempotent upserts for securities,
 * symbol_history and universe.
 *
 * The generator NEVER guesses an ISIN. A seed symbol resolves to an ISIN by
 * (1) verbatim symbol match in the official listing, or (2) a deterministic
 * name-containment rule (exactly one official company whose name contains
 * the seed company's name after normalization). Everything else becomes a
 * universe row with isin NULL and data_quality='UNRESOLVED' + reason.
 *
 * Deterministic: same inputs → byte-identical SQL (no timestamps in the
 * output; input filenames + SHA-256s are stamped in the header).
 *
 * Run via the entry shim (needs --conditions react-server for the
 * server-only seed import):
 *   npx tsx scripts/populateSecurityMaster.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { STOCKS } from "../data/stocks";
import { agreesEnough, nameTokens, parseNameOverrides, type NameOverrideEntry } from "../lib/db/nameAgreement";

const SEC_DIR = path.resolve(__dirname, "../data/security-master");
const OUT = path.join(SEC_DIR, "populate.sql");
const ALIASES_PATH = path.resolve(__dirname, "../lib/registry/tickerAliases.json");
const OVERRIDES_PATH = path.join(SEC_DIR, "name_overrides.json");

// ── input: newest official listing snapshot ─────────────────────────────
function newestCsv(): string {
  const files = fs
    .readdirSync(SEC_DIR)
    .filter((f) => /^nse_equity_l_\d{4}-\d{2}-\d{2}\.csv$/.test(f))
    .sort();
  if (!files.length) throw new Error("no nse_equity_l_*.csv snapshot in data/security-master/");
  return files[files.length - 1];
}

const csvName = newestCsv();
const csvPath = path.join(SEC_DIR, csvName);
const snapshotTag = csvName.match(/\d{4}-\d{2}-\d{2}/)![0];
const csvSha = createHash("sha256").update(fs.readFileSync(csvPath)).digest("hex");

interface ListingRow {
  symbol: string;
  name: string;
  series: string;
  listedOn: string | null; // ISO date
  isin: string;
}

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function parseListing(): ListingRow[] {
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].split(",").map((h) => h.trim());
  const expect = ["SYMBOL", "NAME OF COMPANY", "SERIES", "DATE OF LISTING", "PAID UP VALUE", "MARKET LOT", "ISIN NUMBER", "FACE VALUE"];
  if (JSON.stringify(header) !== JSON.stringify(expect)) {
    throw new Error(`unexpected CSV header: ${lines[0]}`);
  }
  const rows: ListingRow[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (f.length !== 8) throw new Error(`malformed CSV row (${f.length} fields): ${line.slice(0, 80)}`);
    const m = f[3].trim().match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
    if (!m || !MONTHS[m[2]]) throw new Error(`unparseable DATE OF LISTING '${f[3]}' for ${f[0]}`);
    rows.push({
      symbol: f[0].trim(),
      name: f[1].trim(),
      series: f[2].trim(),
      listedOn: `${m[3]}-${MONTHS[m[2]]}-${m[1]}`,
      isin: f[6].trim(),
    });
  }
  return rows;
}

// ── input: registry aliases + seed dataset ──────────────────────────────
type AliasMap = Record<string, string>;
const aliases: AliasMap = Object.fromEntries(
  Object.entries(JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8")) as AliasMap)
    .filter(([k]) => !k.startsWith("$")),
);
const aliasesSha = createHash("sha256").update(fs.readFileSync(ALIASES_PATH)).digest("hex");

const seedSymbols = Object.keys(STOCKS);
const seedName: Record<string, string> = Object.fromEntries(
  seedSymbols.map((s) => [s, STOCKS[s].name]),
);

function resolveAliasChain(sym: string, maxHops = 5): string {
  const seen = new Set<string>();
  let cur = sym;
  while (aliases[cur] && !seen.has(aliases[cur]) && maxHops-- > 0) {
    seen.add(cur);
    cur = aliases[cur];
  }
  return cur;
}

// ── input: curated name-agreement review decisions (audit round 4, Q3) ──
// Optional file: when absent, EVERY name disagreement is unreviewed and
// becomes a NAME_MISMATCH (the gate fails closed by default).
let reviewedOverrides = new Map<string, NameOverrideEntry>();
let overridesSha = "absent";
if (fs.existsSync(OVERRIDES_PATH)) {
  const parsed = parseNameOverrides(JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")));
  reviewedOverrides = new Map(parsed.entries.map((e) => [e.symbol, e]));
  overridesSha = createHash("sha256").update(fs.readFileSync(OVERRIDES_PATH)).digest("hex");
}

// ── normalization for the name rule: shared gate in lib/db/nameAgreement ──
// (nameTokens/agreesEnough live there so the validator, CI tooling and
// tests exercise the exact same rule — one source of truth.)

// ── resolution ──────────────────────────────────────────────────────────
const listing = parseListing();
const bySymbol = new Map(listing.map((r) => [r.symbol, r]));
const byIsin = new Map(listing.map((r) => [r.isin, r]));
if (bySymbol.size !== listing.length) throw new Error("duplicate SYMBOL in official listing");
if (byIsin.size !== listing.length) throw new Error("duplicate ISIN in official listing");

interface SeedOutcome {
  symbol: string;
  isin: string | null;
  liveSymbol?: string;
  rule: "direct" | "direct-reviewed" | "name" | "mismatch" | "unresolved";
  reason: string;
}

const outcomes: SeedOutcome[] = [];

for (const sym of seedSymbols) {
  // (1) direct — counts ONLY if the names agree enough or a curated,
  //     sourced review entry in name_overrides.json accepts it (Q3 gate).
  //     Symbol equality alone has bound seed data to the wrong companies
  //     (e.g. seed "Power Mech" on symbol POWERINDIA = Hitachi Energy India).
  const direct = bySymbol.get(sym);
  if (direct) {
    const agreement = agreesEnough(seedName[sym], direct.name);
    if (agreement.ok) {
      outcomes.push({ symbol: sym, isin: direct.isin, liveSymbol: direct.symbol, rule: "direct", reason: "" });
      continue;
    }
    const reviewed = reviewedOverrides.get(sym);
    if (
      reviewed &&
      reviewed.action !== "REMOVE_SEED_RECORD" &&
      reviewed.officialName === direct.name
    ) {
      outcomes.push({
        symbol: sym,
        isin: direct.isin,
        liveSymbol: direct.symbol,
        rule: "direct-reviewed",
        reason: `direct match, reviewed name disagreement (${reviewed.verdict}): seed "${seedName[sym]}" vs official "${direct.name}" — ${reviewed.basis} (sources: ${reviewed.sources.join("; ")})`,
      });
      continue;
    }
    outcomes.push({
      symbol: sym,
      isin: null,
      rule: "mismatch",
      reason: `NAME_MISMATCH: seed binds "${seedName[sym]}" to symbol ${sym}, but the official listing ${snapshotTag} maps it to "${direct.name}" — unreviewed name disagreement (audit round 4, Q3 gate; curated entries live in data/security-master/name_overrides.json)`,
    });
    continue;
  }
  // (2) name containment against every official row — unique match required
  const seedToks = nameTokens(seedName[sym]);
  const candidates = seedToks.size
    ? listing.filter((r) => {
        const live = nameTokens(r.name);
        for (const t of seedToks) if (!live.has(t)) return false;
        return true;
      })
    : [];
  if (candidates.length === 1) {
    const c = candidates[0];
    outcomes.push({
      symbol: sym,
      isin: c.isin,
      liveSymbol: c.symbol,
      rule: "name",
      reason: `name-resolved: seed "${sym}" / "${seedName[sym]}" -> ${c.symbol} "${c.name}" (${snapshotTag})`,
    });
  } else if (candidates.length > 1) {
    outcomes.push({
      symbol: sym,
      isin: null,
      rule: "unresolved",
      reason: `ambiguous name match (${candidates.length} official companies contain "${seedName[sym]}"): ${candidates.map((c) => `${c.symbol} "${c.name}"`).join("; ")}`,
    });
  } else {
    outcomes.push({
      symbol: sym,
      isin: null,
      rule: "unresolved",
      reason: `not in NSE listing ${snapshotTag} by symbol or name (delisted, renamed with a name change, or not a real listing)`,
    });
  }
}

// ── symbol_history assembly ─────────────────────────────────────────────
interface SymHist {
  isin: string;
  exchange: string;
  symbol: string;
  validFrom: string | null;
  validTo: string | null;
  source: string;
}

const hist = new Map<string, SymHist>();
const superseded: string[] = []; // symbol reuse: variant row skipped, official listing owns the live symbol
const conflicts: string[] = [];

function addHist(row: SymHist, official: boolean) {
  const existing = hist.get(row.symbol);
  if (existing) {
    if (existing.isin !== row.isin) {
      if (official) {
        // the official listing is the authority for the CURRENT symbol:
        // a seed/registry variant recorded earlier for a different ISIN is
        // symbol reuse — keep the official row, drop the variant.
        hist.set(row.symbol, row);
        superseded.push(`${row.symbol}: variant ${existing.source} (${existing.isin}) superseded by official ${row.isin}`);
      } else if ((hist.get(row.symbol)?.source ?? "").startsWith("nse:")) {
        // official row already owns this symbol — skip the variant, report it
        superseded.push(`${row.symbol}: variant ${row.source} (${row.isin}) skipped — official listing maps the symbol to ${existing.isin}`);
      } else {
        conflicts.push(`${row.symbol}: ${existing.source}/${existing.isin} vs ${row.source}/${row.isin}`);
      }
    }
    return;
  }
  hist.set(row.symbol, row);
}

for (const r of listing) {
  addHist({ isin: r.isin, exchange: "NSE", symbol: r.symbol, validFrom: r.listedOn, validTo: null, source: `nse:equity_l:${snapshotTag}` }, true);
}
for (const o of outcomes) {
  if (!o.isin || o.rule === "direct") continue; // direct: live row already covers the symbol
  addHist({ isin: o.isin, exchange: "NSE", symbol: o.symbol, validFrom: null, validTo: null, source: `seed:placeholder:${snapshotTag}` }, false);
}
// registry alias keys: old user-input symbols -> canonical seed symbol -> ISIN
let aliasMapped = 0;
let aliasPending = 0;
let aliasSuperseded = 0;
for (const old of Object.keys(aliases)) {
  const endpoint = resolveAliasChain(old);
  const outcome = outcomes.find((o) => o.symbol === endpoint);
  if (outcome?.isin) {
    addHist({ isin: outcome.isin, exchange: "NSE", symbol: old, validFrom: null, validTo: null, source: "tickerAliases:T12:2026-09-30" }, false);
    const after = hist.get(old);
    if (after && after.isin === outcome.isin) aliasMapped++; // recorded (own row or an existing row with the same ISIN)
    else aliasSuperseded++;
  } else {
    aliasPending++; // endpoint is an UNRESOLVED seed symbol — accounted in universe, not an orphan
  }
}
if (conflicts.length) {
  throw new Error(`symbol conflicts between sources (resolve manually):\n  ${conflicts.join("\n  ")}`);
}

// ── universe assembly ───────────────────────────────────────
interface UniRow { isin: string | null; symbol: string; quality: string; reason: string; }
const uni: UniRow[] = [];
for (const r of listing) {
  uni.push({
    isin: r.isin,
    symbol: r.symbol,
    quality: "PENDING_DATA",
    reason: `official listing ${snapshotTag}; awaiting D1-04/D1-05 ingestion and D1-07/D1-08 validation (D1-09 grants OK)`,
  });
}
for (const o of outcomes) {
  if (o.isin) continue;
  if (o.rule === "mismatch") {
    // (isin, symbol) row downgraded from PENDING_DATA to NAME_MISMATCH:
    // the symbol exists officially, but the seed record that references it
    // names a different company — the seed binding is suspect until a
    // curated, sourced review entry accepts or removes it (Q3).
    uni.push({ isin: bySymbol.get(o.symbol)!.isin, symbol: o.symbol, quality: "NAME_MISMATCH", reason: o.reason });
    continue;
  }
  uni.push({ isin: null, symbol: o.symbol, quality: "UNRESOLVED", reason: o.reason });
}

// ── SQL emission ───────────────────────────────────────────────────────
const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const chunks: string[] = [];

chunks.push(`-- GENERATED by scripts/populateSecurityMasterImpl.ts — DO NOT HAND-EDIT.
-- Inputs:
--   ${csvName}  (sha256 ${csvSha})
--   lib/registry/tickerAliases.json  (sha256 ${aliasesSha})
--   data/security-master/name_overrides.json  (sha256 ${overridesSha})
--   data/stocks/index.ts  (seed symbols + names; ${seedSymbols.length} records; numerics never read)
-- Resolution report: direct=${outcomes.filter((o) => o.rule === "direct").length}
--   direct-reviewed=${outcomes.filter((o) => o.rule === "direct-reviewed").length}
--   name-resolved=${outcomes.filter((o) => o.rule === "name").length}
--   NAME_MISMATCH (unreviewed disagreements)=${outcomes.filter((o) => o.rule === "mismatch").length}
--   unresolved=${outcomes.filter((o) => o.rule === "unresolved").length}
--   registry aliases mapped=${aliasMapped}, pending (endpoint unresolved)=${aliasPending}
-- Idempotent: safe to re-run (upserts + DO NOTHING on duplicate active symbols).
BEGIN;

`);

// securities
const secs = [...new Map(listing.map((r) => [r.isin, r])).values()].sort((a, b) => a.isin.localeCompare(b.isin));
chunks.push(`-- securities: ${secs.length} rows (one per ISIN in the official listing)\n`);
for (let i = 0; i < secs.length; i += 200) {
  const vals = secs.slice(i, i + 200).map(
    (r) => `(${q(r.isin)}, ${q(r.name)}, 'NSE', NULL, ${r.listedOn ? q(r.listedOn) : "NULL"}, NULL, 'ACTIVE', ${q(`nse:equity_l:${snapshotTag}`)})`,
  );
  chunks.push(
    `INSERT INTO public.securities (isin, name, exchange_primary, sector, listed_on, delisted_on, status, source) VALUES\n  ${vals.join(",\n  ")}\nON CONFLICT (isin) DO UPDATE SET name = EXCLUDED.name, exchange_primary = EXCLUDED.exchange_primary, listed_on = EXCLUDED.listed_on, status = EXCLUDED.status, source = EXCLUDED.source;\n`,
  );
}

// symbol_history
const histRows = [...hist.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
chunks.push(`\n-- symbol_history: ${histRows.length} rows (${listing.length} official + ${histRows.length - listing.length} seed/registry variants)\n`);
for (let i = 0; i < histRows.length; i += 200) {
  const vals = histRows.slice(i, i + 200).map(
    (h) => `(${q(h.isin)}, ${q(h.exchange)}, ${q(h.symbol)}, ${h.validFrom ? q(h.validFrom) : "NULL"}, ${h.validTo ? q(h.validTo) : "NULL"}, ${q(h.source)})`,
  );
  chunks.push(
    `INSERT INTO public.symbol_history (isin, exchange, symbol, valid_from, valid_to, source) VALUES\n  ${vals.join(",\n  ")}\nON CONFLICT (exchange, symbol) WHERE valid_to IS NULL DO UPDATE SET isin = EXCLUDED.isin, valid_from = EXCLUDED.valid_from, source = EXCLUDED.source;\n`,
  );
}

// universe — listing rows
const uniListing = uni.filter((u) => u.isin && u.quality === "PENDING_DATA").sort((a, b) => a.isin!.localeCompare(b.isin!));
chunks.push(`\n-- universe (official listings → PENDING_DATA): ${uniListing.length} rows\n`);
for (let i = 0; i < uniListing.length; i += 200) {
  const vals = uniListing.slice(i, i + 200).map(
    (u) => `(${q(u.isin!)}, ${q(u.symbol)}, 'PENDING_DATA', ${q(u.reason)})`,
  );
  chunks.push(
    `INSERT INTO public.universe (isin, symbol, data_quality, reason) VALUES\n  ${vals.join(",\n  ")}\nON CONFLICT (isin, symbol) DO UPDATE SET reason = EXCLUDED.reason, updated_at = now()\n  WHERE public.universe.data_quality NOT IN ('OK', 'QUARANTINED');\n`,
  );
}

// universe — reviewed/unreviewed NAME_MISMATCH rows: the seed record that
// references this symbol names a different company. Reviewed mismatches are
// filtered out before this point (rule direct-reviewed); what lands here is
// UNREVIEWED and must stay visible until someone curates an entry in
// name_overrides.json (Q3). Downgrades PENDING_DATA → NAME_MISMATCH; never
// touches OK/QUARANTINED rows.
const uniMismatch = uni.filter((u) => u.isin && u.quality === "NAME_MISMATCH").sort((a, b) => a.symbol.localeCompare(b.symbol));
chunks.push(`\n-- universe (unreviewed seed-name disagreements → NAME_MISMATCH): ${uniMismatch.length} rows\n`);
for (let i = 0; i < uniMismatch.length; i += 200) {
  const vals = uniMismatch.slice(i, i + 200).map(
    (u) => `(${q(u.isin!)}, ${q(u.symbol)}, 'NAME_MISMATCH', ${q(u.reason)})`,
  );
  chunks.push(
    `INSERT INTO public.universe (isin, symbol, data_quality, reason) VALUES\n  ${vals.join(",\n  ")}\nON CONFLICT (isin, symbol) DO UPDATE SET data_quality = 'NAME_MISMATCH', reason = EXCLUDED.reason, updated_at = now()\n  WHERE public.universe.data_quality NOT IN ('OK', 'QUARANTINED');\n`,
  );
}

// universe — unresolved seed symbols; and clear UNRESOLVED rows that now resolve
const uniUnres = uni.filter((u) => !u.isin).sort((a, b) => a.symbol.localeCompare(b.symbol));
const nowResolved = outcomes.filter((o) => o.isin).map((o) => o.symbol);
chunks.push(`\n-- seed symbols that now resolve: drop any stale UNRESOLVED rows (${nowResolved.length})\n`);
if (nowResolved.length) {
  chunks.push(`DELETE FROM public.universe WHERE isin IS NULL AND symbol IN (${nowResolved.map(q).join(", ")});\n`);
}
chunks.push(`\n-- universe (unresolved seed symbols): ${uniUnres.length} rows\n`);
for (let i = 0; i < uniUnres.length; i += 200) {
  const vals = uniUnres.slice(i, i + 200).map(
    (u) => `(NULL, ${q(u.symbol)}, 'UNRESOLVED', ${q(u.reason)})`,
  );
  chunks.push(
    `INSERT INTO public.universe (isin, symbol, data_quality, reason) VALUES\n  ${vals.join(",\n  ")}\nON CONFLICT (isin, symbol) DO UPDATE SET reason = EXCLUDED.reason, updated_at = now();\n`,
  );
}

// self-verifying coverage assertion: every seed symbol is mapped to an ISIN
// (active symbol_history row) or recorded UNRESOLVED in universe. This runs
// wherever populate.sql runs (CI migrations job, live database) — the D1-02
// acceptance invariant, baked into the artifact so it cannot be skipped.
// The same block is emitted standalone to seed_coverage_check.sql so it can
// be re-run at any time against an already-populated database.
const seedArr = seedSymbols.slice().sort().map(q).join(", ");
const coverageBlock = `
-- D1-02 coverage assertion: every one of the ${seedSymbols.length} seed symbols is
-- mapped to an ISIN (active symbol_history row) or recorded UNRESOLVED or
-- flagged NAME_MISMATCH (unreviewed seed-name disagreement — Q3 gate).
-- GENERATED by scripts/populateSecurityMasterImpl.ts — do not hand-edit.
DO $$
DECLARE
  missing text;
  seed_symbols text[] := ARRAY[${seedArr}];
BEGIN
  FOREACH missing IN ARRAY seed_symbols LOOP
    IF NOT EXISTS (
        SELECT 1 FROM public.symbol_history sh
        WHERE sh.symbol = missing AND sh.valid_to IS NULL
      )
    AND NOT EXISTS (
        SELECT 1 FROM public.universe u
        WHERE u.symbol = missing AND u.isin IS NULL AND u.data_quality = 'UNRESOLVED'
      )
    AND NOT EXISTS (
        SELECT 1 FROM public.universe u
        WHERE u.symbol = missing AND u.data_quality = 'NAME_MISMATCH'
      ) THEN
      RAISE EXCEPTION 'D1-02 coverage FAILED: seed symbol % is neither mapped to an ISIN, nor recorded UNRESOLVED, nor flagged NAME_MISMATCH', missing;
    END IF;
  END LOOP;
END
$$;
`;
chunks.push(coverageBlock);
chunks.push(`\nCOMMIT;\n`);
fs.writeFileSync(path.join(SEC_DIR, "seed_coverage_check.sql"), coverageBlock + "\n");

fs.writeFileSync(OUT, chunks.join(""));

// ── report ─────────────────────────────────────────────────────────────
const direct = outcomes.filter((o) => o.rule === "direct").length;
const directReviewed = outcomes.filter((o) => o.rule === "direct-reviewed").length;
const mismatches = outcomes.filter((o) => o.rule === "mismatch");
const named = outcomes.filter((o) => o.rule === "name").length;
const unres = outcomes.filter((o) => o.rule === "unresolved").length;
console.log(`populate.sql written: ${OUT}`);
console.log(`  official listing rows : ${listing.length} (series EQ/BE/BZ; ISINs unique)`);
console.log(`  securities            : ${secs.length}`);
console.log(`  symbol_history        : ${histRows.length} (${listing.length} official, ${histRows.length - listing.length} seed/registry)`);
console.log(`  universe              : ${uniListing.length} PENDING_DATA + ${uniMismatch.length} NAME_MISMATCH + ${uniUnres.length} UNRESOLVED`);
console.log(`  seed coverage         : ${seedSymbols.length} keys → ${direct} direct + ${directReviewed} direct-reviewed + ${named} name-resolved + ${mismatches.length} NAME_MISMATCH + ${unres} unresolved`);
console.log(`  registry aliases      : ${Object.keys(aliases).length} → ${aliasMapped} mapped, ${aliasPending} pending (endpoint unresolved), ${aliasSuperseded} superseded (symbol reuse)`);
if (superseded.length) {
  console.log(`\n  SYMBOL REUSE (official listing owns the live symbol; variant rows skipped):`);
  for (const s of superseded) console.log(`    ${s}`);
}
if (mismatches.length) {
  console.log(`\n  NAME_MISMATCH — unreviewed seed-name disagreements (${mismatches.length}):`);
  for (const o of mismatches) console.log(`    ${o.symbol.padEnd(16)} ${o.reason.slice(0, 130)}`);
  console.log(`\n  GATE: these symbols are NOT bound to an ISIN by the seed. Curate each one in`);
  console.log(`  data/security-master/name_overrides.json (with sources) or remove/fix the seed`);
  console.log(`  record, then regenerate. The CI invariant D1-02.7 and the validator FAIL while`);
  console.log(`  any NAME_MISMATCH row exists (Constitution 24: a gate that cannot fail is theatre).`);
}
if (uniUnres.length) {
  console.log(`\n  UNRESOLVED seed symbols (${uniUnres.length}) — first 20:`);
  for (const u of uniUnres.slice(0, 20)) console.log(`    ${u.symbol.padEnd(16)} ${u.reason.slice(0, 110)}`);
}
