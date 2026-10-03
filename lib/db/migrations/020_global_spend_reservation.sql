-- 020_global_spend_reservation.sql — W3 closure (founder round-10
-- review, 2026-10-03, defects A and C).
--
-- Replaces the check-afterward token accounting with a RESERVATION /
-- SETTLEMENT pair over the EXISTING rate_limits table (008):
--
--   reserve_rate_limit: the guarded atomic increment. The counter moves
--     ONLY when count + amount fits under the limit (WHERE-guarded
--     upsert), so concurrent admissions can never push it past the cap.
--     The app reserves the single-request token ceiling BEFORE the
--     provider call and is refused when it does not fit.
--   settle_rate_limit: the settlement adjustment (delta may be negative
--     to release an over-reservation, or positive when a provider
--     reports more than the ceiling — recorded honestly, never refused:
--     settlement is a ledger, not an admission). Floors at zero.
--
-- THE IST DAY KEY IS COMPUTED HERE (defect C: one source of truth per
-- concept — the same SQL expression consume_chat_quota has used since
-- 008). Callers pass a stable key PREFIX; there is no JavaScript
-- date-key anywhere. The composed key
--   '<prefix>:<IST date>'
-- is byte-identical to the keys the pre-closure code composed in JS,
-- so live counters continue across the deploy.
--
-- Same ownership model as every 008/019 RPC: SECURITY DEFINER, EXECUTE
-- for service_role ONLY. The V1.1 catalog invariant in
-- scripts/ci/security_definer_invariants.sql enforces this class
-- mechanically; V1.4 (same file) positively controls the service_role
-- grant.
--
-- ADDITIVE ONLY (lesson from 007/008: no ALTER FUNCTION ... OWNER).
-- bump_rate_limit (019) is NOT dropped here: the currently-deployed
-- code still calls it — 021 drops it after the reserve/settle code is
-- deployed and verified (sequencing recorded in the PR evidence).

CREATE OR REPLACE FUNCTION public.reserve_rate_limit(
  p_key_prefix      text,
  p_amount          integer,
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
  v_key    text := p_key_prefix || ':' || (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid amount');
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid limit');
  END IF;
  -- A single amount larger than the whole limit can never be admitted —
  -- on a fresh key or an expired window the resulting count would be
  -- the amount itself (the WHERE guard below only sees live rows).
  IF p_amount > p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'amount exceeds limit');
  END IF;

  INSERT INTO public.rate_limits AS rl (key, window_start, count)
  VALUES (v_key, now(), p_amount)
  ON CONFLICT (key)
  DO UPDATE SET
    count = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
      THEN p_amount
      ELSE rl.count + p_amount
    END,
    window_start = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
      THEN now()
      ELSE rl.window_start
    END
  -- The guard: on the live path the increment happens ONLY when it fits
  -- under the limit. The row lock serializes concurrent upserts, so the
  -- admitted total can never exceed the limit (the CI concurrency proof
  -- in scripts/ci/global_spend_invariants.sql bites on this clause).
  WHERE (CASE
           WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
           THEN 0
           ELSE rl.count
         END) + p_amount <= p_limit
  RETURNING rl.count INTO v_count;

  IF v_count IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'over limit');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_rate_limit(
  p_key_prefix  text,
  p_delta       integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_key    text := p_key_prefix || ':' || (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF p_delta IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid delta');
  END IF;
  -- Settlement only ever adjusts TODAY's row. No row (a request that
  -- crossed the IST midnight between reserve and settle) is a NO-OP:
  -- the old day's key keeps the reservation — over-counted by at most
  -- one ceiling per crossing request, conservative direction, expires
  -- with the day. The floor at zero bounds a double-release.
  UPDATE public.rate_limits
     SET count = GREATEST(0, count + p_delta)
   WHERE key = v_key
   RETURNING count INTO v_count;

  RETURN jsonb_build_object('ok', true, 'count', COALESCE(v_count, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_rate_limit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_rate_limit(text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_rate_limit(text, integer) TO service_role;
