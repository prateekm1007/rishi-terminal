-- ============================================================
-- 029 — QUOTES-WARM SCHEDULE PIN (G3, founder Round-22) — DRAFT,
-- NOT APPLIED until the founder comments exactly `APPROVED: pg_cron`
-- on the G3 PR (founder direction 6).
-- ============================================================
-- What this migration is: the canonical, in-repo pin of the
-- production price-warming schedule. The warmer was registered
-- out-of-band in Round 18 (docs/evidence/round18/e4-warmer-schedule.md)
-- because the job COMMAND carries the CRON_SECRET bearer token, and
-- rule 34 forbids secrets in the repo — so the command can never be
-- part of a migration. The SCHEDULE, the job name, and its active
-- state CAN be pinned here: this file is the source of truth for the
-- schedule shape (Constitution 14), and the live registration is
-- reconciled against it.
--
-- What this migration is NOT: it never stores or rewrites the command
-- (the secret stays out of the repo, rule 34); on a fresh project with
-- no registered job it RAISES a notice naming the one-time bootstrap
-- step — it deliberately does not insert an inert or fake job, because
-- a silently-unwarming scheduler that looks registered is a lie
-- (Constitution 1); the production acceptance of this scheduler is the
-- pre-registered real NSE-session battery (three consecutive
-- scheduled in-session warming runs, >=90% freshness, /api/health
-- agreement, BANKBARODA control, read-only observer).
--
-- CI safety: the CI migrations job runs on vanilla Postgres 16 without
-- pg_cron — the whole file no-ops there (guard below), keeping the
-- migration battery green.
-- ============================================================

DO $$
DECLARE
  n int;
BEGIN
  -- pg_cron absent (CI harness): nothing to pin — no-op.
  IF NOT EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '029: pg_cron not installed (CI harness) — schedule pin skipped';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'quotes-warm';
  IF n = 0 THEN
    -- Fail loud, fail honest: the schedule pin cannot bootstrap a job
    -- whose command carries a secret. The operator registers the job
    -- once, out-of-band, with CRON_SECRET; this migration then keeps
    -- the schedule honest.
    RAISE NOTICE '029: quotes-warm job NOT registered — register it once out-of-band with the CRON_SECRET command (schedule 7-52/15 3-10 * * 1-5 UTC, Mon-Fri), then re-run this migration';
    RETURN;
  END IF;

  -- Pin the schedule shape (idempotent — reconciles drift).
  UPDATE cron.job
  SET schedule = '7-52/15 3-10 * * 1-5',
      active = true
  WHERE jobname = 'quotes-warm'
    AND (schedule IS DISTINCT FROM '7-52/15 3-10 * * 1-5' OR active IS DISTINCT FROM true);

  RAISE NOTICE '029: quotes-warm schedule pinned (7-52/15 3-10 * * 1-5, active)';
END;
$$;
