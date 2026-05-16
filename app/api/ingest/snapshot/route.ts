// SNAPSHOT_V1
import { NextRequest, NextResponse } from "next/server";
import { snapshotAllStocks } from "../../../../lib/services/rishiMemory";
import { logIngestion } from "../../../../lib/services/ingestion";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  return auth === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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