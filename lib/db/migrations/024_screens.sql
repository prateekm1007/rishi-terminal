-- ============================================================
-- 024_screens.sql — X3-05 (Round 14 A6): saved screens.
--
-- One row per (user, name): the query TEXT is stored, not a parsed AST —
-- the parser is pure and total, so re-parsing on read is free and the
-- stored surface stays inspectable by the user who owns it.
--
-- RLS (Constitution 13): every operation is scoped by auth.uid() =
-- user_id. The application never queries with the service role; it uses
-- the request's user-scoped client, so Postgres itself enforces that
-- user A cannot read/update/delete user B's screens. The behavioral
-- proof lives in scripts/ci/rls_invariants.sql (X3-05 blocks).
-- ============================================================

CREATE TABLE screens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  query TEXT NOT NULL CHECK (length(query) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One name per user: saving the same name again is an UPDATE at the
  -- application layer (upsert semantics decided in code, uniqueness
  -- decided here).
  UNIQUE (user_id, name)
);

-- Indexed columns (X3-05): every access path is user_id-first.
CREATE INDEX idx_screens_user ON screens(user_id);

ALTER TABLE screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY screens_select ON screens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY screens_insert ON screens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY screens_update ON screens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY screens_delete ON screens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at maintenance (application sets it on UPDATE; the trigger
-- keeps it honest if a future writer forgets).
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$;

CREATE TRIGGER screens_touch_updated_at
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
