# G7 Driver-1 boundary audit (founder round-27 direction 13)

Audit executed 2026-10-07 ~22:20–22:35 UTC against `origin/main` = production
`/api/version` = `93c1dac034c97921a4b53d2e55dae9a0bf571b1e` (merge #251,
NS1). The audit covers the seven checklist items; each is verified in
SOURCE, in TESTS, and where possible against the raw rows of the two
post-#249 production batteries
(`docs/evidence/round25/g7-driver1-battery.json` @ cf8a4c7 and
`docs/evidence/round25/g7-fastpath-after.json` @ 8da83ce).

## Verdict

Six of seven checks PASS. One check — "advice does not fast-path" — FAILED
at the unit level and at the router level: two valuation-advice ask shapes
("target price", "fair price") leaked into the price seed through the bare
`prices?` alternation of `SEED_TERM_RES[0]`, and because the deterministic
singleton gate keys on `intentSeed`, an advice ask could be answered with a
bare current-price card (model synthesis skipped). Fixed in this PR with
fail-first proof (below). One residual risk (compound single-symbol asks)
is recorded with a recommended default and NOT fixed drive-by (rule 26).

## The seven checks

### 1. Exactly-one-tool singleton path only triggers for the intended class — PASS

`deterministicSingletonOutcome()` (lib/ai/router.ts) is a pure loop-state
read. All of the following must hold: probe path exempt
(`args.probeSeedToolCall` → null); no-initial-evidence path only
(`hasInitialEvidence` → null); exactly one executed tool call; a
successful provider on record; for ok outcomes — intent-detected financial
ask, seed tool AND symbol identity match, exactly one registry symbol in
the message, and at least one typed fact; for failures — the closed
five-state set (unknown-tool, invalid-args, unknown-symbol, no-data,
failed). Battery agreement: 3 of 5 usable toolRequest rows ran with a
single `initial` completion (getPeers INFY 4,978 ms; getFinancials TCS
4,549 ms; getFinancials AXISBANK 5,313 ms) — those are the intended
singleton deterministic shapes (single symbol, seed-consistent canonical
tool, typed facts served by the server surface).

### 2. Deterministic failures remain honest — PASS

The failure branch serves the registry-authored bounded disclosure
(`disclosureFromOutcome`), `claimsVerified: false`,
`groundingMode: "context-only"`, `structuredResponse: "valid"`, with the
disclosure in `uncertainties` — never a fabricated availability. Pinned by
test `(b) a terminal unknown-symbol outcome serves the bounded honest
disclosure`.

### 3. Multi-tool paths still synthesize — PASS

`toolCalls.length !== 1` → gate returns null. All five usable multitool
battery rows show 2–3 tool executions with post-tool synthesis completions
(and honest repairs: schema-mismatch, field-value-mismatch). Pinned by the
`guard: a multi-symbol ask is NOT fast-pathed` test (3 provider calls).

### 4. Advice does not fast-path — FAILED → FIXED (this PR)

Proof of the defect (pre-fix, exit code 1, vitest):

```
npx vitest run test/financialIntent.test.ts
 × target-price asks do NOT seed getPrices (the advice ask must synthesize)
AssertionError: expected { tool: 'getPrices', args: { symbol: 'RELIANCE' } } to be null
 × fair-price / valuation-advice asks do NOT seed getPrices
AssertionError: expected { tool: 'getPrices', args: { symbol: 'RELIANCE' } } to be null
```

Router level (pre-fix): "What is RELIANCE's target price?" with the model
requesting exactly `getPrices(RELIANCE)` served
`synthesis: "deterministic"` after ONE provider call — the advice
synthesis was skipped (`expected 2, received 1`).

Root cause: `SEED_TERM_RES[0]` matches the standalone word "price" inside
"target price" / "fair price", contradicting the seed map's own documented
contract ("Advice-shaped asks (buy or sell, target price, bullish or
bearish, recommendations, ratings) and general valuation wording are NOT
seeded"). The leak predates #249 (it affected only the zero-tool reactive
seed), but #249 raised its severity: with the fast path keyed on
`intentSeed`, the leak converted an advice discussion into a bare fact
card.

Fix (lib/ai/financialIntent.ts): a closed `ADVICE_ASK_RE`
(buy or sell | target price | fair price | fairly priced | bullish or
bearish | recommendations? | ratings? | valuation) is checked FIRST in
`intentSeedTool` — an advice-shaped ask never seeds a tool and therefore
can never fast-path. The DETECTOR still flags advice asks as financial
(the zero-tool backstop keeps biting — "advice needs data" is unchanged);
only the seed is suppressed, so the model chooses its own tools and
synthesizes. Post-fix: 51/51 across the two suites; non-target seeds
unchanged (latest price / share price / fundamentals / peers / dividend
yield all still seed — pinned).

### 5. Unavailable observations do not fast-path — PASS

The ok branch requires `outcome.evidence.some((e) => (e.facts?.length ?? 0) > 0)`;
a fact-less (UNAVAILABLE) outcome never renders as data. Pinned by the
`guard: an unavailable observation (no facts) is never fast-pathed` test
(3 calls, honest BLOCKED outcome).

### 6. The deterministic probe still exercises the full loop — PASS

`if (args.probeSeedToolCall) return null;` is the first line of the gate.
Pinned by the probe guard test: the canary's completion IS the post-tool
synthesis with `TOOL RESULT:` in the transcript.

### 7. Provenance identifies deterministic synthesis correctly — PASS

Both fast-path returns carry `synthesis: "deterministic"`;
`toChatWire` threads it onto the wire router-set only
(`provenance.synthesis`). The multitool/synthesis rows carry no such mark
(`synthesis` undefined on `AiAnswer`).

## Residual risk recorded (NOT fixed here — rule 26)

A compound ask that names exactly ONE symbol but needs MORE than one tool
("Show SBIN's price and its promoter holding.") can, if the model happens
to request the intent-seeded tool first (getPrices), be truncated to the
singleton fact card — the model's second tool request never happens. The
gate cannot see the un-fetched datum because "promoter holding" is not in
the closed detector vocabulary. No production observation of this shape
exists yet (the battery's one such question was a 429 refusal row).
Recommended default (FOUNDER DECISION NEEDED if pursued): extend the
closed term vocabulary with a shareholding class (getShareholding) and
require single-seed-class asks for the fast path — i.e. the fast path
serves only when the message's data terms map to exactly one canonical
tool class. Recorded here; not implemented without direction.

## Driver-2 note (direction 10)

The fixed baseline against current main (93c1dac) is captured separately
(`g7-driver2-baseline.md`, same directory) BEFORE this fix deploys — none
of the 70 canonical battery questions contains advice vocabulary, so this
boundary fix does not shift the measured distribution.
