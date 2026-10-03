-- 021_drop_bump_rate_limit.sql — W3 closure (founder round-10 review,
-- 2026-10-03).
--
-- Drops bump_rate_limit (019), fully superseded by the
-- reserve_rate_limit / settle_rate_limit pair (020):
--   request-cap admission  -> reserve_rate_limit(prefix, 1, ...)
--   token reservation      -> reserve_rate_limit(prefix, R, ...)
--   token settlement       -> settle_rate_limit(prefix, actual - R)
--
-- bump's increment-then-check semantics could not express the guarded
-- admission (denied increments inflated the counter) nor the settlement
-- release. After this migration the app has NO caller for it.
--
-- SEQUENCING (operational, recorded in the PR evidence): the
-- currently-deployed code still calls bump_rate_limit, so 021 is
-- applied to the LIVE database only AFTER the reserve/settle code is
-- deployed and its SHA verified via /api/version. CI applies
-- 001…021 in order on a fresh database, where the ordering is moot.

DROP FUNCTION IF EXISTS public.bump_rate_limit(text, integer, integer, integer);
