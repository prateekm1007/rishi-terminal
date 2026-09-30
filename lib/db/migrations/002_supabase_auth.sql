-- ============================================================
-- 002 — SUPABASE AUTH INTEGRATION (remediation T5, 2026-09)
-- ============================================================
-- Replaces the NextAuth credentials bypass (any email could sign in) with
-- Supabase Auth sessions. RLS policies in 001 are keyed on auth.uid(),
-- so users.id must now be the Supabase auth user id.
--
-- Run against the live project in the Supabase SQL editor, in order,
-- together with 003/004. Idempotent: safe to re-run.
--
-- NOTE FOR FOUNDER: verify 001/003/004 were applied to the live project
-- (Supabase dashboard -> Table editor) before running this. The migration
-- sources were previously split between lib/db/migrations/ and supabase/
-- and have been consolidated into lib/db/migrations/ (see PR notes).

-- ── 1. Link public.users to auth.users ─────────────────────────
-- Rows in public.users that have no auth.users counterpart were created by
-- the old NextAuth demo bypass (no password, no verification). They are
-- fabricated identities and are removed so the FK can be applied.
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- Stop generating our own ids: ids come from auth.users from now on.
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

-- Enforce the 1:1 link with Supabase's auth user.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ── 2. Create users row on first sign-in (trigger) ─────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Protect tier columns from self-service writes ───────────
-- 001's users_update policy lets a user update their own row, which would
-- allow self-upgrading tier from the browser (Supabase REST accepts any
-- column the policy covers). Tier is granted exclusively by the payment
-- webhook via the service role; this trigger rejects anyone else changing it.
CREATE OR REPLACE FUNCTION public.enforce_tier_write_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.tier_expires_at IS DISTINCT FROM OLD.tier_expires_at THEN
    -- service_role connections bypass RLS but still run triggers; the
    -- payment webhook uses the service role, so allow those and block the rest.
    IF coalesce(current_user, '') <> 'service_role'
       AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
      RAISE EXCEPTION 'tier and tier_expires_at are managed by the payment system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_tier_write_protection ON public.users;
CREATE TRIGGER users_tier_write_protection
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tier_write_protection();

-- ── 4. Expired tiers must not be honoured by queries ───────────
-- Helper view of effective tier (readers can also call resolveTier() in app
-- code; this keeps SQL-side consumers consistent).
CREATE OR REPLACE FUNCTION public.effective_tier(u public.users)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN u.tier = 'seeker' THEN 'seeker'
    WHEN u.tier_expires_at IS NULL THEN 'seeker'
    WHEN u.tier_expires_at <= now() THEN 'seeker'
    ELSE u.tier
  END;
$$;
