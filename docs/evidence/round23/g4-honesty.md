# G4 — Honest wording/data: legal text, tile provenance, observation clocks

One item, one PR (founder round-23 G4). All commands run on 2026-10-07 UTC.

## Fail-first

`npx vitest run test/g4.honesty.test.ts` on the pre-fix tree:
**9 failed | 7 passed (14)** — the failing nine are exactly the founder's
defect list; the passing seven are the positive controls (canonical tile
routing already correct; LIVE/DELAYED/STATIC/UNAVAILABLE contracts
unchanged):

```
x LegalDisclaimer's equity line names no Screener.in and says unofficial, delayed
x /terms names no Screener.in as an upstream source and says unofficial, delayed
x a cached aggregate is LAST OBSERVED, not the mechanism word CACHED
x the dashboard time slot renders an explicit not-disclosed state (no '—' arm)
x the i18n keys exist in en and hi
x the commodities header derives from the observation clock, not lastUpdated
x the commodities header chip counts observations, not price-map keys
x the commodities stat tiles carry a provenance chip (no unlabeled static price)
x the crypto header derives from the observation clock, not the arrival effect
```

Post-fix: `14 passed (14)`.

## What changed (per the founder's G4 bullets)

1. **Screener.in removed from the legal surfaces** (it claims to be an
   upstream source in two places; the provider registry marks it
   RESEARCH_ONLY and price routing is structurally barred from it —
   lib/livePrice.ts T55):
   - `LegalDisclaimer.tsx` equity line: "NSE India / Yahoo Finance /
     Screener.in (live where labelled)" → "unofficial, delayed quotes
     from NSE India / Yahoo Finance endpoints where labelled LIVE".
   - `/terms` §3: "(NSE India, Yahoo Finance, Screener.in, CoinGecko)" →
     "unofficial, delayed public sources — NSE India and Yahoo Finance
     endpoints for equities and indexes, CoinGecko for crypto — under no
     data contract". The provenance-labelling and unavailable-state
     sentences are unchanged (the live/delayed/static/reference/
     unavailable distinction the directive says to keep).
2. **NSE/Yahoo described by actual behavior**: "unofficial, delayed" in
   both surfaces (above).
3. **"CACHED MARKET DATA —" fixed** (the aggregate badge + its time slot):
   - `aggregateMarketLabel`: a cached aggregate now reads
     **"LAST OBSERVED MARKET DATA"** — the data actually present, not the
     serving mechanism. LIVE/DELAYED/STATIC/UNAVAILABLE words unchanged
     (pinned contracts).
   - The dashboard time slot no longer renders a bare `—` beside a badge
     when no observation time was disclosed — it renders the explicit
     `dashboard.observationTimeNotDisclosed` state (en + hi; other locales
     fall back to en). A missing age is now stated, not implied by a dash
     that reads like a glitch.
4. **Tiles through the canonical path (verified, kept)**: BTC/ETH/SOL ride
   `useLivePrices` → `/api/prices` → `serveQuote`/`quote_cache` on the
   dashboard (TICKER/STATS/TOP_CRYPTO) and `/crypto`; SILVER/WTI/GOLD on
   the dashboard and `/commodities`; all warmed by the same
   `nonEquityTileSymbols()` derivation the warmer and `/api/health`
   share. Live positive control (in-session, 2026-10-07 ~05:39-05:41Z):
   BTC 84170 / ETH 2616.36 / SOL 118.56 (coingecko), SILVER 60.99 /
   WTI 90.18 / GOLD 4159.5 (yahoo) — every one LIVE with a disclosed
   observedAt.
5. **No fetch time presented as an observation**:
   - `/commodities` header: was "⚡ Live • Updated {fetch clock}" — now
     the state word derives from actual observations (live / partially
     live / last observed) and the time shown is the server-disclosed
     OBSERVATION time (`observedAt`), omitted when not disclosed.
   - `/commodities` header chip: was `Object.keys(prices).length > 0 ?
     'live'` (entry count) — now counts genuine observations
     (`LIVE n/6` honestly, `REFERENCE` when none).
   - `/commodities` stat tiles (GOLD/SILVER/WTI/BRENT): each now carries
     its own ProvenanceChip (live vs reference) — a tile without a live
     observation shows the static reference price LABELLED, never an
     unlabeled number that reads as a current price.
   - `/crypto` header: was "● LIVE / Updated {arrival time}" — now the
     LIVE word is earned by observations and the clock is observedAt,
     with the explicit not-disclosed wording when absent.
6. **null/unavailable stays unavailable**: no rendering change was needed
   on the dashboard tiles (verified: `d?.price ? … : "—"`, missing change
   → "—", the Round-5 fabricated-direction fix intact); the commodities
   and crypto cards already render '—' for missing observations with
   per-card chips. The G4 test suite pins the positive controls.

## Gate change with justification (Constitution 23)

`test/uiProvenance.round9.test.ts` pinned `"CACHED MARKET DATA"` — updated
to `"LAST OBSERVED MARKET DATA"` in this PR per the founder's G4 directive
("Remove/fix the misleading 'CACHED MARKET DATA —' label"). The gate is
not weakened: the same assertion now demands the honest wording, and the
new test/g4.honesty.test.ts adds nine more assertions on the same surface.

## Battery (branch, before push)

```
npx tsc --noEmit                     -> exit 0
npx vitest run test/g4.honesty.test.ts -> 14 passed (14)
npx vitest run                       -> Test Files 160 passed; Tests 1619 passed (1619)
npm run lint:ratchet                 -> 0 errors, 283 warnings (baseline 284 — holds; 283 is
                                        an improvement G6 may lock)
npx tsx scripts/i18nCoverage.ts --locale=hi -> 796/796 keys (100%), 0 missing
npm run validate:encoding            -> passed — no mojibake detected
npm run build                        -> Compiled successfully
```

## Reported observations (not changed here)

- `components/markets/WorldMarketsGrid.tsx` derives regime/flow/
  correlation/philosopher-insight text from `changePercent24h ?? 0` — a
  missing change is read as a real 0 (Rule 16 violation in derived
  analytics, not a rendered price). Separate scope; reported.
- The frozen legacy fundamentals path (`lib/liveFundamentals.ts` →
  `lib/scrapers/screener.ts`) still scrapes Screener.in in production and
  returns `source: "screener"` (verified live) while the registry marks it
  RESEARCH_ONLY. The G4 wording change removes the public CLAIM; whether
  the legacy path itself stays is the founder's call (its DATA_SOURCES
  entry already flags ToS/licensing risk).
