# Round 16 closure — production deployment + repeated acceptances (audit E0)

This file records the closure of the previous-task gate from the founder's
2026-10-05 audit: production SHA == origin/main, the #190 flows and #193
i18n acceptance repeated against the ACTUAL production deployment, the
post-deploy smoke green, and the honest state of everything still pending.

## 1. State at session start (2026-10-05 ~14:05 UTC)

```
origin/main           = d612cfe157ca24b903491bda9056e265c711e6f3
production /api/version = 243fd99b5c8884cc65967b9a0b929edddf83db63
deploy debt           = 202e139 (E1 Space image, merged 12:23Z, rate-limited)
                        c51e185 (#186 bundle ratchet, merged 13:20:44Z)
                        572562b (#189 smoke hardening, merged 13:49:20Z)
```

The audit's E0 gate was NOT closed at session start: production was two
production-relevant merges behind main, and none of the repeated
acceptances below existed on the record.

## 2. Deploy debt resolved (sanctioned single-shot API retry, RELEASE.md policy 4)

The sporadic-retry policy fired at 14:07:20Z — the quota window had
drained (POST /v13/deployments returned HTTP 200, not 402):

```
deployment: dpl_CZ1oQ6Ccghw4egcfkxqWRSvGEw83 state=BUILDING sha=d612cfe157ca
  [14:07:50] state=BUILDING ... [14:09:58] state=READY
/api/version -> {'sha':'d612cfe157ca24b903491bda9056e265c711e6f3',
                 'now':'2026-10-05T14:09:59.436Z','node':'v24.21.0'}
MATCH: production sha == origin/main (d612cfe)
```

All three E0 identities hold: `production SHA == origin/main == d612cfe`.
(The audit's literal `243fd99` expectation was superseded by the six
merges that landed between the audit's evidence cutoff and this session —
d612cfe strictly contains 243fd99, and the acceptance below ran against
the newer SHA, which is the stronger claim.)

## 3. Post-deploy smoke (green, unattended)

`post-deploy-smoke` run 37322471317 on `main@d612cfe`, event
deployment_status, created 2026-10-05T14:09:46Z, conclusion **success** —
the #189 no-silent-skips hardening ran it for this deployment without a
manual dispatch.

## 4. #190 production acceptance — the eight C6 flows, repeated live

Method: a dedicated Supabase test account (created via the Management
API's admin auth surface, `email_confirm: true`), session cookie crafted
in the exact `@supabase/ssr` 0.12.x wire format (`base64-` prefix +
base64url JSON in `sb-<ref>-auth-token` — the format was verified against
`node_modules/@supabase/ssr/dist/main/cookies.js` after a first attempt
that produced only 401s). Raw record with full request/response bodies:
`scripts/e0-c6-flows-raw.json` (session artifact; the account is deleted
after the run — see §7).

Run against `https://rishi-terminal.vercel.app` @ d612cfe, 2026-10-05
14:31 UTC:

```
== unauthenticated negative controls (expect 401, never 500) ==
anon GET screens            -> 401  [PASS]
anon POST screens           -> 401  [PASS]
anon POST portfolio/import  -> 401  [PASS]
anon GET portfolio/summary  -> 401  [PASS]

== the eight C6 flows, authenticated ==
1 auth identity      GET  /api/auth/me              -> 200  [PASS]
2 screen save        POST /api/screens              -> 201  [PASS] (was 500 pre-#190)
3 screen list        GET  /api/screens              -> 200 row present [PASS]
4 screen delete      DELETE /api/screens/{id}       -> 200  [PASS]
5 portfolio import   POST /api/portfolio/import     -> 200, 4 positions [PASS] (was 500 pre-#190)
  5b unknown symbol honestly flagged: known_symbol=false + warnings[0] [PASS]
6 re-import idempotent POST (same CSV)              -> 200 duplicate=true, same importId [PASS]
7 portfolio summary  GET  /api/portfolio/summary    -> 200 positions+analytics [PASS]
8 import delete      DELETE /api/portfolio/import/{id} -> 200 [PASS]
  8b summary after delete -> 404 (no rows left) [PASS]

OVERALL: ALL PASS
```

Two expectations were corrected against the app's ACTUAL contracts during
the run (the app was right, the probe was wrong — both directions
recorded): the screener query grammar (`price` is not a field; `pe > 0 and
roe > 10` parses), and unknown-symbol handling (imported with
`known_symbol: false` + a warning, not rejected as an error — the designed
B2 behavior).

## 5. #193 i18n production acceptance — repeated live

The full spec (not a hand-picked subset) against the deployed site:

```
$ SMOKE_BASE_URL=https://rishi-terminal.vercel.app npx playwright test test/e2e/i18n.spec.ts
  ✓  1 test/e2e/i18n.spec.ts:42:7 › R4-06 i18n › switching language persists across reloads (4.3s)
  ✓  2 test/e2e/i18n.spec.ts:67:7 › R4-06 i18n › pseudo-locale (expanded strings) shows no overflow on the top 10 pages (15.9s)
  2 passed (21.9s)
```

This exercises the exact determinism fix #193 shipped (disclaimer-modal
acknowledgement via `rishi_disclaimer_v2` before interaction) plus the
persistence contract (`rishi_locale=hi` across reloads) and the
pseudo-locale overflow sweep over all ten pages — against production
d612cfe.

## 6. Cadence + CI state at closure

- The push-run reds on main (`d612cfe`, `572562b`, `c51e185`, `723a303`,
  `112217c`, `f723bac`) were the push-side cadence gate recording the two
  acknowledged pacing slips (13:20:41Z and 13:49:18Z, both documented in
  `docs/RELEASE.md`). PR #179 (cadence becomes a PR-blocking merge gate,
  push-time report-only) was reviewed, re-run in the first compliant
  window, and MERGED at 15:02:56Z (73.6 min after #189) — main's push
  run went green again immediately (862b4f1 success 15:05:28Z).
- **Third pacing slip, mine, recorded not hidden**: #202 (clean-server
  harness) merged at 16:29:01Z — only 11.4 min after the parallel
  session's #182 (16:17:37Z). Root cause on my side: the state check
  (fetch, print tip) and the merge fired in ONE command chain; I saw
  main had moved but the merge was already dispatched — the check was
  not a gate, it was decoration. The #179 PR-side gate could not catch
  it either (my green check predated #182 by 2 minutes; strict branch
  protection accepted the merge). Mechanical fix adopted for the rest of
  this session and recorded for the next: `scripts/merge-guard.py`
  (session tooling, mirror of #179's rule) — fetches the tip, verifies
  the required check is green ON THE EXACT HEAD, verifies main has not
  moved since the PR's last evaluation, computes the cadence window from
  the last production-relevant merge, and REFUSES to merge otherwise;
  docs-only PRs are exempt per C8. The push-time report for 5ca757f
  printed the violation (by design, not blocking) and main stayed green.
- Session merges and their cadence gaps: #179 @ 15:02:56Z (73.6 min ✓),
  #202 @ 16:29:01Z (11.4 min ✗ — the slip above), evidence docs PR
  (exempt). Parallel-session merges interleaved: #182 @ 16:17:37Z
  (74.7 min after #179 ✓), #184 @ 17:39:22Z (70.4 min ✓).
- Production tracked main through the whole session, each step with a
  green post-deploy smoke: d612cfe (14:09Z) → 862b4f1 (15:05Z, auto) →
  b3c52db (16:19Z, auto) → 5ca757f (16:56Z, sanctioned API retry after
  the auto-deploy did not fire) → 87deecf (17:45Z, auto, parallel
  session's #184).

## 7. Hygiene

The C6 probe account (`c6-probe-*@rishi-terminal-test.local`) is deleted
via the admin API after the flows; the DB sweep (screens/imports/
positions for the account) is empty by the flows' own deletes (4b/8b
assert the 404s). Supabase keys fetched via the Management API live only
in the rule-37 cache (`.secrets/`, chmod 600) and never in the repo.

## 8. Still open after this closure (honest ledger)

- Warmer scheduled-run gates (3 consecutive scheduled runs, ≥90 %
  coverage, /api/health agreement, BANKBARODA weekday proof) — time-bound
  to the next NSE session; diagnostics and the Tuesday protocol are in
  `docs/evidence/round18/e4-scheduler-diagnostic.md`.
- Fresh production AI reliability/latency battery (audit E5) — runs after
  this closure, recorded separately.
