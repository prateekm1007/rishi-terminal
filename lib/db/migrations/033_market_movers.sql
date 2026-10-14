-- 033_market_movers.sql — LIVE-TODAY (founder order, 2026-10-13):
-- "make the site live. make sure today page on dashboard is fully working.
--  Also add top 5 losers and top 5 winner stocks on dashboard."
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016).
--
-- market_movers + market_movers_meta: the last-computed Top Winners / Top
-- Losers snapshot for the dashboard's Today view. Written ONLY by the
-- warmer (the authenticated ingest path, Bearer QUOTES_WARM_SECRET);
-- read by the homepage's ISR regeneration (service role). RLS deny-all
-- for anon/authenticated — same pattern as quote_cache (016).
--
-- Two producers, disclosed per snapshot (market_movers_meta.derivation):
--   'nse'      — NSE's own live-analysis movers endpoint (unofficial,
--                the endpoint contract documented by the MIT scrapers
--                nsetools / openchart);
--   'computed' — computed from the shared quote cache's freshest
--                observations of the CURRENT session across the tracked
--                universe (Yahoo Finance (unofficial) transport), each
--                row keeping its own source + observed_at.
--
-- Columns carry the FD-15 provenance contract: every figure is nullable
-- where its producer may not disclose it (Rule 16 — null is a real
-- value, never 0).

create table if not exists market_movers (
  kind         text not null check (kind in ('gainer', 'loser')),
  rank         integer not null check (rank >= 1),
  symbol       text not null,
  name         text,
  price        numeric not null check (price > 0),
  change_pct   numeric,
  volume       numeric,
  source       text,
  observed_at  timestamptz,
  written_at   timestamptz not null default now(),
  primary key (kind, rank)
);

create index if not exists market_movers_written_idx on market_movers (written_at);

-- Single-row metadata for the snapshot as a whole.
create table if not exists market_movers_meta (
  id                integer primary key default 1 check (id = 1),
  derivation        text not null check (derivation in ('nse', 'computed')),
  universe_observed integer,
  written_at        timestamptz not null default now()
);

-- RLS: deny-all for anon/authenticated (no policies on purpose) —
-- same pattern as quote_cache (016) / provider_cache (009).
alter table market_movers enable row level security;
alter table market_movers_meta enable row level security;
