/**
 * /api/health (P0-04) — public liveness/freshness endpoint.
 *
 * Returns: status (ok | degraded | down), db round-trip, last price and
 * fundamentals ingestion timestamps, engine version. No secrets, no row
 * counts. `degraded` when any freshness exceeds its SLO (constants live in
 * lib/health/slo.ts until E6-06 confirms them).
 */

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { computeHealth, type HealthBody } from "@/lib/health/compute";
import { SCORE_ENGINE_VERSION as engineVersion } from "@/lib/consensus/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getServiceSupabase();

  // Round-trip probe against a table that must exist (001). A missing-table
  // error IS a down condition for the app, not merely an empty one.
  const roundTrip = await db
    .from("users")
    .select("id", { count: "exact", head: true });
  const dbOk = !roundTrip.error;

  let ingestionRows: Array<{ job_name: string | null; finished_at: string | null }> = [];
  if (dbOk) {
    const { data } = await db
      .from("ingestion_log")
      .select("job_name, finished_at")
      .order("finished_at", { ascending: false })
      .limit(200);
    ingestionRows = (data as Array<{ job_name: string | null; finished_at: string | null }>) ?? [];
  }

  const body: HealthBody = computeHealth({
    dbOk,
    now: new Date(),
    ingestionRows,
    engineVersion,
  });

  return NextResponse.json(body, {
    status: body.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
