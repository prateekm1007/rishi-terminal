-- ============================================================
-- 008 — ATOMIC CHAT QUOTA + PERSISTENT RATE LIMITER (R6, round 2)
-- ============================================================
-- Problems being fixed:
--  1. The old quota was read-then-upsert in JS: concurrent requests read
--     the same count and each wrote count+1, so parallel calls exceeded
--     the daily quota (cost abuse).
--  2. The per-IP burst limiter was an in-memory Map — meaningless on
--     serverless, where every instance has its own map.
--  3. The quota day key used UTC (toISOString.slice(0,10)); users are in
--     India, so the quota reset at 05:30 IST.
--
-- consume_chat_quota is a single INSERT .. ON CONFLICT DO UPDATE ..
-- WHERE count < limit RETURNING count: no row returned = over quota.
-- The IST day is computed here (single source of truth), not in JS.
--
-- refund_chat_quota decrements today's IST counter (floor 0) when the
-- upstream chat call fails — a failed completion must not burn quota.
--
-- hit_rate_limit is a fixed-window counter over the rate_limits table
-- (persistent, shared across serverless instances). Executable only by
-- service_role; RLS: no policies (service role only), same model as
-- chat_usage.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_chat_quota(
  p_user_id uuid,
  p_limit   integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date    := (now() AT TIME ZONE 'Asia/Kolkata')::date; -- IST day (R6.4)
  v_count integer;
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid limit');
  END IF;

  INSERT INTO public.chat_usage AS cu (user_id, day, count)
  VALUES (p_user_id, v_day, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET count = cu.count + 1, updated_at = now()
  WHERE cu.count < p_limit
  RETURNING cu.count INTO v_count;

  -- No row: the conflict guard (count < limit) failed -> over quota.
  IF v_count IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'quota exhausted');
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'day', v_day);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_chat_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day     date    := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_refunded boolean := false;
BEGIN
  UPDATE public.chat_usage
     SET count = GREATEST(0, count - 1)
   WHERE user_id = p_user_id AND day = v_day
  RETURNING TRUE INTO v_refunded;

  RETURN jsonb_build_object('ok', true, 'refunded', v_refunded);
END;
$$;

-- ── persistent rate limiter (shared across instances) ────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count         INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: service role only (same model as chat_usage).

CREATE OR REPLACE FUNCTION public.hit_rate_limit(
  p_key             text,
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
  -- Occasional pruning so stale windows do not accumulate forever.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
     WHERE window_start < now() - interval '1 day';
  END IF;

  INSERT INTO public.rate_limits AS rl (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key)
  DO UPDATE SET
    -- expired window -> reset; otherwise increment
    count = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE rl.count + 1
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

-- Ownership and execution: service_role only.
-- NOTE: ALTER FUNCTION ... OWNER TO service_role omitted — it fails with 42501
-- on Supabase (postgres is not a member of service_role). Verified equivalent
-- end state: owner = postgres · SECURITY DEFINER · EXECUTE revoked from
-- PUBLIC/anon/authenticated and granted to service_role (below).

REVOKE ALL ON FUNCTION public.consume_chat_quota(uuid, integer)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_chat_quota(uuid)                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_chat_quota(uuid, integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_chat_quota(uuid)             TO service_role;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;
