/**
 * /api/health (P0-04) — public liveness/freshness endpoint.
 *
 * N8 (round 3): the endpoint is memoized for a short window and probes
 * the DB through the single minimal `health_probe(...)` RPC (timestamps
 * only — no row counts). 50 rapid requests cause at most 1 DB round-trip
 * per window. A DB failure is never memoized: the next request re-probes
 * (recoverable without waiting out the window) and reports 503.
 */

import { NextResponse } from "next/server";
import { getHealthBody } from "@/lib/health/probe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = await getHealthBody();
  return NextResponse.json(body, {
    status: body.status === "down" ? 503 : 200,
    // The body itself carries the probe time (asOf). A short shared-cache
    // window would also be acceptable, but no-store keeps every monitor
    // honest about the memo it is reading.
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
