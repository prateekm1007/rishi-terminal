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

-- ── 5. pg_cron stand-in (G3, migration 029) ────────────────────
-- Migration 029 registers the warmer job through cron.schedule /
-- cron.unschedule. The CI container is vanilla Postgres (no pg_cron
-- binaries), so this stub provides the schema surface the migration
-- touches: the job table + the two functions, shaped like pg_cron
-- 1.6's own. The job COMMAND is stored, never executed — CI verifies
-- the registration SQL mechanically; the warming behavior itself is
-- the live NSE-session acceptance's to prove (never CI's).
CREATE SCHEMA IF NOT EXISTS cron;

CREATE TABLE IF NOT EXISTS cron.job (
  jobid    bigint PRIMARY KEY,
  jobname  text UNIQUE,
  schedule text NOT NULL,
  command  text NOT NULL,
  database text,
  username text,
  active   boolean NOT NULL DEFAULT true
);

CREATE OR REPLACE FUNCTION cron.schedule(p_jobname text, p_schedule text, p_command text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE v_id bigint;
BEGIN
  SELECT COALESCE(MAX(jobid), 0) + 1 INTO v_id FROM cron.job;
  INSERT INTO cron.job (jobid, jobname, schedule, command, database, username, active)
  VALUES (v_id, p_jobname, p_schedule, p_command, current_database(), current_user, true)
  ON CONFLICT (jobname) DO UPDATE
    SET schedule = EXCLUDED.schedule,
        command  = EXCLUDED.command,
        active   = true;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION cron.unschedule(p_jobname text)
RETURNS boolean
LANGUAGE sql
AS $$
  DELETE FROM cron.job WHERE jobname = p_jobname RETURNING TRUE;
$$;
