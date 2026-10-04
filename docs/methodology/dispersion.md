# Dispersion — the disagreement metric (S2-06)

**Definition.** For one stock, `dispersion` is the **population standard
deviation** of the valid Rishi verdicts:

```
σ = sqrt( (1/N) · Σ (score_i − mean)² ),  N = number of VALID verdicts
```

A valid verdict is any non-null `score` from the 20-scorer panel
(`lib/consensus/orchestrator.ts`). Null verdicts — "insufficient data"
under T11 — are **excluded**, never coerced to 0: a Rishi who could not
form a view is not a Rishi who scored 0 (rule 16).

**Normative source:** `lib/consensus/dispersion.ts` (pure function);
wired into `buildConsensus` and exposed through `sanitizeConsensus` to
the stock page and any API surface that serves the consensus.

**Unit and range.** Score points on the 0-100 scale. `0` = unanimous.
The theoretical maximum for N = 20 is 50 (half the panel at 0, half at
100).

**Why population, not sample.** The panel is the entire population whose
disagreement we describe — there is no larger latent panel being
estimated. Dividing by N − 1 would silently claim a sampling context
that does not exist.

**Why null when N < 2.** One number cannot disagree with itself.
Reporting σ = 0 for a single valid verdict would launder "we only heard
one voice" into "perfect agreement" (rule 3 — a placeholder presented as
an observation).

**Relation to `tensionSpread`.** `tensionSpread` (max − min) stays: it
answers "how far apart are the extremes". Dispersion answers "how wide
is the whole panel" — every valid verdict contributes. A panel of
19 × 70 and one 10 has spread 60 but σ ≈ 13.1: two voices screaming does
not make a panel disagree.

**Interpretation (page copy uses these bands).**
- `σ < 8` — broad agreement (the consensus number is the panel's number)
- `8 ≤ σ < 18` — real disagreement; read the council, not just the number
- `σ ≥ 18` — the panel does not agree this stock is one thing; the
  consensus value carries little information

**Monotonicity.** For a fixed mean and N, σ is monotone non-decreasing
in spread (pinned by constructed cases in
`test/consensus.dispersion.test.ts`: unanimous → 0; adding spread raises
σ; a fully split panel [0,…,0,100,…,100] → 50).
