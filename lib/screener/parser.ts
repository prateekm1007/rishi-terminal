// lib/screener/parser.ts
// X3-05 (Round 14): the screener's expression language — a HAND-WRITTEN
// tokenizer + recursive-descent parser + AST evaluator.
//
// Why hand-written: the roadmap forbids eval and dynamic-function
// construction, and a regex-replace filter DSL is how injection bugs
// happen. Here the input can only ever become an AST of whitelisted nodes
// — there is no path from a string to code execution (the acceptance's
// static grep over app/ and lib/ stays empty — note THIS comment does not
// contain the literal pattern, or the gate would trip on it; the fuzz
// test throws 10k random strings at the parser and nothing ever escapes
// as an uncaught throw).
//
// Grammar (deliberately minimal):
//   expr     := or-expr
//   or-expr  := and-expr ( ("or" | "||") and-expr )*
//   and-expr := not-expr ( ("and" | "&&") not-expr )*
//   not-expr := ("not" | "!") not-expr | comparison
//   comparison := operand ( op operand )?
//   operand  := NUMBER | STRING | FIELD | "(" expr ")"
//   op       := ">" ">=" "<" "<=" "==" "!="
//
// Safety caps (fail-closed, rule 6): input length ≤ 400 chars, ≤ 200
// tokens, paren depth ≤ 24. Anything outside the whitelist — identifiers
// that are not fields, any call syntax, property access, arithmetic that
// could enable exponent abuse — is a typed ParseError, which the fuzz test
// treats as the ONLY legal failure mode.
//
// Null semantics (rule 16 — null is a real value): a comparison against a
// field whose value is null/undefined is FALSE (a missing metric never
// satisfies a screen). This is documented and pinned by the tests.

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/** Hard caps — the parser rejects anything beyond these before touching it. */
export const MAX_EXPRESSION_LENGTH = 400;
export const MAX_TOKENS = 200;
export const MAX_DEPTH = 24;

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "field"; name: string }
  | { kind: "op"; value: ">" | ">=" | "<" | "<=" | "==" | "!=" }
  | { kind: "logic"; value: "and" | "or" | "not" }
  | { kind: "lparen" }
  | { kind: "rparen" };

const WORD_OPS: Record<string, "and" | "or" | "not"> = { and: "and", or: "or", not: "not" };

/** The ONLY fields an expression may reference. The screener's row type is
 *  the source of truth (lib/scoring/slimIndex.ts `SlimStockRow`) — the
 *  evaluator looks values up through this map, so an unknown identifier
 *  never reaches evaluation. */
export const SCREENER_FIELDS: Record<string, "number" | "string"> = {
  consensus: "number",
  pe: "number",
  roe: "number",
  mktcap: "number",
  de: "number",
  revcagr: "number",
  fcf: "number",
  tensionSpread: "number",
  symbol: "string",
  name: "string",
  sector: "string",
  category: "string",
  dataQuality: "string",
};

/** Lowercase alias map for case-insensitive lookups; the value is the
 *  CANONICAL field name (the row's own key). */
export const SCREENER_FIELD_ALIASES: Record<string, string> = Object.fromEntries(
  Object.keys(SCREENER_FIELDS).map(k => [k.toLowerCase(), k]),
);

function tokenize(input: string): Token[] {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_EXPRESSION_LENGTH) {
    throw new ParseError("expression must be a non-empty string of at most 400 characters");
  }
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (ch === ">" || ch === "<" || ch === "=" || ch === "!") {
      if (ch === "=" && input[i + 1] === "=") {
        tokens.push({ kind: "op", value: "==" });
        i += 2;
        continue;
      }
      if (ch === "!" && input[i + 1] === "=") {
        tokens.push({ kind: "op", value: "!=" });
        i += 2;
        continue;
      }
      if (ch === "=") throw new ParseError("use == for equality");
      if (ch === "!" && !(input[i + 1] === "=")) {
        // standalone "!" is NOT in the grammar's op set — `not` is the word
        throw new ParseError("unexpected '!'");
      }
      const two = input[i + 1] === "=";
      tokens.push({ kind: "op", value: (ch + (two ? "=" : "")) as ">" | ">=" | "<" | "<=" });
      i += two ? 2 : 1;
      continue;
    }
    if (ch === "&" || ch === "|") {
      const two = input[i + 1] === ch;
      if (!two) throw new ParseError(`unexpected '${ch}'`);
      tokens.push({ kind: "logic", value: ch === "&" ? "and" : "or" });
      i += 2;
      continue;
    }
    if (ch === "'") {
      // single-quoted string; no escapes (keep it simple, keep it safe)
      const end = input.indexOf("'", i + 1);
      if (end === -1) throw new ParseError("unterminated string");
      tokens.push({ kind: "string", value: input.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? "")) || (ch === "-" && /[0-9]/.test(input[i + 1] ?? ""))) {
      // a leading '-' binds to the number ONLY when a digit follows — the
      // grammar has no arithmetic, so this is unambiguous (no `pe - 5`)
      const start = i;
      if (ch === "-") i++;
      while (i < input.length && /[0-9.]/.test(input[i])) i++;
      const raw = input.slice(start, i);
      if (!/^-?[0-9]+(\.[0-9]+)?$/.test(raw)) throw new ParseError(`bad number '${raw}'`);
      tokens.push({ kind: "number", value: Number(raw) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) i++;
      const word = input.slice(start, i).toLowerCase();
      if (WORD_OPS[word]) {
        tokens.push({ kind: "logic", value: WORD_OPS[word] });
      } else {
        // fields are case-INSENSITIVE (mapped to the canonical row key); an
        // unknown identifier is rejected HERE (whitelist, rule 6)
        const canonical = SCREENER_FIELD_ALIASES[word];
        if (!canonical) throw new ParseError(`unknown field '${word}'`);
        tokens.push({ kind: "field", name: canonical });
      }
      continue;
    }
    throw new ParseError(`unexpected character '${ch}'`);
    // (no `i++` — unreachable, but the throw keeps the loop honest)
  }
  if (tokens.length === 0 || tokens.length > MAX_TOKENS) {
    throw new ParseError("expression is empty or too long");
  }
  return tokens;
}

export type Ast =
  | { kind: "logic"; op: "and" | "or"; left: Ast; right: Ast }
  | { kind: "not"; inner: Ast }
  | { kind: "compare"; field: string; op: ">" | ">=" | "<" | "<=" | "==" | "!="; value: number | string; valueField?: string }
  | { kind: "compareFields"; field: string; op: ">" | ">=" | "<" | "<=" | "==" | "!="; field2: string }
  | { kind: "true" };

interface Cursor {
  tokens: Token[];
  pos: number;
  depth: number;
}

function peek(c: Cursor): Token | null {
  return c.tokens[c.pos] ?? null;
}

function parseOr(c: Cursor, depth: number): Ast {
  if (depth > MAX_DEPTH) throw new ParseError("expression nesting too deep");
  let left = parseAnd(c, depth);
  for (;;) {
    const t = peek(c);
    if (t && t.kind === "logic" && t.value === "or") {
      c.pos++;
      const right = parseAnd(c, depth);
      left = { kind: "logic", op: "or", left, right };
      continue;
    }
    return left;
  }
}

function parseAnd(c: Cursor, depth: number): Ast {
  if (depth > MAX_DEPTH) throw new ParseError("expression nesting too deep");
  let left = parseNot(c, depth);
  for (;;) {
    const t = peek(c);
    if (t && t.kind === "logic" && t.value === "and") {
      c.pos++;
      const right = parseNot(c, depth);
      left = { kind: "logic", op: "and", left, right };
      continue;
    }
    return left;
  }
}

function parseNot(c: Cursor, depth: number): Ast {
  if (depth > MAX_DEPTH) throw new ParseError("expression nesting too deep");
  const t = peek(c);
  if (t && t.kind === "logic" && t.value === "not") {
    c.pos++;
    const inner = parseNot(c, depth + 1);
    return { kind: "not", inner };
  }
  return parseComparison(c, depth);
}

function isValueToken(t: Token | null): boolean {
  return t !== null && (t.kind === "number" || t.kind === "string" || t.kind === "field" || t.kind === "lparen");
}

function parseComparison(c: Cursor, depth: number): Ast {
  if (depth > MAX_DEPTH) throw new ParseError("expression nesting too deep");
  const t = peek(c);
  if (t && t.kind === "lparen") {
    c.pos++;
    const inner = parseOr(c, depth + 1);
    const close = peek(c);
    if (!close || close.kind !== "rparen") throw new ParseError("missing ')'");
    c.pos++;
    // a parenthesised group followed by an operator would need a richer
    // grammar — the screener language intentionally keeps operands atomic
    if (isValueToken(peek(c))) throw new ParseError("unexpected token after ')'");
    return inner;
  }
  if (t && t.kind === "field") {
    const field = t.name;
    c.pos++;
    const op = peek(c);
    if (!op || op.kind !== "op") throw new ParseError(`field '${field}' needs a comparison operator`);
    c.pos++;
    const value = peek(c);
    if (value && value.kind === "number" || value && value.kind === "string") {
      c.pos++;
      if (isValueToken(peek(c))) throw new ParseError("unexpected token after value");
      return { kind: "compare", field, op: op.value, value: value.value };
    }
    if (value && value.kind === "field") {
      c.pos++;
      if (isValueToken(peek(c))) throw new ParseError("unexpected token after value");
      return { kind: "compareFields", field, op: op.value, field2: value.name };
    }
    throw new ParseError("comparison needs a number, quoted string or field");
  }
  if (t && (t.kind === "number" || t.kind === "string")) {
    // literal on the left (e.g. `15 < pe`) — support by swapping
    c.pos++;
    const op = peek(c);
    if (!op || op.kind !== "op") throw new ParseError("literal needs a comparison operator");
    c.pos++;
    const right = peek(c);
    if (!right || right.kind !== "field") throw new ParseError("literal comparison needs a field on the right");
    c.pos++;
    if (isValueToken(peek(c))) throw new ParseError("unexpected token after value");
    const flipped = flipOp(op.value);
    return t.kind === "number"
      ? { kind: "compare", field: right.name, op: flipped, value: t.value as number }
      : { kind: "compare", field: right.name, op: flipped, value: t.value as string };
  }
  throw new ParseError("expected a field, literal or group");
}

function flipOp(op: ">" | ">=" | "<" | "<=" | "==" | "!="): ">" | ">=" | "<" | "<=" | "==" | "!=" {
  switch (op) {
    case ">": return "<";
    case ">=": return "<=";
    case "<": return ">";
    case "<=": return ">=";
    default: return op;
  }
}

/** Parse an expression into an AST. Throws ParseError (and ONLY ParseError)
 *  on any invalid input. */
export function parseExpression(input: string): Ast {
  const c: Cursor = { tokens: tokenize(input), pos: 0, depth: 0 };
  const ast = parseOr(c, 0);
  if (c.pos !== c.tokens.length) throw new ParseError("unexpected trailing tokens");
  return ast;
}

export interface ScreenerRowLike {
  [key: string]: number | string | null | undefined;
}

function fieldValue(row: ScreenerRowLike, field: string): number | string | null | undefined {
  return row[field];
}

/** Evaluate the AST against one row. Null/missing field values make any
 *  comparison false (rule 16 — a missing metric never satisfies a screen). */
export function evalExpression(ast: Ast, row: ScreenerRowLike): boolean {
  switch (ast.kind) {
    case "true":
      return true;
    case "logic":
      if (ast.op === "and") return evalExpression(ast.left, row) && evalExpression(ast.right, row);
      return evalExpression(ast.left, row) || evalExpression(ast.right, row);
    case "not":
      return !evalExpression(ast.inner, row);
    case "compare": {
      const left = fieldValue(row, ast.field);
      const right = ast.value;
      if (left === null || left === undefined) return false;
      if (typeof left !== typeof right) {
        // a number field compared to a string literal (or vice versa) is a
        // type error at eval time — fail the comparison, not the run
        return false;
      }
      return compare(left as number | string, ast.op, right as number | string);
    }
    case "compareFields": {
      const left = fieldValue(row, ast.field);
      const right = fieldValue(row, ast.field2);
      if (left === null || left === undefined || right === null || right === undefined) return false;
      if (typeof left !== typeof right) return false;
      return compare(left as number | string, ast.op, right as number | string);
    }
  }
}

function compare(a: number | string, op: ">" | ">=" | "<" | "<=" | "==" | "!=" | "and" | "or", b: number | string): boolean {
  switch (op) {
    case ">": return a > b;
    case ">=": return a >= b;
    case "<": return a < b;
    case "<=": return a <= b;
    case "==": return a === b;
    case "!=": return a !== b;
    default: return false;
  }
}

/** Parse + evaluate in one step (the API route's entry point). Throws
 *  ParseError on invalid input — the route maps that to a 400. */
export function matchesExpression(input: string, row: ScreenerRowLike): boolean {
  return evalExpression(parseExpression(input), row);
}
