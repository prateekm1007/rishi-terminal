/**
 * Nightly pipeline status report (remediation T14.4).
 *
 * Reports whether the ingest pipeline is actually writing to production:
 * row counts for rishi_snapshots (snapshotAllStocks output), financial_quarters
 * (ingestQuarterly output) and ingestion_logs, plus freshness of the newest
 * rows. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server env).
 *
 * Run: npx tsx scripts/pipelineStatus.ts
 * Exits 1 when credentials are missing (BLOCKED) or tables are empty.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("BLOCKED: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to check the production pipeline");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/**
 * Row count, or the string "TABLE-MISSING" when Postgres reports the table
 * does not exist (42P01 / PGRST205). The previous version collapsed that
 * error into 0 — reporting an unapplied schema as "0 rows", which reads
 * like an empty-but-ready pipeline. Art. I: an unverified claim is a bug
 * that looks like documentation.
 */
async function count(table: string): Promise<number | "TABLE-MISSING"> {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) {
    const missing = isMissingTableError(error);
    if (missing) return "TABLE-MISSING";
    const code = String((error as { code?: string }).code ?? "");
    throw new Error(`${table}: ${error.message} (code=${code})`);
  }
  if (count !== null) return count;
  // supabase-js quirk (verified against live): a head+count request on a
  // MISSING table returns { count: null, error: null } — the 404 body is
  // empty. Probe with a real select, whose error carries the truth.
  const probe = await db.from(table).select("*").limit(1);
  if (probe.error && isMissingTableError(probe.error)) return "TABLE-MISSING";
  return 0;
}

function isMissingTableError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = String(e.code ?? "");
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "PGRST202" ||
    /does not exist|Could not find the table/i.test(e.message ?? "")
  );
}

async function latest(table: string, col: string): Promise<string | null> {
  const { data, error } = await db.from(table).select(col).order(col, { ascending: false }).limit(1);
  if (error) return null;
  const row = (data as unknown as Array<Record<string, unknown>> | null)?.[0];
  const v = row?.[col];
  return typeof v === "string" ? v : null;
}

async function main() {
  const snapshots = await count("rishi_snapshots");
  const quarters = await count("financial_quarters");
  const logs = await count("ingestion_log").catch(() => -1); // singular — matches 003 DDL (was wrongly "ingestion_logs")

  const lastSnapshotDate = await latest("rishi_snapshots", "snapshot_date");
  const lastQuarter = await latest("financial_quarters", "period").catch(() => null);

  console.log("── Nightly pipeline status ──");
  console.log(`rishi_snapshots rows:     ${snapshots}`);
  console.log(`financial_quarters rows:  ${quarters}`);
  console.log(`ingestion_log rows:       ${logs}`);
  console.log(`latest snapshot_date:     ${lastSnapshotDate ?? "none"}`);
  console.log(`latest quarter period:    ${lastQuarter ?? "none"}`);

  const schemaMissing =
    snapshots === "TABLE-MISSING" || quarters === "TABLE-MISSING" || logs === "TABLE-MISSING";
  if (schemaMissing) {
    console.log(
      "BLOCKED: one or more pipeline tables DO NOT EXIST in this database — " +
      "migrations have not been applied (see lib/db/migrations 001..008 and " +
      "the combined SQL in the round-2 PR). Row counts are meaningless until then.",
    );
    process.exit(1);
  }

  const s = snapshots as number;
  const q = quarters as number;
  // Report each producer's state separately — a single "never produced"
  // line misreported a live snapshot pipeline when only fundamentals
  // (or vice versa) were missing.
  console.log(
    s > 0
      ? `Snapshots: pipeline HAS produced data (newest ${lastSnapshotDate ?? "unknown"}).`
      : "Snapshots: NEVER produced — snapshotAllStocks is not running (check CRON_SECRET / vercel.json).",
  );
  console.log(
    q > 0
      ? "Fundamentals: pipeline HAS produced data."
      : "Fundamentals: NEVER produced — ingestQuarterly is not running or has nothing to ingest yet.",
  );
  if (s === 0 || q === 0) process.exit(1);
}

main().catch(e => {
  console.error("BLOCKED:", e.message);
  process.exit(1);
});
