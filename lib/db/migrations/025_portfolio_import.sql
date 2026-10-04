-- ============================================================
-- 025_portfolio_import.sql — X3-07 (Round 14 A6): portfolio
-- imports and dated positions.
--
-- Why new tables instead of the 001 `holdings` table: holdings is
-- CURRENT-state only (portfolio_id, symbol, shares, avg_price — no
-- dates). XIRR needs the TIMING of cashflows (first/last buy dates),
-- and import idempotency needs a per-user content hash. Reusing
-- holdings would either fabricate dates (Constitution 4) or overload
-- its semantics (Constitution 14).
--
-- RLS (Constitution 13, roadmap "RLS on all tables"): every operation
-- on both tables is scoped by auth.uid() = user_id. The application
-- uses the request's user-scoped client only. Behavioral proof in
-- scripts/ci/rls_invariants.sql (X3-07 blocks).
--
-- Idempotency: UNIQUE (user_id, content_hash) — re-importing the same
-- file is a no-op (the route checks and returns the existing import).
-- ============================================================

CREATE TABLE portfolio_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- sha256 of the raw file content; one import per user per content
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  -- parser-detected shape: 'holdings-csv' | 'cas'
  source TEXT NOT NULL CHECK (source IN ('holdings-csv', 'cas')),
  filename TEXT NOT NULL CHECK (length(filename) BETWEEN 1 AND 200),
  rows_imported INT NOT NULL CHECK (rows_imported >= 0),
  rows_rejected INT NOT NULL CHECK (rows_rejected >= 0),
  -- per-row error report (line, reason) — kept so the user can review
  -- what was skipped and why, after the fact
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, content_hash)
);

CREATE INDEX idx_portfolio_imports_user ON portfolio_imports(user_id);

CREATE TABLE portfolio_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES portfolio_imports(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL CHECK (length(symbol) BETWEEN 1 AND 32),
  isin TEXT,
  quantity NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
  avg_price NUMERIC(18,4) NOT NULL CHECK (avg_price >= 0),
  first_buy_date DATE,
  last_buy_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (import_id, symbol)
);

CREATE INDEX idx_portfolio_positions_user ON portfolio_positions(user_id);
CREATE INDEX idx_portfolio_positions_symbol ON portfolio_positions(symbol);

ALTER TABLE portfolio_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY portfolio_imports_select ON portfolio_imports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY portfolio_imports_insert ON portfolio_imports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY portfolio_imports_delete ON portfolio_imports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY portfolio_positions_select ON portfolio_positions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY portfolio_positions_insert ON portfolio_positions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY portfolio_positions_delete ON portfolio_positions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Position rows ride their import (no standalone update path: the
-- contents come from a file; correcting means re-importing). The
-- updated_at trigger family from 024 does not apply — these tables are
-- insert/delete only.
