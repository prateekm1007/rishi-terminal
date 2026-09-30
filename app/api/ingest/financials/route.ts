// INGEST_FINANCIALS_V1
import { NextRequest, NextResponse } from "next/server";
import { ingestQuarterly, ingestAnnual, logIngestion } from "../../../../lib/services/ingestion";
import { requireCronAuth } from "../../../../lib/auth/cron";
import { isKnownSymbol } from "../../../../lib/security";

export const runtime = "nodejs";

async function run(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const started_at = new Date().toISOString();
  const { symbols } = await req.json().catch(() => ({ symbols: [] }));

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: "Provide symbols array" }, { status: 400 });
  }

  const results: Record<string, Record<string, unknown>> = {};

  for (const sym of symbols.slice(0, 20)) {
    // Registry-based validation (remediation T8): reject anything the seed
    // registry does not know before it reaches fetchers/scrapers.
    if (typeof sym !== "string" || !isKnownSymbol(sym)) {
      results[String(sym)] = { error: "invalid symbol" };
      continue;
    }
    const [q, a] = await Promise.all([
      ingestQuarterly(sym),
      ingestAnnual(sym),
    ]);
    results[sym] = { quarterly: q, annual: a };
    await logIngestion({
      job_name: "ingest_financials",
      symbol: sym,
      status: (q.errors + a.errors) === 0 ? "success" : "partial",
      records_in: q.inserted + a.inserted,
      records_out: q.inserted + a.inserted,
      source: "FMP",
      started_at,
    });
  }

  return NextResponse.json({ ok: true, results });
}

// Vercel Cron issues GET requests; POST is kept for manual triggering.
export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}