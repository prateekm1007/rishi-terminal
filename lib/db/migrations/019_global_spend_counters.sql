-- 019_global_spend_counters.sql — W3 (founder round-10): anonymous
-- chat cost safety.
--
-- Adds the ONE primitive the global spend caps need: an atomic
-- increment-by-N counter over the EXISTING rate_limits table (008).
-- hit_rate_limit only increments by 1 per call; the global daily TOKEN
-- cap must add the provider-reported usage (N tokens) atomically, and
-- the cap CHECK must be able to read the counter without incrementing
-- (p_increment = 0).
--
-- Same ownership model as every 008 RPC: SECURITY DEFINER, EXECUTE for
-- service_role ONLY (PUBLIC/anon/authenticated revoked) — the V1.1
-- catalog invariant in scripts/ci/security_definer_invariants.sql
-- enforces this class mechanically.
--
-- ADDITIVE ONLY (lesson from 007/008: no ALTER FUNCTION ... OWNER).

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_key             text,
  p_increment       integer,
  p_limit           integer,
  p_window_seconds  integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_increment IS NULL OR p_increment < 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid increment');
  END IF;

  INSERT INTO public.rate_limits AS rl (key, window_start, count)
  VALUES (p_key, now(), p_increment)
  ON CONFLICT (key)
  DO UPDATE SET
    -- expired window -> reset to this increment; otherwise add it
    count = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
      THEN p_increment
      ELSE rl.count + p_increment
    END,
    window_start = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
      THEN now()
      ELSE rl.window_start
    END
  RETURNING rl.count INTO v_count;

  RETURN jsonb_build_object('allowed', v_count <= p_limit, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, integer, integer, integer) TO service_role;
