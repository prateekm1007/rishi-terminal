-- 023_chat_challenges.sql — X7 (Round 13, Z6b): the self-hosted
-- anonymous chat challenge, single-use consume.
--
-- X7: after N anonymous requests per identity (default 5, env
-- CHAT_CHALLENGE_AFTER), /api/chat answers with a proof-of-work challenge
-- (lib/chat/challenge.ts). A solution is verified server-side (signature,
-- identity binding, expiry, work) and then CONSUMED EXACTLY ONCE here:
--
--   consume_chat_challenge: one UPDATE guarded by consumed_at IS NULL,
--     RETURNING whether THIS caller won the row. Under READ COMMITTED two
--     concurrent consumers of the same row serialize on the row lock and
--     the second re-evaluates the WHERE — only one winner. A replayed
--     solution (same token) finds consumed_at set and is refused.
--
-- The table holds NO secret material: token_hash is SHA-256 of the
-- public challenge token (a verifier, not a credential — rule 8: even if
-- the table leaked, nothing is reusable). Rows expire with the day
-- (purged lazily by the cleanup statement inside the RPC; the TTL is
-- 24h — longer than the 10-minute challenge lifetime, short enough to
-- keep the table trivial).
--
-- Same ownership model as every 008/019/020 RPC: SECURITY DEFINER,
-- EXECUTE for service_role ONLY (the V1.1 catalog invariant in
-- scripts/ci/security_definer_invariants.sql enforces this class
-- mechanically).
--
-- ADDITIVE ONLY. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.chat_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  identity_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  consumed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS chat_challenges_identity_idx
  ON public.chat_challenges (identity_hash, created_at);

CREATE OR REPLACE FUNCTION public.consume_chat_challenge(
  p_token_hash    text,
  p_identity_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  -- Lazy cleanup: rows older than a day fall out (bounded table).
  DELETE FROM public.chat_challenges
   WHERE created_at < now() - interval '24 hours';

  UPDATE public.chat_challenges
     SET consumed_at = now()
   WHERE token_hash = p_token_hash
     AND identity_hash = p_identity_hash
     AND consumed_at IS NULL
     AND created_at > now() - interval '10 minutes';  -- the challenge TTL

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_chat_challenge(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_chat_challenge(text, text) TO service_role;

ALTER TABLE public.chat_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: service-role-only bookkeeping (the RPCs run as definer);
-- RLS enabled with no policies = denied to anon/authenticated.
REVOKE ALL ON public.chat_challenges FROM PUBLIC, anon, authenticated;

-- X7: the challenge gate reads the caller's consumed-unit count for the
-- IST day. The day key is computed HERE (the one-source-of-truth rule the
-- 008/020 RPCs already follow) — no JavaScript date key anywhere.
-- The parameter type matches 008's consume_chat_quota (uuid): PostgREST
-- coerces the JS identity string; a text parameter here would make
-- `user_id = p_user_id` a uuid = text operator error.
CREATE OR REPLACE FUNCTION public.chat_usage_today(
  p_user_id       uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count FROM public.chat_usage
      WHERE user_id = p_user_id
        AND day = (now() AT TIME ZONE 'Asia/Kolkata')::date),
    0);
$$;

REVOKE ALL ON FUNCTION public.chat_usage_today(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_usage_today(uuid) TO service_role;
