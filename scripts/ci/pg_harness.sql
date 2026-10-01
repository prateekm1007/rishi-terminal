-- ============================================================
-- pg_harness.sql — Supabase-like stubs for the CI migration job.
-- ============================================================
-- CI applies lib/db/migrations/001…NN to a vanilla Postgres 16
-- container. The migrations are written for Supabase, which provides:
--   * the roles anon / authenticated / service_role,
--   * the `auth` schema (auth.users, auth.uid(), auth.jwt(), auth.role())
--     backed by GoTrue JWTs,
--   * default privileges that grant anon/authenticated full table
--     access (that is exactly why N2 existed: RLS must be the guard).
-- This harness recreates enough of that surface for the migrations to
-- apply and for the RLS/privilege invariants to be MEANINGFUL: the
-- default privileges below mimic Supabase, so a table that ships
-- without ENABLE ROW LEVEL SECURITY would be writable by anon in this
-- harness — and the rls_invariants.sql assertions would catch it.
--
-- The JWT claims are read from the standard `request.jwt.claim.*`
-- GUCs, so tests can simulate a signed-in user with
--   SET request.jwt.claim.sub = '<uuid>';

-- ── 1. Supabase roles ─────────────────────────────────────────
-- service_role carries BYPASSRLS on Supabase (that is how the
-- service-key writers reach these tables). Recreating it here is what
-- makes the append-only trigger test in rls_invariants.sql exercise
-- the TRIGGER rather than failing on RLS first.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  ELSE
    ALTER ROLE service_role BYPASSRLS;
  END IF;
END
$$;

-- ── 2. Extensions used by the migrations ──────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 3. auth schema stub (GoTrue stand-in) ─────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY,
  email              text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    'anon'
  )
$$;

-- ── 4. Supabase-like default privileges ───────────────────────
-- On Supabase, anon/authenticated/service_role receive broad grants on
-- every table created in `public`. Recreating that here means the CI
-- invariants actually test the migrations' RLS + REVOKE defences
-- instead of passing vacuously on vanilla-Postgres defaults.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
