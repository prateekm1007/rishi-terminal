# INT-D1 — natural-language screening over the ONE engine (round 38)

Implementation PR **#297** (`c6952d6` → merge `b3499a1`, merge-guard gates
0–6 with the pinned head SHA, CI 6/6 on the exact head, C8 cadence 196.9
min). Pre-registration: `docs/intelligence/screening.md` (PR #296,
committed BEFORE any evaluation — the binding contract; drift at
implementation time: NONE — the only additions beyond the pinned tables
are hyphenated variants of the pinned multi-word phrases and the
derived stored-sector-name matching, both inside the closed vocabulary).

## What shipped (one item = one PR)

- `lib/screener/nl.ts` — the deterministic NL layer: a closed-vocabulary
  compiler INTO the existing expression language. Field synonyms →
  `SCREENER_FIELDS` (one registry), comparator phrases → the existing
  operators, `between X and Y` → the normalized fully-parenthesized
  and-range, null-phrases → the parser's is-null forms (consensus only),
  sector phrases → the EXACT stored sector strings (57 names reachable;
  value table CI-pinned to the live data; bare word "it" deliberately
  excluded — "sector it" resolves). Fully parenthesized emission;
  structured fail-closed refusals (bounded messages: user's own tokens
  truncated at 40 chars + fixed lists — rule 10); ZERO AI tokens; pinned
  pure (no clock/random/IO; imports ONLY from './parser').
- `app/api/screener/query` — the ONE query route grows the explicit
  `mode` field: `"expression"` (pinned byte-compatible default;
  missing/unknown falls back per the pre-registration fail-closed table)
  | `"natural"` → `nlToQuery` → the UNCHANGED parse→evaluate path;
  natural 200 carries the TRANSLATED expression in `query`; a translated
  query that fails parse fails closed 400 (the runtime backstop of the
  property pin). No new endpoint (routeIntegrity PASS).
- `ScreenerQueryBar` — the explicit two-way toggle (no auto-detection),
  "understood as:" verbatim line + `data-screener-understood` DOM
  contract, natural-mode examples/help line, `active` = the canonical
  expression so saved screens (replayed in expression mode — pinned)
  and CSV export stay replayable regardless of the producing mode.

## Fail-first (rule 21, raw captures committed)

- RED-1 `red1-output.txt` (commit `3cb12df`): route ignores
  `mode:"natural"` (no echo), no toggle/understood-as, no single
  `nlToQuery` definition — **10 failed / 7 passed** (the 7 are the
  frozen pre-existing byte-compat baseline pins).
- RED-2 `red2-output.txt` (commit `161fdd0`): the mapper pins fail on
  the import-fail — `Cannot find package '@/lib/screener/nl'`.

## GREEN

`test/screener.nl.test.ts` **34/34**: byte-exact translation pins per
phrase class; refusals (empty, unknown token, ambiguous magnitude,
negatives, out-of-range, non-nullable is-null, dangling clauses,
expression syntax in natural mode, injection payloads); the
every-success-parses property; determinism (byte-identical repeat);
sector-vocabulary pins (every synonym value is a stored string; every
stored name reachable byte-exact); 10k fuzz (seeded, both paths
exercised: >50 successes / >50 refusals, no uncaught throw, every
success parses); route pins (byte-compat default incl. unknown mode,
echo, parity rows == direct expression query, limiter constants 120/60
unchanged); UI pins (toggle, understood-as, translated saves, export
href, ONE fetch target). Battery: **188 files / 2099 tests** (2065 + 34),
tsc 0, eslint 0 errors / 283 warnings (ratchet holds), encoding PASS,
aiLoopAudit 8/8 (zero model surface added), routeAudit PASS,
freeAccessAudit PASS.

## Production legs on the exact deployed SHA `b3499a1…` (= main tip)

Raw: `prod-legs-api.txt` (script: session artifact `prodVerifyD1.mjs`;
the first run `prod-legs-api-first-run.txt` shows one false FAIL caused
by the leg script's own expected literal omitting the and-group wrapper
— disclosed; the product echo was correct, re-run ALL PASS):

- Deployed SHA == main tip `b3499a1a…` (verified twice).
- Live natural query `market cap above 50000 crore and roe above 15` →
  200, `query` = `((mktcap > 50000) and (roe > 15))`, **count 276**,
  wallMs 1357 cold → 644 warm.
- Parity positive control: the same string as a direct expression query
  → count 276 and the identical symbol set.
- Expression-mode regression: 200 keys EXACTLY
  `[count, elapsedMs, ok, rows]` — no `query` key, byte-compatible
  pre-D1.
- Refusal leg `huge cheap stocks` → 400, message = `cannot guess a
  number from "huge" — give an exact value — supported in natural
  mode: …` (safe: own token + fixed lists).
- Empty input → 400.
- Hydrated DOM positive controls (browser on the deployed page):
  `data-screener-mode` expression→natural after the toggle click;
  after the run the result box carries
  `data-screener-understood="((mktcap > 50000) and (roe > 15))"` and
  renders `276 stocks match · understood as: ((mktcap > 50000) and
  (roe > 15))` verbatim (`prod-legs-understood.png`); the refusal
  renders as a refusal — `QUERY ERROR — cannot guess a number from
  "huge" …` (`prod-legs-refusal.png`); the captured network log shows
  the ONE `POST /api/screener/query` (no second endpoint).
- `/stocks` TTFB warm p50 80 ms (min 69 / max 356, 10 samples).
- Saved screens are auth-gated (anonymous session: save UI absent, the
  signed-out note renders) — the translated-save/replay contract is
  pinned at source level (34/34) and the save payload `q: active` is
  unchanged; no signed-in browser session was available to the leg.

## Honest boundaries

- Zero AI tokens by construction (no model surface in the delta —
  aiLoopAudit 8/8). The A4-window unlock semantics are untouched: D1
  consumes NO intelligence substrate and is unaffected by the
  ~2026-11-03 window.
- The recorded "AI-assisted intent parse" option stays a
  founder-visibility decision per the pre-registration; the A10
  router-caller pin still holds exactly two callers.
- Open isolated item: #267 health-semantics — untouched.
