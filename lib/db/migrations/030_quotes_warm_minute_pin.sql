-- ============================================================
-- 030 — QUOTES-WARM MINUTE-CADENCE PIN (ISR60, founder round-55,
-- 13 Oct 2026) — DRAFT follows the 029 discipline: the pin is the
-- in-repo source of truth for the schedule shape; the job COMMAND
-- carries the QUOTES_WARM_SECRET bearer and stays out-of-band (rule
-- 34 — never in the repo).
-- ============================================================
-- What changed and why (founder order, words verbatim: "Fix the
-- regeneration so the page updates within 60 seconds"):
--
--   029 pinned  '7-52/15 3-10 * * 1-5'  (one tick / 15 min, 6 slices
--              fired sequentially per tick)
--   030 pins    '* 3-10 * * 1-5'        (one tick / minute, a single
--              POST ?rotate=1&of=15)
--
--   The 13 Oct live evidence: /stock/SBIN served at age 1591 s with a
--   29-minute-old observation line during an OPEN session (the probe's
--   render-freshness legs failed 4/52). Two stacked causes:
--     (a) the ISR regeneration is traffic-driven — between visitor
--         requests the edge entry sat expired-but-unserved, so the
--         first visitor after a quiet period got a many-minutes-old
--         render (stale-while-revalidate);
--     (b) the quote cache itself refreshed only every ~15 min (the
--         029 cadence), so even a regenerated page carried an
--         observation up to 15 min old.
--
--   The 030 shape fixes both for the pages that matter:
--     - every minute the endpoint warms the quick set
--       (lib/quotePath quickRefreshSymbols — the probe symbols + the
--       demo-path proposal) and re-renders their stock pages within
--       the same tick (revalidatePath + self-ping), so those pages'
--       served HTML is at most ~60 s old during market hours;
--     - the universe rotates one slice per minute (rotate=1&of=15),
--       keeping the SAME upstream volume as 029 (896 fetches / 15 min)
--       while spreading it evenly.
--
-- CI safety: the CI migrations job runs on vanilla Postgres 16 without
-- pg_cron — this file no-ops there exactly like 029 (guard below).
--
-- Operator step (once, out-of-band, same as 029): re-register the
-- command with the QUOTES_WARM_SECRET — a single
--   net.http_post('.../api/ingest/quotes-warm?rotate=1&of=15', ...)
-- This migration then keeps the schedule honest.
-- ============================================================

DO $$
DECLARE
  n int;
BEGIN
  -- pg_cron absent (CI harness): nothing to pin — no-op.
  IF NOT EXISTS (SELECT FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '030: pg_cron not installed (CI harness) — minute-cadence pin skipped';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM cron.job WHERE jobname = 'quotes-warm';
  IF n = 0 THEN
    RAISE NOTICE '030: quotes-warm job NOT registered — register it once out-of-band with the QUOTES_WARM_SECRET command (schedule * 3-10 * * 1-5, single POST ?rotate=1&of=15), then re-run this migration';
    RETURN;
  END IF;

  -- Pin the schedule shape (idempotent — reconciles drift, supersedes
  -- the 029 pin by running after it in migration order).
  UPDATE cron.job
  SET schedule = '* 3-10 * * 1-5',
      active = true
  WHERE jobname = 'quotes-warm'
    AND (schedule IS DISTINCT FROM '* 3-10 * * 1-5' OR active IS DISTINCT FROM true);

  RAISE NOTICE '030: quotes-warm schedule pinned (* 3-10 * * 1-5, active — minute cadence, ISR60)';
END;
$$;
