import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/screener/parser';
import { filterRows } from '@/lib/screener/engine';
import { nlToQuery } from '@/lib/screener/nl';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { checkRateLimit } from '@/lib/rateLimit';

/**
 * X3-05 (Round 14 A6): the server-side screener query engine.
 * INT-D1 (pre-registration: docs/intelligence/screening.md): the SAME
 * route grows an explicit `mode` field — "expression" (the default,
 * byte-compatible with pre-D1) | "natural". Natural mode translates the
 * input through the ONE deterministic mapper (`lib/screener/nl.ts`,
 * zero AI tokens) and then walks the UNCHANGED parse → evaluate path;
 * the 200 response carries the TRANSLATED expression in `query` so the
 * UI can show exactly what filter ran (never a black box). Expression
 * mode gains nothing: no `query` key, identical shape (pinned by test).
 * A missing/unknown mode falls back to "expression" — the pinned
 * byte-compatible default.
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

  // INT-D1: the explicit mode field. Missing/unknown → "expression"
  // (the pinned byte-compatible default — pre-registration fail-closed
  // table, row 6).
  const modeRaw = (body as { mode?: unknown }).mode;
  const mode: 'expression' | 'natural' = modeRaw === 'natural' ? 'natural' : 'expression';

  // The ONE validation boundary: natural mode first compiles to a string
  // in the expression language; the expression then goes through the
  // EXISTING parseQuery. The NL layer never filters rows itself.
  let expression = q;
  let translated: string | null = null;
  if (mode === 'natural') {
    const nl = nlToQuery(q);
    if (!nl.ok) {
      return NextResponse.json({ ok: false, error: { message: nl.error.message } }, { status: 400 });
    }
    expression = nl.query;
    translated = nl.query;
  }

  const parsed = parseQuery(expression);
  if (!parsed.ok) {
    if (translated !== null) {
      // Unshippable by the every-success-parses property pin — fail
      // closed honestly anyway rather than evaluating anything.
      return NextResponse.json(
        { ok: false, error: { message: 'the interpretation did not parse — try Expression mode for the full grammar', position: 0 } },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const started = performance.now();
  const rows = filterRows(parsed.node, getSlimIndex());
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;

  if (translated !== null) {
    return NextResponse.json({ ok: true, count: rows.length, elapsedMs, rows, query: translated });
  }
  return NextResponse.json({ ok: true, count: rows.length, elapsedMs, rows });
}
