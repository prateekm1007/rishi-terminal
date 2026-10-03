-- ============================================================
-- 020 — GLOBAL CHAT SPEND: HARD RESERVATION + SETTLEMENT
--       (W3 closure, founder round 11 — defects A + C)
-- ============================================================
-- Founder round-11 review of merged W3 (PR #102):
--
--   Defect A: the token cap was an admission READ followed by a
--   post-response record. Concurrent requests all passed the read and
--   the counter could exceed the nominal ceiling; vendors that report
--   no usage spent uncounted tokens. Fix: ONE atomic reservation at
--   admission — the request's worst-case completion budget
--   (max_tokens x completions ceiling) is added to the daily counter
--   behind a GUARDED UPDATE (the row is only written when BOTH caps
--   still fit), and every request settles its reservation to the
--   ACTUAL provider-reported usage afterward. The counter can never
--   exceed the token cap at admission; after settlement the counter
--   holds the real usage. This table (one row per IST day, two
--   counters) is the minimal architecture that makes both caps a
--   single atomic update — reusing the single-counter rate_limits row
--   would need two RPCs and could not guard both caps atomically.
--
--   Defect C: the merged W3 computed the counter day key in JavaScript
--   while the quota RPCs compute the IST day in SQL (two sources of
--   truth for one concept, rule 14). Fix: the day is computed HERE, in
--   SQL, mirroring consume_chat_quota (R6.4). No date string crosses
--   the RPC boundary from JS.
--
-- The JS-side bump_rate_limit key scheme (migration 019) had exactly
-- one caller (the soft cap read); it is superseded by the guarded
-- reservation and its caller is deleted — the function is DROPPED here
-- (rule 17: dead code; forward-only: 019 created it, 020 retires it).
-- hit_rate_limit (migration 008) is UNTOUCHED — the per-IP burst
-- limiter still uses it.
--
-- Failure semantics (unchanged from the merged W3 contract): the chat
-- route FAILS CLOSED when the counter infrastructure is unreachable
-- (spend is never allowed to run unbounded, rule 12). Until 020 is
-- applied to a live project, the new RPCs do not exist there and chat
-- fails closed on that project — apply 020 BEFORE deploying code that
-- calls it (same sequencing discipline as W2).
--
-- Ownership and execution: service_role only (the migration 018/V1
-- lockdown pattern). ADDITIVE ONLY (no ALTER FUNCTION ... OWNER).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_global_spend (
  day        DATE PRIMARY KEY,
  requests   INTEGER   NOT NULL DEFAULT 0 CHECK (requests >= 0),
  tokens     BIGINT    NOT NULL DEFAULT 0 CHECK (tokens >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_global_spend ENABLE ROW LEVEL SECURITY;
-- No policies: service role only (same model as chat_usage / rate_limits).

CREATE OR REPLACE FUNCTION public.reserve_chat_global_spend(
  p_request_increment integer,
  p_request_cap       integer,
  p_token_increment   bigint,
  p_token_cap         bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day      date := (now() AT TIME ZONE 'Asia/Kolkata')::date; -- IST day (R6.4 model)
  v_requests integer;
  v_tokens   bigint;
BEGIN
  -- Rule 9: validate at the boundary. Garbage admits nothing.
  IF p_request_increment IS NULL OR p_request_increment < 0
     OR p_request_cap IS NULL OR p_request_cap <= 0
     OR p_token_increment IS NULL OR p_token_increment < 0
     OR p_token_cap IS NULL OR p_token_cap <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid reservation');
  END IF;

  INSERT INTO public.chat_global_spend AS g (day, requests, tokens)
  VALUES (v_day, p_request_increment, p_token_increment)
  ON CONFLICT (day) DO UPDATE SET
    requests   = g.requests + EXCLUDED.requests,
    tokens     = g.tokens   + EXCLUDED.tokens,
    updated_at = now()
  WHERE g.requests + EXCLUDED.requests <= p_request_cap
    AND g.tokens   + EXCLUDED.tokens   <= p_token_cap
  RETURNING g.requests, g.tokens INTO v_requests, v_tokens;

  -- No row returned: the guarded conflict update rejected the
  -- reservation — at least one cap would have been exceeded.
  IF v_requests IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'global spend cap reached');
  END IF;

  -- Opportunistic pruning so the day table does not grow forever.
  IF random() < 0.01 THEN
    DELETE FROM public.chat_global_spend WHERE day < v_day - 7;
  END IF;

  RETURN jsonb_build_object('ok', true, 'requests', v_requests, 'tokens', v_tokens, 'day', v_day);
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_chat_global_tokens(
  p_reserved bigint,
  p_actual   bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day     date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_tokens  bigint;
BEGIN
  IF p_reserved IS NULL OR p_reserved < 0 OR p_actual IS NULL OR p_actual < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid settlement');
  END IF;

  UPDATE public.chat_global_spend
     SET tokens = GREATEST(0, tokens - p_reserved + p_actual),
         updated_at = now()
   WHERE day = v_day
  RETURNING tokens INTO v_tokens;

  IF v_tokens IS NULL THEN
    -- No row for today: the reservation was made against a previous
    -- IST day (a request straddling midnight). There is nothing to
    -- settle into today's counter — a deliberate no-op, NOT an error.
    RETURN jsonb_build_object('ok', true, 'settled', false);
  END IF;

  RETURN jsonb_build_object('ok', true, 'settled', true, 'tokens', v_tokens);
END;
$$;

-- Superseded by the guarded reservation (see header): 019's JS-keyed
-- soft-cap primitive has no caller left.
DROP FUNCTION IF EXISTS public.bump_rate_limit(text, integer, integer, integer);

REVOKE ALL ON FUNCTION public.reserve_chat_global_spend(integer, integer, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_chat_global_tokens(bigint, bigint)               FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_chat_global_spend(integer, integer, bigint, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_chat_global_tokens(bigint, bigint)                   TO service_role;
