/**
 * X3-05 (Round 14 A6): the screener expression language — a SAFE parser.
 *
 * The founder's acceptance is explicit: "server-side query engine with a
 * safe expression parser (no `eval`, no `Function`)". This module is that
 * parser: a hand-written tokenizer + recursive-descent parser that
 * produces a typed AST. There is no dynamic code evaluation anywhere in
 * this file (or in engine.ts) — `git grep -nE "\beval\(|new Function\("
 * -- app lib` must stay empty, and test/screener.parser.test.ts fuzzes
 * 10k random strings to prove uncaught throws never happen and injection
 * payloads are rejected as syntax errors.
 *
 * Grammar (precedence low -> high):
 *
 *   query   := or EOF
 *   or      := and ( ("or"|"|") and )*
 *   and     := not ( ("and"|"&") not )*
 *   not     := ("not"|"!") not | cmp
 *   cmp     := primary ( (">"|">="|"<"|"<="|"="|"=="|"!="|"<>")
 *                        primary
 *                      | "is" "not"? "null" )?
 *   primary := "(" or ")" | number | string | field
 *
 * Semantics (documented in docs/DATA_SOURCES.md §Screener v2):
 *   - `and`/`or`/`not` are case-insensitive keywords.
 *   - comparisons between a nullable field and a number are FALSE when
 *     the field is null (Constitution 16: null is a real value — a null
 *     consensus is not 0 and must not match `consensus > 50`); use
 *     `field is null` / `field is not null` to select null rows.
 *   - string comparison supports = / != only (sector = "Banks"); the
 *     match is exact and case-sensitive, mirroring how the UI displays
 *     the stored sector names.
 *   - unknown fields and mismatched types are PARSE errors, so a typo
 *     can never silently match zero rows and look like an empty result.
 */

/** Fields the language can filter on (one registry — Constitution 14). */
export type ScreenerFieldType = 'number' | 'string' | 'nullableNumber' | 'enum';

export interface ScreenerFieldDef {
  type: ScreenerFieldType;
  /** Human label shown in the UI help text. */
  label: string;
}

export const SCREENER_FIELDS: Record<string, ScreenerFieldDef> = {
  pe: { type: 'number', label: 'P/E ratio' },
  roe: { type: 'number', label: 'Return on equity (%)' },
  mktcap: { type: 'number', label: 'Market cap (Cr)' },
  de: { type: 'number', label: 'Debt / equity (x)' },
  revcagr: { type: 'number', label: 'Revenue CAGR (%)' },
  fcf: { type: 'number', label: 'Free cash flow (Cr)' },
  consensus: { type: 'nullableNumber', label: 'Rishi consensus (null = insufficient data)' },
  tensionSpread: { type: 'number', label: 'Council tension spread' },
  symbol: { type: 'string', label: 'Symbol (exact, e.g. SBIN)' },
  name: { type: 'string', label: 'Company name (exact)' },
  sector: { type: 'string', label: 'Sector (exact, e.g. Banking)' },
  category: { type: 'string', label: 'Consensus category' },
  dataQuality: { type: 'enum', label: 'Data quality (OK | INCOMPLETE)' },
};

/** Hard limits — the parser refuses absurd input instead of choking. */
export const SCREENER_QUERY_LIMITS = {
  maxLength: 500,
  maxTokens: 200,
  maxDepth: 24,
  maxStringLiteral: 80,
  maxNumberMagnitude: 1e15,
} as const;

export type QueryNode =
  | { kind: 'bool'; op: 'and' | 'or'; left: QueryNode; right: QueryNode }
  | { kind: 'not'; operand: QueryNode }
  | { kind: 'cmp'; op: '>' | '>=' | '<' | '<=' | '=' | '!='; left: QueryNode; right: QueryNode }
  | { kind: 'isnull'; field: string; negated: boolean }
  | { kind: 'field'; name: string }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string };

export interface ParseError {
  message: string;
  /** 0-based character offset into the query text. */
  position: number;
}

export type ParseResult = { ok: true; node: QueryNode } | { ok: false; error: ParseError };

type Token =
  | { t: 'num'; v: number; pos: number }
  | { t: 'str'; v: string; pos: number }
  | { t: 'ident'; v: string; pos: number }
  | { t: 'op'; v: string; pos: number }
  | { t: 'lp'; pos: number }
  | { t: 'rp'; pos: number }
  | { t: 'eof'; pos: number };

/** Tokenize. Throws never; malformed input comes back as ParseResult. */
export function tokenize(src: string): { ok: true; tokens: Token[] } | { ok: false; error: ParseError } {
  class ParseLimitError extends Error {
    constructor(
      message: string,
      public pos: number,
    ) {
      super(message);
    }
  }

  const tokens: Token[] = [];
  let i = 0;

  const push = (tok: Token) => {
    tokens.push(tok);
    if (tokens.length > SCREENER_QUERY_LIMITS.maxTokens) {
      throw new ParseLimitError(`too many tokens (limit ${SCREENER_QUERY_LIMITS.maxTokens})`, i);
    }
  };

  try {
    while (i < src.length) {
      const ch = src[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers: digits with optional decimal part. Scientific notation is
      // intentionally NOT supported — a stray `e` becomes a syntax error,
      // which is safer than guessing intent.
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
        const start = i;
        while (i < src.length && /[0-9]/.test(src[i])) i++;
        if (src[i] === '.') {
          i++;
          while (i < src.length && /[0-9]/.test(src[i])) i++;
        }
        const raw = src.slice(start, i);
        const value = Number(raw);
        if (!Number.isFinite(value) || Math.abs(value) > SCREENER_QUERY_LIMITS.maxNumberMagnitude) {
          return { ok: false, error: { message: `number out of range: ${raw}`, position: start } };
        }
        push({ t: 'num', v: value, pos: start });
        continue;
      }

      // Strings: single or double quoted. No escapes — a quote ends the
      // literal; keep the surface minimal and predictable.
      if (ch === '"' || ch === "'") {
        const quote = ch;
        const start = i;
        i++;
        let out = '';
        while (i < src.length && src[i] !== quote) {
          out += src[i];
          if (out.length > SCREENER_QUERY_LIMITS.maxStringLiteral) {
            return { ok: false, error: { message: 'string literal too long', position: start } };
          }
          i++;
        }
        if (i >= src.length) {
          return { ok: false, error: { message: 'unterminated string literal', position: start } };
        }
        i++; // closing quote
        push({ t: 'str', v: out, pos: start });
        continue;
      }

      // Identifiers / keywords: [A-Za-z_][A-Za-z0-9_]*
      if (/[A-Za-z_]/.test(ch)) {
        const start = i;
        while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) i++;
        push({ t: 'ident', v: src.slice(start, i), pos: start });
        continue;
      }

      // Operators and punctuation.
      const two = src.slice(i, i + 2);
      if (two === '>=' || two === '<=' || two === '!=' || two === '<>' || two === '==') {
        push({ t: 'op', v: two === '<>' ? '!=' : two === '==' ? '=' : two, pos: i });
        i += 2;
        continue;
      }
      if (ch === '>' || ch === '<' || ch === '=' || ch === '!' || ch === '&' || ch === '|') {
        push({ t: 'op', v: ch, pos: i });
        i++;
        continue;
      }
      if (ch === '(') {
        push({ t: 'lp', pos: i });
        i++;
        continue;
      }
      if (ch === ')') {
        push({ t: 'rp', pos: i });
        i++;
        continue;
      }

      return { ok: false, error: { message: `unexpected character ${JSON.stringify(ch)}`, position: i } };
    }

    push({ t: 'eof', pos: src.length });
    return { ok: true, tokens };
  } catch (e) {
    if (e instanceof ParseLimitError) {
      return { ok: false, error: { message: e.message, position: e.pos } };
    }
    return { ok: false, error: { message: 'tokenizer failed', position: i } };
  }
}

const KEYWORDS = new Set(['and', 'or', 'not', 'is', 'null']);

/**
 * Parse a screener query into an AST. Total function: any input either
 * parses or returns a positioned error — never throws.
 */
export function parseQuery(src: string): ParseResult {
  if (typeof src !== 'string') {
    return { ok: false, error: { message: 'query must be a string', position: 0 } };
  }
  if (src.length === 0) {
    return { ok: false, error: { message: 'query is empty', position: 0 } };
  }
  if (src.length > SCREENER_QUERY_LIMITS.maxLength) {
    return { ok: false, error: { message: `query too long (limit ${SCREENER_QUERY_LIMITS.maxLength} chars)`, position: 0 } };
  }

  const lexed = tokenize(src);
  if (!lexed.ok) return lexed;

  const tokens = lexed.tokens;
  let cursor = 0;
  let depth = 0;

  const peek = (): Token => tokens[cursor];

  const err = (message: string, position: number): ParseResult => ({ ok: false, error: { message, position } });

  function parsePrimary(): ParseResult {
    const tok = peek();

    if (tok.t === 'lp') {
      depth++;
      if (depth > SCREENER_QUERY_LIMITS.maxDepth) {
        return err(`expression nested too deep (limit ${SCREENER_QUERY_LIMITS.maxDepth})`, tok.pos);
      }
      cursor++;
      const inner = parseOr();
      if (!inner.ok) return inner;
      const close = peek();
      if (close.t !== 'rp') {
        return err('expected ")"', close.pos);
      }
      cursor++;
      depth--;
      return inner;
    }

    if (tok.t === 'num') {
      cursor++;
      return { ok: true, node: { kind: 'number', value: tok.v } };
    }

    if (tok.t === 'str') {
      cursor++;
      return { ok: true, node: { kind: 'string', value: tok.v } };
    }

    if (tok.t === 'ident') {
      const word = tok.v.toLowerCase();
      if (KEYWORDS.has(word)) {
        return err(`unexpected keyword "${tok.v}"`, tok.pos);
      }
      const def = SCREENER_FIELDS[tok.v];
      if (!def) {
        return err(
          `unknown field "${tok.v}" — allowed: ${Object.keys(SCREENER_FIELDS).join(', ')}`,
          tok.pos,
        );
      }
      cursor++;
      return { ok: true, node: { kind: 'field', name: tok.v } };
    }

    return err(
      tok.t === 'eof' ? 'unexpected end of query' : 'expected a field, number or string',
      tok.pos,
    );
  }

  function typeOf(node: QueryNode): ScreenerFieldType | 'numberLiteral' | 'stringLiteral' | null {
    if (node.kind === 'field') return SCREENER_FIELDS[node.name].type;
    if (node.kind === 'number') return 'numberLiteral';
    if (node.kind === 'string') return 'stringLiteral';
    return null; // boolean sub-expression — cannot sit beside a comparator
  }

  function parseCmp(): ParseResult {
    // `not` binds tighter than comparison? No — `not pe > 10` would then
    // mean `not (pe > 10)`; we implement that reading at the `not` level
    // by descending there first, so here we only see primaries.
    const leftPos = peek().pos;
    const left = parsePrimary();
    if (!left.ok) return left;

    const tok = peek();
    if (tok.t === 'op' && ['>', '>=', '<', '<=', '=', '!='].includes(tok.v)) {
      cursor++;
      const right = parsePrimary();
      if (!right.ok) return right;

      // Type check both sides now (rule: a typo must be an error, and a
      // nonsense comparison like sector > 5 must not silently match).
      const lt = typeOf(left.node);
      const rt = typeOf(right.node);
      const numeric = (t: string | null) => t === 'number' || t === 'nullableNumber' || t === 'numberLiteral';
      const stringy = (t: string | null) => t === 'string' || t === 'enum' || t === 'stringLiteral';

      if (numeric(lt) && numeric(rt)) {
        return { ok: true, node: { kind: 'cmp', op: tok.v as '>', left: left.node, right: right.node } };
      }
      if (stringy(lt) && stringy(rt)) {
        if (tok.v !== '=' && tok.v !== '!=') {
          return err('strings compare with = or != only', tok.pos);
        }
        return { ok: true, node: { kind: 'cmp', op: tok.v as '=', left: left.node, right: right.node } };
      }
      return err(
        `type mismatch: ${describeType(lt)} ${tok.v} ${describeType(rt)} — numbers compare with numbers, strings with strings`,
        tok.pos,
      );
    }

    // `field is null` / `field is not null`
    if (tok.t === 'ident' && tok.v.toLowerCase() === 'is') {
      cursor++;
      let negated = false;
      const next = peek();
      if (next.t === 'ident' && next.v.toLowerCase() === 'not') {
        negated = true;
        cursor++;
      }
      const nullTok = peek();
      if (nullTok.t === 'ident' && nullTok.v.toLowerCase() === 'null') {
        cursor++;
        if (left.node.kind !== 'field' || SCREENER_FIELDS[left.node.name].type !== 'nullableNumber') {
          return err('`is null` applies to nullable fields only (consensus)', leftPos);
        }
        return { ok: true, node: { kind: 'isnull', field: left.node.name, negated } };
      }
      return err('expected "null" after "is"', nullTok.pos);
    }

    // A bare primary is not a boolean — reject (no implicit truthiness).
    const lt = typeOf(left.node);
    if (lt !== null) {
      return err('expected a comparison (e.g. pe > 10) — a bare value is not a condition', tok.pos);
    }
    return left;
  }

  function parseNot(): ParseResult {
    const tok = peek();
    if (tok.t === 'op' && tok.v === '!') {
      cursor++;
      const inner = parseNot();
      if (!inner.ok) return inner;
      return { ok: true, node: { kind: 'not', operand: inner.node } };
    }
    if (tok.t === 'ident' && tok.v.toLowerCase() === 'not') {
      cursor++;
      const inner = parseNot();
      if (!inner.ok) return inner;
      return { ok: true, node: { kind: 'not', operand: inner.node } };
    }
    return parseCmp();
  }

  function parseAnd(): ParseResult {
    let left = parseNot();
    if (!left.ok) return left;
    for (;;) {
      const tok = peek();
      const isAnd =
        (tok.t === 'ident' && tok.v.toLowerCase() === 'and') || (tok.t === 'op' && tok.v === '&');
      if (!isAnd) return left;
      cursor++;
      const right = parseNot();
      if (!right.ok) return right;
      left = { ok: true, node: { kind: 'bool', op: 'and', left: left.node, right: right.node } };
    }
  }

  function parseOr(): ParseResult {
    let left = parseAnd();
    if (!left.ok) return left;
    for (;;) {
      const tok = peek();
      const isOr = (tok.t === 'ident' && tok.v.toLowerCase() === 'or') || (tok.t === 'op' && tok.v === '|');
      if (!isOr) return left;
      cursor++;
      const right = parseAnd();
      if (!right.ok) return right;
      left = { ok: true, node: { kind: 'bool', op: 'or', left: left.node, right: right.node } };
    }
  }

  const result = parseOr();
  if (!result.ok) return result;

  const tail = peek();
  if (tail.t !== 'eof') {
    return err('unexpected trailing input', tail.pos);
  }
  return result;
}

function describeType(t: string | null): string {
  switch (t) {
    case 'number':
    case 'nullableNumber':
      return 'a number field';
    case 'numberLiteral':
      return 'a number';
    case 'string':
    case 'enum':
      return 'a text field';
    case 'stringLiteral':
      return 'a string';
    default:
      return 'a boolean expression';
  }
}
