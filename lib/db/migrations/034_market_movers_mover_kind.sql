-- 034_market_movers_mover_kind.sql — TODAY-MOVERS (founder order,
-- 2026-10-13, this session): "add top 5 movers, top 5 losers and top 5
-- winners on dashboard for stocks."
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016/033): the market_movers
-- kind check widens to admit the THIRD ranked list — 'mover', the
-- biggest absolute percent swings across BOTH directions. Existing
-- 'gainer'/'loser' rows are untouched; the widen is a constraint
-- replacement, never a data rewrite. RLS stays deny-all (no policies —
-- the 033 pattern); the warmer keeps being the only writer.

alter table market_movers drop constraint market_movers_kind_check;
alter table market_movers add constraint market_movers_kind_check
  check (kind in ('gainer', 'loser', 'mover'));

-- The movers list's OWN derivation disclosure (it is always the computed
-- path — NSE's endpoint ranks only its own gainers/losers — but the
-- column keeps the snapshot's meta self-describing). Null = the cache
-- read returned nothing this tick (the honest empty state).
alter table market_movers_meta add column if not exists movers_derivation text;
alter table market_movers_meta add column if not exists movers_universe_observed integer;

