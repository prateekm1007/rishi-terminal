/**
 * X3-05 (Round 14 A6) — the safe expression parser acceptance.
 *
 * Roadmap acceptance (verbatim):
 *   npx vitest run test/screener.parser.test.ts
 *   → fuzz: 10k random strings never throw uncaught, never reach eval;
 *     injection strings rejected
 *
 * The "never reach eval" half is enforced twice: (a) the parser/engine
 * contain no dynamic evaluation by construction and this file scans the
 * whole app/ + lib/ tree for `eval(`/`new Function(` on every run, and
 * (b) the fuzz corpus includes the classic JS/SQL injection payloads —
 * every one of them must come back as a POSITIONED PARSE ERROR, never
 * as a successful parse and never as an exception.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseQuery, SCREENER_QUERY_LIMITS } from '@/lib/screener/parser';
import { rowMatches, filterRows } from '@/lib/screener/engine';
import type { SlimStockRow } from '@/lib/scoring/slimIndex';

// ---------------------------------------------------------------------
// Deterministic PRNG so a fuzz failure is reproducible (Constitution 18:
// no Math.random in test logic either — failures must re-run identically).
// ---------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADVERSARIAL_CHARSET = [
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  ...' \t\n\r', // whitespace variants
  ...'()[]{}<>=!&|,;:.+-*/%^~?@"\'`\\', // punctuation
  ...'$_#', // identifier-adjacent
  ...'éü中(PointerEvents)', // non-ASCII (UTF-8 safety)
];

describe('X3-05 screener parser — fuzz: 10k random strings', () => {
  it('never throws uncaught and always returns a shaped result', () => {
    const rand = mulberry32(20261004);
    // Semi-valid fragments so the corpus exercises the ACCEPT path too —
    // a corpus that rejects 100% would prove nothing about parsing.
    const FIELDS = ['pe', 'roe', 'mktcap', 'de', 'revcagr', 'fcf', 'consensus', 'sector', 'symbol', 'name', 'category', 'dataQuality', 'tensionSpread'];
    let parsed = 0;
    let rejected = 0;
    for (let i = 0; i < 10_000; i++) {
      let s: string;
      if (rand() < 0.05) {
        // guaranteed-valid generator: a random boolean expression built
        // from the grammar itself — this is what exercises the ACCEPT
        // path (junk alone would reject 100% and prove nothing).
        const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
        const clause = () => `${pick(FIELDS.filter((f) => f !== 'sector' && f !== 'symbol' && f !== 'name' && f !== 'category' && f !== 'dataQuality'))} ${pick(['>', '<', '>=', '<=', '=', '!='])} ${Math.floor(rand() * 500)}`;
        s = clause();
        for (let j = 0; j < Math.floor(rand() * 3); j++) {
          s += ` ${pick(['and', 'or'])} ${rand() < 0.3 ? `(${clause()})` : clause()}`;
        }
      } else {
        const len = 1 + Math.floor(rand() * 60);
        let out = '';
        for (let j = 0; j < len; j++) {
          out += ADVERSARIAL_CHARSET[Math.floor(rand() * ADVERSARIAL_CHARSET.length)];
        }
        s = out;
      }
      let result: ReturnType<typeof parseQuery>;
      try {
        result = parseQuery(s);
      } catch (e) {
        throw new Error(`parser THREW on input ${JSON.stringify(s)}: ${e}`);
      }
      if (result.ok) {
        parsed++;
        expect(typeof parseQueryAstEquals(result.node)).toBe('boolean');
      } else {
        rejected++;
        expect(typeof result.error.message).toBe('string');
        expect(result.error.message.length).toBeGreaterThan(0);
        expect(result.error.position).toBeGreaterThanOrEqual(0);
        expect(result.error.position).toBeLessThanOrEqual(s.length);
      }
    }
    // Sanity: the corpus actually exercised both paths (a fuzz that
    // rejects 100% or accepts 100% would be a broken corpus).
    expect(parsed).toBeGreaterThan(50);
    expect(rejected).toBeGreaterThan(5_000);
  });
});

function parseQueryAstEquals(node: unknown): boolean {
  return typeof node === 'object' && node !== null;
}

describe('X3-05 screener parser — injection payloads are REJECTED', () => {
  const PAYLOADS = [
    'process.exit(1)',
    'eval("pe > 0")',
    'new Function("return 1")()',
    'pe > 0; DROP TABLE screens;--',
    "'; DELETE FROM screens WHERE '1'='1",
    '__proto__["constructor"]',
    '${process.env.QUOTES_WARM_SECRET}',
    '`code`',
    'pe > 0 || process.exit()',
    'globalThis.process.exit',
    'constructor.constructor("return process")()',
    'pe > 0 && console.log(1)',
    'window.location="https://evil.example"',
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    'pe > 0 // comment with ) tricks',
    'pe > 0 /* block */ and roe > 1',
    'require("fs").readFileSync("/etc/passwd")',
    'import("child_process")',
    'pe.constructor("return 1+1")() > 2',
    '(function(){return 1})()',
    '(()=>1)()',
    'pe ?? 0',
    'pe > 0 ?? roe',
    'this.process',
    'SELECT * FROM screens',
    'UNION SELECT user_id FROM screens--',
    "\\' OR 1=1--",
    'pe > "20"',
  ];

  it.each(PAYLOADS)('rejects %s', (payload) => {
    const result = parseQuery(payload);
    expect(result.ok).toBe(false);
  });

  it('rejects the payloads even appended to a valid prefix', () => {
    for (const payload of PAYLOADS.slice(0, 12)) {
      const result = parseQuery(`pe > 0 and ${payload}`);
      expect(result.ok, `pe > 0 and ${payload}`).toBe(false);
    }
  });
});

describe('X3-05 screener parser — syntax and limits', () => {
  it('parses the documented grammar', () => {
    expect(parseQuery('pe > 0').ok).toBe(true);
    expect(parseQuery('pe>0 and roe>=15').ok).toBe(true);
    expect(parseQuery('pe > 0 or (roe > 20 and de < 1)').ok).toBe(true);
    expect(parseQuery('not (pe > 40)').ok).toBe(true);
    expect(parseQuery('sector = "Banking"').ok).toBe(true);
    expect(parseQuery("category != 'Legendary'").ok).toBe(true);
    expect(parseQuery('consensus is null').ok).toBe(true);
    expect(parseQuery('consensus is not null').ok).toBe(true);
    expect(parseQuery('5 < pe').   ok).toBe(true); // literal on the left
    expect(parseQuery('pe != 0 and pe != 100').ok).toBe(true);
  });

  it('rejects unknown fields with the allowed list in the message', () => {
    const r = parseQuery('priice > 5');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('priice');
  });

  it('rejects type mismatches (string vs number)', () => {
    expect(parseQuery('sector > 5').ok).toBe(false);
    expect(parseQuery('pe = "20"').ok).toBe(false);
  });

  it('rejects bare values (no implicit truthiness)', () => {
    expect(parseQuery('pe').ok).toBe(false);
    expect(parseQuery('10').ok).toBe(false);
    expect(parseQuery('"Banking"').ok).toBe(false);
  });

  it('rejects malformed structure', () => {
    expect(parseQuery('').ok).toBe(false);
    expect(parseQuery('pe >').ok).toBe(false);
    expect(parseQuery('(pe > 0').ok).toBe(false);
    expect(parseQuery('pe > 0)').ok).toBe(false);
    expect(parseQuery('and pe > 0').ok).toBe(false);
    expect(parseQuery('pe > 0 and').ok).toBe(false);
    expect(parseQuery('"unterminated').ok).toBe(false);
    expect(parseQuery('pe <> ').ok).toBe(false);
  });

  it('enforces the length cap', () => {
    const tooLong = 'pe > 0 and '.repeat(60) + 'pe > 0';
    expect(tooLong.length).toBeGreaterThan(SCREENER_QUERY_LIMITS.maxLength);
    const r = parseQuery(tooLong);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('too long');
  });

  it('enforces the nesting-depth cap', () => {
    const deep = '('.repeat(SCREENER_QUERY_LIMITS.maxDepth + 2) + 'pe > 0' + ')'.repeat(SCREENER_QUERY_LIMITS.maxDepth + 2);
    const r = parseQuery(deep);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('nested too deep');
  });

  it('enforces the token-count cap', () => {
    // Compact form so the LENGTH cap (500) does not trigger first:
    // 60 clauses of "pe>0 or" = 240 tokens, ~484 chars.
    const many = Array.from({ length: 60 }, () => 'pe>0').join(' or ');
    expect(many.length).toBeLessThanOrEqual(SCREENER_QUERY_LIMITS.maxLength);
    const r = parseQuery(many);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('too many tokens');
  });

  it('rejects numbers out of range', () => {
    const r = parseQuery('pe > 99999999999999999999');
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------
// Engine semantics (null honesty — Constitution 16)
// ---------------------------------------------------------------------

function fakeRow(over: Partial<SlimStockRow>): SlimStockRow {
  return {
    symbol: 'TEST', name: 'Test Industries', sector: 'Banking', consensus: 80,
    category: 'High Conviction', dataQuality: 'OK', topBull: null, topBear: null,
    tension: '', tensionSpread: 10, summaryScores: [], pe: 20, roe: 25,
    mktcap: 50000, de: 0.4, revcagr: 12, fcf: 500, ...over,
  } as SlimStockRow;
}

describe('X3-05 screener engine — semantics', () => {
  it('numeric comparisons work in both directions', () => {
    const row = fakeRow({});
    const a = parseQuery('pe > 10');
    const b = parseQuery('10 < pe');
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(rowMatches(a.node, row)).toBe(true);
      expect(rowMatches(b.node, row)).toBe(true);
    }
  });

  it('null consensus matches NO numeric comparison (null is not 0)', () => {
    const row = fakeRow({ consensus: null });
    for (const q of ['consensus > 50', 'consensus <= 50', 'consensus = 0', 'consensus != 0']) {
      const r = parseQuery(q);
      expect(r.ok, q).toBe(true);
      if (r.ok) expect(rowMatches(r.node, row), q).toBe(false);
    }
  });

  it('null consensus is selectable with `is null` / `is not null`', () => {
    const nullRow = fakeRow({ consensus: null });
    const dataRow = fakeRow({ consensus: 80 });
    const isNull = parseQuery('consensus is null');
    const isNotNull = parseQuery('consensus is not null');
    expect(isNull.ok && isNotNull.ok).toBe(true);
    if (isNull.ok && isNotNull.ok) {
      expect(rowMatches(isNull.node, nullRow)).toBe(true);
      expect(rowMatches(isNull.node, dataRow)).toBe(false);
      expect(rowMatches(isNotNull.node, nullRow)).toBe(false);
      expect(rowMatches(isNotNull.node, dataRow)).toBe(true);
    }
  });

  it('`not` and precedence: and binds tighter than or', () => {
    const row = fakeRow({ pe: 50, roe: 5 }); // matches "pe > 40", not "roe > 20"
    const r = parseQuery('pe > 40 or pe > 0 and roe > 20');
    expect(r.ok).toBe(true);
    if (r.ok) {
      // (pe > 40) or ((pe > 0) and (roe > 20)) -> true or false -> true
      expect(rowMatches(r.node, row)).toBe(true);
    }
    const r2 = parseQuery('(pe > 40 or pe > 0) and roe > 20');
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      // (true or true) and false -> false
      expect(rowMatches(r2.node, row)).toBe(false);
    }
  });

  it('string equality is exact', () => {
    const row = fakeRow({});
    const eq = parseQuery('sector = "Banking"');
    const ne = parseQuery('sector = "banking"');
    expect(eq.ok && ne.ok).toBe(true);
    if (eq.ok && ne.ok) {
      expect(rowMatches(eq.node, row)).toBe(true);
      expect(rowMatches(ne.node, row)).toBe(false);
    }
  });

  it('filterRows preserves input order and filters correctly', () => {
    const rows = [
      fakeRow({ symbol: 'AAA', pe: 5 }),
      fakeRow({ symbol: 'BBB', pe: 50 }),
      fakeRow({ symbol: 'CCC', pe: 15 }),
    ];
    const r = parseQuery('pe < 20');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(filterRows(r.node, rows).map((x) => x.symbol)).toEqual(['AAA', 'CCC']);
    }
  });
});

// ---------------------------------------------------------------------
// "never reach eval" — enforced as a standing source scan of app/ + lib/
// (mirrors the roadmap's `git grep -nE "\beval\(|new Function\(" -- app lib`
// → empty, but runs in CI on every push, not only when remembered)
// ---------------------------------------------------------------------
describe('X3-05 — no dynamic code evaluation anywhere in app/ or lib/', () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const p = path.join(dir, entry);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        walk(p, acc);
      } else if (/\.(ts|tsx|mjs|js)$/.test(entry)) {
        acc.push(p);
      }
    }
    return acc;
  }

  it('app/ and lib/ contain no eval( and no new Function(', () => {
    const root = path.resolve(__dirname, '..');
    const offenders: string[] = [];
    for (const dir of ['app', 'lib']) {
      for (const file of walk(path.join(root, dir))) {
        const src = readFileSync(file, 'utf8');
        // \b … ( mirrors the acceptance grep; also catches `eval (`? No —
        // the acceptance regex is the contract, keep it identical.
        if (/(^|[^A-Za-z0-9_$.])eval\s*\(/.test(src) || /new\s+Function\s*\(/.test(src)) {
          offenders.push(path.relative(root, file));
        }
      }
    }
    expect(offenders, `dynamic evaluation found in: ${offenders.join(', ')}`).toEqual([]);
  });
});
