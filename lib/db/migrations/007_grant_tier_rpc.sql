-- ============================================================
-- 007_grant_tier_rpc.sql (remediation round 2, R2)
--
-- PROBLEM FIXED: the old grant flow wrote transactions.status='paid' in one
-- query and users.tier in a second. A failure between them left a PAID
-- transaction with NO tier granted, and every retry then hit the replay
-- guard forever — a paying customer with no access.
--
-- FIX: one SECURITY DEFINER function performs lock -> verify -> settle ->
-- grant inside a single transaction. Any failure rolls EVERYTHING back, so
-- a retry starts clean.
--
-- Tier rules (stated explicitly per spec R2.1). TIER_DURATION = 365 days.
-- Rank: seeker=0 < student=1 < disciple=2.
--   SETTLE path (transaction flips created -> paid):
--     - Buying the SAME tier while it is still active extends from
--       GREATEST(now(), tier_expires_at)  (no lost paid time on renewal).
--     - Buying a higher tier starts a fresh 365 days from now (upgrade).
--     - An expired or 'seeker' current tier always starts from now().
--   REPLAY path (same order + same payment id arrive again):
--     - Never extends. It only REPAIRS: ensures the user holds at least
--       (purchased tier, paid_at + 365d). If they already hold an active
--       tier at least as good with expiry >= that promise, it is a no-op.
--     - Never downgrades: a replay of an older/lower payment after a later
--       upgrade leaves the better tier untouched.
--
-- Executable only by service_role (the payment webhook / server routes).
-- ============================================================

-- Helper (settle path): apply the tier grant honouring the extension rule.
CREATE OR REPLACE FUNCTION public.apply_tier_grant(p_user_id uuid, p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier        text;
  v_expires     timestamptz;
  v_now         timestamptz := now();
  v_new_expires timestamptz;
  v_base        timestamptz;
  v_cur_active  boolean;
  v_cur_rank    int;
  v_new_rank    int;
BEGIN
  SELECT tier, tier_expires_at INTO v_tier, v_expires
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'user_missing');
  END IF;

  v_cur_rank := CASE v_tier
    WHEN 'disciple' THEN 2 WHEN 'student' THEN 1 ELSE 0 END;
  v_new_rank := CASE p_tier
    WHEN 'disciple' THEN 2 WHEN 'student' THEN 1 ELSE 0 END;
  v_cur_active := v_tier <> 'seeker' AND v_expires IS NOT NULL AND v_expires > v_now;

  -- Extension base: renewal of the same (active) tier extends from its
  -- current expiry; everything else (upgrade, expired, seeker) starts now.
  IF v_cur_active AND v_new_rank = v_cur_rank THEN
    v_base := GREATEST(v_now, v_expires);
  ELSE
    v_base := v_now;
  END IF;
  v_new_expires := v_base + interval '365 days';

  UPDATE public.users
     SET tier = p_tier, tier_expires_at = v_new_expires
   WHERE id = p_user_id;

  RETURN jsonb_build_object('status', 'granted',
    'tier', p_tier, 'tier_expires_at', v_new_expires);
END;
$$;

-- Helper (replay path): re-assert this payment's promise WITHOUT extending.
-- Promise: the user should hold at least (p_tier, p_paid_at + 365 days).
CREATE OR REPLACE FUNCTION public.repair_tier_grant(
  p_user_id uuid, p_tier text, p_paid_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier     text;
  v_expires  timestamptz;
  v_min_exp  timestamptz := p_paid_at + interval '365 days';
  v_cur_active boolean;
  v_cur_rank int;
  v_new_rank int;
  v_new_tier text;
  v_new_exp  timestamptz;
BEGIN
  SELECT tier, tier_expires_at INTO v_tier, v_expires
    FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'user_missing');
  END IF;

  v_cur_rank := CASE v_tier
    WHEN 'disciple' THEN 2 WHEN 'student' THEN 1 ELSE 0 END;
  v_new_rank := CASE p_tier
    WHEN 'disciple' THEN 2 WHEN 'student' THEN 1 ELSE 0 END;
  v_cur_active := v_tier <> 'seeker' AND v_expires IS NOT NULL AND v_expires > now();

  -- Already holding an active tier at least as good, past this payment's
  -- promise: pure no-op (also covers "replay after a later upgrade").
  IF v_cur_active AND v_cur_rank >= v_new_rank AND v_expires >= v_min_exp THEN
    RETURN jsonb_build_object('status', 'already',
      'tier', v_tier, 'tier_expires_at', v_expires);
  END IF;

  -- Repair up to the promise, never regressing a better current state.
  v_new_tier := CASE WHEN v_cur_rank > v_new_rank THEN v_tier ELSE p_tier END;
  v_new_exp  := GREATEST(v_min_exp,
                   CASE WHEN v_cur_active THEN v_expires ELSE '-infinity'::timestamptz END);

  IF v_new_tier = v_tier AND v_expires IS NOT NULL AND v_expires >= v_new_exp THEN
    RETURN jsonb_build_object('status', 'already',
      'tier', v_tier, 'tier_expires_at', v_expires);
  END IF;

  UPDATE public.users
     SET tier = v_new_tier, tier_expires_at = v_new_exp
   WHERE id = p_user_id;

  RETURN jsonb_build_object('status', 'repaired',
    'tier', v_new_tier, 'tier_expires_at', v_new_exp);
END;
$$;

-- Main entry point: atomically settle a Razorpay payment and grant its tier.
CREATE OR REPLACE FUNCTION public.grant_tier_for_payment(
  p_order_id   text,
  p_payment_id text,
  p_amount     integer,
  p_currency   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.transactions%ROWTYPE;
  grant_result jsonb;
BEGIN
  -- 1. Serialise webhook vs client-verify on the same order.
  SELECT * INTO tx FROM public.transactions
   WHERE razorpay_order_id = p_order_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unknown_order');
  END IF;

  -- 2. Amount/currency must match what we asked Razorpay to collect.
  IF tx.amount <> p_amount OR tx.currency <> p_currency THEN
    RETURN jsonb_build_object('status', 'amount_mismatch');
  END IF;

  -- 3. Already settled?
  IF tx.status = 'paid' THEN
    IF tx.razorpay_payment_id = p_payment_id THEN
      -- Idempotent replay: success, AND re-assert the tier promise in case
      -- a pre-R2 partial write left the user without it (repair, no extend).
      grant_result := public.repair_tier_grant(tx.user_id, tx.tier_purchased, tx.paid_at);
      RETURN jsonb_build_object('status',
        CASE grant_result->>'status'
          WHEN 'repaired' THEN 'repaired'   -- replay repaired a missing grant
          ELSE 'already'                   -- true no-op replay
        END,
        'tier',       grant_result->>'tier',
        'tier_expires_at', grant_result->>'tier_expires_at');
    END IF;
    -- Settled by a DIFFERENT payment id: refuse rather than double-grant.
    RETURN jsonb_build_object('status', 'conflict',
      'settled_with', tx.razorpay_payment_id);
  END IF;
  IF tx.status <> 'created' THEN
    RETURN jsonb_build_object('status', 'unexpected_status',
      'detail', tx.status);
  END IF;

  -- 4. Winning write: settle + grant atomically (same transaction).
  UPDATE public.transactions
     SET status = 'paid',
         razorpay_payment_id = p_payment_id,
         paid_at = now()
   WHERE id = tx.id;

  grant_result := public.apply_tier_grant(tx.user_id, tx.tier_purchased);
  IF grant_result->>'status' = 'user_missing' THEN
    -- Force a full rollback: the transaction must NOT stay paid without its
    -- grant. Caller sees a transient error and Razorpay retries.
    RAISE EXCEPTION 'user % missing for order %', tx.user_id, p_order_id;
  END IF;

  RETURN jsonb_build_object('status', 'granted',
    'tier',       grant_result->>'tier',
    'tier_expires_at', grant_result->>'tier_expires_at');
END;
$$;

-- Ownership: run as service_role. In production the RPC is invoked through
-- PostgREST with the service key (auth.jwt() role = service_role), which the
-- users_tier_write_protection trigger (002) accepts.
ALTER FUNCTION public.apply_tier_grant(uuid, text)       OWNER TO service_role;
ALTER FUNCTION public.repair_tier_grant(uuid, text, timestamptz) OWNER TO service_role;
ALTER FUNCTION public.grant_tier_for_payment(text, text, integer, text) OWNER TO service_role;

-- Executable only by service_role.
REVOKE EXECUTE ON FUNCTION public.apply_tier_grant(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.repair_tier_grant(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_tier_for_payment(text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_tier_grant(uuid, text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.repair_tier_grant(uuid, text, timestamptz) TO service_role;
GRANT  EXECUTE ON FUNCTION public.grant_tier_for_payment(text, text, integer, text) TO service_role;
