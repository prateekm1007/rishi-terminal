-- ============================================================
-- 005 — CHAT QUOTA TRACKING (remediation T7)
-- ============================================================
-- Per-user daily chat usage for tier-based quotas on /api/chat.
-- Service role reads/writes this table; end users never touch it directly
-- (no RLS grant to the anon role).

CREATE TABLE IF NOT EXISTS public.chat_usage (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- No policies: only the service role (payment/webhook/quota logic) touches
-- this table. RLS enabled with no policies = denied to anon/authenticated.
