# Round 44 — founder round 2026-10-10: defect reproduction, the merge sequence, WP1

Evidence economy: this is the round's ONE file. Raw outputs live beside it
(`docs/evidence/round44/` for committed copies; large captures preserved in the
session tooling directory). Historical rounds are untouched.

## 1. The 17 founder defects — reproduced or refuted, on deployed d2d14ab (07:19Z–08:20Z)

Probes: `scripts/round44/defectRepro.mjs`, `scripts/round44/defectRepro2.mjs`
(SSR bytes), plus a real-browser pass (headless Chromium) for client-rendered
surfaces. Rule 28: nothing below was fixed without reproduction or honest
refutation, and refutations carry their evidence.

| # | Founder defect | Verdict on current deploy | Evidence |
|---|---|---|---|
| 1a | Two screeners (`/screener` 936 vs `/stocks` 896) | REFUTED at route level: `/screener` → HTTP 308 → `/stocks` (sanctioned SR 2026-10-06); identical bytes otherwise | crawl `--   /screener -> 308 /stocks` |
| 1b | Two datasets (SBIN 80 vs 78) | REFUTED at API level: `POST /api/screener/query {(mktcap > 0)}` → count 896, SBIN consensus 80 — the SAME dataset | raw output `defect-repro-output.txt` |
| 1c | The 936 number | EXPLAINED: the seed dataset is 936 records (`data/security-master/populate.sql` header: "data/stocks/index.ts (seed symbols + names; 936 records)") — the pre-consolidation screener rendered the full seed; today both surfaces render the 896 universe | populate.sql header |
| 2a | Two app shells | PARTLY REFUTED: the nav skeleton is IDENTICAL on every crawled route (0 `/screener` links anywhere; crawl gate 5 passes) — the founder's six "old-shell" routes carry the new shell | `wp1-crawl-RED3.txt` gate 5 |
| 2b | Generic og/twitter/og:url everywhere | CONFIRMED: og:title + og:url generic/root on 16 routes; canonical root/parent on 6 (methodology, lab, privacy, terms, bonds detail, methodology detail) — the crawl's 36 RED failures; FIXED in WP1 | `wp1-crawl-RED3.txt` |
| 2c | A route without the shell | FOUND (refines the founder's list): `/bonds/[symbol]` detail pages — fixed in WP1 (per-bond canonical + og); the nav itself is uniform | crawl |
| 3 | Placeholder zeros scored (KWALITY, DFL, EASEMYTRIP, ZEEL, YATRA) | CONFIRMED at source: all five carry `pe: 0, roe: 0` in `data/stocks/index.ts`; `pick()` passes seed 0 through as a real value; scorers consume it — WP2 (null-gate + `no_verdict`) | grep output in session log |
| 4 | Bank metrics applied to a bank (SBIN: OPM 42%, NCAV 69.62x, D/E) | CONFIRMED: SBIN SSR carries "NCAV 69.62x — crowd wrong?", Klarman "Zero Debt" comp with "Debt 0"; `lib/scorers/*` contain NO sector-class skip — WP2 | SSR extracts |
| 5 | Passes with missed targets (Kacholia 75 vs growth >25%; Greenblatt EY 7.9 vs >10, ROC 13.2 vs >25) | CONFIRMED mechanically: per-component scores are linear scalings (`fcfGrowth * 4`, `eyPct * 10`, `rocPct * 4`) and the total is a weighted mean — a component can miss its target while the composite "passes". Fix = WP3 (show composite-pass or gate the verdict) | scorer source `lib/scorers/kacholia.ts`, `lib/scorers/greenblatt.ts` |
| 6a | Invalid tickers on the screener (FLIPKART, BLINKIT, ...) | REFUTED on the live 896 universe: none render (probe 1); they exist only in `data/security-master/*.sql` as coverage-check fixtures | probe |
| 6b | Duplicate aliases (13 pairs) | PARTLY REFUTED: 11 of 13 pairs are already single-symbol, and the surviving symbols are genuine NSE ones (NAUKRI, CONCOR, COLPAL, TASTYBITE, RVNL, JISLJALEQS, GPIL, ANANDRATHI, ANURAS, HGINFRA). CONFIRMED REMAINING: RAYMOND2 + RAYMOND, KALYANAJW + KALYANKJIL — both invalid against `data/security-master/nse_equity_l_2026-10-01.csv` — WP2 | grep + CSV verification |
| 6c | Verify-list (RAYMOND2, KAPIL, BNRSEC, KAMOPAINTS, KNESL, DFL, RADICON, WINDMACHIN) | RESOLVED against the NSE master CSV: KAMOPAINTS (Kamdhenu Ventures) and WINDMACHIN (Windsor Machines) are REAL; RAYMOND2, KAPIL, BNRSEC, KNESL, DFL, RADICON are NOT in the CSV (seed names garbled: "Kapil Raj Feeds (Avanti)", "KNL") — WP2 removals/corrections | CSV lookups |
| 7a | Rishi counts 19/20/21 | CONFIRMED: scoring = 20 (`scoresCount: 20` on SBIN SSR; 20 files in `lib/scorers/`); `/rishis` has NO Soros (probe); `/pricing` carries a "21"-near-Rishi string — WP3 | probes |
| 7b | `/stocks` "Free tier shows top-5" vs `/pricing` "everything free" | CONFIRMED: `/pricing` H1 is "Everything Is Free"; the `/stocks` metadata description says "Free tier shows the top-5 Rishi verdicts" — WP3 (pricing copy) | browser + source |
| 8a | 10Y G-Sec 6.92 vs 7.08 | REFUTED: /pulse and /bonds both say 7.08% today | browser text extracts |
| 8b | "spread over repo 28bps" | REFUTED: the live card says "Spread over repo at 83bps" — and 7.08 − 6.25 = 0.83 exactly | browser extract |
| 8c | "yield softening" next to "+8bps" | REFUTED: the live copy says "Yields have firmed ~8bps over 30 days" — direction-consistent | browser extract |
| 8d | Repo-card duplicated sentence | REFUTED on current deploy: no repeated sentence in the rendered card | browser extract |
| 8e | Gold $4,209.9 vs 52W $2,200–$2,750 | CONFIRMED (values drifted, defect stands): Gold "$4,216.30 LIVE" against "52W RANGE $2,200 $2,750" on /commodities — WP4 | browser extract |
| 8f | Gold's +% equals Sensex's +% | Not reproducible this run (values moved); flagged for the WP4 computed-derived-fields gate | — |
| 8g | MCX prices labelled "$" | CONFIRMED: the "MCX INDIA" section renders "$4,216.30" (MCX trades in ₹) — WP4 currency fields | browser extract |
| 8h | BTC dominance 58.2% vs $1.95T/$2.75T | CONFIRMED and WORSE: the page shows BTC $1.95T against "TOTAL MARKET CAP DERIVED $2.14T" → 91% actual vs "BTC DOMINANCE REFERENCE 58.2%" typed — WP4 (computed, not typed) | browser extract |
| 8i | Two matured T-bills | REFUTED: one T-Bill row (Nov 2026); the matured ones were already removed (`// round5: IN91DTB removed — matured 2026-08-15`) | dataset + browser |
| 8j | 2Y G-Sec duration 1.9y > ~1.25y to maturity | CONFIRMED: "2Y G-Sec IN2YS 6.90% Jan 2028 1.9y" — duration exceeds remaining maturity; the field is typed, not computed — WP4 | browser extract + `data/bonds.ts` |
| 8k | Bond header counts 13 vs 17 | REFUTED: "TOTAL BONDS 15" = 4 G-Secs + 3 SDLs + 3 Corporate + 1 T-Bill + 4 US-Treasuries = 15; row types on page match | browser extract |
| 8l | SDLs and Reliance/HDFC at AA/AA+ | PARTLY RESOLVED: SDL rows carry "SOV" (sovereign) now; corporate rows keep AA/AA+ — cannot verify vs a ratings feed; provenance chips needed — WP4, and a FOUNDER DECISION on a ratings source | browser extract + `data/bonds.ts` comment |
| 9a | /forex "Live currency markets" with all REFERENCE | OUTDATED: rows now carry 12 LIVE chips + "⚡ Live • Updated <IST time>"; JPY row's 24H renders honest `—` | browser extract |
| 9b | /bonds "live yields" but all REFERENCE | OUTDATED: subtitle now "reference yields, labelled live where a live quote exists"; hydrated rows re-chip LIVE (IN2YS 6.94% REFERENCE SSR → 6.90% LIVE after fetch) and "AVG YTM LIVE 14/15" | SSR vs browser |
| 9c | "Observation time not disclosed" vs page timestamps | REFUTED: the string is absent from the dashboard now | browser |
| 9d | /news ticker all "--" | REFUTED: 0 `--` occurrences in the hydrated DOM | browser |
| 10 | Screener PRICE/24H "—" on all rows | REFUTED on /stocks: rows carry PRICE (119.34) and 24H (+1.70%) | browser row dump |
| 11a | Stock page "Rishi Intelligence" stuck on "Resolving intelligence…" | REFUTED in a real browser: `data-intelligence-panel="ready"` on /stock/SBIN (the SSR string is the pre-hydration placeholder; every failure path lands on an explicit `unavailable` state with an AbortSignal timeout — `components/stock/IntelligencePanel.tsx`); screenshot `stock-panel-ready.png` | browser eval + screenshot |
| 11b | Wisdom empty ("No historical parallels detected") | PARTIALLY CONFIRMED: the tab renders ("Rishi Wisdom — All 20 Philosopher Scores"); the parallels content requires the analog engine — section-4 scope (after WP1–4) | SSR |
| 11c | /news empty but in the nav | OUTDATED: /news hydrates headlines (R43 production pin); hiding-from-nav not applicable | R43 evidence |
| 12 | Dashboard links (Portfolio/Watchlist/Compare → /lab) | CONFIRMED: 5 `href="/lab"` links on / — section-4 gives the three quick links distinct targets (after WP1–4) | probe |
| 13 | Sector taxonomy duplicates | CONFIRMED in the dataset: Realty(17)+RealEstate(9), IT(46)+Tech(11), Finance(10)+Fintech(23), Auto(15)+Auto Ancillaries(44) — WP2; AgriTech/Defense/Jewelry variants already gone | dataset grep |
| 14 | Methodology slugs/S2-IDs | CONFIRMED (client-rendered): "(S2-01)", "(S2-06)", "(Basant Maheshwari)" duplication, "/basant" slug subtitle — FIXED in WP1 | browser + `wp1-vitest-RED-full.txt` |
| 15a | "Powered by Agnes 2.5 Flash" | REFUTED: the label now reads "Powered by model: not yet reported" until a response reports the model; "Agnes" absent from every surface | browser eval |
| 15b | Prompt "…or life" | CONFIRMED on /rishis: "Ask anything about stocks, markets, investing, or life ↓" — scope restriction queued with the chat work | browser extract |
| 15c | /pricing "verified, grounded answers" | PENDING verifier work (section-4 loop, gated on WP1–4) | — |
| 16 | Crypto "$" + Fear & Greed twice | CONFIRMED (both): 34 "$" occurrences on /commodities (MCX in $); /crypto renders "FEAR & GREED 68 – Greed" AND "CRYPTO FEAR AND GREED INDEX 68 – Greed" | browser extracts |
| 17 | JPY/USD naming + rounding | REFUTED: pairs render "USD/JPY" and "JPY/INR"; JPY spread shows 0.0200 | browser extract |
| — | NaN/mojibake | NOT OBSERVED in fetched HTML (founder's own note) nor in the browser pass; encoding gate green | `validate:encoding` |

## 2. Merge sequence (C8-honest)

- #314 (pulse advice wording) — merged by the founder/parallel session 07:34:22Z.
- #315 (INT-D3 fixture mount) — CI re-run on its exact head after the 07:18:09Z window
  opened; all five blocking checks green; main moved mid-flight (#314) → re-currency
  merge → green on the NEW exact head e82e1d7 → merged 08:43:58Z as `4965deb`;
  deploy verified `/api/version` = 4965deb58 (C6).
- #319 (hydration pins) — CI cadence-bited as designed on its exact head 2464bdc
  (job 114175225336: "deploy-cadence: FAIL — earliest safe merge 2026-10-10T09:41:59.000Z";
  branch-check PASS, four commits audited against 4965deb — code clean). Re-run in the
  window, then merge; the merge/deploy record lands in the PR thread (this file is
  committed before that moment and is not rewritten afterward).
- Quota: today's production-relevant merges ≤ 6, deploy pipeline healthy (each merge
  deployed; no 402s) — `docs/RELEASE.md` ledger holds.

## 3. WP1 (this PR)

- Acceptance script the founder specified: `scripts/wp1RouteCrawl.mjs` — identical nav,
  unique titles, per-route canonical + og, no `/screener` nav links, `/screener`
  permanent-redirect gate. RED against production: 36 failures (raw:
  `wp1-crawl-RED3.txt`). GREEN after deploy (the production leg).
- Unit twin: `test/wp1.routeMetadata.test.ts` — 29 pins, fail-first captured raw
  (`Cannot find package '@/lib/seo/routeMetadata'`), GREEN 29/29.
- One builder: `lib/seo/routeMetadata.ts` (title/canonical/og/twitter from one input);
  client pages get segment layouts (11 extended, 4 created); detail routes
  (`bonds/[symbol]`, `methodology/[scorer]`) carry their own canonical + og in the U5
  absolute form.
- Public-label hygiene: `(S2-01)`, `(S2-06)`, the `(Basant Maheshwari)` self-duplication
  and the `/slug` subtitle are gone from `docs/methodology/*.md` H1s and the index cards.
- Battery: tsc 0; eslint 0 errors / 284 warnings (ratchet exact); encoding PASS; build 0.
- Not fixed here (scope + founder decision): `/forex/pairs`, `/forex/rishis`,
  `/bonds/rishis`, `/bonds/screener` all render the Forex Rishis page — route-content
  duplication needing a product decision (distinct bond surfaces vs redirect vs removal).
