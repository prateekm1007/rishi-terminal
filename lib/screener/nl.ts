/**
 * INT-D1 — the deterministic natural-language layer over the ONE
 * screener expression language.
 *
 * Pre-registration: docs/intelligence/screening.md (committed BEFORE any
 * evaluation, PR #296). This module is a CLOSED-VOCABULARY COMPILER: it
 * maps a natural-language screen to a STRING IN THE EXISTING EXPRESSION
 * LANGUAGE (`{ ok: true, query }`) or a structured refusal. It emits
 * ONLY boolean filter expressions — never symbols, counts or orderings
 * (the list is always engine-computed; "never an LLM-chosen list" holds
 * by construction). ZERO AI tokens: there is no model, no router, no
 * fetch, no clock and no randomness here — the same input produces the
 * byte-identical query, always (pinned by test).
 *
 * One-of-each discipline (Constitution 14 / rule 14):
 *   - the output goes through the EXISTING `parseQuery` in the ONE
 *     query route before evaluation — this module introduces NO second
 *     grammar, NO second evaluator, NO row filtering, and imports ONLY
 *     from './parser' (the single field registry);
 *   - sector phrases resolve to the EXACT stored sector strings of the
 *     slim index's own vocabulary (the value table below is pinned to
 *     the live data by test/screener.nl.test.ts — a data rename or a
 *     table typo breaks the build);
 *   - the expressions are emitted FULLY PARENTHESIZED so precedence is
 *     never ambiguous;
 *   - unrecognized or ambiguous intent refuses — it never widens to
 *     "all stocks" and never guesses a number (fail-closed, rule 10:
 *     refusal messages carry only the user's own tokens and the fixed
 *     vocabulary lists).
 *
 * Vocabulary (closed, pinned by test):
 *   fields      roe ("return on equity"), pe ("price to earnings",
 *               "valuation"), mktcap ("market cap", "size"), de ("debt",
 *               "leverage"), revcagr ("revenue growth", "growth"), fcf
 *               ("free cash flow"), consensus ("rishi score"),
 *               tensionSpread ("council tension", "tension spread");
 *   comparators above / over / more than / greater than / higher than /
 *               exceeding → `>`; at least → `>=`; below / under / less
 *               than / lower than → `<`; at most → `<=`; between X and Y
 *               → the and-range (normalized min..max); is null / has no
 *               data → `is null`; is not null / has data → `is not null`
 *               (consensus only — the parser's nullable field);
 *   connectives and / also / "," → and; or / either → or; not / no /
 *               excluding → `not` (applied to the following clause);
 *   numbers     plain integers and decimals, thousands separators
 *               (50,000), and unit markers consumed without semantic
 *               change (the stored fields are already in crore / percent
 *               units): crore, cr, %, percent, pct. Negative numbers and
 *               magnitudes beyond the parser's limit refuse. Ambiguous
 *               magnitudes ("huge", "cheap", "low"…) refuse — never a
 *               guessed number.
 *
 * The bare stored sector names resolve too (longest token-run match),
 * with one deliberate exception: the bare word "it" is NOT a sector
 * (stop-word collision — say "sector it"). Hyphenated variants of
 * multi-word phrases are accepted ("market-cap", "free-cash-flow").
 */

import { SCREENER_FIELDS, SCREENER_QUERY_LIMITS } from './parser';

export type NlResult = { ok: true; query: string } | { ok: false; error: { message: string } };

/** The exact stored sector strings (the slim index's own vocabulary —
 *  pinned to the live data by test; DO NOT hand-edit values here). */
const SECTOR_VALUES: readonly string[] = [
  'Chemicals', 'Capital Goods', 'Pharma', 'FMCG', 'IT', 'Auto Ancillaries',
  'NBFC', 'Banking', 'Consumer', 'Metals', 'Infra', 'Textiles', 'Energy',
  'Fintech', 'Logistics', 'Healthcare', 'Cement', 'Defence', 'Realty',
  'Auto', 'Retail', 'Media', 'Tech', 'Hospitality', 'Agri', 'Telecom',
  'Finance', 'RealEstate', 'Insurance', 'Electronics', 'Renewables',
  'Mining', 'Industrials', 'Food', 'Paints', 'Power', 'Entertainment',
  'Jewellery', 'Internet', 'Electricals', 'Education', 'Utilities',
  'Packaging', 'Oil & Gas', 'E-commerce', 'Railways', 'Engineering',
  'Building Materials', 'Biotech', 'Aviation', 'Transport', 'Steel',
  'Polymers', 'Pipes', 'Paper', 'Exchange', 'Conglomerate',
];

/** Natural-language variants → stored sector strings (closed; the
 *  stored names themselves resolve by construction — see the matcher).
 *  Exported ONLY so the test can pin every value to the live data. */
export const SECTOR_SYNONYMS: Record<string, string> = {
  bank: 'Banking',
  banks: 'Banking',
  banking: 'Banking',
  pharmaceuticals: 'Pharma',
  'health care': 'Healthcare',
  'health-care': 'Healthcare',
  software: 'IT',
  'information technology': 'IT',
  'information-technology': 'IT',
  defence: 'Defence',
  defense: 'Defence',
  realty: 'Realty',
  'real estate': 'RealEstate',
  'real-estate': 'RealEstate',
  realestate: 'RealEstate',
  automobiles: 'Auto',
  'auto components': 'Auto Ancillaries',
  'auto-components': 'Auto Ancillaries',
  infrastructure: 'Infra',
  agriculture: 'Agri',
  jewelry: 'Jewellery',
  ecommerce: 'E-commerce',
  telecommunications: 'Telecom',
  conglomerates: 'Conglomerate',
  'oil and gas': 'Oil & Gas',
  'oil & gas': 'Oil & Gas',
  'oil-and-gas': 'Oil & Gas',
  tech: 'Tech',
};

/** Field synonyms → the ONE field registry (SCREENER_FIELDS keys). */
const FIELD_SYNONYMS: ReadonlyArray<readonly [phrase: string, field: string]> = [
  ['return on equity', 'roe'],
  ['return-on-equity', 'roe'],
  ['roe', 'roe'],
  ['price to earnings', 'pe'],
  ['price-to-earnings', 'pe'],
  ['valuation', 'pe'],
  ['pe', 'pe'],
  ['market cap', 'mktcap'],
  ['market-cap', 'mktcap'],
  ['market capitalization', 'mktcap'],
  ['size', 'mktcap'],
  ['mktcap', 'mktcap'],
  ['debt to equity', 'de'],
  ['debt-to-equity', 'de'],
  ['debt equity', 'de'],
  ['debt', 'de'],
  ['leverage', 'de'],
  ['de', 'de'],
  ['revenue growth', 'revcagr'],
  ['revenue-growth', 'revcagr'],
  ['growth', 'revcagr'],
  ['revcagr', 'revcagr'],
  ['free cash flow', 'fcf'],
  ['free-cash-flow', 'fcf'],
  ['fcf', 'fcf'],
  ['rishi score', 'consensus'],
  ['rishi-score', 'consensus'],
  ['consensus', 'consensus'],
  ['council tension', 'tensionSpread'],
  ['council-tension', 'tensionSpread'],
  ['tension spread', 'tensionSpread'],
  ['tension-spread', 'tensionSpread'],
  ['tension', 'tensionSpread'],
];

const COMPARATORS: ReadonlyArray<readonly [phrase: string, op: '>' | '>=' | '<' | '<=']> = [
  ['above', '>'],
  ['over', '>'],
  ['exceeding', '>'],
  ['more than', '>'],
  ['greater than', '>'],
  ['higher than', '>'],
  ['at least', '>='],
  ['below', '<'],
  ['under', '<'],
  ['less than', '<'],
  ['lower than', '<'],
  ['at most', '<='],
];

/** Words that ASK for a magnitude without giving one — always refused. */
const MAGNITUDE_WORDS = new Set([
  'huge', 'big', 'small', 'large', 'cheap', 'expensive', 'high', 'low',
  'strong', 'weak', 'good', 'bad', 'solid', 'tiny', 'massive',
  'significant', 'decent', 'great', 'poor',
]);

const UNIT_WORDS = new Set(['crore', 'cr', '%', 'percent', 'pct']);
const NULL_TAIL_WORDS = new Set(['data', 'value', 'values']);

const CONNECTIVE_HELP =
  'supported in natural mode: fields (return on equity, price to earnings / valuation, market cap / size, ' +
  'debt / leverage, revenue growth / growth, free cash flow, rishi score / consensus, council tension), ' +
  'comparisons (above, over, more than, at least, below, under, less than, at most, between X and Y, ' +
  'is null / has no data), connectives (and, or, excluding), sector names (e.g. banks, pharma, software, ' +
  'energy) — or switch to Expression mode for the full grammar';

// ---------------------------------------------------------------------------
// Tokenizer — total, deterministic, no throw (the X3-05 shape).
// ---------------------------------------------------------------------------

const TOKEN_RE = /[a-z][a-z0-9&-]*|\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%?|&|,|-/g;

function tokenize(input: string): { ok: true; tokens: string[] } | { ok: false; message: string } {
  const tokens: string[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m = TOKEN_RE.exec(input); m !== null; m = TOKEN_RE.exec(input)) {
    const gap = input.slice(last, m.index);
    if (/\S/.test(gap)) {
      const ch = gap.trim()[0];
      return {
        ok: false,
        message: `unexpected character ${JSON.stringify(ch)} — comparisons are words in natural mode (above, below, at least, at most)`,
      };
    }
    tokens.push(m[0]);
    last = m.index + m[0].length;
  }
  const tail = input.slice(last);
  if (/\S/.test(tail)) {
    const ch = tail.trim()[0];
    return {
      ok: false,
      message: `unexpected character ${JSON.stringify(ch)} — comparisons are words in natural mode (above, below, at least, at most)`,
    };
  }
  return { ok: true, tokens };
}

const isNumberToken = (t: string): boolean => /^\d{1,3}(?:,\d{3})+(?:\.\d+)?%?$/.test(t) || /^\d+(?:\.\d+)?%?$/.test(t);

function numberValue(token: string): number {
  return Number(token.replace(/%/g, '').replace(/,/g, ''));
}

/** Split a phrase key into normalized tokens (for the tables above). */
function phraseTokens(phrase: string): string[] {
  const lexed = tokenize(phrase);
  if (!lexed.ok) throw new Error(`internal: bad vocabulary phrase ${JSON.stringify(phrase)}`);
  return lexed.tokens;
}

interface PhraseEntry {
  tokens: string[];
  op?: string;
  field?: string;
  sector?: string;
}

function buildTable(
  entries: ReadonlyArray<readonly [string, string]>,
  tag: 'field' | 'sector' | 'op',
): PhraseEntry[] {
  const table = entries.map(([phrase, value]) => ({
    tokens: phraseTokens(phrase),
    ...(tag === 'field' ? { field: value } : tag === 'sector' ? { sector: value } : { op: value }),
  }));
  // Longest token-run first; deterministic tiebreak on the phrase text.
  return table.sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length;
    return a.tokens.join(' ').localeCompare(b.tokens.join(' '));
  });
}

const FIELD_TABLE = buildTable(FIELD_SYNONYMS, 'field');
const COMPARATOR_TABLE = buildTable(COMPARATORS, 'op');
const SECTOR_VARIANT_TABLE = buildTable(
  Object.entries(SECTOR_SYNONYMS).sort(([a], [b]) => a.localeCompare(b)),
  'sector',
);

/** The stored sector names as token runs (e.g. "Oil & Gas" →
 *  [oil, &, gas]) — bare stored names resolve; "it" is excluded from
 *  bare matching (stop-word collision — say "sector it"). */
const SECTOR_NAME_TABLE: PhraseEntry[] = SECTOR_VALUES.map((value) => ({
  tokens: phraseTokens(value.toLowerCase()),
  sector: value,
}))
  .filter((e) => !(e.tokens.length === 1 && e.tokens[0] === 'it'))
  .sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length;
    return (a.sector ?? '').localeCompare(b.sector ?? '');
  });

const SECTOR_NAME_TABLE_WITH_IT: PhraseEntry[] = SECTOR_VALUES.map((value) => ({
  tokens: phraseTokens(value.toLowerCase()),
  sector: value,
})).sort((a, b) => {
  if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length;
  return (a.sector ?? '').localeCompare(b.sector ?? '');
});

function matchPhrase(table: PhraseEntry[], tokens: string[], pos: number): PhraseEntry | null {
  for (const entry of table) {
    if (pos + entry.tokens.length > tokens.length) continue;
    let hit = true;
    for (let k = 0; k < entry.tokens.length; k++) {
      if (tokens[pos + k] !== entry.tokens[k]) {
        hit = false;
        break;
      }
    }
    if (hit) return entry;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The compiler — a tiny recursive descent over the NL token stream that
// emits fully parenthesized expressions in the ONE grammar.
// ---------------------------------------------------------------------------

function refusal(message: string): NlResult {
  return { ok: false, error: { message: `${message} ${CONNECTIVE_HELP}` } };
}

/** Quoted user token — truncated so a refusal stays a bounded, safe,
 *  single-line message (rule 10: the user's own tokens + fixed lists). */
function quote(token: string): string {
  return JSON.stringify(token.length > 40 ? `${token.slice(0, 40)}...` : token);
}

export function nlToQuery(input: string): NlResult {
  if (typeof input !== 'string') {
    return refusal('natural-language screening needs text —');
  }
  const text = input.trim();
  if (text.length === 0) {
    return refusal('empty input — describe the screen in words, e.g. "roe above 15 and sector banking" —');
  }
  if (text.length > SCREENER_QUERY_LIMITS.maxLength) {
    return refusal(`input too long (limit ${SCREENER_QUERY_LIMITS.maxLength} characters) —`);
  }

  const lexed = tokenize(text.toLowerCase());
  if (!lexed.ok) return refusal(lexed.message);
  const tokens = lexed.tokens;
  if (tokens.length > SCREENER_QUERY_LIMITS.maxTokens) {
    return refusal(`too many tokens (limit ${SCREENER_QUERY_LIMITS.maxTokens}) —`);
  }

  let pos = 0;

  const peek = (): string | null => (pos < tokens.length ? tokens[pos] : null);

  function parseNumber(minPos = pos): NlResult {
    const tok = peek();
    if (tok === null) {
      pos = minPos;
      return refusal(`expected a number after "${tokens.slice(minPos, pos).join(' ')}" —`);
    }
    if (tok === '-') {
      return refusal('negative numbers are not supported — the screener fields are positive magnitudes —');
    }
    if (MAGNITUDE_WORDS.has(tok)) {
      return refusal(`cannot guess a number from ${quote(tok)} — give an exact value —`);
    }
    if (!isNumberToken(tok)) {
      pos = minPos;
      return refusal(`expected a number after "${tokens.slice(minPos, pos).join(' ')}" —`);
    }
    const value = numberValue(tok);
    if (!Number.isFinite(value) || Math.abs(value) > SCREENER_QUERY_LIMITS.maxNumberMagnitude) {
      return refusal(`numbers out of range (limit ${SCREENER_QUERY_LIMITS.maxNumberMagnitude}) —`);
    }
    pos++;
    // Consume the closed unit-marker run — units are decorative here
    // (the stored fields already carry crore / percent units).
    while (peek() !== null && UNIT_WORDS.has(peek() as string)) pos++;
    return { ok: true, query: String(value) };
  }

  function parseClause(): NlResult {
    const tok = peek();

    if (tok === null) {
      return refusal('unexpected end of input — expected a comparison clause (e.g. "roe above 15") —');
    }

    // Ambiguous magnitude in subject position — never guessed.
    if (MAGNITUDE_WORDS.has(tok)) {
      return refusal(`cannot guess a number from "${tok}" — give an exact value —`);
    }

    // Negation binds to the following clause.
    if (tok === 'not' || tok === 'no' || tok === 'excluding') {
      pos++;
      const inner = parseClause();
      if (!inner.ok) return inner;
      return { ok: true, query: `not ${inner.query}` };
    }

    // "either" opens the first branch of an or.
    if (tok === 'either') {
      pos++;
      return parseClause();
    }

    // Sector clauses: "sector <name>" (every stored name, incl. "it")
    // or a bare sector phrase (variants + stored names minus "it").
    if (tok === 'sector') {
      const after = pos + 1;
      const entry = matchPhrase(SECTOR_NAME_TABLE_WITH_IT, tokens, after);
      if (entry && entry.sector) {
        pos = after + entry.tokens.length;
        return { ok: true, query: `(sector = "${entry.sector}")` };
      }
      const word = tokens[after] ?? '';
      return refusal(`unknown sector ${quote(word)} — the supported sector names are the stored sector names (e.g. Banking, Pharma, IT, Energy, FMCG) —`);
    }
    const bareSector = matchPhrase(SECTOR_VARIANT_TABLE, tokens, pos) ?? matchPhrase(SECTOR_NAME_TABLE, tokens, pos);
    if (bareSector && bareSector.sector) {
      pos += bareSector.tokens.length;
      return { ok: true, query: `(sector = "${bareSector.sector}")` };
    }

    // Numeric / nullable field clauses.
    const field = matchPhrase(FIELD_TABLE, tokens, pos);
    if (field && field.field) {
      const fieldStart = pos;
      pos += field.tokens.length;
      const fieldName = field.field;

      const cmp = matchPhrase(COMPARATOR_TABLE, tokens, pos);
      if (cmp && cmp.op) {
        pos += cmp.tokens.length;
        const value = parseNumber(fieldStart);
        if (!value.ok) return value;
        return { ok: true, query: `(${fieldName} ${cmp.op} ${value.query})` };
      }

      if (peek() === 'between') {
        pos++;
        const lo = parseNumber(fieldStart);
        if (!lo.ok) return lo;
        if (peek() !== 'and') {
          return refusal('expected "and" and a second number to complete "between X and Y" —');
        }
        pos++;
        const hi = parseNumber(fieldStart);
        if (!hi.ok) return hi;
        const a = Number(lo.query);
        const b = Number(hi.query);
        // Normalize the range (ordering two given numbers — never guessing one).
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return { ok: true, query: `((${fieldName} >= ${min}) and (${fieldName} <= ${max}))` };
      }

      // is null / is not null / has no (data) / has (data) — consensus only.
      const nullable = SCREENER_FIELDS[fieldName].type === 'nullableNumber';
      if (peek() === 'is') {
        if (!nullable) {
          return refusal(`only consensus can be checked for missing data —`);
        }
        pos++;
        if (peek() === 'not') pos++;
        if (peek() !== 'null') {
          return refusal('expected "null" (or "not null") after "is" —');
        }
        pos++;
        const negated = tokens.slice(fieldStart, pos).includes('not');
        return { ok: true, query: `(consensus is ${negated ? 'not ' : ''}null)` };
      }
      if (peek() === 'has') {
        if (!nullable) {
          return refusal(`only consensus can be checked for missing data —`);
        }
        pos++;
        const negated = peek() === 'no';
        if (negated) pos++;
        while (peek() !== null && NULL_TAIL_WORDS.has(peek() as string)) pos++;
        return { ok: true, query: `(consensus is ${negated ? '' : 'not '}null)` };
      }
      if (peek() !== null && MAGNITUDE_WORDS.has(peek() as string)) {
        return refusal(`cannot guess a number from ${quote(peek() as string)} — give an exact value —`);
      }
      // This message already names the comparator list — appending the
      // full HELP would duplicate it (bounded-message discipline).
      return {
        ok: false,
        error: {
          message: `expected a comparison after ${quote(tokens.slice(fieldStart, pos).join(' '))} — supported: above, over, more than, at least, below, under, less than, at most, between X and Y, is null / has no data`,
        },
      };
    }

    return refusal(`could not understand ${quote(tok)} —`);
  }

  function parseAnd(): NlResult {
    const first = parseClause();
    if (!first.ok) return first;
    const parts: string[] = [first.query];
    while (peek() === 'and' || peek() === 'also' || peek() === ',') {
      pos++;
      const next = parseClause();
      if (!next.ok) return next;
      parts.push(next.query);
    }
    return parts.length === 1 ? first : { ok: true, query: `(${parts.join(' and ')})` };
  }

  function parseOr(): NlResult {
    const first = parseAnd();
    if (!first.ok) return first;
    const parts: string[] = [first.query];
    while (peek() === 'or') {
      pos++;
      const next = parseAnd();
      if (!next.ok) return next;
      parts.push(next.query);
    }
    return parts.length === 1 ? first : { ok: true, query: `(${parts.join(' or ')})` };
  }

  const result = parseOr();
  if (!result.ok) return result;

  const trailing = peek();
  if (trailing !== null) {
    return refusal(`unexpected trailing input ${quote(trailing)} —`);
  }

  if (result.query.length > SCREENER_QUERY_LIMITS.maxLength) {
    return refusal(`the translated expression is too long (limit ${SCREENER_QUERY_LIMITS.maxLength} characters) — split the screen into fewer clauses —`);
  }
  return result;
}
