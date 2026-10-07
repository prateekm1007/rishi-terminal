# G3 — Scheduler verification, the pg_cron migration artifact, and the rule-32 amendment (PROPOSED)

One item, one PR (founder round-23 G3). All commands run on 2026-10-07 UTC.
**Approval gate: nothing in this PR mutates production or CONSTITUTION.md.
The live apply and the constitution amendment wait for the founder's exact
comment `APPROVED: pg_cron` on this PR.**

## 1. Verification (read-only, via the Supabase Management API)

Extensions on the current free project (the G3 directive's first bullet):

```
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron','pg_net');
  pg_cron  1.6.4
  pg_net   0.20.4
SELECT name, default_version, installed_version FROM pg_available_extensions WHERE name IN ('pg_cron','pg_net');
  pg_cron  default 1.6.4  installed 1.6.4
  pg_net   default 0.20.4 installed 0.20.4
```

The live registration (secret REDACTED — rule 34; the real command stores
the bearer):

```
SELECT jobid, jobname, schedule, database, username, active, length(command) FROM cron.job;
  jobid=1  jobname=quotes-warm  schedule=7-52/15 3-10 * * 1-5
  database=postgres  username=postgres  active=true  command_len=1518
```

Scheduled run history (`cron.job_run_details`) — 2026-10-06: runids 1-3
failed (the three documented wire-level fixes: PERFORM, named args,
jsonb-cast), runids 4-5 succeeded (off-session honest no-ops).
**2026-10-07 (today, the pre-registered NSE-session day):**

```
runid 6  succeeded 03:07 -> 03:13    runid 11 succeeded 04:22 -> 04:28
runid 7  succeeded 03:22 -> 03:28    runid 12 succeeded 04:37 -> 04:43
runid 8  succeeded 03:37 -> 03:43    runid 13 succeeded 04:52 -> 04:58
runid 9  succeeded 03:52 -> 03:58    runid 14 succeeded 05:07 -> 05:13
runid 10 succeeded 04:07 -> 04:13    runid 15 running   05:22 -> ...
```

`net._http_response`: 6 responses per run (one per slice), every observed
status_code = 200, no errors. In-session snapshots (read-only observer):

```
05:19 /api/health: equities fresh 815/916 (88.97%), tiles 5/16
05:25 /api/health: equities fresh 811/916 (88.54%), tiles 5/16
05:25 /api/prices?symbol=BANKBARODA:
  {"price":232.36,"currency":"INR","status":"LIVE","observedAt":"2026-10-07T05:25:51Z",
   "marketOpen":true,"marketFreshness":"live-delayed","sessionDate":"2026-10-07"}
  quote_cache row: observed_at 20 seconds before the read.
```

Honest note: the ≥90 % equities-freshness criterion was NOT met at these
two snapshot moments (88.5-89.0 %, inside the 30-minute rolling window
with mid-session aging). The formal 8-point acceptance verdict — three
consecutive scheduled in-session executions, sustained ≥90 % coverage,
`/api/health` agreement, live BANKBARODA — is rendered AFTER approval per
the G3 directive, on the recorded run history; today's record above is
the verification evidence, not the acceptance claim.

## 2. The migration artifact (lib/db/migrations/029_warmer_pg_cron.sql)

Reproduces the live registration exactly — verified byte-for-byte modulo
the bearer and indentation:

```
$ python3 scripts/g3_command_compare.py
live (redacted, normalized) == migration block: True
both have 11 statements; byte-identical modulo bearer + indentation
```

- jobname `quotes-warm`, schedule `7-52/15 3-10 * * 1-5` — IDENTICAL to
  `.github/workflows/quotes-warm.yml` (pinned by test/g3.pgcron.test.ts;
  the two must never drift).
- command: 6 slice POSTs to `/api/ingest/quotes-warm?slice=k&of=6`,
  `pg_sleep(75)` pacing, positional-args `net.http_post` (the pg_net 0.20
  form), 120000 ms timeout.
- The bearer is a `<QUOTES_WARM_SECRET>` PLACEHOLDER — the value never
  enters the repo (rule 34); the live apply substitutes from the vault.
- Idempotent: `cron.unschedule('quotes-warm')` before `cron.schedule(...)`
  — re-application replaces, never duplicates (G3: "do not create a
  duplicate scheduler").
- Fail-closed guard: refuses to run where the cron schema is absent.

## 3. RED/blocked evidence for the unapproved mutation path (rule 24)

(a) Mechanical — on vanilla Postgres WITHOUT pg_cron (main's harness,
before this PR's stub), migration 029 refuses:

```
$ python3 scripts/g3_red_green_driver.py blocked
[g3] FAILED applying 029_warmer_pg_cron.sql: 029 requires the pg_cron
     extension (schema cron) — refusing to run without it
[g3] BLOCKED PROOF CONFIRMED: migration 029 refuses to run without pg_cron
     (fail-closed, no silent skip)                      exit 0 (proof)
```

(b) Mechanical — WITH this PR's harness cron stub (CI's shape):

```
$ python3 scripts/g3_red_green_driver.py stubbed
[g3] harness + 29 migrations applied (mode=stubbed)
[g3] registered jobs: [{"jobid":"1","jobname":"quotes-warm",
     "schedule":"7-52/15 3-10 * * 1-5","active":true,...}]
[g3] after re-apply, job count: 1 (must be 1 — no duplicate scheduler)
[g3] placeholder bearers in stored command: 6            exit 0
```

(c) Procedural — the production mutation path is BLOCKED pending the
founder's comment: no apply script exists yet (the runbook below is the
post-approval plan), `CONSTITUTION.md` is untouched (asserted by
test/g3.pgcron.test.ts: no `pg_cron`/`Rule 32a` text may appear in it),
and the job that runs in production today is the round-19 registration,
unmodified by this PR.

## 4. The exact proposed Constitution rule-32 amendment text

> **Rule 32a (amendment, proposed 2026-10-07, G3 — takes effect only
> with the founder's `APPROVED: pg_cron` recorded on the PR).** The
> Supabase project's `cron.job` table may hold exactly ONE production
> credential: the `QUOTES_WARM_SECRET` bearer, embedded in the
> `quotes-warm` job command (migration 029). Scope and bounds:
> one secret, one endpoint (`POST /api/ingest/quotes-warm`), one job;
> revocable by rotating `QUOTES_WARM_SECRET` everywhere it lives (vault,
> HF mirror, Vercel env, and the job command, in one sitting) or by
> `cron.unschedule('quotes-warm')` outright; the value never enters the
> git repository — migration 029 carries a `<QUOTES_WARM_SECRET>`
> placeholder, substituted only at live-apply time from the vault; any
> ADDITIONAL database-held credential requires a new amendment (this is
> a bounded exception, not a precedent). Logic: the free-tier scheduler
> decision (round-18 packet, option (a)) requires the secret to live
> with the job; rule 32's two-store invariant continues to hold for
> every other credential.

## 5. Post-approval runbook (executed only after `APPROVED: pg_cron`)

1. Create `scripts/prod_closure/apply_029_live.py` (the 021/022 pattern):
   pre-state check (job `quotes-warm` present, active, schedule matches,
   command matches modulo bearer) -> read the bearer from the vault ->
   substitute the placeholder -> apply the substituted 029 via ONE
   Management API query call -> post-state check (exactly ONE job, same
   jobname/schedule, command length consistent with the real bearer).
2. Amend `CONSTITUTION.md` with the rule-32a text above, in its own PR
   whose thread carries the founder's approval comment reference.
3. Render the formal 8-point acceptance verdict on the recorded run
   history: three consecutive scheduled in-session executions (already
   satisfied by today's runids 9-14 if the record stands), sustained
   ≥90 % equities freshness over the session (NOT yet met at the two
   snapshot moments above — 88.5-89.0 %), `/api/health` agreement, and a
   live BANKBARODA positive control. A manual dispatch counts for none
   of it. The observer stays read-only.
4. Rollback (if ever needed): `SELECT cron.unschedule('quotes-warm');`
   plus `QUOTES_WARM_SECRET` rotation.

## 6. Full battery on the branch (before push)

```
npx tsc --noEmit                 -> exit 0
npx vitest run test/g3.pgcron.test.ts -> all passed (see PR proof)
npx vitest run                   -> full suite (see PR proof)
npx eslint . + lint:ratchet      -> 0 errors, baseline holds
```

## 7. Observations (no action in this PR)

- `.github/workflows/quotes-warm.yml` retains its (unreliable) schedule
  trigger alongside pg_cron. Double-firing is harmless by design
  (off-session no-ops; the claim mechanism deduplicates in-session), and
  retiring the workflow trigger is a scope decision for after the
  acceptance verdict — recorded here, not changed.
- The two in-session health snapshots measured 88.5-89.0 % equities
  freshness against the ≥90 % criterion; if the post-approval verdict
  still measures below target, the slice pacing or the 30-minute window
  definition needs tuning — a follow-up, honestly reported, not silently
  re-anchored (C9).
