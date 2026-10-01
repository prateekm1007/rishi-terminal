/**
 * validateSecurityMasterImpl — D1-02 acceptance script.
 *
 * Roadmap acceptance:
 *   npx tsx scripts/validateSecurityMaster.ts
 *     → 0 duplicate active symbols
 *     → 0 orphan aliases
 *     → every seed (STOCKS) symbol mapped to an ISIN or recorded UNRESOLVED
 *
 * Runs against the live/staging database via the service-role REST client
 * (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). The same
 * invariants run in CI as plain SQL (scripts/ci/security_master_invariants.sql
 * plus the coverage assertion embedded in data/security-master/populate.sql),
 * so both sides of the gate can fail independently.
 *
 * Exit 0 = pass; exit 1 = violation (details printed).
 */
import fs from "node:fs";
import path from "node:path";
import { getAdminSupabase } from "../lib/services/supabaseAdmin";
import { STOCKS } from "../data/stocks";
import { findDuplicateActiveSymbols, type SymbolHistoryRow } from "../lib/db/securityMaster";
import { agreesEnough, parseNameOverrides, type NameOverrideEntry } from "../lib/db/nameAgreement";

type AliasMap = Record<string, string>;
const aliases: AliasMap = Object.fromEntries(
  Object.entries(
    JSON.parse(fs.readFileSync(path.resolve(__dirname, "../lib/registry/tickerAliases.json"), "utf8")) as AliasMap,
  ).filter(([k]) => !k.startsWith("$")),
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

async function main(): Promise<void> {
  const db = getAdminSupabase();

  // ── curated name-agreement decisions (audit round 4, Q3) ──
  const OVERRIDES_PATH = path.resolve(__dirname, "../data/security-master/name_overrides.json");
  const overrides = new Map<string, NameOverrideEntry>();
  if (fs.existsSync(OVERRIDES_PATH)) {
    const parsed = parseNameOverrides(JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")));
    for (const e of parsed.entries) overrides.set(e.symbol, e);
  }

  // PostgREST caps a single response at 1000 rows; the security master is
  // ~2.7k rows and grows. Paginate or the validation silently inspects a
  // prefix (exactly the bug this line prevents).
  const fetchAll = async (table: string, select: string, pageSize = 1000): Promise<Record<string, unknown>[]> => {
    const out: Record<string, unknown>[] = [];
    for (let from = 0; ; from += pageSize) {
      const res = await db.from(table).select(select).range(from, from + pageSize - 1);
      if (res.error) throw new Error(`${table} read failed: ${res.error.message}`);
      const rows = res.data as unknown as Record<string, unknown>[];
      out.push(...rows);
      if (rows.length < pageSize) break;
    }
    return out;
  };

  // ── fetch the whole security master (small: a few thousand rows) ──
  const hist = (await fetchAll("symbol_history", "isin,exchange,symbol,valid_from,valid_to,source")) as unknown as SymbolHistoryRow[];
  const isins = new Set((await fetchAll("securities", "isin")).map((r) => r.isin as string));
  const secNames = new Map(
    (await fetchAll("securities", "isin,name")).map((r) => [r.isin as string, r.name as string]),
  );
  const universe = (await fetchAll("universe", "isin,symbol,data_quality,reason")) as unknown as {
    isin: string | null; symbol: string | null; data_quality: string; reason: string;
  }[];

  const activeSymbols = new Set(hist.filter((r) => r.valid_to === null).map((r) => r.symbol));
  const unresolvedSymbols = new Set(
    universe.filter((u) => u.isin === null && u.data_quality === "UNRESOLVED").map((u) => u.symbol as string),
  );

  let failures = 0;

  // ── V1: 0 duplicate active symbols ─────────────────────────────
  const dups = findDuplicateActiveSymbols(hist);
  if (dups.length) {
    failures++;
    console.log(`FAIL V1 — ${dups.length} live symbols claimed by more than one ISIN:`);
    for (const d of dups) console.log(`   ${d.exchange}:${d.symbol} -> ${d.isins.join(" vs ")}`);
  } else {
    console.log("PASS V1 — 0 duplicate active symbols");
  }

  // ── V2: 0 orphan aliases ───────────────────────────────────────
  // An alias is orphaned when its resolution chain does not end at a
  // symbol that is mapped to an ISIN or recorded UNRESOLVED.
  const orphans: string[] = [];
  const pending: string[] = [];
  for (const [old] of Object.entries(aliases)) {
    const endpoint = resolveAliasChain(old);
    if (activeSymbols.has(endpoint)) continue;
    if (unresolvedSymbols.has(endpoint)) {
      pending.push(old); // accounted, waiting on ISIN resolution
      continue;
    }
    orphans.push(`${old} -> ${endpoint}`);
  }
  if (orphans.length) {
    failures++;
    console.log(`FAIL V2 — ${orphans.length} orphan aliases (endpoint neither mapped nor UNRESOLVED):`);
    for (const o of orphans) console.log(`   ${o}`);
  } else {
    console.log(`PASS V2 — 0 orphan aliases (${Object.keys(aliases).length} aliases; ${pending.length} pending, endpoint recorded UNRESOLVED)`);
  }

  // ── V3: every seed symbol mapped, recorded UNRESOLVED, or flagged ──
  const seedSymbols = Object.keys(STOCKS);
  const mismatchFlagged = new Set(
    universe.filter((u) => u.data_quality === "NAME_MISMATCH").map((u) => u.symbol as string),
  );
  const unmapped: string[] = [];
  for (const s of seedSymbols) {
    if (activeSymbols.has(s)) continue;
    if (unresolvedSymbols.has(s)) continue;
    if (mismatchFlagged.has(s)) continue; // V6 fails while these exist; V3 accounts them
    unmapped.push(s);
  }
  if (unmapped.length) {
    failures++;
    console.log(`FAIL V3 — ${unmapped.length} seed symbols neither mapped nor UNRESOLVED:`);
    for (const s of unmapped) console.log(`   ${s}`);
  } else {
    const mapped = seedSymbols.filter((s) => activeSymbols.has(s)).length;
    const flagged = seedSymbols.filter((s) => mismatchFlagged.has(s)).length;
    console.log(`PASS V3 — all ${seedSymbols.length} seed symbols accounted: ${mapped} mapped to an ISIN, ${unresolvedSymbols.size} recorded UNRESOLVED, ${flagged} flagged NAME_MISMATCH (V6 judges those)`);
  }

  // ── V4: referential sanity (belt over the FK braces) ───────────
  const histOrphans = [...new Set(hist.filter((r) => !isins.has(r.isin)).map((r) => r.isin))];
  const uniOrphans = [...new Set(universe.filter((u) => u.isin !== null && !isins.has(u.isin)).map((u) => u.isin as string))];
  if (histOrphans.length || uniOrphans.length) {
    failures++;
    console.log(`FAIL V4 — rows referencing unknown ISINs: symbol_history ${histOrphans.length}, universe ${uniOrphans.length}`);
  } else {
    console.log("PASS V4 — every symbol_history/universe ISIN exists in securities");
  }

  // ── V5 (Q3): every direct seed↔listing binding passes the name gate ──
  // Re-verifies the binding against the LIVE database (not just the
  // generated artifact): a seed record whose name disagrees with the
  // official listing name for the same symbol is a wrong-company binding
  // (audit round 4: seed "Power Mech" on POWERINDIA = Hitachi Energy India)
  // unless a sourced entry in name_overrides.json has reviewed it.
  const officialRowBySymbol = new Map<string, SymbolHistoryRow>();
  for (const r of hist) {
    if (r.valid_to === null && r.source.startsWith("nse:equity_l:")) officialRowBySymbol.set(r.symbol, r);
  }
  const unreviewed: Array<{ sym: string; seed: string; official: string }> = [];
  let reviewedOk = 0;
  for (const s of seedSymbols) {
    const row = officialRowBySymbol.get(s);
    if (!row) continue; // not a direct listing match (variant/unresolved path)
    const officialName = secNames.get(row.isin) ?? "";
    if (!officialName) continue;
    const gate = agreesEnough(STOCKS[s].name, officialName);
    if (gate.ok) continue;
    const reviewed = overrides.get(s);
    if (reviewed && reviewed.action !== "REMOVE_SEED_RECORD" && reviewed.officialName === officialName) {
      reviewedOk += 1;
      continue;
    }
    unreviewed.push({ sym: s, seed: STOCKS[s].name, official: officialName });
  }
  if (unreviewed.length) {
    failures++;
    console.log(`FAIL V5 — ${unreviewed.length} seed symbol(s) bind a name the official listing contradicts, with no reviewed entry:`);
    for (const u of unreviewed) {
      console.log(`   ${u.sym.padEnd(14)} seed="${u.seed}" | official="${u.official}"`);
    }
    console.log("   Curate each in data/security-master/name_overrides.json (with sources) or fix/remove the seed record.");
  } else {
    console.log(`PASS V5 — all direct seed bindings pass the name-agreement gate (${reviewedOk} reviewed via name_overrides.json)`);
  }

  // ── V6 (Q3): no NAME_MISMATCH rows may linger in the database ──
  const mismatchRows = universe.filter((u) => u.data_quality === "NAME_MISMATCH");
  if (mismatchRows.length) {
    failures++;
    console.log(`FAIL V6 — ${mismatchRows.length} NAME_MISMATCH universe row(s) (unreviewed):`);
    for (const m of mismatchRows.slice(0, 40)) {
      console.log(`   ${(m.symbol ?? "?").padEnd(14)} ${(m.reason || "").slice(0, 120)}`);
    }
  } else {
    console.log("PASS V6 — 0 NAME_MISMATCH universe rows");
  }

  // ── V7 (Q3): every curated entry still matches the live listing ──
  const staleEntries: string[] = [];
  for (const [sym, entry] of overrides) {
    const row = officialRowBySymbol.get(sym);
    if (!row) continue; // entry for a symbol no longer directly listed — nothing to contradict
    const liveName = secNames.get(row.isin) ?? "";
    if (liveName && liveName !== entry.officialName) {
      staleEntries.push(`${sym}: entry pins "${entry.officialName}" but the live listing says "${liveName}" — re-review`);
    }
  }
  if (staleEntries.length) {
    failures++;
    console.log(`FAIL V7 — ${staleEntries.length} stale name_overrides.json entr(ies):`);
    for (const s of staleEntries) console.log(`   ${s}`);
  } else {
    console.log(`PASS V7 — all ${overrides.size} curated name decisions still match the live listing`);
  }

  // ── decisions table (audit trail) ──
  if (overrides.size) {
    console.log("\nname-agreement decisions (data/security-master/name_overrides.json):");
    for (const e of [...overrides.values()].sort((a, b) => a.symbol.localeCompare(b.symbol))) {
      console.log(`   ${e.symbol.padEnd(14)} ${e.verdict.padEnd(13)} ${e.action.padEnd(19)} seed="${e.seedName}" -> official="${e.officialName}"`);
      console.log(`   ${" ".repeat(14)} basis: ${e.basis}`);
      console.log(`   ${" ".repeat(14)} sources: ${e.sources.join(" | ")}`);
    }
  }

  // ── report ─────────────────────────────────────────────────────
  const bySource = new Map<string, number>();
  for (const r of hist) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
  const byQuality = new Map<string, number>();
  for (const u of universe) byQuality.set(u.data_quality, (byQuality.get(u.data_quality) ?? 0) + 1);
  console.log("\nsecurity master state:");
  console.log(`  securities      : ${isins.size}`);
  console.log(`  symbol_history  : ${hist.length} (${[...bySource.entries()].map(([k, v]) => `${k}=${v}`).join(", ")})`);
  console.log(`  universe        : ${[...byQuality.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);

  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exitCode = 1;
  }
  console.log("\nAll D1-02 acceptance checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
