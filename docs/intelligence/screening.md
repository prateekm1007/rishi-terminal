# INT-D1 Screening — natural-language screening over the ONE engine (pre-registration)

Roadmap item D1 ("PHASE D — Screening · Stock Intelligence · Stock
Dossier", first item in the frozen order — the position-within-phase
id scheme of B1/C1). Dependencies: the screener stack (X3-05: the safe
expression parser, the server engine, the slim index) — all CLOSED and
stable on `origin/main` = `e8db343`; no intelligence substrate is
consumed by this item. This document is committed BEFORE any
evaluation (the A5–C1 precedent). The translation contract, the
refusal table and the no-second-parser pins are enforced by test — a
silent change breaks the build.

## What exists today (surveyed, reused — nothing rebuilt)

- `lib/screener/parser.ts` (X3-05): THE safe expression language —
  hand-written tokenizer + recursive-descent parser, no eval/Function,
  closed field registry (`SCREENER_FIELDS` — 13 fields, one registry,
  Constitution 14), hard limits (500 chars / 200 tokens / depth 24),
  unknown fields and type mismatches are PARSE errors, null is a real
  value (`is null` / `is not null`). Fuzz-pinned: 10k random strings
  produce no uncaught throw and no injection.
- `lib/screener/engine.ts` `filterRows`: THE evaluation engine over
  the slim index. `POST /api/screener/query` (X3-05): THE query route
  — parse → evaluate → `{ ok, rows, count, elapsedMs }`; 400 with a
  safe message on parse errors (only the user's tokens + the fixed
  field list); per-IP 120/60 s compute defense.
- `components/screener/ScreenerQueryBar.tsx`: the query UI —
  expression input, server evaluation, saved screens (`/api/screens`,
  auth-gated), CSV export. The expression NEVER runs in the browser.
- `app/stocks/page.tsx` → `ScreenerClient`: the canonical screening
  surface (`/screener` 308s here); presets + query results + stat
  pills over the slim rows; bundle ratchet 162.0 kB (+2 tolerance).

## What D1 is

1. **The deterministic NL layer** (`lib/screener/nl.ts`, SERVER
   module — zero client bundle): `nlToQuery(input: string)` maps a
   natural-language screen to a STRING IN THE EXISTING EXPRESSION
   LANGUAGE — `{ ok: true, query }` or a structured refusal. The
   mapper is a closed-vocabulary compiler, pinned deterministic (same
   input → same query, byte-identical):
   - field synonyms → the EXISTING `SCREENER_FIELDS` registry (one
     field registry — no second name list): roe/"return on equity",
     pe/"price to earnings"/"valuation", mktcap/"market cap"/"size",
     de/"debt"/"leverage", revcagr/"revenue growth"/"growth",
     fcf/"free cash flow", consensus/"rishi score"/"consensus",
     tensionSpread/"council tension"; sector names come from the slim
     index's own sector vocabulary (exact stored strings);
   - comparator phrases → the existing operators: "above/over/more
     than/at least/exceeding" → `>` / `>=`, "below/under/less than/at
     most" → `<` / `<=`, "between X and Y" → the and-range form,
     "is null"/"has no" → `is null`, "is not null"/"has" → `is not
     null`;
   - connectives: "and"/"also"/"," → `and`; "or"/"either" → `or`;
     "not"/"no"/"excluding" → `not` (composed per the grammar's
     precedence — the mapper emits fully parenthesized comparisons so
     precedence is never ambiguous);
   - numbers: plain integers/decimals/crore-suffixed magnitudes only.
2. **The ONE validation boundary is unchanged**: the NL layer's
   output goes through the EXISTING `parseQuery` before evaluation —
   the NL layer introduces NO second grammar, NO second evaluator, NO
   direct row filtering. A `nlToQuery` success that fails
   `parseQuery` is a D1 defect, made unshippable by a property pin
   (every translated query must parse — property-tested over the
   fixture corpus).
3. **The route extension** (`POST /api/screener/query`, the ONE
   query route): an explicit `mode` field — `"expression"` (default,
   byte-compatible with today) | `"natural"`. `natural` →
   `nlToQuery` → the existing parse/evaluate path; the 200 response
   gains a `query` field carrying the TRANSLATED expression so the UI
   can show exactly what filter ran (C1 transparency: the user sees
   the interpretation, never a black box). No new route (rule 14).
4. **The UI** (`ScreenerQueryBar`): an explicit two-way mode toggle
   (Expression | Natural language) — no magic auto-detection of which
   grammar the user typed (honest UI). In natural mode the active-query
   line shows "understood as: <translated expression>" verbatim.
   Results, saved screens and CSV export behave identically (a saved
   screen stores the TRANSLATED expression — it stays replayable by
   the expression engine regardless of the mode that produced it).
5. **Fail-closed refusals**: unrecognized or ambiguous intent → a
   structured refusal whose safe message names the supported
   vocabulary (same rule-10 discipline as the parser: only the
   user's own tokens + the fixed lists, no internals). Zero
   fabricated matches: an NL query that maps to nothing refuses — it
   never silently widens to "all stocks".

## What D1 is NOT

- not an AI path: ZERO model tokens — the mapper is deterministic
  computation over a closed vocabulary; "never an LLM-chosen list"
  holds by construction (the mapper emits only filter expressions;
  the engine computes the list). An AI-assisted intent parse, if ever
  ordered, is a NEW item that extends the A10 router-caller pin
  (exactly two `generateEvidenceGroundedAnswer` callers today) —
  that is a founder-visibility decision, recorded here as such;
- not a second parser or evaluator: the expression grammar, the
  field registry and the engine stay the ONE of each (rule 14); the
  NL layer compiles INTO the grammar;
- not a field expansion: no new screener fields, no new data source —
  field additions arrive by their own PR editing `SCREENER_FIELDS`;
- not a row-picker, not a ranking: the NL layer cannot emit symbols,
  counts, or orderings — only boolean filter expressions;
- not a new surface: everything lives on the existing `/stocks` page
  behind the existing query bar (§38: deepen existing routes);
- not a bundle event: the mapper is server-side; the client delta is
  the toggle + the understood-as line — the `/stocks` ratchet
  (162.0 kB, +2 tolerance) must hold at build time.

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| empty / whitespace-only input | refusal, nothing runs |
| unknown token or phrase (out of vocabulary) | refusal naming the supported vocabulary (safe message) |
| ambiguous magnitude ("huge", "big", "cheap") | refusal — never a guessed number |
| number out of the parser's magnitude bound | refusal |
| translated expression fails `parseQuery` | 400-style honest failure; the property pin makes this unshippable |
| mode missing/unknown in the request body | treated as `"expression"` (byte-compatible default) |
| engine errors / upstream failure | the route's existing failure semantics, unchanged |

## No-second-path pins (static, CI)

- `lib/screener/nl.ts` imports no parser of its own beyond re-using
  `SCREENER_FIELDS`, no engine, no fetcher, no provider, no router;
  no clock, no randomness (pinned pure);
- `nlToQuery` is the ONLY NL→query translation in the repo — a
  second mapper breaks the build;
- every `nlToQuery` success parses (the property pin over the
  fixture corpus — CI);
- `/api/screener/query` remains the ONE screener query route; the NL
  mode adds no second endpoint;
- the UI renders the translated expression verbatim — never a
  silent reinterpretation.

## Verification plan

- RED: fail-first pins on the pre-implementation tree — `nl.ts`
  absent (import-fail), the route rejects/ignores `mode:"natural"`
  (no `query` field), the UI toggle absent — captured raw (rule 21);
- GREEN: translation pins per phrase class (fields, comparators,
  connectives, between-ranges, null-phrases, crore magnitudes,
  sector strings), refusal pins (unknown token, ambiguous magnitude,
  empty), the every-success-parses property pin, parity pins (for a
  translated query, the route's rows equal a direct expression query
  of the same string), route pins (mode default byte-compat, `query`
  echo, rate limit unchanged), UI pins (toggle, understood-as line,
  saved-screen stores the translated expression); fuzz extension
  (X3-05 discipline: 10k random NL strings — no uncaught throw, no
  injection); battery + CI;
- production legs on the exact deployed SHA: a live natural-language
  query on the deployed `/stocks` — the translated expression is
  displayed, the row count equals a direct expression query of the
  same string (positive control), the refusal leg returns the safe
  vocabulary message, `/api/screener/query` expression mode is
  byte-identical to pre-D1 (regression), latency + page TTFB
  captured.
