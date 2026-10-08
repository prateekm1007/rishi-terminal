# G7 Driver-2 fixed baseline (founder round-27 direction 10)

Measured BEFORE any Driver-2 code change, against the deployed production
tree of the moment: `/api/version` = `93c1dac034c97921a4b53d2e55dae9a0bf571b1e`
(merge #251). Run window 2026-10-07 22:30:36 UTC → 2026-10-08 00:24 UTC,
resumable state-file chunks (sandbox foreground limit), same canonical
battery as the round-25 runs (70 questions, 7 classes, sequential,
default 6s pacing, anonymous mode — X7 PoW solved in-loop after the daily
free units; `powIncludedInWallMs: true`, both variants reported).

Raw artifact: `g7-driver2-baseline-battery.json` (same directory). All
numbers below are `scripts/g7CanonicalStats.mjs` output over the raw rows
(direction 12 — the canonical calculation authority).

## Overall (50 usable / 70; refusals 429×18, 413×1, 502×1)

- wallExclPoW: **p50 6,388 ms**, p95 41,031 ms, mean 9,334 ms
- wallInclPoW: p50 6,444 ms, p95 41,040 ms, mean 9,369 ms
- The ≤8s P50 gate HOLDS on current main (consistent with the two
  round-25 measurements: 5,336 / 6,378 ms).

## Per class (wallExclPoW)

| class | usable | p50 ms | p95 ms |
|---|---|---|---|
| financial | 15/22 | 4,858 | 15,874 |
| philosophy | 8/11 | 8,519 | 11,102 |
| invalid | 9/11 | 4,631 | 7,890 |
| hostile | 6/8 | 4,193 | 11,104 |
| financialNoSymbol | 5/6 | 11,096 | 13,481 |
| toolRequest | 3/6 | 9,224 | 47,221 |
| multitool | 4/6 | 16,274 | 42,691 |

## Eligible request classes isolated (direction 10, step 1)

The synthesis-required composition classes are `multitool` and the
synthesis rows of `toolRequest` (their `stages` carry `post-tool`
completions; the fast-pathed singleton rows carry `initial` only and are
Driver-1 territory). The Driver-2 target is the multitool class:
p50 16.3s, p95 42.7s — materially above every other class.

## Dominant component identified (direction 10, step 2)

Attribution over usable rows (wallExclPoW basis): provider completions
**62.7%** (initial 33.9% + post-tool 18.0% + repair 10.9%), tool
execution 1.6%. The multitool rows specifically pay one EXTRA completion
per additional symbol — the serial tool-request round trip (model
requests tool → server executes → model re-asked). Raw multitool rows:

- 42,695 ms: initial:1 + post-tool:3 + repair:1 (field-value-mismatch)
- 16,287 ms: initial:1 + post-tool:2
- 6,200 ms: initial:1 + post-tool:1 (model answered after one tool)
- (2 refusals: 429, 502)

## The one driver chosen (direction 10, step 3)

Upfront multi-symbol canonical evidence seeding: an intent-detected data
ask naming 2+ registry symbols seeds each named symbol's canonical tool
(cap 2 symbols, preserving the model's 4-call budget) BEFORE the first
completion, collapsing N+1 serial completions to one evidence-complete
synthesis pass. Model synthesis is preserved (direction 11): multi-symbol
asks can never fast-path; validation, repairs and the honest paths are
unchanged. The ≤8s target stays fixed. Implementation:
`fix/g7-driver2-multitool-seed`.
