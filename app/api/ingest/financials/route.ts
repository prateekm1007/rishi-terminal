// INGEST_FINANCIALS_V1
import { NextRequest, NextResponse } from "next/server";
import { ingestQuarterly, ingestAnnual, logIngestion } from "../../../../lib/services/ingestion";

export const runtime = "nodejs";

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
  const { symbols } = await req.json().catch(() => ({ symbols: [] }));

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: "Provide symbols array" }, { status: 400 });
  }

  const results: Record<string, any> = {};

  for (const sym of symbols.slice(0, 20)) {
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