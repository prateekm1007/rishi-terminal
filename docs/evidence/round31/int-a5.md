# INT-A5 evidence — the deterministic thesis-state model (round 31)

Roadmap item: A5. Branch: `feat/int-a5-thesis` from exact `origin/main`
`12ca15c79e676d9f9904e683467a5653b394f016`. Founder direction (verbatim):
`supports[]`, `weakens[]`, `conflicts[]`, `invalidators[]`, a
deterministic state (IMPROVING, MIXED, DETERIORATING, UNCLEAR) from
weighted material evidence and freshness. The model never chooses the
state. Pre-registration: `docs/intelligence/thesis.md` (committed BEFORE
any evaluation — commit `b470c5c`, docs-only).

## 1. RED — fail-first before the module existed (rule 21)

```
$ npx vitest run test/intelligenceThesis.test.ts        (pre-module tree, 18:32Z)
 Test Files  1 failed (1)
      Tests  no tests
$ npx tsc --noEmit | grep intelligenceThesis
error TS2307: Cannot find module '@/lib/intelligence/thesis'
```

Import failure — the A3/A4 precedent for a new contract module.

## 2. GREEN + gate-bites (rules 21/24)

```
$ npx vitest run test/intelligenceThesis.test.ts        (module landed)
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

Deliberate violations, shown failing, then restored byte-clean:

```
mutation 1 — state rule MIXED->IMPROVING inversion:
  Test Files  1 failed (1)      Tests  2 failed | 22 passed (24)
  (the founder's synthetic case MIXED assertion caught it)
mutation 2 — silently INVENT a VOLUME direction rule:
  FAIL ... direction rules cover exactly the four signed performance categories
  (the pre-registered vocabulary pin catches silent extension)
restored: 24/24 green
```

## 3. Founder acceptance case (raw)

growth up + margin down + price up (all material, fresh) -> state MIXED,
supports [revenueGrowth, price], weakens [marginBp], conflicts
[FUNDAMENTAL pair] — pinned verbatim in
`test/intelligenceThesis.test.ts` ("the founder's synthetic case").
Model-supplied state ignored: inputs poisoned with
`modelSuggestedState`/`promptInjection` fields produce byte-identical
states (pinned). PRICE verdicts in fixtures come from the REAL A4
engine; synthetic FUNDAMENTAL verdicts are the documented stand-in for a
future founder-confirmed A4 extension (A4 rules no FUNDAMENTAL category
today — the thesis never re-decides materiality).

## 4. Full battery on the branch head

```
$ npx tsc --noEmit                    -> exit 0
$ npx eslint .                        -> 0 errors, ratchet 283 holds
$ npx vitest run                      -> 176 files / 1900 tests passed
$ npm run validate:encoding           -> passed, no mojibake
$ npx tsx scripts/validateStocks.ts   -> all T12 gates passed (896 symbols)
$ npx tsx scripts/scoreParity.ts      -> 0 mismatches / 0 non-finite of 896
```

(1900 = 1876 + 24 A5, exact.)

## 5. CI + cadence (C5/C8 honored, gates bit twice)

- First CI run on ab67fae: the ONLY failure was the C8 deploy-cadence
  gate (push 4 min before the window; "earliest safe merge
  2026-10-08T18:48:59Z"). Re-run at 18:57Z: 6/6 success.
- Re-run on e8fdb75 (branch updated with #272's A4 integrity fix):
  cadence gate again ("earliest safe merge 20:03:36Z"). Re-run at
  20:04Z: 6/6 success on 3223706 (branch updated with #274 docs).
- Merge-guard refused twice on stale base (C7) — branch re-synced with
  main each time; merged via the guard path. #273 merged 20:18:55Z as
  `806f7cd` (the guard's gate-0 read raced GitHub's index mid-merge —
  the documented A3 race pattern; authoritative state verified
  post-merge: two-parent merge commit on origin/main).

## 6. Production (C6)

```
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"806f7cd1e316d0e7bbdff4a0d65ea8b2bb592179","now":"2026-10-08T20:21:36.211Z"}
$ curl -s https://rishi-terminal.vercel.app/api/health
{"status":"ok","db":true,...}
```

origin/main == production == `806f7cd`. Honest scope note (A3/A4
precedent): a pure substrate module with no runtime consumer by design —
consumers arrive at A7/A8 — so the production proof is the
deployment-identity tuple plus the 24-test real execution of the engine.
No production number is claimed beyond what is pasted.

A5 is CLOSED per the C6/C10 definition: code + fail-first + regression +
CI + merged + deployed + exact SHA + raw evidence. Next: A6 ChangeSince.
