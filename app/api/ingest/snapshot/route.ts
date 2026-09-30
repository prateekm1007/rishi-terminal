// SNAPSHOT_V1
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

  await logIngestion({
    job_name:    "nightly_snapshot",
    status:      result.errors === 0 ? "success" : "partial",
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