import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/screener/parser';
import { filterRows } from '@/lib/screener/engine';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * X3-05 (Round 14 A6): the server-side screener query engine.
 *
 * POST { q: string } -> { ok, rows, count, elapsedMs } on success,
 * 400 { ok: false, error: { message, position } } on a parse error —
 * the message is safe to show (it contains only the user's own tokens
 * and the fixed field list; no internals — Constitution 10).
 *
 * The rows returned are the SAME public slim rows the /screener page
 * already ships as RSC props (N1: free display fields, no engine
 * inputs), so nothing here gates or exposes anything new; the per-IP
 * rate limit is compute defense, identical in spirit to the
 * /api/rishis/[symbol] route.
 */
export const dynamic = 'force-dynamic';

const QUERY_IP_LIMIT = 120;
const QUERY_IP_WINDOW = 60;

function clientIp(req: NextRequest): string {
  // Same platform contract as the chat route (N4 round 3): Vercel
  // overwrites x-forwarded-for with exactly the client's public IP;
  // parsing the LAST entry stays correct behind appending proxies too.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await checkRateLimit(`screener-query:${ip}`, QUERY_IP_LIMIT, QUERY_IP_WINDOW);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: { message: 'Too many queries — wait a minute and retry.', position: 0 } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { message: 'body must be JSON', position: 0 } },
      { status: 400 },
    );
  }

  const q = (body as { q?: unknown }).q;
  if (typeof q !== 'string') {
    return NextResponse.json(
      { ok: false, error: { message: 'field "q" must be a string', position: 0 } },
      { status: 400 },
    );
  }

  const parsed = parseQuery(q);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const started = performance.now();
  const rows = filterRows(parsed.node, getSlimIndex());
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;

  return NextResponse.json({ ok: true, count: rows.length, elapsedMs, rows });
}
