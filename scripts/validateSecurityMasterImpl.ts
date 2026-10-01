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

  // ── V3: every seed symbol mapped or recorded UNRESOLVED ────────
  const seedSymbols = Object.keys(STOCKS);
  const unmapped: string[] = [];
  for (const s of seedSymbols) {
    if (activeSymbols.has(s)) continue;
    if (unresolvedSymbols.has(s)) continue;
    unmapped.push(s);
  }
  if (unmapped.length) {
    failures++;
    console.log(`FAIL V3 — ${unmapped.length} seed symbols neither mapped nor UNRESOLVED:`);
    for (const s of unmapped) console.log(`   ${s}`);
  } else {
    const mapped = seedSymbols.filter((s) => activeSymbols.has(s)).length;
    console.log(`PASS V3 — all ${seedSymbols.length} seed symbols accounted: ${mapped} mapped to an ISIN, ${seedSymbols.length - mapped} recorded UNRESOLVED`);
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
