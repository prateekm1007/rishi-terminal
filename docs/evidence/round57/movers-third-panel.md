# Round 57 — TODAY-MOVERS: the third panel (Top 5 Movers) + the populated news row

Founder order (13 Oct 2026, this session): "add top 5 movers, top 5 losers and
top 5 winners on dashboard for stocks. and make sure the full today panel is
populated on dashboard."

## Context — the C7 overlap with #433 (LIVE-TODAY)

A parallel session implemented the same founder order from its own session
(web-8e0cdc75) and merged #433 at 15:17:24Z while this session's first
implementation (a self-contained ranking engine + panels) was mid-build. Per
B-23/R50 (audit, never rebuild): that first implementation was RETIRED (the
pushed branch deleted, no competing PR opened) and this PR re-delivers ONLY
what #433 does not carry, riding #433's canonical engine
(lib/movers/*, market_movers) instead of a second one (rule 14):

1. **The third panel — Top 5 Movers** (this session's directive adds
   "top 5 movers"; #433 shipped winners + losers only).
2. **The news row** — the Today panel's news line was still the static
   "No headlines yet" over a feed that exists and often has items.

## The movers list is ALWAYS computed — the honesty decision

NSE's movers endpoint (lib/movers/nse.ts) ranks only its own gainers and
losers. A "movers" list built from those rows would be the biggest swings
AMONG THE TOP GAINERS AND LOSERS — a lie by omission (a 4% swing outside
NSE's top-10 lists would be invisible). So the movers list always comes from
the shared quote cache over the tracked universe (the SAME gated pool:
registry symbols, current-session observations, usable price, disclosed
change — computeMoversFromRows), ranked by |pct| desc with symbol-asc
tie-breaks (rule 18). warm.ts reads the cache ONCE per tick and reuses the
rows for the computed fallback's winners/losers too. `moversDerivation` is
"computed" or null (cache read returned nothing — the honest empty state);
`moversUniverseObserved` discloses the coverage on the panel.

## What changed

- lib/db/migrations/034_market_movers_mover_kind.sql — ADDITIVE: the kind
  check widens to admit 'mover'; market_movers_meta gains
  movers_derivation + movers_universe_observed (nullable). No data rewrite.
- lib/movers/types.ts — MoverKind += "mover"; MoversSnapshot gains
  movers / moversDerivation / moversUniverseObserved.
- lib/movers/compute.ts — the movers ranking over the same eligible pool.
- lib/movers/warm.ts — ONE cache read per tick; the snapshot always carries
  the movers list (empty + null derivation when the read returned nothing).
- lib/movers/store.ts — mover rows written/read; meta carries the movers
  derivation + count.
- lib/movers/presentation.ts — moversListDerivationLine (the movers list's
  own disclosure).
- components/dashboard/MoversPanel.tsx — the third list (gold accent,
  "Today's Top 5 Movers"), honest empty copy, the movers derivation line.
- The news row: lib/news/server.ts (the RSS aggregation moved verbatim from
  app/api/news/route.ts — ONE source, rule 14; the route keeps its region
  param, response shape, cache headers, rule-10 error body);
  components/dashboard/TodayPanel.tsx renders the feed's ACTUAL state (the
  real latest headline with publisher + age, or the founder's "No headlines
  yet" wording when the feed returned nothing); app/page.tsx wires it with
  the isBuildPhase hermetic guard.

## Fail-first (C5) — raw outputs

- Compute pins RED (before the extension):
  `npx vitest run test/movers.compute.test.ts` → exit 1, `Failed Tests 4`
  (TypeError: out.movers is undefined).
- Panel pins RED: `npx vitest run test/movers.panel.test.ts` → exit 1,
  `Tests 3 failed | 8 passed (11)`.
- Copy-audit gate BITE (self-caught): the first TodayPanel comment contained
  the banned phrase "live news" (round-53 item 5) —
  test/copyAudit.zero.test.ts failed with
  `["components/dashboard/TodayPanel.tsx"]`; reworded → 9/9 GREEN. The gate
  works; no gate was touched.
- GREEN: `npx vitest run` → exit 0, `Test Files 229 passed (229) /
  Tests 2484 passed (2484)`; `npx tsc --noEmit` exit 0; eslint 0 errors /
  0 new warnings; validate:encoding exit 0; validateStocks exit 0;
  scoreParity `0 mismatches / 0 non-finite of 896`; provenanceAudit exit 0
  (no drift); `npm run build` exit 0.

## Risk

- Migration 034 widens a CHECK constraint (drop + re-add) — additive, no
  data loss; the noDrift gate passes. Rollback: `git revert <merge-commit>`
  restores the two-list panel; the widened constraint is harmless to the
  reverted code (extra admitted kind never written by it).
- The homepage ISR regeneration now performs ONE RSS aggregation (the same
  fan-out /api/news serves with s-maxage 120) in the ISR background — the
  request path is untouched; first-load JS unchanged (server components).

## Rollback

`git revert <merge-commit>` — the news route file reverts to its
self-contained form and the panel reverts to the two-list view.
