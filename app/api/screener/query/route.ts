// app/api/screener/query/route.ts
// X3-05 (Round 14): the server-side screener query endpoint.
//
// The expression NEVER touches eval — it is parsed by lib/screener/parser
// (hand-written tokenizer + AST evaluator with a field whitelist) and
// evaluated against the slim index (the same rows the screener page
// renders). ParseError maps to a 400 with a safe message; anything else
// unexpected fails closed (rule 10: generic outward).

import { NextResponse } from 'next/server';
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import type { NextRequest } from 'next/server';
import { ParseError, parseExpression, evalExpression, MAX_EXPRESSION_LENGTH, type ScreenerRowLike } from '@/lib/screener/parser';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 100;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const expression = (body as { expression?: unknown })?.expression;
  if (typeof expression !== 'string' || expression.length === 0 || expression.length > MAX_EXPRESSION_LENGTH) {
    return NextResponse.json({ error: 'expression must be a string of 1-400 characters' }, { status: 400 });
  }

  let ast;
  try {
    ast = parseExpression(expression);
  } catch (e) {
    if (e instanceof ParseError) {
      return NextResponse.json({ error: 'invalid expression', detail: e.message }, { status: 400 });
    }
    throw e; // rule 10: unexpected errors fail closed, not with details
  }

  const rows = getSlimIndex();
  const matched = rows.filter((row) => evalExpression(ast, row as unknown as ScreenerRowLike));

  return NextResponse.json({
    expression,
    matchedCount: matched.length,
    rows: matched.slice(0, MAX_ROWS),
  });
}
