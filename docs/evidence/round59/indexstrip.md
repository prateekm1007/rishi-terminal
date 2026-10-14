# Round 59 — INDEXSTRIP: the Today panel's NIFTY 50 / SENSEX index strip

Founder order (14 Oct 2026, option (b), verbatim): "(b) NIFTY from NSE + SENSEX
from the existing BSE provider with 'Source: BSE' attribution." FD-32 records
the decision and its caveats.

## Architecture (the movers pattern, one source per concept)

- lib/markets/indexStrip.ts — the derivation + both upstream parsers
  (zod, fail-closed) + the fetchers (one header profile per host) + the
  face (nulls render "—", source labels derive from the row's OWN
  source field, as-of renders the upstream's timestamp in IST or
  "as-of not disclosed" — never the fetch time).
- lib/markets/indexStripStore.ts — migration 037's persistence
  (market_index_strip + meta, additive, RLS deny-all; rollback in the
  migration header). Full replace; zod-validated on read.
- app/api/ingest/index-strip/route.ts — the producer (CRON_SECRET,
  its own 60 s budget, per-leg honest nulls, logIngestion recorded).
- components/dashboard/IndexStripPanel.tsx — server component, zero
  first-load JS, mounted in TodayPanel above the movers panel; both
  slots always render (present row or the honest empty slot).
- app/page.tsx — ONE cheap store read (isBuildPhase guards the hermetic
  prerender; the Y1 contract holds — no vendor fetch in the render path).
- .github/workflows/quotes-warm.yml — the strip's ingest step rides the
  session-hours warmer (weekdays 03:07–10:52 UTC, ~15-min cadence);
  non-fatal with a visible warning on a miss.

## Licence scope (the three-licence-sources rule, one PR)

- NIFTY 50: the letter-covered index endpoint (FD-31 §1 scope).
- SENSEX: a NEW dataset class on the APPROVED BSE host —
  providerRegistry, DATA_PROVIDER_MATRIX and FD-32 all updated here.
- The letter does NOT cover BSE; the SENSEX leg carries "Source: BSE"
  per the founder's explicit wording.

## Proof (raw outputs in this directory)

- indexstrip-red.txt — the C5 red: the tests ran before the module
  existed (import resolution failure, exit 1).
- indexstrip-green.txt — 9/9 after implementation (two TEST fixture
  bugs corrected on the way: 13:44 IST is 08:14 UTC; parseNseTimestamp
  returns the UTC ISO instant per the movers contract).
- Local fast gate: tsc 0 errors; eslint changed files 0 problems; the
  ratchet holds at 236 warnings (unchanged); 48/48 across the four
  touched test files (the TodayPanel prop change updated every mount —
  the demoState mount-contract test carries the new prop with its
  intent kept).

## Honest caveats

- The SENSEX response schema was written from BSE's documented realtime
  index surface (alias-tolerant, strict zod) because BSE's edge 403s
  the development sandbox's datacenter IP (bytes captured 14 Oct). It
  validates against PRODUCTION egress bytes in the first post-merge
  smoke; until then a mismatch fails closed to the empty leg.
- indexid 16 = SENSEX per BSE's site surface — same validation path.
- The ingest step's CRON_SECRET must exist as an Actions secret; a miss
  is a visible non-fatal warning (the strip renders its empty state).
