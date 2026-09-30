// REFERENCE_OBSERVATIONS_V1
import { NextRequest, NextResponse } from "next/server";
import { captureReferenceObservations } from "../../../../lib/services/observations";
import { logIngestion } from "../../../../lib/services/ingestion";
import { requireCronAuth } from "../../../../lib/auth/cron";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const started_at = new Date().toISOString();

  // Phase 6 T61: persist OUR OWN daily observations for storage-entitled
  // sources only (FRED yields, FX reference). Own cron route so this job
  // gets its own full 60 s budget — the nightly consensus snapshot must
  // never be starved by upstream timeouts. Skips are honest; failures are
  // counted, never fabricated.
  const result = await captureReferenceObservations();

  await logIngestion({
    job_name:    "reference_observations",
    status:      result.errors === 0 ? "success" : "partial",
    records_out: result.persisted,
    source:      "PERSISTABLE_SOURCES",
    started_at,
  });

  return NextResponse.json({ ok: true, observations: result });
}

// Vercel Cron issues GET requests; POST is kept for manual triggering.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
