-- ============================================================
-- 028_chat_usage_erasure.sql — G1 (founder round 23): account
-- deletion must erase chat_usage again.
--
-- Defect (found by the new live CI erasure test,
-- scripts/ci/account_erasure_invariants.sql): migration 015 dropped
-- chat_usage_user_id_fkey because anonymous quota identities (uuidv5
-- of the client IP, lib/auth/anonIdentity.ts) are not auth users and
-- cannot satisfy a references-auth.users FK. Consequence: the
-- account-deletion cascade stopped covering chat_usage — deleted
-- accounts left quota rows behind while lib/account/coverage.ts
-- still claimed 'cascade-via-auth-users' and the delete route's
-- `cascaded` response still listed the table. The static test passed
-- vacuously (its regex matched 005's original CREATE clause and never
-- modeled 015's DROP CONSTRAINT).
--
-- Root fix — keep anonymous identities AND restore erasure, with no
-- auth-schema modification (Supabase owns that surface):
--   a BEFORE DELETE trigger on public.users sweeps the account's
--   chat_usage rows inside the same transaction as the cascade.
--
--   auth.users DELETE
--     -> FK cascade deletes public.users (002, users_id_fkey)
--       -> BEFORE DELETE trigger (this migration) removes the
--          account's chat_usage rows
--       -> FK cascade continues into every cascade-via-users table
--
-- Anonymous rows are untouched (they have no public.users row), the
-- sweep is atomic with the deletion (C3), and it fires on EVERY
-- deletion path — the admin API, the SQL editor, any future route —
-- because it lives in the schema, not in application code.
--
-- ADDITIVE ONLY. Idempotent: safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.erase_chat_usage_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.chat_usage WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS users_erase_chat_usage ON public.users;
CREATE TRIGGER users_erase_chat_usage
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.erase_chat_usage_on_user_delete();
