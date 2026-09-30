-- ============================================================
-- 008_chat_usage_atomic.sql (remediation round 2, R6)
--
-- PROBLEMS FIXED:
--   1. Quota race: the chat route read `count`, then upserted `count+1`.
--      Concurrent requests all read the same value and a user could exceed
--      the daily quota by firing parallel requests (cost abuse).
--   2. Burned quota on upstream failure: quota was consumed before the
--      provider call and never refunded when the provider errored.
--   3. In-memory IP limiter: a per-instance Map is meaningless on
--      serverless. Replaced by a shared Postgres counter (this migration).
--   4. UTC day key: users are in India; the quota now keys on the IST
--      calendar day (computed by the caller via Asia/Kolkata; the RPC
--      treats p_day as an opaque date).
--
-- All consumption is ATOMIC and returns the verdict in one statement.
-- ============================================================

-- ── 1. Atomic per-user daily chat quota ────────────────────────────────
-- Returns { allowed: boolean, count: int }. No row returned by the UPDATE
-- arm means the caller is at/over the limit — the INSERT arm handles the
-- first use of the day.
CREATE OR REPLACE FUNCTION public.consume_chat_quota(
  p_user_id uuid,
  p_day     date,
  p_limit   integer
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO public.chat_usage (user_id, day, count)
    VALUES (p_user_id, p_day, 1)
    ON CONFLICT (user_id, day) DO UPDATE
      SET count = public.chat_usage.count + 1
      WHERE public.chat_usage.count < p_limit
    RETURNING count
  )
  SELECT jsonb_build_object(
    'allowed', COALESCE((SELECT count IS NOT NULL FROM ins), false),
    'count',   COALESCE((SELECT count FROM ins), 0)
  );
$$;

-- ── 2. Refund on upstream failure ──────────────────────────────────────
-- Decrements the day's counter (floored at 0) so a failed provider call
-- does not burn the user's allowance. Never raises.
CREATE OR REPLACE FUNCTION public.refund_chat_quota(
  p_user_id uuid,
  p_day     date
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_usage
     SET count = GREATEST(0, count - 1)
   WHERE user_id = p_user_id AND day = p_day;
$$;

-- ── 3. Shared per-IP burst budget (persistent limiter store) ───────────
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip         text NOT NULL,
  bucket     text NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, bucket)
);

-- Atomic budget consumption: inserts the bucket row or increments it only
-- when under the limit; returns false when the caller is over budget.
-- Prunes stale buckets (older than p_prune_minutes) opportunistically.
CREATE OR REPLACE FUNCTION public.consume_ip_budget(
  p_ip            text,
  p_bucket        text,
  p_limit         integer,
  p_prune_minutes integer DEFAULT 10
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO public.ip_rate_limits (ip, bucket, count)
    VALUES (p_ip, p_bucket, 1)
    ON CONFLICT (ip, bucket) DO UPDATE
      SET count = public.ip_rate_limits.count + 1,
          updated_at = now()
      WHERE public.ip_rate_limits.count < p_limit
    RETURNING count
  ),
  prune AS (
    DELETE FROM public.ip_rate_limits
     WHERE updated_at < now() - make_interval(mins => p_prune_minutes)
  )
  SELECT EXISTS (SELECT 1 FROM ins);
$$;

-- ── 4. Executable only by service_role (server routes) ─────────────────
REVOKE EXECUTE ON FUNCTION public.consume_chat_quota(uuid, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_chat_quota(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ip_budget(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_chat_quota(uuid, date, integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.refund_chat_quota(uuid, date) TO service_role;
GRANT  EXECUTE ON FUNCTION public.consume_ip_budget(text, text, integer, integer) TO service_role;
