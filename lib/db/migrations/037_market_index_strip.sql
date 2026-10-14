-- 037_market_index_strip.sql — INDEXSTRIP (founder order, 2026-10-14,
-- option (b) verbatim: "NIFTY from NSE + SENSEX from the existing BSE
-- provider with 'Source: BSE' attribution").
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016/033).
--
-- market_index_strip + market_index_strip_meta: the last-fetched index
-- snapshot for the dashboard's Today panel. Written ONLY by the
-- index-strip ingest route (the authenticated cron path, Bearer
-- CRON_SECRET); read by the homepage's ISR regeneration (service role).
-- RLS deny-all for anon/authenticated — same pattern as market_movers
-- (033) / quote_cache (016).
--
-- Columns carry the FD-15 provenance contract: change_pct and
-- observed_at are nullable where the producer may not disclose them
-- (Rule 16 — null is a real value, never 0). symbol is the primary key
-- (at most one row per index: 'NIFTY 50', 'SENSEX').
--
-- ROLLBACK (recorded per the migration rule): DROP TABLE IF EXISTS
-- market_index_strip; DROP TABLE IF EXISTS market_index_strip_meta;
-- (additive tables — the drop removes nothing the pre-037 schema had,
-- and the panel reverts to its honest empty state on the missing read).

create table if not exists market_index_strip (
  symbol      text not null check (symbol in ('NIFTY 50', 'SENSEX')),
  source      text not null check (source in ('nse', 'bse')),
  value       numeric not null check (value > 0),
  change_pct  numeric,
  observed_at timestamptz,
  written_at  timestamptz not null default now(),
  primary key (symbol)
);

create index if not exists market_index_strip_written_idx on market_index_strip (written_at);

create table if not exists market_index_strip_meta (
  id         integer primary key default 1 check (id = 1),
  derivation text not null,
  written_at timestamptz not null default now()
);

-- RLS: deny-all for anon/authenticated (no policies on purpose) —
-- same pattern as market_movers (033) / quote_cache (016).
alter table market_index_strip enable row level security;
alter table market_index_strip_meta enable row level security;
