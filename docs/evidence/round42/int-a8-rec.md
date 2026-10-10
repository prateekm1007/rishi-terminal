# INT-A8-REC — the exclusion reconciliation (round 42)

Founder audit findings 5+6 (session directives, 2026-10-09): the
BANKBARODA artifact reported `excluded=928` with TWO uncertainty lines
each citing 928, and `whatChanged:[]`/`evidence:[]` under a CHANGED
changeSince state. Implementation PR **#306** (RED `64e8262` → GREEN
`21d9e3d` → merge `09884cc0`, merge-guard gates 0–6, CI 5/5 on the
exact head after the C8 window was honored once). Production legs on
the exact deployed SHA `09884cc0`: ALL PASS (`prod-legs-306-api.txt`
13/13, `prod-legs-306-presentation.txt` 5/5, the D2 supplement 3/3).

## The findings resolved (verified from A4's actual verdicts, zero number changes)

1. **The 928/928 pair is a partition, not a double count.** The true
   partition of every observed verdict: MATERIAL (the ledger) vs
   NON-MATERIAL (excluded), and the non-material set partitions exactly
   into `below-threshold` (evaluated, not qualified) + the 8 fail-closed
   refusal reasons (A4's closed vocabulary — `MATERIALITY_REASONS`, the
   14-reason pin). The refused class is therefore a SUBSET of the
   excluded — but the interface showed two bare equal counts, reading as
   two disjoint populations. Fix: every breakdown line now binds itself
   to line 1's total — "Of those excluded: 928 transition(s) were
   refused fail-closed by the materiality engine (non-comparable)." —
   so the counts read as the partition they are. The reconciliation is
   a pinned invariant, not a hope: summary `excluded=` (A5's counter) ==
   the uncertainty total (A4) == Σ(breakdown lines) == observed minus
   material, all derived from the SAME verdicts (the A5 ≡ A4 equality is
   a theorem on the chain path: every A5 exclusion class is pre-refused
   by A4 — seed/unavailable rows get verdict-level refusal reasons —
   and the chain passes no freshness context). Live on production
   (`09884cc0`): "928 observed transition(s) did not qualify …" + "Of
   those excluded: 928 … refused fail-closed (non-comparable)."
2. **The empty `whatChanged`/`evidence` under CHANGED is verdict-backed,
   not a projection loss (ruled OUT with a test).** The projection is
   composed from MATERIAL events only (the ledger's backing — the chain
   maps `kept` = `events.filter(aiSpendAllowed(verdicts))`); with every
   verdict non-material, both arrays are empty BY CONSTRUCTION and the
   CHANGED state (fieldsChanged=3) counts raw A6 deltas that never
   qualified. The new pin proves the rule: a refused delta yields NO
   field line while a material event yields exactly one (evidence.length
   == material count below the A1 32 cap). The residual 928-vs-925
   (excluded vs transitionsSince) is a definitional difference, not a
   defect: A6's since-window is `recordedAt > since` (strictly greater),
   dropping the 3 boundary rows — one per tracked field — written at the
   window's open instant.
3. **The whatChanged empty state states the exclusion truth.** "No
   tracked change in the window." was an absence claim a CHANGED-state
   summary contradicts; it now reads "No observed transition qualified
   as material evidence in this window — the ledger records no field
   change." (the EvidenceList wording family from #301).

## Fail-first (rule 21, raw capture committed)

`red-a8rec-output.txt` (commit `64e8262`): 3 failed / 28 passed — the
partition-marker template pins, the reconciliation binding (the old
lines carry no "Of those excluded:" marker), the empty-state pin. The
verdict-backed projection pin PASSES on the pre-fix tree by design —
that is the proof the founder's finding 6 asked for.

## GREEN (battery, from the PR)

vitest **191 files / 2131 tests ALL PASSING** (+2 pins); tsc 0; eslint
0 errors / 283 warnings (ratchet holds); encoding PASS; aiLoopAudit
8/8; build clean; bundle `/` 159.4 / `/stocks` 163.2 / `/stock/[symbol]`
170.7 (below the 171.2 ratchet); ISR PASS; scoreParity 0/896; smoke
a8-presentation 5/5 (incl. the count-gate settle from #304). No A1
schema change, no A5 detail-format change, no number adjusted — the
counters already agreed; the interface now proves it.

## Production legs on the exact deployed SHA `09884cc0`

- `/api/version` == `09884cc0…` (deploy gate; verified after the
  7-attempt poll).
- Scanner disclosure: the raw leg outputs carry changeKeys TRUNCATED
  (first 8 hex + `…`, the round-35 house pattern) — the required
  gitleaks job flags the full-value assignment pattern; the key is a
  public deterministic sha256 and no gate is weakened. The leg script
  itself now truncates in ALL printed output (the fix is at the
  source, so future rounds inherit it).
- Live BANKBARODA artifact: the reconciled breakdown renders (above);
  thesis positive 200; determinism (composed fields identical across
  calls); honest badges unchanged (unknown/low/low/deterministic);
  refusals 400/400/400; capability=insight honest 404 (zero AI spend
  pre-window); `/evidence-fixtures` 200.
- Committed presentation spec 5/5; D2 supplement 3/3 (breadth zero
  fetches, drawer ONE fetch + re-key + composition, badge target,
  abort/re-key, drawer geometry) — the D2 surfaces regress clean on the
  repaired tree.

## Honest boundaries

- The A1 `uncertainty` carrier stays `string[]` (schema untouched; old
  cached artifacts remain valid); the 1+1+8=10 static bound pin is
  unchanged and green.
- The unlock semantics are untouched: insight surfaces stay
  honest-missing until the A4 baseline window (~2026-11-03).
- Open isolated item: #267 health-semantics — untouched.
- Next per the frozen order: INT-D3 Stock Dossier by its
  pre-registration (`docs/intelligence/stockDossier.md`).
