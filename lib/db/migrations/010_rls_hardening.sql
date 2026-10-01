-- ============================================================
-- 010 — RLS HARDENING (remediation round 3, N2)
-- ============================================================
-- Four tables shipped without row-level security (N2 audit finding,
-- re-verified on the live project before this migration):
--
--   select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
--    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
--   → financial_annual, ingestion_log, rishi_snapshots, signal_history
--
--   select has_table_privilege('anon','public.ingestion_log','INSERT'),   -- t
--          has_table_privilege('authenticated','public.rishi_snapshots','DELETE'); -- t
--
-- With Supabase's default grants, the publishable (anon) key shipped in
-- the browser could write these tables directly through PostgREST:
-- forged ingestion_log rows keep /api/health "ok" while the real
-- pipeline is dead (SLO gaming), and rishi_snapshots holds the score
-- history the immutable forward track record (S2-07) will be built on.
--
-- Fix, three layers (Constitution art. 13: authorization lives in the
-- database too):
--   1. ENABLE ROW LEVEL SECURITY with NO policies = deny-all for
--      anon/authenticated. The service role bypasses RLS and remains
--      the only reader/writer (server paths: lib/services/ingestion.ts,
--      lib/services/rishiMemory.ts — verified: no client component
--      touches these tables; the only `.from("<table>")` callers are
--      server services on the admin client).
--   2. REVOKE the direct grants so even schema-ownership defaults
--      cannot resurface write access for anon/authenticated.
--   3. rishi_snapshots becomes append-only for EVERYONE including
--      service_role (roadmap S2-07 pulled forward): UPDATE and DELETE
--      always raise. Writers must use INSERT .. ON CONFLICT DO NOTHING
--      (see lib/services/rishiMemory.ts and scripts/snapshotBatch.ts,
--      updated in the same commit).
--
-- Idempotent: safe to re-run.

-- ── 1. Deny-all RLS on the four unprotected tables ────────────
ALTER TABLE public.financial_annual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rishi_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_history   ENABLE ROW LEVEL SECURITY;

-- ── 2. Remove direct table grants from client-facing roles ────
REVOKE ALL ON public.financial_annual FROM anon, authenticated;
REVOKE ALL ON public.ingestion_log    FROM anon, authenticated;
REVOKE ALL ON public.rishi_snapshots  FROM anon, authenticated;
REVOKE ALL ON public.signal_history   FROM anon, authenticated;

-- ── 3. rishi_snapshots is append-only (S2-07 early) ───────────
-- The forward track record must be reproducible from snapshot rows
-- alone; no role — including service_role — may rewrite history.
-- Correcting a bad snapshot means inserting a new dated row, never
-- editing an old one.
CREATE OR REPLACE FUNCTION public.reject_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'rishi_snapshots is append-only: UPDATE and DELETE are rejected for every role (S2-07)'
  USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS rishi_snapshots_append_only ON public.rishi_snapshots;
CREATE TRIGGER rishi_snapshots_append_only
  BEFORE UPDATE OR DELETE ON public.rishi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.reject_snapshot_mutation();
