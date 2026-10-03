-- 018_security_definer_rpc_lockdown.sql — V1 (founder round 9): close the
-- PUBLIC EXECUTE hole on try_quote_cache_refresh.
--
-- DEFECT (auditor round 9, verified on the Postgres 16 harness): migrations
-- 016/017 revoked EXECUTE on try_quote_cache_refresh from anon and
-- authenticated but never from PUBLIC. Postgres grants EXECUTE to PUBLIC at
-- function-creation time by default, so PUBLIC kept the privilege and any
-- caller holding the anon key could still invoke this SECURITY DEFINER RPC:
--   * as anon it inserted claim-placeholder rows (price 0, source='claim',
--     observed_at null) into quote_cache — RLS is bypassed because a
--     SECURITY DEFINER function runs as its owner (016/017 deny-all RLS
--     never applied to this path),
--   * it held the refresh claim on real symbols, so the legitimate
--     refresher lost the claim and quotes went stale site-wide,
--   * called every ~5 s per symbol it could keep the quote surface stale
--     while bloating quote_cache with placeholder rows.
-- Why CI missed it: pg_harness.sql mimics Supabase with
-- "GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role", so the
-- harness hole came from the DIRECT grant while the LIVE hole came from
-- PUBLIC — the 016/017 revokes looked effective in CI but left PUBLIC open.
-- has_function_privilege() aggregates every grant path (PUBLIC or direct),
-- so the new invariant (scripts/ci/security_definer_invariants.sql) bites
-- in BOTH environments.
--
-- ADDITIVE ONLY (lesson from 007/008: no ALTER FUNCTION ... OWNER).

-- 1. The defect: close every grant path on the quote-cache claim RPC and
--    grant it to the one role that legitimately calls it (lib/quoteCache
--    uses the service key).
REVOKE EXECUTE ON FUNCTION public.try_quote_cache_refresh(text, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.try_quote_cache_refresh(text, integer) TO service_role;

-- 2. Same treatment for the 002 SECURITY DEFINER trigger functions that
--    still held the default PUBLIC EXECUTE: firing a trigger never checks
--    EXECUTE, so this changes nothing for the triggers themselves — it
--    closes the direct-call vector with the caller's privileges elevated
--    to the function owner.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_tier_write_protection() FROM PUBLIC, anon, authenticated;

-- 3. Cleanup of rows the hole let callers create: claim placeholders that
--    never completed a real observation. lib/quoteCache writeRow() upserts,
--    so deleting an in-flight claim row is safe — the legitimate refresher
--    re-inserts the row with the real quote (source = provider id,
--    observed_at set); only rows WITHOUT a real observation remain here.
DELETE FROM quote_cache WHERE source = 'claim' AND observed_at IS NULL;
