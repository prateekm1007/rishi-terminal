// SNAPSHOT_V1 (NS1 2026-10-07: the writer is batched — see lib/services/rishiMemory.ts;
// the 60 s kill that prevented logIngestion from ever running is fixed at the
// root: ~10 bounded round-trips instead of ~896 serial ones.)
import { NextRequest, NextResponse } from "next/server";
import { snapshotAllStocks } from "../../../../lib/services/rishiMemory";
import { logIngestion } from "../../../../lib/services/ingestion";
import { requireCronAuth } from "../../../../lib/auth/cron";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const started_at = new Date().toISOString();
  const result = await snapshotAllStocks();

  // NOTE (Phase 6): T61 reference-observation capture lives in its own cron
  // route (/api/ingest/observations, 13:45 UTC) — combining both jobs blew
  // the 60 s maxDuration budget (observed live 2026-10-01). One job, one
  // budget.

  await logIngestion({
    job_name:    "nightly_snapshot",
    // NS1: honest coverage semantics — a null-consensus skip (T11 fail-closed)
    // is not a write error, but it IS partial coverage, never "success".
    status:      result.errors === 0 && result.skipped === 0 ? "success" : "partial",
    records_out: result.snapshots,
    source:      "RishiEngine",
    started_at,
  });

  return NextResponse.json({ ok: true, ...result });
}

// Vercel Cron issues GET requests; POST is kept for manual triggering.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}