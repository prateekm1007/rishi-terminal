-- ============================================================
-- 027_alerts_v2.sql — X3-08 (founder Round-16 C7): server-side
-- alerts with idempotent events, a persistent rate limit, and
-- per-user unsubscribe.
--
-- v1's defects (lib/alerts/alertEngine.ts, localStorage-only):
-- alerts only evaluated while the user's browser is open, no
-- delivery, no cross-device persistence, no idempotency, no rate
-- limit — every defect this migration's shapes exist to close.
--
-- Delivery provider (email/push/WhatsApp) is FD-5, still a founder
-- decision: the schema records DELIVERY STATE honestly (queued rows
-- carry delivery_status), it never fabricates a "sent" claim.
--
-- Caps and limits:
--   alerts_triggers    <= 25 per user (a cap trigger guards it)
--   deliveries         <= 10 per user per hour (persistent counter)
--
-- RLS (Constitution 13): every table is auth.uid()-scoped; the
-- unsubscribe endpoint verifies a stateless HMAC token (no auth needed,
-- no user enumeration possible).
-- ============================================================

CREATE TABLE alerts_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (length(symbol) BETWEEN 1 AND 32),
  -- 'price_above' | 'price_below' | 'score_above' | 'score_below' | 'filing_new'
  kind TEXT NOT NULL CHECK (kind IN ('price_above', 'price_below', 'score_above', 'score_below', 'filing_new')),
  threshold NUMERIC(18,4) NOT NULL CHECK (threshold >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_triggers_user ON alerts_triggers(user_id);
CREATE INDEX idx_alerts_triggers_active ON alerts_triggers(active) WHERE active;

ALTER TABLE alerts_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_triggers_select ON alerts_triggers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY alerts_triggers_insert ON alerts_triggers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY alerts_triggers_update ON alerts_triggers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY alerts_triggers_delete ON alerts_triggers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- The idempotency table: ONE row per (trigger, event). The evaluator's
-- INSERT ... ON CONFLICT DO NOTHING is the "fires once across two
-- evaluator runs" guarantee — the database, not the caller, decides.
CREATE TABLE alerts_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_id UUID NOT NULL REFERENCES alerts_triggers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Deterministic event identity, e.g. 'price_above:RELIANCE:2500:1728100800'
  -- (the hour bucket of the crossing — one alert per crossing per hour).
  event_key TEXT NOT NULL CHECK (length(event_key) BETWEEN 3 AND 200),
  observed_value NUMERIC(18,4) NOT NULL,
  -- 'pending' | 'delivered' | 'skipped_unsubscribed' | 'skipped_rate_limited'
  -- | 'skipped_no_provider' | 'failed'
  delivery_status TEXT NOT NULL CHECK (delivery_status IN
    ('pending', 'delivered', 'skipped_unsubscribed', 'skipped_rate_limited', 'skipped_no_provider', 'failed')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (trigger_id, event_key)
);

CREATE INDEX idx_alerts_events_user ON alerts_events(user_id);
CREATE INDEX idx_alerts_events_created ON alerts_events(created_at DESC);

ALTER TABLE alerts_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_events_select ON alerts_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY alerts_events_insert ON alerts_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY alerts_events_delete ON alerts_events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- The persistent per-user hourly delivery counter (Constitution 12:
-- in-memory state on serverless is not state).
CREATE TABLE alerts_rate_limit (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Hour bucket, e.g. '2026-10-05T09' UTC.
  hour_bucket TEXT NOT NULL CHECK (length(hour_bucket) = 13),
  delivered INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour_bucket)
);

ALTER TABLE alerts_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_rate_limit_select ON alerts_rate_limit FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Delivery preferences. The unsubscribe TOKEN is stateless: it is
-- HMAC-SHA256(userId, domain-separated key derived from CRON_SECRET)
-- (lib/alerts/unsubToken.ts) — stable per user, unforgeable without the
-- server secret, verifiable without a database read, and no token
-- material is ever stored.
CREATE TABLE alerts_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE alerts_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_preferences_select ON alerts_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY alerts_preferences_insert ON alerts_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY alerts_preferences_update ON alerts_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── triggers cap (<= 25 per user), same shape as 026 ────────────────
CREATE OR REPLACE FUNCTION enforce_alerts_triggers_cap() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('alerts-triggers-cap:' || NEW.user_id::text, 0));
  SELECT count(*) INTO n FROM public.alerts_triggers WHERE user_id = NEW.user_id;
  IF n >= 25 THEN
    RAISE EXCEPTION 'alerts triggers cap reached: at most 25 alert triggers per user (delete one first)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER alerts_triggers_cap BEFORE INSERT ON public.alerts_triggers
  FOR EACH ROW EXECUTE FUNCTION enforce_alerts_triggers_cap();

-- ── the atomic rate-limit consumer (Constitution 12) ────────────────
-- SECURITY DEFINER with the 011/018 fail-closed grant pattern: only the
-- service role (the CRON_SECRET-gated evaluator) may consume; anon and
-- authenticated callers get nothing.
CREATE OR REPLACE FUNCTION alerts_consume_rate_limit(p_user uuid, p_bucket text, p_cap int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('alerts-rl:' || p_user::text || ':' || p_bucket, 0));
  INSERT INTO public.alerts_rate_limit (user_id, hour_bucket, delivered)
  VALUES (p_user, p_bucket, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET delivered = public.alerts_rate_limit.delivered + 1;
  SELECT delivered INTO n FROM public.alerts_rate_limit
  WHERE user_id = p_user AND hour_bucket = p_bucket;
  RETURN n <= p_cap;
END $$;

REVOKE ALL ON FUNCTION alerts_consume_rate_limit(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION alerts_consume_rate_limit(uuid, text, int) TO service_role;
