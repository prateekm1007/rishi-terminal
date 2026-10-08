-- ============================================================
-- 031_user_visit_state.sql — Phase A item 6 (INT-A6, founder
-- direction 2026-10-09): the per-user, per-symbol LAST-VISIT cursor.
--
-- One row per (user, symbol): the moment the user last looked at a
-- symbol's intelligence surface. It is the honest supplier of
-- computeChangeSince's caller-supplied `since`
-- (lib/intelligence/changeSince.ts) — a Since-Last-Visit surface
-- reads the cursor and passes last_visited_at as the recorded-time
-- cutoff. No row = never visited = no cutoff exists; the surface
-- reports the honest empty state and nothing fabricates a default
-- window.
--
-- NOT a second history system (rule 14): history stays in A2's
-- append-only observation_state_log (030). The cursor is user-owned
-- STATE — one row per (user, symbol), mutable by upsert; a re-visit
-- is an UPDATE of last_visited_at (upsert semantics decided in code,
-- uniqueness decided here — the 024 screens precedent).
--
-- RLS (Constitution 13): user-PRIVATE data — the 024 screens class
-- exactly, NOT 030's deny-by-default global class. Every operation is
-- scoped by auth.uid() = user_id; the application reaches this table
-- only through the request's user-scoped client. The behavioral proof
-- lives in scripts/ci/rls_invariants.sql (X3-05b block).
--
-- Coverage (L5-02): registered in lib/account/coverage.ts as
-- cascade-via-users; scripts/ci/rls_invariants.sql L5_02_EXPECTED and
-- scripts/ci/account_deletion_invariants.sql carry the same truth
-- (three sources, one mechanically-verified reality).
-- ============================================================

CREATE TABLE public.user_visit_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (length(trim(symbol)) BETWEEN 1 AND 32),
  -- The value that becomes `since` (recorded-time cutoff).
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One cursor per (user, symbol): a re-visit is an UPDATE at the
  -- application layer. The UNIQUE btree leads with user_id, so no
  -- separate user_id index is added (documented deviation from 024's
  -- idx_screens_user — a second index on the same leading column is
  -- redundant weight).
  UNIQUE (user_id, symbol)
);

ALTER TABLE public.user_visit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_visit_state_select ON public.user_visit_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY user_visit_state_insert ON public.user_visit_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_visit_state_update ON public.user_visit_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_visit_state_delete ON public.user_visit_state FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at maintenance reuses the single touch_updated_at
-- definition from 024 (one definition in the chain — rule 14).
CREATE TRIGGER user_visit_state_touch_updated_at
  BEFORE UPDATE ON public.user_visit_state
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
