# INT-A4 evidence — the deterministic materiality engine (round 29)

Roadmap item: A4. Branch: `feat/int-a4-materiality` from exact
`origin/main` `4052a0d6dd3a55cb61fed5a8fd971c5c07f7953c`.
Threshold set: founder-confirmed in-session 2026-10-08 (statistical rules
verbatim) — decision recorded in the PR thread (C10 decision protocol).

One evidence file for the round (C10). Raw outputs, command + exit code,
no summaries-as-proof (rule 25). CI + production SHA + production probe
live in this file's closeout section after the deploy — historical
sections are never rewritten.

## 1. RED — fail-first before the module existed (rule 21)

Command (pre-implementation; only the test file was on disk):

```
npx vitest run test/intelligenceMateriality.test.ts
```

Output (exit 1):

```
 ❯ test/intelligenceMateriality.test.ts:2:1
   ^^^^^^^^
 Test Files  1 failed (1)
      Tests  no tests
   Duration  1.23s
```

Import of `@/lib/intelligence/materiality` fails: module missing —
the A3 precedent for a new contract module.

## 2. The threshold-drift gate bites (rule 24)

Deliberate violation: `priceIntradayPct: 4` -> `5` in the source, test run,
then restored.

```
× is exactly the founder-confirmed statistical set — silent drift breaks this
FAIL test/intelligenceMateriality.test.ts > the pre-registered threshold set
AssertionError: expected { priceSigmaMult: 3, …(6) } to deeply equal { priceSigmaMult: 3, …(6) }
DRIFT_GATE_EXIT:1
```

## 3. GREEN — after the implementation

```
✓ test/intelligenceMateriality.test.ts (39 tests) 70ms
 Test Files  1 passed (1)
      Tests  39 passed (39)
```

Honest in-flight defect (found by the engine's own tests before GREEN):
the first GREEN attempt showed the degenerate zero-variance baseline test
failing because `populationStd` of a constant baseline returned a tiny
positive float (e.g. `7.1e-16`) and `3 * tiny` still fired the sigma leg
on an epsilon move. Root fix: an exact constant-baseline guard
(`returns.every(v => v === returns[0])` -> `insufficient-history`),
not a loosened comparison (rule 23: never weaken a check).

## 4. Tier-1 gate (before push)

```
npx tsc --noEmit                                  -> TSC_EXIT:0
npx eslint lib/intelligence/materiality.ts test/intelligenceMateriality.test.ts
                                                  -> exit 0, 0 errors 0 warnings
npx eslint . ; cat eslint-ratchet.json
  283 problems (0 errors, 283 warnings)
  ratchet baseline: { "total": 283, "errors": 0, "warnings": 283 }  (held)
npm run validate:encoding
  ✅ Encoding validation passed — no mojibake detected  (exit 0)
first bytes: 47 47 32 BOM: false
```

Sibling-module regression (A1/A2/A3 must stay green):

```
npx vitest run test/intelligenceMateriality.test.ts test/intelligenceEvents.test.ts \
  test/rishiInsightContract.test.ts test/stateLog.test.ts
 Test Files  4 passed (4)
```

## 5. Full battery + pre-existence proof for the 7 failing files

```
npx vitest run
 Test Files  7 failed | 168 passed (175)
      Tests  30 failed | 1846 passed (1876)
```

Failing files: `c2.deployCadencePr`, `clientBoundary`, `e2s.cleanServer`,
`provenance`, `rishis.route`, `vercelIgnore`, `z1.vercelIgnore`.

Failure causes (all Windows/Linux environment artifacts):
`spawnSync C:\nvm4w\nodejs\node.exe ENOENT`; backslash paths
(`app\api\gurus\route.ts`); `/proc/net/tcp fallback` (Linux procfs);
bash exit `127` (no POSIX shell for `vercel-ignore.sh`).

Pre-existence proof — same files, my changes stashed (`git stash -u`),
clean `origin/main` tree:

```
git stash -u
npx vitest run test/c2.deployCadencePr.test.mjs test/clientBoundary.test.ts \
  test/e2s.cleanServer.test.mjs test/provenance.test.ts \
  test/rishis.route.test.ts test/vercelIgnore.test.ts test/z1.vercelIgnore.test.ts
 Test Files  7 failed (7)
git stash pop   # 3 files restored
```

Identical 7/7 failure set without my diff — pre-existing, environment-
specific, disclosed, not weakened (rule 23). Independent certification is
CI: origin/main's last CI run is `success` (run 37803324515).

## 6. Self-caught process incident (rule 19, B-14 recurrence class)

While running the drift-gate demo I edited `materiality.ts` with
PowerShell `Get-Content | Set-Content -Encoding utf8` — the exact method
rule 19 forbids. PS 5.1 read UTF-8 as ANSI: a BOM plus 23 mojibake
occurrences (`â”€â”€` box-drawing) were introduced. The repository's own
gate caught it:

```
❌ ENCODING VALIDATION FAILED  Found 23 encoding issue(s):
  📄 lib\intelligence\materiality.ts
     Line 1: … (INT-A4, roadmap item A4) â€” THE DETERMINISTIC
```

Fix: the file was rewritten byte-clean through Node/Write (no
reconstructed history — the source is this session's authored content),
`BOM: false`, validator green. Disclosed here rather than silently
cleaned; the root cause is tooling method, not content.

## 7. Closeout — CI, merge, production SHA, production probe

PR #270 (`INT-A4 deterministic materiality engine`,
`feat/int-a4-materiality` @ `ceddd8172ec6afa30af9fb3a073f1d5a7ca88d3e`).

CI on the exact head (run 37818135593, all green):

```
Playwright smoke (blocking since round 2)              pass  2m23s
Lighthouse gate (U3 — measured-score floors, ratchet)  pass  5m15s
Docker Space image (E1)                                pass  1m29s
Lint, typecheck, test, validate                        pass  2m14s
Migrations & RLS invariants (Postgres 16)              pass  30s
Vercel Preview Comments                                pass
```

Merge via the sanctioned guard (`scripts/ci/merge-guard.py --pr 270`,
exit 0), all six gates raw:

```
[gate 0] GET /pulls/270 -> HTTP 200, state=open base=main mergeable_state=clean
[gate 1] origin/main tip (read #1) = 4052a0d6dd3a55cb61fed5a8fd971c5c07f7953c
[gate 2] merge-base == main tip — branch is current with main
[gate 3] six check-runs on ceddd8172ec6: all completed/success
[gate 4] deployCadence.mjs --pr -> exit 0 (cadence PASS, ~140 min since #263)
[gate 5] origin/main tip (read #2) = 4052a0d6dd3a55cb61fed5a8fd971c5c07f7953c (unmoved)
[gate 6] PUT /pulls/270/merge (sha=ceddd8172ec6) -> HTTP 200
         {"sha": "361706f3a84f1e8a4c6f806015f9a18948020880", "merged": true}
```

Production (Vercel auto-deploy on the main push):

```
GET https://rishi-terminal.vercel.app/api/version
{"sha":"361706f3a84f1e8a4c6f806015f9a18948020880","now":"2026-10-08T17:51:24.436Z","node":"v24.21.0"}
```

origin/main == /api/version sha == `361706f` — the C6 tuple holds.

```
GET https://rishi-terminal.vercel.app/api/health
{"status":"ok","db":true,...,"asOf":"2026-10-08T17:51:38.035Z"}
post-deploy-smoke workflow: success (run 37819729508, 17:51:02Z, 14s)
```

Honest scope note: the engine has no production consumer yet by design
(wiring arrives with A7/A9/A10) — so the production probe is the
deployment-identity tuple plus the 39-test real execution of the engine,
not a served materiality verdict. No production number is claimed beyond
what is pasted above.

A4 is CLOSED: code + fail-first + regression + CI + merged + deployed +
exact SHA + real production identity + evidence. Next: A5 Thesis.
