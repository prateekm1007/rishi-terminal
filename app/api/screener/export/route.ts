import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/screener/parser';
import { filterRows } from '@/lib/screener/engine';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * X3-05 (Round 14 A6): CSV export of a screener query.
 *
 * GET /api/screener/export?q=pe%20%3E%200%20and%20roe%20%3E%2015
 *   -> text/csv attachment with one header row + one row per match.
 *   Parse errors come back as 400 with the same { error } shape as the
 *   query route (so the UI can surface them identically).
 *
 * The CSV carries exactly the public slim fields — the same data the
 * /screener page renders. Null consensus exports as an empty cell
 * (never 0 — Constitution 16/3).
 */
export const dynamic = 'force-dynamic';

const EXPORT_IP_LIMIT = 30;
const EXPORT_IP_WINDOW = 60;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** RFC 4180 field quoting: wrap in quotes, double embedded quotes.
 * B2 (founder Round-15): STRING cells that begin with a spreadsheet
 * formula character (=, +, -, @, tab, CR) are prefixed with a single
 * quote so Excel/Sheets renders them as text — the stored data can no
 * longer carry a formula back out through an export. Numeric cells are
 * never prefixed (a real -5 must stay a number, and numbers cannot
 * execute formulas). */
function csvCell(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await checkRateLimit(`screener-export:${ip}`, EXPORT_IP_LIMIT, EXPORT_IP_WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { message: 'Too many exports — wait a minute and retry.', position: 0 } },
      { status: 429 },
    );
  }

  const q = req.nextUrl.searchParams.get('q');
  if (typeof q !== 'string' || q.length === 0) {
    return NextResponse.json(
      { ok: false, error: { message: 'query parameter "q" is required', position: 0 } },
      { status: 400 },
    );
  }

  const parsed = parseQuery(q);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const rows = filterRows(parsed.node, getSlimIndex());

  const header = [
    'symbol', 'name', 'sector', 'consensus', 'category', 'dataQuality',
    'pe', 'roe', 'mktcap', 'de', 'revcagr', 'fcf',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.symbol), csvCell(r.name), csvCell(r.sector), csvCell(r.consensus),
        csvCell(r.category), csvCell(r.dataQuality), csvCell(r.pe), csvCell(r.roe),
        csvCell(r.mktcap), csvCell(r.de), csvCell(r.revcagr), csvCell(r.fcf),
      ].join(','),
    );
  }

  return new NextResponse(lines.join('\r\n') + '\r\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rishi-screener-export.csv"`,
      // Deterministic snapshot — no store needed, but no stale caching either.
      'Cache-Control': 'no-store',
    },
  });
}
