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

async function count(table: string): Promise<number> {
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
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
  const logs = await count("ingestion_logs").catch(() => -1);

  const lastSnapshotDate = await latest("rishi_snapshots", "snapshot_date");
  const lastQuarter = await latest("financial_quarters", "period").catch(() => null);

  console.log("── Nightly pipeline status ──");
  console.log(`rishi_snapshots rows:     ${snapshots}`);
  console.log(`financial_quarters rows:  ${quarters}`);
  console.log(`ingestion_logs rows:      ${logs}`);
  console.log(`latest snapshot_date:     ${lastSnapshotDate ?? "none"}`);
  console.log(`latest quarter period:    ${lastQuarter ?? "none"}`);
  console.log(
    snapshots > 0 && quarters > 0
      ? "Pipeline HAS produced data. If latest dates are stale, the Vercel Cron schedule is not firing — check CRON_SECRET and vercel.json cron config."
      : "Pipeline has NEVER produced data — snapshotAllStocks / ingestQuarterly are not running in production.",
  );
  if (snapshots === 0 || quarters === 0) process.exit(1);
}

main().catch(e => {
  console.error("BLOCKED:", e.message);
  process.exit(1);
});
