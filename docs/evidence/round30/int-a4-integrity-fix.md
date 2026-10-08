# A4 completion audit — impossible-domain integrity fix (round 30)

Direction: founder round-30 directives §5 — narrowly scoped A4 completion
audit before A5. Add regression coverage for impossible event-domain
inputs ONLY if the existing contract requires them; no new semantics, no
new thresholds. Branch: `fix/int-a4-impossible-domains` from exact
`origin/main` `12ca15c79e676d9f9904e683467a5653b394f016`.

## 1. The audit finding (contract requires the fix)

`lib/intelligence/materiality.ts` promises: "corrupt numerics ... are
all NON-MATERIAL with a named reason — never guessed." Prices and share
volumes are non-negative physical quantities, but the legs scaled
whatever numbers arrived:

- price 100 → -5 classified **MATERIAL** (`price-intraday`, |−105| ≥ 4)
- price -100 → 105 classified **MATERIAL** (205% move)
- volume old -50 → new 300 classified **MATERIAL** (`volume-surge`)
- volume new -50 classified **below-threshold** (evaluated-small, dishonest label for impossible input)

Three MATERIAL-on-impossible verdicts plus one mislabelled refusal path.
The contract requires refusal; the fix is root-integrity, not redesign.

## 2. RED — regression tests before the fix (rule 21)

```
npx vitest run test/intelligenceMateriality.test.ts
AssertionError: expected 'material' to be 'non-material'      (price 100 → -5)
AssertionError: expected 'material' to be 'non-material'      (price -100 → 105)
AssertionError: expected 'below-threshold' to be 'invalid-input' (volume new -50)
AssertionError: expected 'material' to be 'non-material'      (volume old -50 → 300)
 Test Files  1 failed (1)
RED_EXIT:1
```

## 3. The fix (no new thresholds, no semantic expansion)

One shared guard, `hasImpossibleDomain(event)`: `price`- or
`volume24h`-field events with a negative numeric old or new value abstain
each leg as `invalid-input` ("negative price/volume is impossible").
Change-field values are untouched — signed declines are real (-5%
still classifies MATERIAL, pinned by test). Combination priority,
verdict shape, threshold set, and all other legs are unchanged.

## 4. GREEN + Tier-1

```
npx vitest run test/intelligenceMateriality.test.ts   -> 44/44 pass (39 + 5 new)
npx vitest run (materiality + events + contract + stateLog) -> 4 files pass
npx tsc --noEmit                                       -> exit 0
npx eslint (changed files)                             -> exit 0, 0 errors 0 warnings
npx eslint .                                           -> 283 problems (0 errors, 283 warnings) = ratchet baseline
npm run validate:encoding                              -> pass, no mojibake
```

## 5. Scope record — considered and deliberately left alone

- Signed `change`-field negatives: legal declines, still classify (test-pinned).
- Zero old price: already fail-closed (`non-comparable`, non-material).
- Negative `sessionsConfirmed`: cannot produce MATERIAL (firing needs
  ≥ 2); already non-material as `below-threshold`. Reason-label precision
  only — not a contract violation, left untouched per scope discipline.
- Absurd-but-finite magnitudes (e.g. price 1e308): impossibility not
  provable — left untouched; the founder-confirmed thresholds decide.

## 6. Closeout — CI, merge, production SHA (appended post-deploy)

PR #272, head `a95c51ba889cb96e742528205465fdf535a71074`, merged as
`454c8bd7a103f56d05c14c2660177418602264fd` (2026-10-08).

CI run 37822813114 — first attempt blocked by the C8 cadence gate
(docs-only merge #271 is deploy-exempt; the last production-relevant
merge #270 was younger than 60 min):

```
deploy-cadence: FAIL — last production-relevant merge landed 26.2 min ago
— merging this PR now would violate C8 (at most one production-relevant
merge per 60 min); earliest safe merge 2026-10-08T18:48:59.000Z
```

Rerun after the window opened — all six checks green:

```
Lint, typecheck, test, validate                     pass  2m51s
Migrations & RLS invariants (Postgres 16)           pass  3m6s
Docker Space image (E1)                             pass  1m54s
Lighthouse gate (U3)                                pass  2m39s
Playwright smoke                                    pass  4m15s
Vercel Preview Comments                            pass  0
```

merge-guard gates 0–6 (sanctioned path, `GITHUB_PAT` env):

```
[gate 0] GET /pulls/272 -> HTTP 200
[gate 0] state=open base=main head=a95c51ba889c mergeable_state=clean
[gate 1] origin/main tip (read #1) = 12ca15c79e676d9f9904e683467a5653b394f016
[gate 2] merge-base == main tip — branch is current with main
[gate 3] check-runs on a95c51ba889c: all six completed/success
[gate 4] node scripts/ci/deployCadence.mjs --pr --base origin/main -> exit 0
[gate 5] origin/main tip (read #2, pre-merge) = 12ca15c79e676d9f9904e683467a5653b394f016
[gate 6] PUT /pulls/272/merge (sha=a95c51ba889c) -> HTTP 200
[gate 6] {"sha": "454c8bd7a103f56d05c14c2660177418602264fd", "merged": true}
MERGE-GUARD: MERGED PR #272 (head a95c51ba889c) -> merge commit 454c8bd7a103
```

Production verification after Vercel deploy (2026-10-08 ~19:07Z):

```
GET /api/version  -> sha = 454c8bd7a103f56d05c14c2660177418602264fd  (matches merge)
GET /api/health   -> {"status":"ok","db":true,...}
post-deploy-smoke on 454c8bd7a103 -> completed success
```

Roadmap: A4 row already CLOSED (PR #271); this integrity fix does not
change status. Next roadmap item: INT-A5 (Thesis), from exact main
`454c8bd7a103f56d05c14c2660177418602264fd`.
