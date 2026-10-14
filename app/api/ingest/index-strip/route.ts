// app/api/ingest/index-strip/route.ts — INDEXSTRIP: the index snapshot's
// producer (founder order, 2026-10-14, option (b)). ONE route, its own
// full 60 s budget (the observations-route pattern: a slow upstream must
// never starve a sibling job), authenticated with CRON_SECRET like the
// other Vercel-cron ingest routes.
//
// Per leg: NSE /api/allIndices (NIFTY 50) and BSE's realtime index
// endpoint (SENSEX) — both zod-parsed and fail-closed (lib/markets/
// indexStrip). A dead leg is the honest absent row; the snapshot always
// writes (a partial snapshot is real state, disclosed per row).

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/auth/cron";
import { logIngestion } from "@/lib/services/ingestion";
import {
  deriveIndexStripSnapshot,
  fetchNiftyFromNse,
  fetchSensexFromBse,
} from "@/lib/markets/indexStrip";
import { writeIndexStripSnapshot } from "@/lib/markets/indexStripStore";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const startedAt = new Date().toISOString();
  const [nifty, sensex] = await Promise.all([fetchNiftyFromNse(), fetchSensexFromBse()]);
  const snap = deriveIndexStripSnapshot(nifty, sensex, new Date().toISOString());
  await writeIndexStripSnapshot(snap);
  await logIngestion({
    job_name: "index_strip",
    status: snap.rows.length === 2 ? "success" : "partial",
    records_out: snap.rows.length,
    source: "NSE+NSEPERM/BSE",
    started_at: startedAt,
  });
  return NextResponse.json({ ok: true, rows: snap.rows.length, symbols: snap.rows.map(r => r.symbol) });
}

// Vercel Cron issues GET requests; POST is kept for manual triggering.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
