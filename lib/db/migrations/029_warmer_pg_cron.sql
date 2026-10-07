-- ============================================================
-- 029_warmer_pg_cron.sql — G3 (founder round 23): the pg_cron
-- warmer registration, as a tracked migration artifact.
-- ============================================================
-- STATUS: ARTIFACT ONLY. Do NOT apply to production before the
-- founder comments exactly `APPROVED: pg_cron` on this PR (G3
-- directive). CI runs this file against the pg_harness cron stub —
-- that is mechanical verification of the registration SQL, not an
-- application. The live apply procedure (post-approval) is in
-- docs/evidence/round23/g3-scheduler-verification.md.
--
-- What it registers (idempotently) — the job that ALREADY runs on
-- production, created 2026-10-06 via the Management API (round 19,
-- implementing the round-18 decision packet's default (a)):
--   jobname   quotes-warm
--   schedule  7-52/15 3-10 * * 1-5  (== .github/workflows/quotes-warm.yml)
--   command   6 slice POSTs to /api/ingest/quotes-warm paced 75 s
--             apart — the exact invocation the workflow uses (same
--             URL, same ?slice=k&of=6, same dedicated bearer).
--
-- Preconditions (verified read-only 2026-10-07, evidence file):
--   * pg_cron 1.6.4 and pg_net 0.20.4 are installed on the project.
--     This file does NOT create extensions (they already exist; the
--     CI harness provides a cron schema stub instead — the stub
--     STORES the command, it never executes it).
--   * The endpoint contract is pinned by test/y2.quoteWarm.test.ts;
--     the schedule/command equality with the workflow is pinned by
--     test/g3.pgcron.test.ts.
--
-- SECRET HANDLING (rule 34): the bearer below is a
-- <QUOTES_WARM_SECRET> PLACEHOLDER. The live apply substitutes the
-- real value from the vault at apply time; the value never enters
-- the repo. The proposed rule-32 amendment (evidence file) sanctions
-- this single database-held credential.
--
-- Rollback: SELECT cron.unschedule('quotes-warm');
-- ============================================================

-- Fail closed: without pg_cron (or the CI stub) this file refuses to
-- run rather than silently skipping the registration.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE EXCEPTION '029 requires the pg_cron extension (schema cron) — refusing to run without it';
  END IF;
END
$$;

-- Idempotent registration: replace any existing job of this name —
-- never a duplicate scheduler (G3 directive: the evidence already
-- shows quotes-warm registered and active).
SELECT cron.unschedule('quotes-warm');

SELECT cron.schedule(
  'quotes-warm',
  '7-52/15 3-10 * * 1-5',
  $job$
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=0&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  SELECT pg_sleep(75);
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=1&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  SELECT pg_sleep(75);
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=2&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  SELECT pg_sleep(75);
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=3&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  SELECT pg_sleep(75);
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=4&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  SELECT pg_sleep(75);
  SELECT net.http_post('https://rishi-terminal.vercel.app/api/ingest/quotes-warm?slice=5&of=6', '{}'::jsonb, NULL::jsonb, '{"Authorization": "Bearer <QUOTES_WARM_SECRET>"}'::jsonb, 120000);
  $job$
);
