-- ============================================================
-- 015 — ANONYMOUS CHAT QUOTA IDENTITIES (founder decision 2026-10-02)
-- ============================================================
-- Founder decision: chatting with the Rishis requires NO authentication.
-- POST /api/chat now quota-keys every caller:
--
--   signed-in caller  -> the account id (unchanged)
--   anonymous caller  -> a DETERMINISTIC uuidv5 of the client IP
--                        (lib/auth/anonIdentity.ts; the raw IP is never
--                        stored)
--
-- chat_usage.user_id therefore becomes the QUOTA IDENTITY column: it may
-- hold an auth user id OR an anonymous per-IP uuid. Migration 005 created
-- it with `REFERENCES auth.users (id) ON DELETE CASCADE`, which cannot
-- represent anonymous identities (the insert fails the FK and the quota
-- path fail-closes with 429 — observed locally 2026-10-02).
--
-- This migration drops that single constraint. Nothing else changes:
--   - the table remains service-role-only bookkeeping (RLS: no policies),
--   - consume_chat_quota / refund_chat_quota (008) are untouched,
--   - the one free daily quota (FREE_CHAT_DAILY_QUOTA) is unchanged,
--   - no historical migration is modified (forward-only, per Rule 14).
-- Quota rows of deleted accounts become inert bookkeeping instead of
-- cascade-deleted rows; they are bounded (one row per identity per day)
-- and readable by nobody but the service role.
-- ============================================================

ALTER TABLE public.chat_usage
  DROP CONSTRAINT IF EXISTS chat_usage_user_id_fkey;
