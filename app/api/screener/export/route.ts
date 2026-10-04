// app/api/screener/export/route.ts
// X3-05 (Round 14): CSV export of a screener query — the SAME parser, the
// SAME slim index, one evaluation path (rule 14). GET keeps this
// bookmarkable; the expression is length-capped and parse-checked before
// any evaluation.

import { NextResponse, type NextRequest } from 'next/server';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { ParseError, parseExpression, evalExpression, MAX_EXPRESSION_LENGTH, type ScreenerRowLike } from '@/lib/screener/parser';

export const dynamic = 'force-dynamic';

const CSV_COLUMNS = ['symbol', 'name', 'sector', 'consensus', 'category', 'pe', 'roe', 'mktcap', 'de', 'revcagr', 'fcf'] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const s = String(value);
  // RFC 4180: quote anything containing a comma, quote or newline
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const expression = req.nextUrl.searchParams.get('expression') ?? '';
  if (expression.length === 0 || expression.length > MAX_EXPRESSION_LENGTH) {
    return NextResponse.json({ error: 'expression must be a string of 1-400 characters' }, { status: 400 });
  }

  let ast;
  try {
    ast = parseExpression(expression);
  } catch (e) {
    if (e instanceof ParseError) {
      return NextResponse.json({ error: 'invalid expression', detail: e.message }, { status: 400 });
    }
    throw e;
  }

  const rows = getSlimIndex().filter((row) => evalExpression(ast, row as unknown as ScreenerRowLike));

  const header = CSV_COLUMNS.join(',');
  const body = rows.map((row) => CSV_COLUMNS.map((col) => csvCell((row as unknown as Record<string, string | number | null | undefined>)[col])).join(',')).join('\n');

  return new NextResponse(`${header}\n${body}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rishi-screener.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
