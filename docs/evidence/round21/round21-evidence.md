# Round 21 — LP3 provider aliases + E4 scheduler state + C5 boundary (2026-10-06, evening session)

One evidence file for the round (C10). Artifact: `unavailable-symbols-verification.json`
(committed with PR #227). All times UTC.

## 1. Production reconciliation (founder direction 18)

- Session start: origin/main `6507ec6` (#226, docs-only), production
  `/api/version` = `1bdc909` — exact match to the latest deployment-relevant
  SHA (docs-only merges are deploy-exempt per C6). `/api/health` 200.
- After this round's merge: production `/api/version` = `f79558e0`
  (poll 3 of the deploy watch, 17:12Z).

## 2. E4 — scheduler state (directions 6, 8; acceptance is pre-registered for the Wed NSE session)

The pg_cron job `quotes-warm` (schedule `7-52/15 3-10 * * 1-5`, active) was
re-verified directly against `cron.job` / `cron.job_run_details` /
`net._http_response` via the Management API:

- runid 4 (10:37:00→10:43:15Z) `succeeded` — 6/6 slice POSTs HTTP 200
  (honest market-closed no-op; documented in round 19).
- **runid 5 (10:52:00→10:58:15Z) `succeeded` — 6/6 slice POSTs HTTP 200**,
  the SECOND consecutive scheduled success (new evidence this round). The
  cron window closed at 10:52Z for the day.
- runids 1–3 (09:52–10:22Z) are the three documented wire-level failures
  (PERFORM / named-args / jsonb-cast), each fixed in turn — unchanged.

The acceptance battery (≥3 consecutive scheduled in-window runs, ≥90%
coverage, health agreement, BANKBARODA positive control — pre-registered in
`docs/evidence/round18/e4-scheduler-diagnostic.md` §4) runs in the
**Wed 2026-10-07 NSE session (03:07–10:00 UTC)**. A manual dispatch does not
count.

Packet cleanup item executed: the `*/10` pure-echo diagnostic in the
scheduler repo (`rishi-warmer-scheduler`) was deleted (commit `f2348f1`)
per `e4-scheduler-decision.md` §5 ("deleted after the decision is
implemented") — the decision IS implemented and the probe is dead weight.
The repo's dead `warm.yml` experiment (the ~2.4%-delivery external
scheduler the packet superseded) went with it.

## 3. LP3 — the 133 never-fresh symbols: root cause, fix, live proof (directions 7–9)

### 3.1 Defect (re-produced on production, 16:40Z era)

`POST /api/prices/batch` for BAJAJAUTO / COLGATE / ADANITRANS / AMARAJABAT
returned honest UNAVAILABLE while RELIANCE served normally. Root cause: the
seed universe carries OLD NSE symbols; Yahoo serves the same instruments
under their CURRENT symbols (verified on the product's own v7/spark
transport: BAJAJ-AUTO.NS, COLPAL.NS, ADANIENSOL.NS, ARE&M.NS all return INR
observations; BAJAJAUTO.NS et al. return nothing on .NS or .BO). The
single-symbol path aliased via STOCK_ALIASES; the BATCH path (the Stocks
table AND the warmer) queried the raw registry symbol — renamed instruments
could never price.

### 3.2 Verification pipeline (autocommand-only, deterministic)

`scripts/verifyUnavailableSymbols.ts` (committed) probes all 133 with two
pre-registered gates: (1) old symbol dead on .NS+.BO and candidate current
symbol returns an INR observation; (2) the provider's instrument name
agrees with the seed row's name (normalized token overlap ≥ 0.6). Two runs
agreed on the same 51 accepted rows (raw JSON committed as the round
artifact).

### 3.3 Decisions (all auditable in scripts/generateYahooAliases.ts EXCLUDED)

| Class | Count | Action |
|---|---|---|
| Verified renames | 51 − 7 = 44 | `lib/registry/yahooAliases.json` (44 entries) |
| Demerger ambiguity (TATAMOTORS: TMCV vs TMPV both overlap 1.0) | 1 | unresolved — product decision needed, not a provider fact |
| Un-establishable identity (KWALITY: bare name matched two companies) | 1 | unresolved |
| **Duplicate seed rows** (BLUESTAR→BLUESTARCO, COLGATE→COLPAL, INFOEDGE→NAUKRI, JAINIRRIG→JISLJALEQS, TASYBITE→TASTYBITE — the CURRENT symbol is itself a STOCKS key) | 5 | unresolved here — **reported: the seed universe holds the same instrument twice; the registry merge belongs to D1-02** |
| No NSE search candidate / name mismatch (delistings, Yahoo coverage gaps — LTIM-class: Yahoo serves NOTHING for current NIFTY-50 symbols; verified across query1/query2, spark+chart, .BO, and search) | 82 | honest UNAVAILABLE stands |

Concept note (recorded in the JSON `$comment`): the provider-identifier map
(what Yahoo serves) is a DIFFERENT concept from the registry rename map
(lib/registry/tickerAliases.json — what users may type); they legitimately
diverge for ABCL/ZENSAR/PURAVANKARA, where Yahoo still serves the registry's
old forms.

### 3.4 Fix (PR #227, merged `f79558e0` through the merge-guard — 6 gates, cadence PASS 158.5 min)

- `bulkRefreshQuotes`: the alias applies at the PROVIDER-QUERY layer and
  results are re-keyed to the REQUESTED registry symbol — quote_cache rows
  stay registry-keyed, so the /api/health coverage RPC
  (`p_universe = STOCKS keys`) keeps counting them and the warmer's
  freshness economy is intact. One instrument, one row, one key shape.
- `serveQuote`/`serveCachedQuote`/`serveCachedQuotes` no longer pre-alias
  the cache key (the old behavior keyed the BGV01 row `BSLIMITED` while the
  batch path keyed registry rows — two shapes for one concept).
- Canonical path unchanged: Stocks → useLivePrices → /api/prices/batch →
  quotePath → quote_cache → yahoo-bulk. No second client-side system; no
  new provider calls beyond the aliased queries.

### 3.5 Gates (raw)

- Fail-first: `npx vitest run test/lp3.providerAliases.test.ts` on the
  pre-fix tree → `4 failed | 3 passed`; post-fix → green (7/7).
- `npx tsc --noEmit` → exit 0. `npx eslint .` → 0 errors / 284 warnings =
  ratchet baseline. `npx vitest run` → 159 files / 1603 tests passed.
- `npm run validate:encoding` → pass; `scripts/validateStocks.ts` → 916 OK;
  `scripts/scoreParity.ts` → 0 mismatches. `npm run build` → exit 0.
- CI on the exact head 1cb8ba69: 6/6 checks green (incl. Lighthouse gate
  and Playwright smoke).

### 3.6 Live positive control (deployed `f79558e0`, 17:14Z, market closed — last-close fetches)

```
AMARAJABAT   -> LIVE   price=742.9   observedAt=2026-10-06T10:00:01.000Z
BAJAJAUTO    -> LIVE   price=10017   observedAt=2026-10-06T09:45:01.000Z
MEGH         -> LIVE   price=60.25   observedAt=2026-10-06T10:00:02.000Z
NARAYANA     -> LIVE   price=1723.8  observedAt=2026-10-06T09:59:57.000Z
SONATASOFT   -> LIVE   price=252.05  observedAt=2026-10-06T10:00:00.000Z
RELIANCE     -> CACHED price=1215.5  observedAt=2026-10-06T09:31:43+00:00 (unchanged control)
```

Every row carries Yahoo's own observation time (rule 3/60.1 provenance) —
no seed fallback, no fabricated timestamps (direction 8). Full-coverage
effect (how many of the 133 price) is measured in the Wed NSE session
together with E4's acceptance — the closed-market BEFORE/AFTER plateau
comparison belongs to that run.

## 4. C5 — IST Oct-6→Oct-7 boundary regression (direction 5) — CLOSED

The original C5 defect was caused by date-dependent content, so a
pre-boundary green run does not establish closure. The regression re-ran
against PRODUCTION after the IST date flipped (00:00 IST Oct 7 = 18:30:00Z
Oct 6; production serves `f79558e0` — the deployed LP3 build, reconciled
above).

Raw result (command: `SMOKE_BASE_URL=https://rishi-terminal.vercel.app
npx playwright test test/smoke/c5-cls-stock.spec.ts`):

```
=== RUN 0 @ 18:31:46Z (00:01 IST Oct 7) ===
  ✓  1 test/smoke/c5-cls-stock.spec.ts:20:5 › stock page: late price attribution does not shift layout (CLS < 0.01) (4.4s)
  1 passed (5.5s)   EXIT: 0
=== RUN 1 @ 18:32:19Z ===
  ✓  ... (3.7s)  1 passed (6.0s)
=== RUN 2 @ 18:32:26Z ===
  ✓  ... (3.4s)  1 passed (4.5s)
=== RUN 3 @ 18:32:34Z ===
  ✓  ... (3.5s)  1 passed (5.6s)
```

4/4 passed after the boundary (the spec includes its own positive controls:
the stock page is really the stock page and the late price attribution
really rendered). Repeatability: the command is deterministic — same
command, same production URL, any session can re-run it.

Full smoke on the NEW IST date (the date-dependent surfaces re-rendered for
Oct 7 — Stock of the Day re-seeds, stock pages, honesty checks):

```
SMOKE_BASE_URL=https://rishi-terminal.vercel.app npx playwright test
  38 passed (1.2m)
```

C5 stands closed across the date boundary on production evidence.

## 5. Founder-visible findings (reported, not fixed — rule 26/31)

1. **Duplicate seed rows** (5 pairs, §3.3): the screener shows two rows for
   one instrument and one of them can never price. Registry merge is the
   correct fix (D1-02 territory); it changes the 916 universe count and the
   scoreParity inputs, so it is a scoped task, not a drive-by.
2. **Yahoo NSE coverage gap** (LTIM-class, §3.3): the provider currently
   serves nothing for some CURRENT NSE symbols (a NIFTY-50 constituent among
   them) — unfixable by aliasing (there is nothing to alias to); the rows
   stay honestly unavailable. If coverage matters for those, a second
   provider is a FOUNDER DECISION NEEDED (rule 31: vendor choice).
3. **Name-changed renames** (ADANITRANS→ADANIENSOL, GMRINFRA→GMRAIRPORT,
   JINDALSTPP class): provable to a human, but not to the two in-band gates
   (the company name changed too). Accepting them needs a second source
   (NSE symbol-change history) — scoped as D1-02 registry input work.
