-- 035_market_movers_pick.sql — NSEPERM/TODAY-FULL (founder order,
-- 2026-10-14: "finish and tune it to world class now that we have
-- permission … make sure the full today panel is populated on
-- dashboard").
--
-- ADDITIVE ONLY (the 007/008 lesson, same as 016/033/034): two meta
-- columns, no row-table change, no data rewrite.
--
--   nse_universe  the universe that served when the NSE path won
--                 ("ALL" | "NIFTY") — the derivation line's scope
--                 disclosure. Null on the computed path.
--   pick          TODAY-FULL's live Stock of the Day (jsonb): the
--                 session's most-traded stock by value — a raw market
--                 fact, not a verdict (P0-1/P0-8 clean). Null when the
--                 session pool had nothing rankable (the honest empty
--                 state). Validated with zod on read: a malformed cell
--                 is the honest null, never a partial pick.
--
-- RLS stays deny-all (no policies — the 033 pattern); the warmer keeps
-- being the only writer.

alter table market_movers_meta add column if not exists nse_universe text;
alter table market_movers_meta add column if not exists pick jsonb;
