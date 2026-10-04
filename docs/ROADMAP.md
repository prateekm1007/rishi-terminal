# ROADMAP — Rishi Terminal

**Repo:** https://github.com/prateekm1007/rishi-terminal
**Baseline:** `main` @ `3188e80`. Round-2 (`R1–R10` in `rishi-terminal-remediation-spec-v2.md`) must merge before Phase 1 starts.
**Governing document:** `CONSTITUTION.md`. Every task below is subject to it. If a task tempts you to break an article, stop and report.
**Auditor:** Claude re-runs every acceptance command independently at each gate.

---

## How to use this file

**Task format**
```
### <ID> <Title>
Owner: CODER | FOUNDER | COUNSEL      Depends: <IDs>      Effort: S (≤1d) | M (≤3d) | L (≤2w)   (rough, agent-led)
Do:      what to build
Accept:  commands + expected result (paste raw output in the PR)
```

**Rules**
- One PR per task ID, commit prefix `feat(<ID>):` or `fix(<ID>):`. No mixing.
- `FOUNDER` / `COUNSEL` tasks are not coder work. The coder must not decide them; an unresolved dependency means `BLOCKED: <FD-n>`.
- Thresholds marked **PROPOSED** are defaults the founder must confirm before the task starts. The coder never silently picks a number.
- Migrations continue from **`009_*.sql`** (007 and 008 are consumed by R2 and R6).
- "Universe" = the set of stocks with `data_quality = 'OK'` in the database. Nothing outside the universe appears in rankings, scores, screeners, or chat.
- Every acceptance that says "prove the gate bites" requires a deliberate violation on a scratch branch and the failing CI run URL (Constitution art. 24).

**Gates** (a phase's exit is audited by Claude before the next phase's tasks marked ★ start)

| Gate | Requires | Meaning |
|---|---|---|
| **G-A Trust** | P0-*, D1-* | Every number on screen is sourced, dated, and reconciled |
| **G-B Scores** | S2-* | Scores are explained, backtested honestly, and versioned |
| **G-C Product** | X3-*, R4-01..R4-05 | Users get real depth and grounded answers |
| **G-D Launch** | L5-*, E6-*, G-A..G-C | Safe, legal, fast, observable enough to charge money |

**Founder decision register** (blocks the tasks that cite it)

| ID | Decision | Blocks |
|---|---|---|
| FD-1 | Data vendor(s) and budget | D1-01 → all of D1 |
| FD-2 | Positioning: educational vs. advice-regulated | L5-01, copy in X3/R4 |
| FD-3 | Scope: India equities only until G-C | P0-05, X3-10 |
| FD-4 | Analytics tool | G7-01 |
| FD-5 | Email / push / WhatsApp providers | X3-08, G7-04 |
| FD-6 | Which broker CSV formats to support first | X3-07 |
| FD-7 | Pricing and free-tier limits | G7-03 | **RESOLVED 2026-10-02 (founder instruction): all features free — no tiers, no paid gates.** See `docs/ROADMAP-STATUS.md` §Commit M. G7-03 is therefore NOT APPLICABLE. |
| FD-8 | Chat/LLM vendor and data-retention terms | R4-02, R4-03 |
| FD-9 | Constitution/credential-recovery decision (root-secret handling after sandbox resets) | audit 2026-10-02 |
| FD-10 | `/rishis` general-chat scope: philosophy-only/context-only vs symbol-aware grounded | audit 2026-10-02 |
| FD-11 | Matured bond policy (IN91DTB class): historical filter vs authoritative replacement source | audit 2026-10-02 |
| FD-12 | Non-equity heuristic scores (crypto/commodity/forex/bond "RISHI CONSENSUS"): remain REFERENCE heuristics or become an official product score? Current state: labelled `HEURISTIC REFERENCE — not the canonical Rishi consensus engine` on all four detail surfaces | audit 2026-10-02 (G8) |
| FD-13 | Seed-dataset residual placeholders: ~416 of 916 rows are boilerplate clones (identical ocf/rev/sh/np) and ~422 carry `mktcap = price×1000` artifacts (APEX 285K Cr, AIAENG 38.5L Cr). Interim: impossibility gate excludes 55 self-contradictory rows from every scored surface; the rest display under the seed banner. Real fix is the D1 live-fundamentals project, not more placeholder edits | audit round-5 (2 Oct 2026) |
| FD-14 | `/terms` + `/privacy` are minimal honest drafts written to match what the code actually stores — counsel review required (the "before paid tiers scale" trigger is moot since 2026-10-02: there are no paid tiers); refund wording (7-day) needs founder sign-off | audit round-5 (2 Oct 2026) |
| FD-15 | Crypto/forex/commodities/bonds remain in the main nav although the roadmap scopes the product to India equities — keep (traffic) or demote (focus)? | audit round-5 (2 Oct 2026) |
| FD-16 | Banks are scored with non-bank metrics (SBIN: D/E 0.0x, OPM 42%, FCF yield) — NIM/GNPA/CRAR modelling needs a data source decision | audit round-5 (2 Oct 2026) |
| FD-17 | Soft-404: unknown stock symbols return the not-found UI with HTTP 200 (pre-existing, streaming shell) — SEO/crawler hygiene fix vs leave | audit round-5 (2 Oct 2026) |
| FD-18 | `data/security-master/populate.sql` still mirrors the pre-round-5 symbol list (20 removed/renamed rows) — regeneration is owned by the D1 pipeline task; flag so D1-04/D1-05 do not resurrect removed symbols | audit round-5 (2 Oct 2026) |

---

# PHASE 0 — Close trust gaps (weeks 0–2)

### P0-01 Merge round-2 remediation
Owner: CODER   Depends: —   Effort: L
Do: implement R1–R10 exactly as written in `rishi-terminal-remediation-spec-v2.md`.
Accept: the Definition of Done block in that spec, plus
```bash
git grep -n "SEED_AS_OF" -- .                       # → empty
npm run lint:ratchet && npx vitest run              # → pass
```

### P0-02 Verify live Supabase state
Owner: FOUNDER + CODER   Depends: network allowlist for `api.supabase.com` (for Claude's audit)   Effort: S
Do: run the operational checks in R10; apply migrations 001→008 to the live project in order; reconcile the `003`/`004` `financial_quarters` drift.
Accept:
```bash
npx tsx scripts/pipelineStatus.ts                    # → row counts + newest timestamps; paste
# non-service session PATCH of users.tier with anon key must be rejected:
curl -si -X PATCH "$SUPABASE_URL/rest/v1/users?id=eq.$UID" -H "apikey: $ANON" -H "Authorization: Bearer $USER_JWT" \
  -H "content-type: application/json" -d '{"tier":"disciple"}' | head -20     # → error 'tier and tier_expires_at are managed by the payment system'
```

### P0-03 Staging environment
Owner: CODER   Depends: —   Effort: M
Do: separate Supabase project + Vercel preview environment for staging; `scripts/checkEnv.ts` verifies every variable in `.env.example` is present (names only, never values) and fails on missing required ones for the target env; document the promotion flow in `docs/RELEASE.md`.
Accept:
```bash
npx tsx scripts/checkEnv.ts --env=staging            # → all required present
curl -s https://<staging-url>/api/health | jq .      # → {"status":"ok", ...} (endpoint from P0-04)
```

### P0-04 `/api/health`
Owner: CODER   Depends: —   Effort: S
Do: public endpoint returning `status`, `db` (round-trip ok), `lastPriceIngestAt`, `lastFundamentalsIngestAt`, `engineVersion`. No secrets, no row counts. `degraded` when any freshness exceeds its SLO (values from E6-06; until then constants in one file).
Accept: vitest for `ok`, `degraded` (stale timestamp injected), `down` (DB error); `curl -s localhost:3000/api/health | jq .status`.

### P0-05 Provenance audit of every surface
Owner: CODER   Depends: FD-3   Effort: M
Do: `scripts/provenanceAudit.ts` walks `app/**/page.tsx` and their imports; classifies each page's data as `sourced | seed | static-editorial | none`; writes `docs/PROVENANCE.md`. Any page that renders `seed` numbers must show the illustrative-data label (R1) or be hidden. Pages in scope of FD-3's "out" decision (crypto, forex, commodities, bonds, F&O) are hidden from nav and return a "not available yet" state.
Accept:
```bash
npx tsx scripts/provenanceAudit.ts --fail-on-unlabelled-seed    # → exit 0
npx vitest run test/provenance.test.ts                          # you write: asserts the label on each seed page
```

### P0-06 `Sourced<T>` type and provenance contract
Owner: CODER   Depends: R1   Effort: M
Do: introduce `lib/types/sourced.ts`: `Sourced<T> = { value: T | null; source: 'vendor:<name>' | 'filing' | 'seed' | 'derived'; asOf: string | null }`. `resolveStockMetrics` returns `Sourced` fields. UI components that render a number take a `Sourced`, and a shared `<DataValue>` renders value, tooltip (source + as-of), and `—` for null.
Accept:
```bash
npx tsc --noEmit
git grep -nE "toFixed\(" -- app components | grep -v DataValue     # → each remaining hit justified in PR (non-market numbers only)
```

---

# PHASE 1 — Data foundation (weeks 2–8) ★ gated by G-A

### D1-01 Vendor and licence decision
Owner: FOUNDER   Depends: FD-1   Effort: M
Do: shortlist providers for (a) EOD + delayed intraday prices, (b) corporate actions, (c) fundamentals or primary-filing access, (d) news/filings. Write `docs/decisions/0001-data-vendor.md` with: price, licence text confirming **display + storage + use in a paid consumer product**, redistribution limits, SLA, corporate-action handling, exit cost. Include quotes. Claude has not verified any vendor's current terms.
Accept: file exists with all sections (checked by):
```bash
npx tsx scripts/checkDecisionDoc.ts docs/decisions/0001-data-vendor.md   # → headings present: Licence, Cost, SLA, Corporate actions, Exit
```

### D1-02 ISIN-keyed security master ★
Owner: CODER   Depends: —   Effort: L
Do: migration `009_security_master.sql`: `securities(isin PK, name, exchange_primary, sector, listed_on, delisted_on, status)`, `symbol_history(isin, exchange, symbol, valid_from, valid_to)`, `universe(isin, data_quality, reason, updated_at)`. Populate from official exchange listings and `lib/registry/tickerAliases.json`. **Never guess an ISIN**; unresolved rows go to `universe.data_quality='UNRESOLVED'` with a reason.
Accept:
```bash
npx tsx scripts/validateSecurityMaster.ts            # → 0 duplicate active symbols, 0 orphan aliases, every STOCKS symbol mapped or listed as UNRESOLVED
npx vitest run test/securityMaster.test.ts           # → symbol change resolves to the same ISIN across dates
```

### D1-03 Corporate actions and adjusted prices
Owner: CODER   Depends: D1-02   Effort: L
Do: migration `010_corporate_actions.sql` (`corporate_actions(isin, ex_date, type, ratio_num, ratio_den, cash_amount, source)`); `lib/data/adjust.ts` computes adjustment factors for splits, bonuses, and cash dividends; merger handling documented for the cases the vendor supplies.
Accept: property test — for any generated split/bonus, return series is continuous across ex-date within 1e-9; golden fixtures from **cited official announcements** for 5 real actions.
```bash
npx vitest run test/adjust.test.ts
```

### D1-04 Price ingestion (EOD) via provider adapter ★
Owner: CODER   Depends: D1-01, D1-02, D1-03   Effort: L
Do: `interface PriceProvider` + one vendor adapter; table `prices_eod(isin, date, open, high, low, close, volume, adj_close, source, ingested_at)`; idempotent upsert; runs from Vercel Cron (Bearer `CRON_SECRET`); gap detector against the trading calendar (`docs/trading-calendar.json`, sourced from the exchange).
Accept:
```bash
npx tsx scripts/ingestPrices.ts --date=<last trading day> && npx tsx scripts/ingestPrices.ts --date=<same>   # → second run inserts 0, updates 0 changed
npx tsx scripts/pipelineStatus.ts                    # → newest prices_eod date = last trading day
npx tsx scripts/priceGaps.ts --universe              # → 0 unexplained gaps
```

### D1-05 Fundamentals ingestion, point-in-time ★
Owner: CODER   Depends: D1-01, D1-02   Effort: L
Do: migration `011_fundamentals_pit.sql`: `fundamentals_pit(isin, period_end, period_type, filed_at, statement, item, value, unit, restated_of, source)`. Ingest quarterly results and annual filings; preserve as-reported values and later restatements as new rows. `getFundamentalsAsOf(isin, asOf)` returns only rows with `filed_at <= asOf`.
Accept:
```bash
npx vitest run test/fundamentals.pit.test.ts         # → look-ahead test: a value filed on D is invisible at D-1, visible at D
npx tsx scripts/goldenFundamentals.ts --sample=20    # → 20 hand-verified companies match filing values exactly; print diffs
```

### D1-06 Shareholding pattern ingestion
Owner: CODER   Depends: D1-05   Effort: M
Do: `shareholding_pit(isin, quarter_end, filed_at, promoter, fii, dii, public, pledged_pct)`.
Accept: golden test for 10 companies; `promoter + fii + dii + public` within 0.5 percentage points of 100 for every row, violations quarantined (D1-07).

### D1-07 Validation rules and quarantine
Owner: CODER   Depends: D1-05   Effort: M
Do: rules engine (`lib/data/rules.ts`): accounting identities (assets = liabilities + equity within tolerance), quarters sum to annual within tolerance, sign and unit sanity, outlier bounds by sector. Violations go to `data_quarantine` with rule id; quarantined rows never reach the serving layer.
Accept:
```bash
npx vitest run test/rules.test.ts                    # each rule has a passing and a failing fixture
npx tsx scripts/validateData.ts                      # → 0 unquarantined violations
```

### D1-08 Reconciliation against a second source
Owner: CODER   Depends: D1-04, D1-05   Effort: M
Do: `scripts/reconcile.ts --universe --metrics=revenue,pat,close` compares primary against an independent secondary source and prints per-metric error distribution. Secondary source choice recorded in `docs/decisions/0002-reconciliation-source.md` (licence permitting internal comparison).
Accept: report command output. **PROPOSED threshold (founder to confirm):** ≥95% of universe names within 1% on revenue and PAT, and ≥99% within 0.5% on close. Names outside tolerance are quarantined, not hidden.

### D1-09 Universe: Nifty 500 done properly ★
Owner: CODER   Depends: D1-02, D1-04, D1-05, D1-07, D1-08   Effort: M
Do: set `universe.data_quality='OK'` only for names passing D1-07 and D1-08. All ranked lists, screener, scores and chat draw only from the universe. Others return "coverage not available".
Accept:
```bash
psql "$DATABASE_URL" -c "select data_quality, count(*) from universe group by 1;"     # → OK ≥ 480 (PROPOSED; founder to confirm)
npx vitest run test/universe.gating.test.ts          # → a non-OK symbol never appears in rankings/screener/chat context
```

### D1-10 Freshness SLOs and alerting
Owner: CODER   Depends: P0-04, D1-04, D1-05   Effort: M
Do: `ingestion_logs` records each job; `/api/health` derives `degraded` from SLOs (PROPOSED: price ≤ 1 trading day old; fundamentals ≤ 2 days after a filing); alert to email/webhook on breach; UI stale badge via `lib/freshness.ts` driven by real timestamps.
Accept: test injects a stale timestamp → health `degraded`, alert function called once (not per request), UI shows the stale badge.

### D1-11 Retire placeholder seed from user-facing paths
Owner: CODER   Depends: D1-09   Effort: M
Do: remove numeric values from `data/stocks` (keep only registry metadata needed for search/aliases); delete `SEED_STATUS` and the illustrative-data label logic that only existed for seed values.
Accept:
```bash
git grep -nE "pe:|roe:|mktcap:|price:" -- data/stocks            # → empty
git grep -n "from ['\"].*data/stocks" -- app components hooks    # → only registry-metadata imports (list them)
npm run build && npx vitest run
```

### D1-12 Thirty-day unattended run ★ (G-A exit)
Owner: FOUNDER + CODER   Depends: D1-04, D1-05, D1-10   Effort: S (wall-clock 30 days)
Accept:
```bash
psql "$DATABASE_URL" -c "select date_trunc('day', started_at) d, bool_and(status='success') from ingestion_logs where started_at > now() - interval '30 days' group by 1 order by 1;"
# → 30 consecutive trading-day rows, all true (non-trading days may be absent)
```
**G-A audit:** Claude re-runs P0/D1 acceptance commands from a fresh clone and samples 30 random numbers on the site against primary filings.

---

# PHASE 2 — Scores earn their place (weeks 6–12) ★ gated by G-B

### S2-01 Methodology documentation
Owner: CODER (draft) + FOUNDER (approve)   Depends: —   Effort: M
Do: `docs/methodology/<scorer-id>.md` for every scorer: inputs, formula, thresholds, rationale, known failure modes, sectors where it does not apply. Public page `/methodology` renders them.
Accept:
```bash
npx vitest run test/methodology.coverage.test.ts     # → every registered scorer id has a doc with all required headings
```

### S2-02 Point-in-time backtest harness ★
Owner: CODER   Depends: D1-03, D1-04, D1-05   Effort: L
Do: `scripts/backtest/` — walk-forward engine using `getFundamentalsAsOf`, adjusted prices, historical universe **including delisted names**, monthly or quarterly rebalance, transaction cost and slippage parameters, benchmark (Nifty 500 total-return index from the licensed source). Metrics: rank IC, decile spread, CAGR, volatility, max drawdown, turnover, hit rate. Deterministic given a seed.
Accept (the harness must prove it is correct before it is used):
```bash
npx vitest run test/backtest.correctness.test.ts
# → perfect-foresight factor: IC ≈ 1;  shuffled factor: |IC| < 0.05 over 1000 trials;
#   look-ahead guard: shifting every filed_at forward by one quarter changes results
#   survivorship guard: removing delisted names from the universe changes results and the test asserts the direction
```

### S2-03 Evaluation report per scorer and for consensus
Owner: CODER   Depends: S2-02   Effort: M
Do: `npx tsx scripts/backtest/report.ts` writes `docs/reports/backtest-<YYYY-MM>.md`: assumptions (costs, slippage, rebalance), out-of-sample split, per-scorer and consensus metrics vs. benchmark, and a plain-language verdict written by the script from thresholds (no hand-written spin). Publishes results even when the score does not beat the index.
Accept:
```bash
npx tsx scripts/backtest/report.ts --check           # → required sections present; verdict computed, not typed
```

### S2-04 Prune / reweight with out-of-sample proof
Owner: CODER + FOUNDER   Depends: S2-03   Effort: M
Do: any change to scorer weights or membership must show improvement on a held-out period; otherwise keep the current engine. Bump `SCORE_ENGINE_VERSION` and record the rationale in the report.
Accept: report shows in-sample vs. out-of-sample; `npx tsx scripts/scoreParity.ts` → `0 mismatches / 0 non-finite`; snapshot rows record the new engine version.

### S2-05 Score explainability
Owner: CODER   Depends: —   Effort: M
Do: `getStockScore` returns per-Rishi contributions with the input values and thresholds that produced them. Stock page shows the breakdown.
Accept:
```bash
npx vitest run test/scoring.explain.test.ts          # → sum of contributions reconstructs the score within 1e-6 for every universe stock
```

### S2-06 Disagreement metric
Owner: CODER   Depends: S2-05   Effort: S
Do: dispersion across the Rishis (define in `docs/methodology/dispersion.md`); expose on the API and stock page.
Accept: unit tests on constructed cases (unanimous → 0; split → high); monotonic in spread.

### S2-07 Immutable forward track record ★
Owner: CODER   Depends: D1-09   Effort: M
Do: `rishi_snapshots` (already written nightly) becomes append-only: trigger rejects UPDATE/DELETE, including for `service_role`. Public `/track-record` computes paper-portfolio performance vs. benchmark **only from snapshots**, with rules fixed in advance in `docs/methodology/track-record.md`.
Accept:
```sql
-- both must raise an exception:
update rishi_snapshots set consensus = 0 where id = (select id from rishi_snapshots limit 1);
delete from rishi_snapshots where id = (select id from rishi_snapshots limit 1);
```
```bash
npx vitest run test/trackRecord.test.ts              # → page numbers reproducible from snapshot rows alone
```
**G-B audit:** Claude re-runs S2-02's correctness tests, regenerates the report, and checks the published numbers against the harness.

---

# PHASE 3 — Core product depth (weeks 8–20) ★ gated by G-C

### X3-01 Stock page: financials
Owner: CODER   Depends: D1-05, P0-06   Effort: L
Do: 10-year annual and 12-quarter tables with charts, server-rendered with ISR, every value via `<DataValue>`.
Accept: Playwright: `/stock/RELIANCE` shows both tables, each cell has a source/as-of tooltip; `npx playwright test test/e2e/stock.financials.spec.ts`; axe (E6-08) has 0 serious/critical.

### X3-02 Price chart
Owner: CODER   Depends: D1-04   Effort: M
Do: open-source `lightweight-charts`, adjusted series from `prices_eod`, ranges 1M–max, split/bonus markers. The route validates symbols via the registry (R5).
Accept: e2e renders the chart; adjusted series continuous across a known split fixture; `curl "localhost:3000/api/history?symbol=../x" -i | head -1` → 400.

### X3-03 Valuation bands
Owner: CODER   Depends: D1-04, D1-05   Effort: M
Do: PE and PB history bands (median, ±1σ) computed point-in-time; excludes periods of negative earnings explicitly.
Accept: unit test on a synthetic series with known median/σ; negative-earnings periods are absent (not zero).

### X3-04 Shareholding and corporate actions tabs; results calendar
Owner: CODER   Depends: D1-03, D1-06   Effort: M
Accept: e2e for each tab; calendar entries come from filings/vendor data with source shown; no entry without a source.

### X3-05 Screener v2 ★
Owner: CODER   Depends: D1-09   Effort: L
Do: server-side query engine with a **safe** expression parser (no `eval`, no `Function`); saved screens (`screens` table, RLS by `auth.uid()`); CSV export; indexed columns.
Accept:
```bash
npx vitest run test/screener.parser.test.ts          # → fuzz: 10k random strings never throw uncaught, never reach eval; injection strings rejected
npx tsx scripts/benchScreener.ts --universe          # → p95 < 500 ms (PROPOSED)
npx vitest run test/rls.screens.test.ts              # → user A cannot read/update/delete user B's screens
git grep -nE "\beval\(|new Function\(" -- app lib    # → empty
```

### X3-06 Screens tied to each Rishi
Owner: CODER   Depends: X3-05, S2-05   Effort: S
Accept: each pre-built screen reproduces its scorer's pass criteria exactly: test asserts screen result set == scorer-pass set for the universe.

### X3-07 Portfolio import and analytics
Owner: CODER   Depends: FD-6, D1-09   Effort: L
Do: CSV parsers for the chosen broker formats and CAS statements; holdings, XIRR, sector exposure, concentration; RLS on all tables.
Accept:
```bash
npx vitest run test/portfolio.xirr.test.ts           # → XIRR matches a reference implementation to 1e-6 on 10 fixtures
npx vitest run test/portfolio.import.test.ts         # → re-importing the same file is a no-op; malformed rows reported, never silently dropped
npx vitest run test/rls.portfolio.test.ts
```
Note: parsing statements handles personal financial data; L5-02 (privacy) must be complete before public launch of this feature.

### X3-08 Alerts v2
Owner: CODER   Depends: FD-5, D1-04   Effort: L
Do: price, score-change, and filing triggers; delivery via chosen provider; idempotent (one alert per trigger event); unsubscribe link in every email; per-user rate limit.
Accept: tests — trigger fires once across two evaluator runs; unsubscribe stops delivery; rate limit enforced (Constitution art. 12: persistent counter).

### X3-09 PWA
Owner: CODER   Depends: —   Effort: M
Do: manifest, icons, service worker caching the app shell only (never API data), offline page.
Accept: Playwright: manifest served and valid, service worker registers, offline navigation shows the offline page, API responses are not cached by the worker.

### X3-10 Market dashboard from real data
Owner: CODER   Depends: D1-04, FD-3   Effort: M
Do: breadth, sector heatmap, top movers computed from `prices_eod` for the universe; index levels from the licensed source.
Accept: values reproducible by a SQL query in the test; each widget shows as-of; nothing hardcoded (`git grep -nE "Math\.(random|sin)"` empty).

**G-C audit:** Claude runs the e2e suite, exercises RLS with two real sessions, and compares a random sample of on-screen values with the database.

---

# PHASE 4 — Differentiation: the Rishi lens (weeks 14–28)

### R4-01 Internal data API for tools
Owner: CODER   Depends: D1-09   Effort: M
Do: typed, authenticated server functions/routes exposing: `getStock`, `getFinancials`, `getPrices`, `getScore`, `getPeers`. Each returns `Sourced` values. These are the only data the chat may use.
Accept: contract tests with zod schemas; unauthenticated → 401; unknown symbol → 404.

### R4-02 Grounded chat with numeric verification ★
Owner: CODER   Depends: R4-01, FD-8, FD-2   Effort: L
Do: tool-calling loop; system prompt requires answers to come from tool results; **post-validator** extracts every number in the reply and rejects (or regenerates) any number not present in the tool outputs; refuses questions it lacks data for. Preserves existing auth, quota (R6), and limits.
Accept:
```bash
npm run eval:chat -- --fixtures                      # → deterministic run on recorded fixtures, no live LLM in CI
# PROPOSED thresholds (founder to confirm): numeric accuracy ≥ 98%, unsupported-claim rate ≤ 2%, correct refusal on unanswerable ≥ 95%
npx vitest run test/chat.grounding.test.ts           # → injected answer containing a number not in tool output is rejected
```
Golden set ≥ 100 questions; at least 30 reviewed by the founder for domain correctness. Live-model evals run nightly and report, not block.

### R4-03 Filings and concall retrieval with citations
Owner: CODER   Depends: COUNSEL check on licence (L5-04), R4-02   Effort: L
Do: ingest filings/transcripts the licence permits; chunk, embed, retrieve; answers cite document and page/section with a link.
Accept: eval: every factual claim in sampled answers links to a retrievable source passage (citation precision ≥ 95%, PROPOSED); no answer without citation when retrieval was used.

### R4-04 Rishi Council view
Owner: CODER   Depends: S2-05, S2-06   Effort: M
Do: consensus plus dissent: which Rishis pass or fail and why (from explainability data), plus "what would need to change for X to pass" computed from thresholds.
Accept: test — for each universe stock, the "what would change" values, when substituted, flip that scorer's outcome (verified by re-running the scorer).

### R4-05 Portfolio coach
Owner: CODER   Depends: X3-07, S2-05   Effort: M
Do: portfolio through each lens; concentration and overlap warnings; no trade instructions (FD-2).
Accept: copy audit (L5-01) passes; tests on constructed portfolios.

### R4-06 i18n (Hindi first)
Owner: CODER   Depends: —   Effort: L
Do: read `node_modules/next/dist/docs/` for the i18n approach in this Next version; extract strings to catalogs; language switcher; Hindi complete for core flows before adding others.
Accept:
```bash
npx tsx scripts/i18nCoverage.ts --locale=hi          # → 100% of core-flow keys translated, 0 missing
npx playwright test test/e2e/i18n.spec.ts            # → switching language persists; pseudo-locale (expanded strings) shows no overflow on top 10 pages
```

### R4-07 Learning hub
Owner: CODER + FOUNDER (content)   Depends: S2-01   Effort: M
Do: MDX pages explaining each philosophy; links to the live methodology and screens.
Accept: build passes; every page has unique title/description; no financial claims without a source link (copy audit).

---

# PHASE 5 — Legal, money, security ops (start now, runs in parallel; ★ gates G-D)

### L5-01 SEBI positioning and copy audit
Owner: COUNSEL + FOUNDER   Depends: FD-2   Effort: M
Do: counsel's written opinion in `docs/legal/sebi-opinion.md` (not legal advice from Claude). Encode its conclusions as a banned/required-phrases list in `docs/legal/copy-rules.json`.
Accept:
```bash
npx tsx scripts/copyAudit.ts                         # → scans UI strings, chat prompts, emails, MDX; exit 0 only when every hit is on an explicit, justified allowlist
```

### L5-02 Privacy (DPDP Act, 2023) and account controls
Owner: COUNSEL + CODER   Depends: —   Effort: L
Do: privacy policy, consent capture, retention schedule, grievance contact; `GET /api/account/export` and `DELETE /api/account` implemented for **every table holding user data**.
Accept:
```bash
npx vitest run test/account.delete.test.ts
# → test enumerates every public table with a user_id column from information_schema and asserts each is covered by export and delete; a new table without coverage fails the test
```

### L5-03 Payment operations
Owner: CODER   Depends: R2   Effort: L
Do: GST-compliant invoices (format per counsel/CA); refund webhook (`refund.processed`) revokes or prorates tier per policy; daily reconciliation job comparing Razorpay orders/payments to `transactions`; renewal reminder and expiry emails driven by `tier_expires_at`.
Accept: tests for refund → tier revoked once; reconciliation script reports zero unmatched paid orders (needs credentials; if unavailable, `BLOCKED`); `npx vitest run test/payments.ops.test.ts`.

### L5-04 Terms and data-licensing compliance
Owner: FOUNDER + COUNSEL   Depends: D1-01   Effort: M
Do: Terms of Service, refund policy, and a licence-compliance checklist mapping each displayed data element to its licence clause.
Accept: `docs/legal/licence-map.md` lists every data source shown in the UI (from `docs/PROVENANCE.md`) with clause reference; script checks no source in PROVENANCE is missing from the map.

### L5-05 Pre-launch security
Owner: CODER + FOUNDER   Depends: R8   Effort: L
Do: external penetration test; CSP moved from report-only to enforced after reviewing reports (R8); dependency scanning in CI; secrets-rotation runbook; Supabase PITR enabled and a **restore drill** performed.
Accept:
```bash
npm audit --omit=dev --audit-level=high              # → 0 high/critical (or each has a documented, dated exception)
curl -sI https://<prod>/ | grep -i "^content-security-policy:"      # → enforced header, not -Report-Only
```
Evidence files: `docs/security/pentest-<date>.md` (findings + fixes), `docs/runbooks/restore-drill-<date>.md`.

### L5-06 Incident runbook and status page
Owner: FOUNDER + CODER   Depends: P0-04   Effort: S
Accept: `docs/runbooks/incident.md` (roles, comms, rollback); public status page driven by `/api/health`.

---

# PHASE 6 — Engineering excellence (continuous; ★ gates G-D)

### E6-01 Web-performance budgets in CI
Owner: CODER   Depends: —   Effort: M
Do: Lighthouse CI with mobile emulation and throttling; budgets on top pages. Google's Core Web Vitals "good" thresholds as targets: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
Accept:
```bash
npx @lhci/cli autorun                                # → passes with assertions in lighthouserc.json
# prove the gate bites: add a 1 MB blocking script on a scratch branch → CI fails (paste run URL)
```

### E6-02 Bundle budgets
Owner: CODER   Depends: —   Effort: S
Do: script reads the build output and fails when first-load JS for `/`, `/screener`, `/stock/[symbol]` exceeds the budget (**PROPOSED:** stock page ≤ 200 KB gzip, founder to confirm).
Accept: `npm run build && npx tsx scripts/bundleBudget.ts` → exit 0; deliberate violation fails.

### E6-03 Server components and streaming for `/screener` and `/lab`
Owner: CODER   Depends: X3-05   Effort: L
Accept: `curl -s localhost:3000/screener | grep -c "<tr"` → table rows present in the initial HTML (not client-rendered); e2e unchanged; E6-01 budgets hold.
Positive control (standing rule for EVERY grep-based acceptance, A1 Round 14): pair each defect-grep with a string that only exists when the surface actually renders (a heading, a row label, a rendered-only marker), and paste that count in the same output — a zero must never be confusable with "the content is missing entirely". Where an acceptance needs occurrence counts on minified HTML, prefer `grep -o … | wc -l` (occurrences) over `grep -c` (lines — minified SSR HTML can hold many matches on one line).

### E6-04 ISR for stock pages
Owner: CODER   Depends: D1-09   Effort: M
Do: `generateStaticParams` from the universe; on-demand revalidation triggered by ingestion completion.
Accept: `npm run build` route table lists `/stock/[symbol]` as SSG/ISR with a page count equal to the universe size; after an ingestion run, revalidated page shows the new as-of (e2e).

### E6-05 Observability
Owner: CODER   Depends: P0-03   Effort: M
Do: error tracking, structured logs with redaction, request tracing, uptime and synthetic checks against staging and prod.
Accept: forced server error appears in the tracker (paste event ID); `npx vitest run test/logging.redaction.test.ts` → tokens, emails, JWTs never appear in log output.

### E6-06 SLOs and dashboards
Owner: FOUNDER + CODER   Depends: E6-05, D1-10   Effort: S
Do: `docs/SLO.md`: availability, latency, data freshness, payment-to-access success. Alerts wired to each.
Accept: each SLO has a query and an alert rule listed in the doc; a simulated breach fires an alert (evidence).

### E6-07 Blocking e2e, contract tests, upstream-failure drills
Owner: CODER   Depends: —   Effort: M
Do: make the Playwright smoke job blocking once it has 10 consecutive green runs; recorded-fixture contract tests per upstream adapter; drills that force each upstream to fail.
Accept: drill test asserts pages render a stale badge (not a 500) when the price provider is down; CI config has no `continue-on-error` on the e2e job.

### E6-08 Accessibility
Owner: CODER   Depends: —   Effort: M
Do: axe checks in Playwright on the top 10 pages; keyboard navigation for tables; visible focus; contrast.
Accept: `npx playwright test test/e2e/a11y.spec.ts` → 0 serious/critical violations; keyboard-only test can sort and open a row.

### E6-09 Feature flags, migrations in CI, rollback drill
Owner: CODER   Depends: P0-03   Effort: M
Accept: migrations apply to a fresh database in CI in order (`001…N`); a rollback drill on staging is documented with timings.

### E6-10 Type safety everywhere
Owner: CODER   Depends: R4   Effort: L
Do: `no-explicit-any` as `error` repo-wide; zod schemas for every upstream payload.
Accept:
```bash
npx eslint . --rule '{"@typescript-eslint/no-explicit-any":"error"}'   # → 0 errors
git grep -nE ":\s*any\b|as any\b" -- app lib components hooks | wc -l  # → 0, or each hit has a justified // eslint-disable-next-line with reason (list them)
```

### E6-11 Load and abuse testing
Owner: CODER   Depends: R5, R6   Effort: M
Accept: `k6 run scripts/load/api.js` against staging → p95 latency budget met (**PROPOSED:** < 800 ms for `/api/prices/batch` at 50 rps); rate limiter returns 429 above the limit; chat quota holds under 50 parallel requests.

**G-D audit:** Claude reruns E6 acceptance, reviews the pen-test report and restore-drill evidence, and confirms the L5 items are complete before any paid launch.

---

# PHASE 7 — Growth (only after G-A and G-B)

### G7-01 Analytics and activation
Owner: CODER   Depends: FD-4, L5-02   Effort: M
Do: event schema in `docs/analytics.md`; activation defined as **PROPOSED:** 3 watchlist adds or 1 portfolio import within 7 days; consent-gated; no PII in events.
Accept: e2e asserts events fire only after consent; schema test rejects events containing email or user id in properties.

### G7-02 Programmatic SEO
Owner: CODER   Depends: D1-09, E6-04   Effort: M
Do: sitemap from the universe; JSON-LD; canonical URLs; **thin-page rule:** a page is indexable only if it has at least N sourced data blocks (PROPOSED N=6), otherwise `noindex`.
Accept:
```bash
npx tsx scripts/seoAudit.ts --sitemap             # → every URL 200, unique title and description, thin-page rule enforced
```
Evidence from the founder: Search Console coverage screenshot after 2 weeks.

### G7-03 Pricing experiments
Owner: CODER   Depends: FD-7, E6-09   Effort: M
Do: flag-controlled plan variants (monthly/annual, price points); server-side only; every purchase records its variant.
Accept: test — variant assignment is sticky per user and cannot be set from the client; `transactions` rows record the variant.

### G7-04 Weekly Council digest
Owner: CODER   Depends: FD-5, S2-06, D1-09   Effort: M
Accept: preview generated from real data only (`git grep` for seed data in the template code is empty); unsubscribe works; copy audit passes.

### G7-05 Referral
Owner: CODER   Depends: L5-03, G7-01   Effort: M
Accept: tests for self-referral rejection, duplicate-credit prevention (atomic, Constitution art. 11).

### G7-06 API / B2B
Owner: FOUNDER   Depends: D1-01 licence allows redistribution   Effort: —
Do: decision memo only. No build until the licence explicitly permits it.

---

## Order of execution (critical path)

```
P0-01 → P0-02/03/04/05/06
      → FD-1 → D1-01 → D1-02 → D1-03 → D1-04 ┐
                                 D1-05 → D1-06/07 → D1-08 → D1-09 → D1-11 → D1-12   [G-A]
D1-09 → S2-02 → S2-03 → S2-04 → S2-07                                                  [G-B]
D1-09 → X3-* , R4-01 → R4-02 → R4-04/05                                                [G-C]
L5-* and E6-* run in parallel from P0; all must be green for                          [G-D]
G7-* only after G-A and G-B
```

**Not on this roadmap (do not build):** F&O analytics without licensed derivatives data, crypto/forex/commodities/bonds unless FD-3 says otherwise, new lenses or scorers before S2-04, visual redesign before G-A.

**Estimated calendar** (assumes agent-led execution and quick founder decisions): G-A ~week 8–10 (the 30-day run in D1-12 is wall-clock), G-B ~week 12–14, G-C ~week 20–24, G-D ~week 24–28. These are estimates, not commitments; vendor onboarding and legal review are the likely slippage points.