-- supabase/financial_quarters.sql — RECONCILED (P0-02, 2026-09-30)
--
-- DRIFT NOTE: this file previously re-defined financial_quarters with a
-- DIFFERENT column set than 003_automation_schema.sql. Both used
-- "create table if not exists", so on every database where migrations ran
-- in order, 003's shape won and this file's table DDL was dead. Live
-- verification (2026-09-30, Management API query against the production
-- project) confirmed 003's shape: period/gross_profit/operating_income/
-- net_margin/eps/ebitda/derived/fetched_at, currency default 'USD'.
-- The only application code touching this table
-- (lib/services/ingestion.ts ingestQuarterly) writes exactly that shape.
--
-- Reconciliation decision: 003 IS the canonical definition of
-- financial_quarters; this file keeps only its additive, still-valid parts
-- (index, RLS). The updated_at trigger was REMOVED: it referenced an
-- updated_at column that exists only in the dead 004 shape, so on real
-- databases it made every UPDATE (including upsert conflict-take) fail
-- with 'record "new" has no field "updated_at"'. Freshness on this table
-- is carried by 003's fetched_at, which ingestQuarterly already sets.

create index if not exists financial_quarters_symbol_end_idx
  on public.financial_quarters(symbol, quarter_end desc);

alter table public.financial_quarters enable row level security;

-- IMPORTANT:
-- We do NOT add a public SELECT policy.
-- Your Next.js API route will use the SERVICE ROLE key (server-only) which bypasses RLS.
-- This keeps the table private from anon clients.

-- Example insert (edit values to match your unit convention — code writes
-- currency 'USD' via lib/services/ingestion.ts)
-- insert into public.financial_quarters(symbol, period, fiscal_year, fiscal_quarter, quarter_end, revenue, net_profit, opm, source)
-- values ('TCS', 'Q3-2025', 2025, 3, '2024-12-31', 63500, 11800, 25.2, 'Exchange Filing');