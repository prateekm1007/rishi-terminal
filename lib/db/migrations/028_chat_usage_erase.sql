-- ============================================================
-- 028 — CHAT_USAGE ERASURE COVERAGE (G1, founder Round-22)
-- ============================================================
-- The live CI Postgres erasure test (scripts/ci/
-- account_deletion_invariants.sql) proved that deleting the auth user
-- does NOT remove the deleted account's chat_usage rows — while
-- /api/account/delete responds `cascaded: [... chat_usage ...]` and lib/account/coverage.ts claims
-- cascade-via-auth-users. The rows survive.
--
-- Root cause (Constitution 15 — root cause, not symptom): migration
-- 015 (founder decision, anonymous chat quota identities) dropped
-- chat_usage's FK to auth.users, because the quota identity may be an
-- anonymous uuidv5 of the client IP. Deletion coverage was never
-- re-established, and the static enumeration test cannot catch the
-- gap: it reads migration TEXT, where 005 still declares the cascade.
--
-- Fix at the same layer the deletion happens: a DB-level trigger on
-- auth.users purges the deleted identity's chat_usage rows atomically,
-- in the same transaction as the auth-user delete (the one operation
-- /api/account/delete performs through auth.admin.deleteUser).
--
-- Migration 015's decision is preserved: chat_usage.user_id remains a
-- QUOTA IDENTITY column and anonymous identities (uuidv5 of the client
-- IP — not auth users, never matching OLD.id) are untouched.
--
-- SECURITY DEFINER: GoTrue deletes auth users as the
-- supabase_auth_admin role, which holds no grants on public tables —
-- the purge must not depend on the caller's privileges (the same
-- reason 002's handle_new_user is SECURITY DEFINER). RLS on
-- chat_usage (enabled, no policies) is bypassed by the table owner,
-- which is the intended service-path semantics of this trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_chat_usage_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_usage WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS chat_usage_erase_on_user_delete ON auth.users;
CREATE TRIGGER chat_usage_erase_on_user_delete
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.purge_chat_usage_on_user_delete();

-- ── Self-check: the erasure path must exist every time this runs ──
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
    AND tgname = 'chat_usage_erase_on_user_delete'
    AND NOT tgisinternal
    AND tgenabled IN ('O', 'A', 'R');
  IF n <> 1 THEN
    RAISE EXCEPTION 'G1 self-check FAILED: chat_usage erasure trigger missing on auth.users';
  END IF;
END $$;
