# ROADMAP status register

**Purpose:** one place to see where every `docs/ROADMAP.md` task stands, with the
evidence that closed it. The auditor re-runs acceptance commands at each gate
(G-A/G-B/G-C/G-D) from a fresh clone; this register points at what to re-run.
It complements `docs/ROADMAP.md` (the task definitions, kept verbatim as
delivered) and `CONSTITUTION.md` (the governing rules).

**Statuses:** ✅ done (evidence linked) · 🟡 partial (what remains, who blocks it) ·
⬜ not started · 🚫 blocked on an FD · ➖ not applicable yet.

Last updated: 2026-10-12 (Round 49 — RULES-1 records: FD-22 rankings on; FD-12 resolved as FD-23; News kept with the honest "No headlines yet" empty state, PR #346 rewritten; FD-1 BLOCKED stands. Prior: 2026-10-02, Commit M — founder decision: ALL FEATURES FREE, no tiers; pricing/payment surface retired; FD-7 resolved. Prior: Commit L — AI tool loop, grounding/provenance closure, eval harness; FD-9..FD-18 reconciled).

**Phase-0 status correction (Q5):** the round-3 close-out commit (`301a9d0`)
said "Phase 0 closed"; that was an overclaim — P0-03 remains 🟡 (no staging
Supabase project) and P0-02 is 🟡 pending the auditor's independent check of
the live evidence. Phase 0 is NOT fully closed.

## Phase 0 — Close trust gaps (weeks 0–2)

| Task | Status | Evidence / notes |
|---|---|---|
| P0-01 Merge round-2 remediation | ✅ (superseded by round-3) | Round-2 R1–R10 merged (PRs #1–#10 era). Round-3 N1–N9 + D-4 then merged as PRs #11, 13–24 — the v3 spec superseded v2; final DoD run on `5a6d56b` recorded in the round-3 close-out (worklog `R3-FINAL`). |
| P0-02 Verify live Supabase state | 🟡 | The round-3 "verified live" claim could not be independently checked (the auditor cannot reach the live project). Raw verification output (RLS on all 21 public tables, full privilege dump, append-only UPDATE/DELETE/TRUNCATE rejections as service_role, security-master state, and the honest gaps: no migration ledger on the live project; blanket pre-010 grants still resting on RLS policies) is supplied in **`docs/evidence/p0-02-live-2026-10-01.md`** for the auditor to check. Status stays 🟡 until that check passes. |
| P0-03 Staging environment | 🟡 | **Round 4 (Q2):** the staging project was publicly reachable AND wired to the production database — fixed live: Deployment Protection re-enabled (`/api/health` → 302), production Supabase variables removed from staging and from the preview target of `rishi-terminal`, production payment/ingest drills STOPPED (`BLOCKED: staging Supabase project`). Staging now runs database-less by design; `/api/health` reports `down` there, which is sanctioned. Remaining: founder creates the staging Supabase project in the dashboard (Management PAT 403 on create), then pastes `CHAT_API_KEY`/`NEXTAUTH_SECRET`. |
| P0-04 `/api/health` | ✅ | Migration 011 + `lib/health/probe.ts` (12s memo, single RPC). Live: 200 with honest `degraded` reasons while no ingestion has run. |
| P0-05 Provenance audit | ✅ | `scripts/provenanceAudit.ts` → `docs/PROVENANCE.md` (seed 5 / sourced 12 / editorial 1 / none 12); `--fail-on-unlabelled-seed` exit 0; `test/provenance.test.ts`. Out-of-scope asset classes (crypto/forex/commodities/bonds) are *reported* pending FD-3. |
| P0-06 `Sourced<T>` + provenance contract | ✅ | `Sourced<T>` + `<DataValue>` shipped (R1); `asOf` = provider observation time (N3); toFixed inventory justified per-group (N7, appendix). |

## Phase 1 — Data foundation (weeks 2–8) — gated by G-A

| Task | Status | Evidence / notes |
|---|---|---|
| D1-01 Vendor and licence decision | 🚫 BLOCKED (reverted 2026-10-11, round 48) | **FD-1 REVERTED TO BLOCKED (founder directive 2026-10-11, round-48 order: "Revert the FD-1 status to BLOCKED unless the founder confirms the delegation in writing, with date and wording")** — no written confirmation with date and wording of a delegation exists in the founder's reply, so the round-47 "FD-1 MOVED" record is superseded and the decision returns to the founder's desk (rule 31; a delegation this consequential needs the founder's own dated words). The licensing RESEARCH stands as founder-provided fact: NSE display fees per website/app, non-display licence for automated calculations (valuation ratios are calculations on prices), broker APIs own-account only, yfinance personal-use-only. The free-official route (NSE archives EQUITY_L.csv ticker master, EOD bhavcopy after the terms check one request/day, RBI DBIE macro, filings/IR company facts) remains the RECOMMENDED DEFAULT per C10 — staged behind internal gates (price-based scores refuse via PR #349; the universe price leg refuses via #350's display flag) — but nothing is DECIDED until the founder records it. Two enquiries await written answers (NSE Data & Analytics: EOD display, non-display licence for valuation ratios, costs; Angel One: public display of the SmartAPI feed, exchange licence). Blocks D1-04/D1-05 (and D1-08's secondary source). |
| D1-02 ISIN-keyed security master ★ | 🟡 (was ✅ — round 4 found binding defects) | **Q3:** direct symbol matches trusted symbol equality; the auditor found 5 wrong-company bindings and 12 renames; the implemented gate found 4 more wrong bindings (KALYANI, SUNDARAM, SUVEN, VSTL). Remediation (PR #28, applied live): name-agreement gate (`lib/db/nameAgreement.ts`), migration 014 (`NAME_MISMATCH`), `name_overrides.json` with 55 sourced decisions, 8 seed records removed (944→936), 4 seed names updated, CI `D1-02.7` + validator V5–V7; validator V1–V7 all PASS against live. Stays 🟡 until the auditor re-verifies. |
| D1-03 Corporate actions + adjusted prices | ⬜ | Depends D1-02 (remediation in review, 🟡) — but real action *data* needs the vendor (D1-01). Schema+adjustment math can start. |
| D1-04 Price ingestion (EOD) ★ | 🚫 FD-1 | Vendor adapter. |
| D1-05 Fundamentals ingestion, PIT ★ | 🚫 FD-1 (schema can start) | `fundamentals_pit` schema is vendor-independent. |
| D1-06 Shareholding ingestion | ⬜ | Depends D1-05. |
| D1-07 Validation rules + quarantine | ⬜ | Rules engine is vendor-independent; can start against D1-05's schema. |
| D1-08 Reconciliation vs second source | ⬜ | Needs D1-04+D1-05 data. |
| D1-09 Universe: Nifty 500 done properly ★ | 🚫 FOUNDER DECISION NEEDED (delegation unconfirmed, 2026-10-11) | **The round-47 "founder-delegated, DECIDED: NIFTY 100" record is REVERTED** — the founder's round-48 order ("Revert the FD-1 status to BLOCKED unless the founder confirms the delegation in writing, with date and wording") applies to the delegation this decision was recorded under, and no such written confirmation exists. RECOMMENDED DEFAULT per C10: NIFTY 100 via the free official NSE route — the code is staged by PR #350 (constituents + the licence-gated internal price feed) and lands on the founder's explicit order, but the universe CHOICE stays the founder's. Rationale for the default unchanged: the largest manually-maintainable set for filings/IR facts with source+date per value; 50 too thin for the council; 500 stays the end state. Rebuild base: NSE EQUITY_L.csv. Depends D1-02 (🟡) + D1-01 (🚫). |
| D1-10 Freshness SLOs + alerting | 🟡 | Probe + health `degraded` semantics live (N8); UI stale banners live (N3). Alerting + SLO docs remain (E6-06 overlap). |
| D1-11 Retire placeholder seed from user paths | ⬜ | Depends D1-09. |
| D1-12 Thirty-day unattended run ★ (G-A exit) | ⬜ | Wall-clock; starts when D1-04/D1-05 run. First scheduled cron slot since the production project went fresh: 2026-10-01 13:30 UTC. |

## Phase 2 — Scores earn their place — gated by G-B

| Task | Status | Evidence / notes |
|---|---|---|
| S2-01 Methodology docs | ⬜ | |
| S2-02 Backtest harness ★ | ⬜ | Depends D1-03/04/05. |
| S2-03 Evaluation report | ⬜ | |
| S2-04 Prune/reweight with OOS proof | ⬜ | |
| S2-05 Score explainability | ⬜ | |
| S2-06 Disagreement metric | ⬜ | |
| S2-07 Immutable forward track record ★ | 🟡 | DB half done early (N2, migration 010); round 4 closed its TRUNCATE hole (Q1, migration 013: `REVOKE TRUNCATE` everywhere + statement triggers; CI Q1.1/Q1.2; live-verified — as service_role TRUNCATE → 42501). `/track-record` page not built (needs D1-09). |

## Phase 3 — Core product depth — gated by G-C

X3-01..X3-10: all ⬜ (depend on Phase 1 data). X3-09 (PWA) has no data dependency — startable.

## Phase 4 — Differentiation: the Rishi lens

R4-01 🟡, R4-02 🟡 (both started early, see below); R4-03..R4-07 ⬜. R4-06 (i18n) and parts of R4-07 have no data dependency.

| Task | Status | Evidence / notes |
|---|---|---|
| R4-01 Internal data API for tools | ✅ implemented (pending independent verification) | **Commit L1:** `lib/ai/tools.ts` — the typed tool layer `getStock`/`getFinancials`/`getPrices`/`getScore`/`getPeers`, each resolving ONLY through the canonical surfaces (registry, `resolveStockMetrics`, `getStockScore`, `fetchLivePrice`) — no second source of truth, no AI-side score recomputation. Strict allowlist + zod argument validation + security-master check + explicit failure states (`unknown-tool | invalid-args | unknown-symbol | no-data | failed`). **HTTP-exposure note (deliberate):** the tools are server-internal with NO route of their own — the only consumer is the bounded loop inside `/api/chat` (401-guarded), because Coder Directions §4 forbids client-supplied tool results; the roadmap's 'unknown symbol → 404' maps to the explicit `unknown-symbol` failure state at the tool boundary ('where applicable', §5). Evidence: `test/aiToolLoop.test.ts` (20 cases, incl. score parity vs `getStockScore`), `test/aiTools` coverage in the golden set, `docs/AI_LOOP.md`. |
| R4-02 Grounded chat with numeric verification ★ | 🚫 blocked on FD-8 (founder) — technical contract complete | **Commit L closes the technical scope:** bounded tool-calling loop (L1, `MAX_TOOL_ITERATIONS=4`, exhaustion → honest BLOCKED, `structuredResponse:"blocked"`); server-generated verified surface (L2 — the grounded `text` is built ONLY from validated typed facts `[field] = [value] [unit] — [source state]`, model prose rides as labelled unverified commentary — the mixed-claim hole from §2 is structurally closed); provenance in the grounding contract (closed source-state vocabulary live/live-undated/derived/seed/unavailable + conservative closed-vocabulary anti-upgrade, claims and answer); untrusted-transcript contract for client history; `eval:chat` harness + 113 golden questions across all 31 mandated categories (`npm run eval:chat`, `test/evalChat.golden.test.ts`), every case an expected contract state; evidence-assembly quota refund; `null→0` cleanup. **Remaining for ✅:** FD-8 (chat/LLM vendor + retention terms) and FD-2 (SEBI positioning) — founder-owned; plus the founder-reviewed slice of the golden set (roadmap asks ≥30 questions reviewed by the founder) and the PROPOSED threshold confirmation. Evidence: `test/chat.grounding.l2.test.ts`, `test/aiToolLoop.test.ts`, `test/evalChat.golden.test.ts`, `test/chat.quota.assembly.test.ts`, `docs/AI_LOOP.md`. |

## Phase 5 — Legal, money, security ops (parallel)

| Task | Status | Evidence / notes |
|---|---|---|
| L5-01 SEBI positioning + copy audit | 🚫 FD-2 | Counsel task. |
| L5-02 Privacy + account controls | ⬜ | COUNSEL + CODER; the enumeration test pattern is specified in the roadmap. |
| L5-03 Payment operations | ➖ superseded (free product) | **Commit M (2026-10-02): payments RETIRED** — /api/payment + webhook answer 410, the Razorpay surface and dead code are deleted, CSP/env references removed. Historical transaction rows + migrations preserved. GST invoices/refunds/reconciliation for the 2026 era remain a founder/finance matter outside the codebase (the processor dashboard handles them); nothing further is owed by code. |
| L5-04 Terms + data-licensing map | 🚫 D1-01 | |
| L5-05 Pre-launch security | ⬜ | CSP is report-only (R8); pen test, PITR restore drill pending. |
| L5-06 Incident runbook + status page | 🟡 | One post-mortem runbook exists (`docs/runbooks/2026-09-30-observations-starving-snapshot.md`, D-4). General incident.md + status page pending. |

## Phase 6 — Engineering excellence (parallel)

| Task | Status | Evidence / notes |
|---|---|---|
| E6-01 Lighthouse CI budgets | ✅ | Lighthouse gate runs blocking in CI with measured-score floors + ratchet ("Lighthouse gate (U3)"), wired since U3 (round 5); green on every PR since. Register row was stale. |
| E6-02 Bundle budgets | ✅ (ratchet half) | `scripts/bundleBudget.ts` wired into CI + ratchet; gate bite-proven (scratch PR #18, CI run 36801733290). The PROPOSED 200 kB budgets are still exceeded (274/273/310 kB) — tracked, needs founder confirmation of the number. |
| E6-03 RSC + streaming /screener /lab | 🟡 | N1 moved pages to RSC with slim indexes; streaming + the `<tr` -in-initial-HTML acceptance remain. |
| E6-04 ISR for stock pages | ✅ | Y1 (PR #118): ISR revalidate 60 s for / and /stock/[symbol] with quote peek at regeneration; warm TTFB p95 ≈ 0.15 s on production (round-14 evidence). On-demand revalidation on ingestion folds into the Y2 warmer's TTL design. |
| E6-05 Observability | ⬜ | |
| E6-06 SLOs + dashboards | ⬜ | |
| E6-07 Blocking e2e, contract tests, drills | 🟡 | Playwright smoke is blocking (since round 2); contract tests + upstream-failure drills remain. |
| E6-08 Accessibility (WCAG 2.2 AA) | ✅ (automatable subset) | PR #150: axe-core gate (wcag2a/2aa/21a/21aa/22aa) over /, /screener, /stock/RELIANCE, /methodology, /lab, /rishis rides the blocking Playwright job; fail-first (all six routes red pre-fix), then 0 violations. Token-level contrast fixes (--text-muted #8395AC, --text-ghost #7C8BA1, ~270 literal hexes swept) + /rishis keyboard access. Honest scope note in PR: axe automates ~⅓ of WCAG; manual audit items remain. |
| E6-09 Flags, migrations in CI, rollback drill | 🟡 | Migrations 001–014 run in CI (PG16 job, since N2; populates + validates the security master; Q1/Q3 invariants live). Feature flags + documented rollback drill remain. |
| E6-10 Type safety everywhere | 🟡 | `no-explicit-any` is ERROR in `hooks/**` + `scripts/**` (N9); repo-wide promotion remains (318 warnings baseline). |
| E6-11 Load + abuse testing | 🟡 (load/abuse proven; production warm-cache latency OPEN) | PR #151: k6 profile (scripts/load/api.js); limiter 429 proven on the LIVE deployment (60×200 then 15×429, exactly the 60/60 s bound); "chat quota holds under 50 parallel" proven at the SQL level — W3-A storm extended 24→50 parallel, CI-gated. Staging-vs-local and no-synthetic-chat deviations documented. **Required statement (founder Round-15 audit — supersedes any latency-closure reading of the 3.6 ms local number):** Control-plane latency measured locally. Live rate-limit behavior proven. Production warm-cache latency remains independently unmeasured. The <800 ms budget remains PROPOSED. Do not report `/api/prices/batch` as meeting a production latency budget. |

## Phase 7 — Growth (only after G-A and G-B)

G7-01..G7-06: all ⬜ / 🚫 (G7-01 needs FD-4, G7-06 needs D1-01 licence terms). **G7-03 (pricing experiments): ➖ NOT APPLICABLE — superseded by the FD-7 resolution (all features free, 2026-10-02). There are no plans to experiment with; any future paid surface would require a NEW founder decision.**

## Founder decisions register (blocks tasks above)

| FD | Decision | Blocks | Status |
|---|---|---|---|
| FD-1 | Data vendor(s) + budget | D1-01 → D1-04/05/08, L5-04, G7-06 | **OPEN — the critical-path decision for G-A.** `BLOCKED: FD-1` stands on D1-01/D1-04/D1-05/L5-04 (Round-15 audit): the full D1 sequence (security master → corporate actions → EOD → PIT fundamentals → shareholding → validation/quarantine → reconciliation → universe gating → freshness/alerting → seed retirement → unattended run → G-A) starts only when FD-1 is supplied. |
| FD-2 | SEBI positioning | L5-01, copy in X3/R4 | OPEN. |
| FD-3 | Scope: India equities only until G-C | P0-05 hiding, X3-10 | OPEN (out-of-scope classes are reported, not hidden). |
| FD-4 | Analytics tool | G7-01 | OPEN. |
| FD-5 | Email/push/WhatsApp providers | X3-08, G7-04 | OPEN. |
| FD-6 | Broker CSV formats | X3-07 | OPEN. |
| FD-7 | Pricing + free-tier limits | G7-03 | **RESOLVED (2026-10-02, founder instruction): ALL FEATURES ARE FREE — no tiers, no paid gates, no upgrade paths, no Razorpay checkout, no feature/Rishi/stock-view limits.** Implemented by Commit M (M1–M5): tier entitlements removed, persona/verdict/guru surfaces serve everyone, one global free chat quota (FREE_CHAT_DAILY_QUOTA=150), pricing page honest ("Free"), /api/payment + webhook 410, dead payment code deleted (migrations + historical rows preserved). Mechanical invariants: `npm run freeAccessAudit` + `test/freeAccess.contract.test.ts` (evidence: `docs/evidence/commit-m/`). |
| FD-8 | Chat/LLM vendor + retention terms | R4-02/03 | OPEN (current chat provider works; terms unreviewed). |

**Round-4/round-5 additions — reconciled into this register (all OPEN, founder-owned; detailed entries below):**

| FD | Decision | Blocks | Status |
|---|---|---|---|
| FD-9 | Constitution rules 32–37 ratification + encrypted-credentials-mirror proposal (detail below) | Article VI governance | PARTIALLY RESOLVED — rules 32–37 are now in force as Appendix A Article VI of the ratified Constitution v2 (PR #152, 2026-10-05); the **encrypted-credentials-mirror proposal itself remains OPEN** (current base64 scheme stays in force until decided). |
| FD-10 | `/rishis` general chat scope: philosophy-only vs symbol-aware evidence-grounded (detail below) | `app/rishis` product contract | OPEN. |
| FD-11 | Matured bond instruments (IN91DTB and successors) (detail below) | `data/bonds.ts` | OPEN. |
| FD-12 | Non-equity heuristic-reference scores: promote to official scores or keep labelled heuristic reference | crypto/forex/commodity/bond score surfaces | **RESOLVED 11 Oct 2026 as FD-23** (founder words "Crypto cards score and category back on reference data."; restated 12 Oct 2026 — RULES-2 verbatim in docs/ROADMAP.md FD-12). Implementing PR: #369. |
| FD-13 | Seed-dataset residual placeholders (~416 boilerplate clones, ~422 mktcap artifacts) — impossibility gate + seed banner is interim | D1 live-fundamentals project | OPEN (real fix is D1, not more placeholder edits). |
| FD-14 | `/terms` + `/privacy` minimal honest drafts — counsel review of the free-product wording; refund wording sign-off | legal copy | OPEN (the "before paid tiers scale" trigger is moot — there are no paid tiers; the drafts were updated for the free product in Commit M and still need counsel review). |
| FD-15 | Non-equity asset classes in main nav (keep for traffic vs demote for focus) | nav/product scope | **RESOLVED 2026-10-11 (founder, verbatim: "Keep them, with each row showing its source and as-of time.")** — the rows STAY in the main nav, and every row must carry its source and as-of time; the missing-field state renders an honest em-dash with "no source yet" (the R3 REFMARKET-CONTRACT acceptance: a test fails when any row renders without a source or as-of time). |
| FD-16 | Banks scored with non-bank metrics — NIM/GNPA/CRAR modelling needs a data-source decision | bank scoring surfaces | OPEN. |
| FD-17 | Soft-404 on unknown stock symbols (HTTP 200 + not-found UI) — fix vs leave | SEO hygiene | OPEN. |
| FD-18 | `data/security-master/populate.sql` mirrors the pre-round-5 symbol list — regeneration owned by the D1 pipeline | D1-04/D1-05 (must not resurrect removed symbols) | OPEN (flagged). |
| FD-22 | Rankings on: `RANKINGS_ENABLED=true` in production (detail in docs/ROADMAP.md FD-22) | dashboard ranked widgets | **RESOLVED 2026-10-12 (founder words verbatim in docs/ROADMAP.md FD-22).** Env verified set (production target, `true`, created 2026-10-06). Honest-state probe (three widgets show honest empties, no seed ranking renders) rides the round-49 evidence; the flag-on-no-candidates note fix is the round-49 implementation PR. |

### Round-4 additions (Q6) — pending founder approval

- **FD-9 | Constitution rules 32–37 ratification + encrypted-credentials-mirror proposal** | CONSTITUTION.md | OPEN.
  Rules 32–37 (Article VI, credential provisioning) were added by coder commits without founder approval recorded. **No further edits to `CONSTITUTION.md` will be made without the founder's approval in the PR thread** — the Constitution is frozen pending ratification.
  **Proposal (for the founder to approve, NOT implemented):** replace the base64-obfuscated HF mirror blob (`rishi-credentials.b64`) with a passphrase-encrypted blob (e.g. `age` or `openssl enc -aes-256-cbc`) whose passphrase only the founder holds. Coder-side recovery would then require the founder to supply the passphrase once per sandbox reset (one interruption per reset, in exchange for the mirror not being readable with the HF token alone). The founder may also reject or amend — the current base64 scheme stays in force until a decision is recorded.

Plus non-FD founder actions outstanding: **ratify Constitution rules 32–37 and decide FD-9 (Q6)**; download the NSE `EQUITY_L.csv` in a browser for the Q3 hash comparison; create the staging Supabase project (Q2); confirm the PROPOSED env-matrix thresholds; staging env var pastes (`CHAT_API_KEY`, optionally `FMP_API_KEY`/`NEXTAUTH_SECRET`); `GEMINI_API_KEY` (§C.2). ~~ratify `docs/PAID_CONTENT.md`~~ (MOOT 2026-10-02: superseded by the FD-7 free-access resolution — there is no paid/free matrix to ratify).

### Audit 2026-10-02 additions (D/E/F) — pending founder decisions

- **FD-10 | /rishis general chat scope: philosophy-only vs symbol-aware evidence-grounded** | `app/rishis/page.tsx`, `/api/chat` | OPEN.
  The audit found /rishis calls `/api/chat` without a symbol and renders only `data.text`, while the server (correctly) treats that response as unstructured context-only output (`grounded: false`, no validated claims). The UI must not imply context-only output is numerically verified investment analysis — the interim fix labels every general-chat reply "context-only · not numerically verified" and surfaces provider/model/grounding state. **FOUNDER DECISION NEEDED: should general /rishis chat stay philosophy-only/context-only, or become symbol-aware and evidence-grounded?** Until decided, no product-contract change is made.

- **FD-11 | Matured bond instruments (IN91DTB and successors)** | `data/bonds.ts` | OPEN.
  IN91DTB's recorded maturity (2026-08-15) passed on 2026-10-01 and the 182D bill matures 2026-11-15. The honest interim fix derives maturity state from the recorded date and labels the row MATURED (historical reference). **FOUNDER DECISION NEEDED: replace matured instruments with current-issue T-Bills from an authoritative source (and which source), or retire them from the default view?** No replacement dates were invented.

## Commit M — free-access conversion (2026-10-02)

**Founder decision (supersedes the spec-v2 pricing assumption):** every
product feature is FREE. No Seeker/Student/Disciple, no paid gates, no
upgrade buttons, no Razorpay checkout, no feature/Rishi/stock-view
limits. Authentication is not a tier — it stays only for security,
account state, abuse prevention and persisted user functionality.

Implemented in work order M1→M5 (branch `feat/free-access-commit-m`):

| Step | What | Evidence |
|---|---|---|
| M1 | Repository-wide classified inventory — 1,089 occurrences across 131 files, every one classified (runtime entitlement / payment surface / UI copy / db-persistence / dead code / docs / test / legitimate concept) BEFORE any deletion | `docs/evidence/commit-m/free-access-inventory.{md,json}` + `scripts/freeAccessInventory.mjs` (fails on unclassified matches) |
| M2 | Fail-first contract tests, written pre-conversion: **26 failing** on the pre-fix tree (persona matrix, forged tier, verdict slices, guru locks, quota equality, /api/auth/me, pricing page, payment 410s) | `test/freeAccess.contract.test.ts` + raw output `docs/evidence/commit-m/m2-failfirst-vitest.txt` |
| M3 | Tier entitlements removed: registry access/fnoAccess axes deleted; personaAccess = existence + canonical validation; /api/chat 403-by-tier gone; /api/rishis + stock-page RSC serve the FULL verdict set; /api/gurus serves everyone in full (no locked teasers); dead F&O tier module deleted; client hooks/components de-gated (`useSession`) | commits `feat(M3)`; `test/persona.registry.test.ts` pins the axes cannot return |
| M4 | Payment surface retired: POST/PUT /api/payment + webhook → **410 Gone**; PaymentButton/UpgradePrompt/grantTier/signatures/lib/premium.ts deleted (zero importers); unused `razorpay` dep removed; CSP origins cleaned; /pricing = honest free page; privacy/terms/locale copy truthful | commits `feat(M4)`; 410s + no-grant pinned in the M2 contract |
| M5 | One global free quota `FREE_CHAT_DAILY_QUOTA=150` (explicit constant, not tier-derived); session model = single `access: 'free'` (legacy DB tier columns not even selected); client stock-view counter gone; **`npm run freeAccessAudit`** — the canonical gate (comment-stripped, entitlement-specific patterns, documented legacy-persistence allowlist, filesystem walk so untracked violations fail too), wired into CI before vitest | `scripts/freeAccessAudit.mjs`; Rule 24 bite proof `docs/evidence/commit-m/m5-gate-bite-proof.txt` (scratch tier gate + razorpay URL + resurrected lib/premium.ts → exit 1) |

M9-M12 (deployment + production proof): PR #45 merged (d7f16ac), CI green on all three jobs including the new free-access audit step (evidence: docs/evidence/commit-m/m9-ci-jobs.txt), production deployed (dpl_BSZ2XF1QXq) and probed — **33/33 free-access + AI-loop matrix rows PASS** against the deployed SHA with REAL legacy-tier database rows (docs/evidence/commit-m/production-free-access-matrix.json), and the exact-SHA receipt binds git SHA = Vercel deployment = /api/version = probe SHA = d7f16ac (production-receipt.json). Model identity in production confirmed: agnes-2.5-flash.

Post-conversion state: **706/706 vitest green** (692 at M5, +14 from the M7 tool-state suite) (the 26 fail-first rows
now pass with no assertion weakened); `tsc --noEmit` 0; eslint 0 errors
(warnings 302, below the 305 baseline); encoding validation clean.

Preserved verbatim (historical): `lib/db/migrations/001, 002, 007`
(users.tier columns, transactions, grant RPC), all transaction rows, and
the audit-history documents (`docs/PAID_CONTENT.md` is banner-marked
SUPERSEDED, body kept).

Not resolved by this change (still OPEN, per the founder's explicit
list): FD-1, FD-2, FD-8..FD-18. G7-03 (pricing experiments) is NOT
APPLICABLE under the free decision.

## Commit N — anonymous access completion + grounded-AI closure (2026-10-02/03, session 2)

**Founder decision (verbatim):** "make sure chat with rishi's works, and
requires no autehentication when I use it. Also make sure portfolio lab
works, without me needng to log into google."

**Reconciliation note (Rule 28):** a parallel session (PR #46, merged
8e9cada) implemented anonymous CHAT + the /lab page redirect removal
while this session was in flight, using a deterministic per-IP uuidv5
quota identity riding the existing atomic `chat_usage` RPCs (migration
015 drops the FK so anonymous ids fit). This session ADOPTED that design
(it is live and Rule-12-complete) and dropped its own draft cookie-based
quota rather than rebuild a live surface. What production still lacked —
verified by probe before this commit (`GET /api/rishis/RELIANCE` -> 401
anonymous, docs/evidence/commit-n/production-baseline-pre-n.txt) — is
what Commit N adds:

| Step | What | Evidence |
|---|---|---|
| N1 (completion) | Portfolio Lab DATA without sign-in: `GET /api/rishis/[symbol]` opened to every caller (the Intelligence/Compare tabs upgrade their bounded slice through it — previously a silent 401 degradation for signed-out visitors), per-IP rate-limited (fails open — defense in depth; the chat quota remains the fail-closed spend control); lab tabs un-gated from `useSession`; `'/portfolio'` removed from the proxy's protected list (dead path — no route exists; an honest 404 beats a sign-in wall) | `app/api/rishis/[symbol]/route.ts`, `components/lab/{CompareTab,IntelligenceTab}.tsx`, `lib/auth/protectedPaths.ts`; fail-first `test/anonymous.access.test.ts` + `test/proxy.access.test.ts` (RED on pre-N main), evidence in `docs/evidence/commit-n/` |
| N8 | Deterministic financial-data intent guard on the no-initial-evidence path: a closed two-signal detector (registry symbol token AND a closed data-term vocabulary — not an NLP classifier) requires canonical-tool engagement before a context-only reply is accepted for a clear symbol-specific data question; otherwise honest `BLOCKED` | `lib/ai/financialIntent.ts`, `test/financialIntent.test.ts`, router guard in `lib/ai/router.ts` |
| N9 | Production-grade complete-loop contract (local deterministic twin of the production canary): user → model → `getPrices` tool → typed evidence → validated claims → SERVER-generated verified surface + separate commentary, wire-schema-validated end to end | `test/ailoop.unified.test.ts` (Commit N describes) |
| N12 | Display terminology: `tier` → `rank` (`Persona.rank`, `RANK_COLORS`, `selectedRishi.rank`) — the marketing display rank (Legend/Master) no longer spells entitlement vocabulary; client-safe projection pinned to carry `rank` and no entitlement concept | `test/persona.clientProjection.test.ts` |
| N7 | Production grounded-AI canary + negative canary (automated probe, not a manual browser procedure): binds to the exact `/api/version` SHA; requires `getPrices:ok` on the registry symbol, `grounded=true`, `structured-claims`, the server-generated verified surface (not model prose), separate commentary, every number covered by validated facts, identity attestation; negative canary requires an explicit failure state for an unknown symbol with no fabricated answer and no false grounding | `scripts/prodGroundedCanary.mjs` |

All existing AI protections preserved (strict zod tool args, canonical
state, one tool allowlist, MAX_TOOL_ITERATIONS=4, explicit tool failures,
server-only evidence growth, numeric field/value/unit matching,
provenance anti-upgrade, server-generated verified surface, untrusted
client history, invalid-response fail-closed, BLOCKED exhaustion,
provider failover) — re-verified by the full suite.

### Commit N follow-ups (recorded separately, NOT fixed here)

| ID | Finding | Disposition |
|---|---|---|
| NF-1 | `app/fno/page.tsx` links to `/fno/builder`, but no `builder/` route exists in the current `app/fno` tree (`page.tsx`, `backtester/`, `options/`) — a real broken product path | Needs its own commit: either remove the link or build the route (founder decision). Do not fabricate a builder or hide the link inside Commit N. |
| NF-2 | `app/api/gurus/route.ts` contains `?? 0` fallbacks that coerce missing change values to `0`, conflicting with Constitution Rule 16 (`null` is a real value) | Needs a separate fail-first data-semantics task (gurus API + consumers). Not mixed into the AI-loop commit. |
| NF-3 | `/alerts` remains behind the proxy sign-in wall although the page persists alerts client-side (localStorage) — same class as the `/lab` wall removed by PR #46, but OUT of the founder's named scope | FOUNDER DECISION NEEDED: should /alerts also be reachable signed-out? |
| NF-4 | The per-IP anonymous quota identity (PR #46) collates every visitor behind one public IP (CGNAT is common on Indian mobile networks): a busy shared exit can exhaust the 150/day quota for everyone behind it | FOUNDER DECISION NEEDED (only if 429 complaints appear): switch to a server-issued cookie identity for per-device fairness, keeping the per-IP ceiling as the abuse bound. |
| NF-5 | The chat provider key (apihub.agnes-ai.com, agnes-2.5-flash) is a FREE-TIER key: on 2026-10-02 ~06:18 UTC the account hit the provider's free rate limit ("Upgrade to a Token Plan to unlock higher limits"). Production chat then degrades HONESTLY (502 with quota refund; no fabricated answers) until the limit resets. The grounded-AI canary had already PASSED end-to-end on 15d0cab before the limit hit (receipt in git). | FOUNDER DECISION NEEDED: upgrade the Agnes API plan / provide a paid key, or accept free-tier capacity. This is a vendor/cost decision (Rule 31), not a code defect. |

## Round 9 — correctness/performance closure (2026-10-02/03, session 3)

**Provenance of this section (Rule 28):** the Round-9 fixes were originally
built as six local branches in a sandbox that was later wiped — never
pushed, therefore never durable. This session restored credentials via the
Constitution Article VI protocol (HF mirror → vault), re-cloned at
`main` = `e478e42` (production `dbc4c7b` verified via `/api/version` and the
Vercel API), re-read the Constitution, and REBUILT the six scoped branches
from the Coder Directions defect map, each with fresh fail-first evidence.
The rebuild was verified against current code before starting: gurus
null-semantics (NF-2) and the `/fno/builder` route fix (NF-1) were already
closed on main and were NOT redone.

| Branch | Scope | Highlights |
|---|---|---|
| R9-1 Rule-16 UI provenance | LivePriceWidget, useLivePrices, dashboard, alerts, dashboardSnapshot | missing change renders "—" (was `?? 0` → "0.00%"); observation clock = server-disclosed upstream time (was browser `new Date()`); badges derived from entry statuses via `pricePresentation.ts` (conservative aggregate + DELAYED downgrade); hook transports status/source verbatim |
| R9-2 FX/static-yield semantics | lib/livePrice.ts | ExchangeRate-API fallback: rate observed, change null (was hardcoded 0); static-yields-us change null (parity with IN/corp); Yahoo FX path regression-locked to keep its disclosed change |
| R9-3 pulse null semantics | /api/pulse/breadth, /api/pulse/blocks, pulse UI | missing percentChange counted `unknown` (not "unchanged"); ratio null at declines=0; blocks: nulls not zeros, no manufactured BUY/SELL side, provider timestamp or null; UI coercions removed |
| R9-4 AI repair-cause attribution | lib/ai/router.ts, schemas | RepairCause taxonomy (9 codes) recorded in `timings.repairs` at the decision point; completions stage-labelled initial/post-tool/repair; pure `classifyGroundingRejections` |
| R9-5 price observedAt parity | lib/livePrice.ts (CoinGecko) | `include_last_updated_at` requested and transported; single and batch routes expose the same provenance contract (production gap was BTC `observedAt: null`) |
| R9-6 this section + provider-matrix addendum | docs | verified-claims-only reconciliation |

### What Round 9 explicitly does NOT claim (still open)
| Item | State |
|---|---|
| AI first-pass reliability | Round-9 battery measured 1/8 first-pass grounded, 7/8 needing the repair completion. The cause taxonomy (R9-4) now makes every future failure attributable; the larger production battery (≥20 financial / ≥10 philosophy / ≥10 invalid) must run on the deployed SHA before any provider/prompt change (directive 9). |
| AI latency reduction | Dominant measured sink remains provider completion (~16.5 s + ~8.4 s vs ~66 ms tool execution on the deterministic gate). Attribution infrastructure is complete; optimization is NOT started (directive 8: do not touch the tool executor or validator without a disproving battery). |
| Price wall-time reduction | The 90% upstream-reduction result is preserved as evidence; wall-time attribution under cold/stale/error/fallback conditions needs the production price battery (directive 19/21). |
| Rule-10 repository-wide sweep | Separate branch (directive 18) — outward `detail`/`String(err)` surfaces remain in some routes' catch blocks (e.g. pulse breadth/blocks), each to be swept with its own fail-first test. |
| Agnes free-tier capacity | Unchanged vendor constraint (NF-5) — not a code defect; Rule-31 founder decision. |

### Standing invariants re-verified this round
All-features-free product (no tiers/quotas by rank; the 150/day global chat
quota is abuse/spend control, not a paid tier); anonymous chat and
Portfolio Lab; the canonical AI loop (one router, one executor, one
evidence builder, structured claims, grounding validation,
server-generated verified surface, separated commentary); reactive
tool engagement preserved (no unconditional pre-seeding — directive 11);
`/rishis` context-only contract unchanged pending FD-10; no fabricated
bond issues (FD-11 stands: IN91DTB class is filtered, never replaced);
RESEARCH_ONLY providers unreachable through the routing primitive.

## Rounds 10–14 (2026-10-03 → 2026-10-04) — the X/Y/Z/W/V/S/A defect-map campaigns

**Provenance of this section (Rule 28):** reconstructed from the merged-PR
record and `docs/evidence/round10..round14/`; every row cites its PR (CI-gated,
full battery) and its evidence file. Rounds 10–14 ran the founder's
audit-driven defect maps: each round = one founder audit → scoped PRs, each
with fail-first proof (rule 21/24) and raw command output in the PR.

### Round 10 — production receipt + battery baselines (PRs #76–#81)
| Item | PR | Evidence |
|---|---|---|
| R10-01 battery pacing under the 12/min limiter + bounded provider-failure retries | #77 | `evidence/round10/ai-latency-battery-r10-baseline.json` |
| R10-03 specific repair feedback + verbatim-echo contract | #78 | battery artifacts |
| R10-04/05 production surface sweeps (price provenance, anonymous AI) | #79, #80 | `price-provenance-surface-sweep.json`, `production-receipt-03ef7fe.json` |
| R10-06 deployment closure on `03ef7fe` (three-way identity, env-attach record) | #81 | round-10 receipt set |

### Round 11 — X1 deploy budget + X3 first-byte prices + registry hygiene (PRs #82–#92, #112–#115)
| Item | PR | Evidence |
|---|---|---|
| R11-01 env decrypt-envelope incident record (root cause + deploy-path ruling) | #82 | `env-decrypt-incident-2026-10-03.md` |
| V1 SECURITY DEFINER privilege revocation + CI invariant | #85 | `scripts/ci/rls_invariants.sql` CI block |
| R11-02/03 rate/yield intent scoping + chat symbol via canonical registry | #84, #86 | round-11 evidence |
| V2 Greenblatt units fix (~100× too small) + net-profit proxy disclosure | #87, #89 | `greenblatt-probe-*.json` |
| R11-04/05/06 AI_LOOP reconciliation + registry-derived search + entropy audit | #88, #90, #91, #92 | `one-registry-audit-and-docs-reconciliation.md` |
| X1 ignored-build-step for docs-only changesets (quota defense) | #112, #115 | `x1-deploy-budget.md` |
| X2 crypto keyboard smoke CI-hermetic | #113 | CI job |
| X3 prices in the first byte (SSR + read-only quote-cache peek) | #117 | `x3-first-byte-prices.md` |

### Round 12 — Y1–Y7 (fast pages, cache warming, honest labels, nulls) + W/V closure (PRs #93–#111)
| Item | PR | Evidence |
|---|---|---|
| R12-01..07 multi-tool composition proof, state reconciliation, twin deletion, feature-depth audit, /fno honest copy, adjacent-instrument intent, production closure | #93–#96, #98, #100, #109, #110, #111 | `feature-depth-audit-round1.md`, `state-reconciliation-and-live-recheck.md`, `production-closure-e214b52.md` |
| W1–W4 anonymous-chat cost safety (global caps, kill switch, peppered /64 identity, token reservation/settlement) + scorer health gate | #101–#107, #108 | `w4-audit-2026-10-03.md`, `entropy-audit-post-w4-2026-10-03.md` |
| Y1 ISR restore for `/` and `/stock/[symbol]` (revalidate 60 s, quote peek at regeneration) | #118 | `y1-fast-pages.md`, `y1-ttfb-before/after-prod.txt`, `y1-prod-headers-after.txt` |
| Y2 quote-cache warmer (coverage telemetry, peers + tiles at the first byte, dedicated `QUOTES_WARM_SECRET`) | #119, #121, #122, #127, #128 | `y2-*.md/txt/json`, warmer run evidence |
| Y3 honest price labels (date/timezone/market state + plain source chip) | #120 | `y3-failfirst-vitest.txt` |
| Y4 null-not-zero (placeholder zeros → em dash, banking metrics honesty, sector-correct comparisons) | #124 | `y4` fail-first in PR |

### Round 13 — Z1–Z6 + X6/X7 (deploy starvation, CLS, bundles, scorer honesty, PoW) (PRs #125, #130–#136)
| Item | PR | Evidence |
|---|---|---|
| Z1 stop deploy starvation (skip non-prod builds, `VERCEL_GIT_PREVIOUS_SHA` diff base, `artifacts/**` in skip scope) | #125 | `z1-failfirst.txt`, `test/z1.vercelIgnore.test.ts` |
| Z2 dedicated `QUOTES_WARM_SECRET` (CRON_SECRET untouched) + checkEnv template | #127, #128 | warmer 401 probes |
| Z3 CLS gate repair + peek age contract (last observation up to 7 days) | #130, #131 | `z3-failfirst.txt` |
| Z5 every audited route under 200 kB gzip (dictionary diet + dynamic splits) | #132 | bundle gate on CI |
| X6 Greenblatt allow-list reason corrected + 15% own-bounds gate (Nemish named) | #134, #135 | `x6-failfirst.txt`, `x6-audit-output.txt` |
| Z6 Greenblatt honest record + Nemish placeholder-zero root cause | #135 | `greenblatt-production-probe-96726c6.json` |
| X7 self-hosted PoW challenge for anonymous chat (single-use consume, replay-locked) | #136 | `x7-failfirst.txt` |

### Round 14 — A1–A6 (first-byte content, human-solvable challenge, warmer run, methodology, feature depth) (PRs #137–#148)
| Item | PR | Evidence |
|---|---|---|
| S2-05 published breakdown IS the arithmetic (unrounded pillars) | #137 | PR raw outputs |
| S2-06 disagreement metric (population sigma of valid verdicts) | #138 | PR raw outputs |
| S2-01 methodology docs for every scorer + public `/methodology` page | #139 | `/methodology` (production after deploy catch-up) |
| A1 stock-page content back in the first byte (static imports, server-resolved parallels; bundle ratchet re-anchored — **FOUNDER DECISION NEEDED, restated verbatim (Round-15 audit):** accept ~207 kB as the content-restored baseline, OR approve the deeper server-component/client-island refactor; if approved, an actual reduction must be proven before re-anchoring the ratchet. The budget is never silently loosened. Current ratchet: `/stock/[symbol]` 206.77 kB, tolerance +2 kB) | #140 | `a1-bundle-accounting.md`, `a1-fail-first-smoke.md` |
| A2 chat challenge human-solvable (Web Worker PoW at 15 bits, progress + timeout) | #141 | `a2-failfirst-and-benchmarks.md` |
| A5 `/methodology` linked from nav + stock-page footer | #142 | smoke suite pin |
| A4 warmer run (workflow_dispatch + forced verification, all six slices) | #143 | `a4-warmer-run.md` |
| R4-04 Rishi Council view (consensus + dissent, verified lever paths, honest-null count) | #144 | PR raw outputs |
| X3-05 screener v2 (safe server-side expression parser, saved screens RLS, CSV export) | #146 | PR raw outputs |
| X3-07 portfolio import + analytics (shared XIRR, CSV grammar, RLS + idempotent re-import, GREEN+RED×2 Postgres proofs) | #148 | PR raw outputs |

### Deployment state at this register's last update (2026-10-04)
Production serves `47d76c4` (A2). Main `a4a7486` is 4 code commits ahead
(`e678e49` A5, `67f153d` R4-04, `5fc16c7` X3-05, `a4a7486` X3-07) solely
because the Hobby deployment quota exhausted a second time (13:14:49Z; see
`docs/RELEASE.md` ledger). The sanctioned API retry loop is running; the
production acceptance greps for A5/R4-04/X3-05/X3-07 run on the deployed SHA
the moment the window lifts.

### Deployment state at this register's last update (2026-10-04, rev 2)
Production serves `c88bd1d` — main is fully deployed and includes the
rate-limited catch-up (A5/R4-04/X3-05/X3-07 verified live), the E6-08
accessibility gate, and the E6-11 storm extension. The second quota
exhaustion (13:14:49Z) was remedied by the sanctioned API retry at
14:48:02Z; the #150 merge hit the cap a THIRD time (~15:10Z) and drained
naturally before #151 merged cleanly at 15:52:36Z. Full ledger:
docs/RELEASE.md. Next founder-independent items: E6-03 (streaming
acceptance), E6-05/06 (observability/SLOs), E6-07 (contract tests + drills),
E6-10 (repo-wide type promotion), X3-09 (PWA), L5-02/05/06, R4-03/05/06/07
data-independent parts.

## Round-48 ranked coder brief (2026-10-11) — the item ledger

Founder brief verbatim frame: "Open each ranked item as its own issue or PR, one branch per item (C7). Put the rank and ID in the title... Record every item in ROADMAP-STATUS with status, owner and the acceptance test. Opening items doesn't count as a production merge, so C8 pacing doesn't apply to opening them."

| Rank | Item | Surface | Status (2026-10-11) | Owner | Acceptance test |
|---|---|---|---|---|---|
| R1 | DEPLOY-GAP — the failing probe + the deployment record pasted; batch the queue if quota blocks | production | **DELIVERED (evidence pasted in the round-48 reply):** probe FAIL live sha 4c9f7088 ≠ main, /api/version recorded, 24h deployment record extracted (last deploy 13:11:48Z; NO deployment event for #343 or later — cause unverifiable sandbox-side, no Vercel token; quota saturation after the ninth exhaustion is the leading hypothesis); the batch protocol ARMED (merges continue at the C8 pace, deploy debt accumulates, ONE catch-up deploy when the blocker clears) | CODER + FOUNDER (Vercel dashboard check) | the failing probe (exit 1) and the deployment table are pasted — DONE |
| R2 | FD-15-RECORD — the founder's verbatim words recorded, FD-15 resolved, FD-3's out list updated | docs | **DELIVERED** — PR #360 (this branch): ROADMAP.md + ROADMAP-STATUS.md carry "Keep them, with each row showing its source and as-of time." + the date | CODER | ROADMAP.md and ROADMAP-STATUS.md carry the quote and date — DONE in this PR |
| R3 | REFMARKET-CONTRACT — value, unit, source, as-of, state on every non-equity row; dashboard ticker too | lib/refmarket + 4 surfaces + dashboard | **OPEN** — issue #363 (spec + plan); scheduled after the R6–R10 merge queue | CODER | a test fails when any row renders without a source or as-of time |
| R4 | PR-345-PERSONAS — rebase and merge #345 | PR #345 | **MERGED 15:53Z** (7c9b6a1) after the a11y contrast fix + the rebase reconciliation; covers the first-person prompts, the Graham commentary line, "or life" | CODER | grep-zero on those strings + positive control — test/personaAttribution.zero.test.ts 13/13 |
| R5 | ADVICE-IDENTIFIERS — BUY/HOLD/AVOID identifiers removed; journal confirmed user-own; F&O hidden | PR #362 | **OPEN (built, CI running)** — lib/utils.ts dead identifiers deleted, rishiMemory neutral signal vocabulary, journal type contract ("your trade"), F&O hidden behind the fail-closed FNO_ENABLED flag + FOUNDER DECISION NEEDED | CODER | the grep gate covers identifiers as well as strings — test/r5.adviceIdentifiers.test.ts 6/6 |
| R6 | PB-BASIS — one price basis for the header, P/B and the flip | PR #353 | **OPEN (rebased, CI green-pending)** | CODER | P/B equals the displayed price divided by bvps — test/pb.priceBasis.test.ts 8/8 |
| R7 | MUNGER-DEFAULT — the inversion check defaults to "not assessed" until forensic inputs | PR #354 | **OPEN (rebased, CI green-pending)** — endorsed over the stricter full-refusal alternative (recorded in the round-48 worklog) | CODER | no PASS without forensic inputs — test/munger.notAssessed.test.ts 5/5 |
| R8 | PR-346-LIVE-CLAIMS — rebase and merge #346; News out of the nav | PR #346 | **OPEN (rebased, CI green-pending)** | CODER | News not in the nav + the claim strings grep-zero — test/liveClaims.zero.test.ts 9/9 |
| R9 | PR-348-347-ROUTING — merge #348 then #347 | PRs #348, #347 | **OPEN (queue slots)** | CODER | one shell and nav on every route; no internal IDs in public text — test/routingShells.p1.test.ts + test/methodologyClean.zero.test.ts |
| R10 | PR-350-LIVE-UNIVERSE — NSE EOD prices behind an internal flag until NSE answers in writing | PR #350 | **OPEN (built, queue slot LAST)** — the branch now carries the internal display flag (EOD_PRICE_DISPLAY_LICENSE, the fail-closed 503-before-fetch route, 6 pins) | CODER | no public page shows NSE-sourced prices — test/universe.priceDisplay.test.ts |
| R11 | DEMO-SPEC — the honest demo path spec | test/demo | **OPEN** — issue #364 | CODER | runs green on main |
| R12 | ACTIVATION-EVENTS — five events behind a consent hook | instrumentation | **OPEN** — issue #365 (consent wording: counsel-owned, FOUNDER DECISION NEEDED) | CODER + counsel | the events fire during the demo spec |
| R13 | TODAY-AND-TRACKING — the dashboard Today view + "tracking since: not started" | dashboard + methodology | **OPEN** — issue #366 | CODER | both render on main |
## Round 49 (2026-10-12) — RULES-1 founder-decision records (words + implementing PRs)

Recorded BEFORE any code change this round, per the founder's order ("Record each founder
instruction with your exact words and the date before changing code" — the directive's words are
quoted verbatim; the date is the directive's receipt date, 2026-10-12).

- **FD-22 — Rankings on.** Founder's words (11 Oct): "enable all the top buy signals." Implementation note (brief wording, not the founder's words): rankings enabled in production via `RANKINGS_ENABLED=true`.
  (Phase 0, DELIV-1.) Env verified already set (production target, `true`, created 2026-10-06).
  Implementing PR (the honest flag-on-no-candidates state + probe): the round-49 rankings PR.
  Register row: docs/ROADMAP.md FD-22.
- **FD-12 — crypto/commodity cards (implemented as FD-23).** Founder's words (11 Oct, recorded
  as FD-23 in PR #368): "Crypto cards score and category back on reference data." Restated
  12 Oct (RULES-2): "Show score and category on reference data, labelled 'Heuristic reference —
  static reference inputs, not a verdict', with source, attribution and as-of time. Show no BUY,
  SELL, HOLD or AVOID. Stock verdicts stay null on seed data." Implementing PR: #369.
- **The price-based override ("licence pending" label) — implemented as FD-26.** Founder's
  words (11 Oct): "price based scores enabled again." Founder's words (12 Oct, DELIV-2):
  "Every price-based score carries 'licence pending'. The status stays 'unresolved' in code."
  FD-26 recorded 11 Oct (PR #368). Implementing PR: #371.
- **"Top Buy Signals" name exception to P0-6 — implemented as FD-24.** Recorded 11 Oct
  (PR #368): "Keep 'Top Buy Signals' as the name." Implementing PR: #370.
- **Persona labels (Michael Saylor, Vitalik) — implemented as FD-25.** Recorded 11 Oct
  (PR #368): "Keep Michael Saylor and Vitalik as persona labels."
- **Payments after the demo — implemented as FD-27.** Recorded 11 Oct (PR #368): scheduled,
  no code change until the demo date.
- **FD-15 — the four markets show source and as-of on every row.** Founder's words (12 Oct,
  DELIV-3): "Every row shows value, unit, source, as-of time and state. Missing fields show '—'
  with 'no source yet'. Screener PRICE and 24H follow the same rule." Record PR: #360;
  implementing PRs: #361 (sourced-rows contract) + #363 (the row-contract module, wiring tracked
  in issue #363).
- **News — keep, with an honest empty state (RESP-2).** Founder's words: "News stays in the nav
  with an honest empty state, 'No headlines yet'. The PR must not hide News. Keep-or-remove stays
  with you." (and: "News: keep or remove. Current directive: keep, with an honest empty state.")
  Implementing PR: #346 (rewritten — the 11 Oct hide reversed on these words).
- **FD-1 — BLOCKED stands.** Founder's words (12 Oct): "Set FD-1 back to BLOCKED unless you
  confirm the 11 Oct delegation in writing." No written confirmation of the delegation exists,
  so the revert is implemented by PR #359 (the 11 Oct record, which quotes the round-48 order)
  and no further change happens without the founder's dated, written confirmation.
- **Rishi count — DECIDED 12 Oct 2026, implemented this round (was FOUNDER DECISION
  NEEDED).** Founder's words, verbatim: "21 with Chanos chat-only" (register row
  docs/ROADMAP.md FD-28). Verified code state stands: 20 scored (TOTAL_RISHIS = 20,
  no Chanos scorer); 21 display with Chanos flagged `chatOnly` (CHAT-ONLY chip on the
  /rishis row, simulated label, no score, no methodology doc). Dashboard wisdom body
  no longer lists Chanos among applied frameworks (en/hi/pseudo; fallback locales
  follow en).

## Round 50 (2026-10-12, afternoon order) — the scorecard work order, words verbatim

Recorded BEFORE the implementing changes, per the standing rule. The founder's
12 Oct afternoon order (receipt 16:04 IST scorecard; the task citations are the
founder's own):

- **RESP-1/RESP-4 — the deploy batch.** Founder's words: "Deploy one batch: dcd4c06.
  The window has been open since 05:29Z. Verify that `/api/version` returns dcd4c06,
  then run the seed-leak probe and paste both results into the ledger." State: the
  #392 merge auto-deployed; production serves dcd4c06 (verified); the smoke probe
  PASS; ledger PR #393 merged (14ad9013).
- **DELIV-4 — the copy audit.** Founder's words: "Still present: 'every verdict'
  (6 files), 'live prices' (9), 'knowledge graph' (16) and 'WISDOM TIERS' (2). Remove
  each claim the build can't support, or build and test it. Acceptance: grep-zero in
  messages and UI." Implementing PR: #388 (rebased this round).
- **RULES-3 follow-through — one Rishi-count wording.** Founder's words, verbatim:
  "Use one wording everywhere: '21 Rishis: 20 scored, Jim Chanos chat-only'. The copy
  still says 'All 21' in 8 files and 'All 20' or 'VIEW ALL 20' in 4. The CHAT-ONLY
  label on /rishis is correct." This supersedes FD-28's "stand as written" note for
  the /pricing "All 21 Rishis" string and the wisdomDesc exemption in the round-44
  unification pin. Implementing PR: this round's RULES-3 branch.
- **DELIV-5 — sector duplicates.** Founder's words: "Realty is 17 and RealEstate 9.
  Tech is 11 and IT 46. Fintech is 23 and FinTech 0. Merge each pair, with a
  migration test. Keep it off the demo path until merged." Implementing PR: #389
  (rebased this round).
- **DEMO-4/DEMO-5/DEMO-6 — Today view, activation events, demo spec.** Founder's
  words: the Today view carries "an honest empty state: 'No live verdicts yet', and
  no seed rankings"; the five activation events (search, verdict view, dissent expand,
  flip expand, watchlist add) ride "behind a consent hook"; the demo spec is
  `test/demo/demo-path.spec.ts` against the public site, "Keep it honest. Point it at
  /demo once the approach is approved." Implementing PR: #391 (rebased this round).
- **ENG-2/ENG-6/ENG-3/ENG-4.** Formula tests on every persona doc; lint to zero on
  the demo-path files first; LCP ≤ 2.5 s and zero serious axe violations on the public
  demo path. Implementing PRs: #390 (rebased) + this round's follow-ups.
- **The demo guardrail (standing).** Founder's words, verbatim: "Do not build any
  demo that shows seed verdicts on real companies. Build `/demo` only after your
  written decision on the approach." The approach itself remains FOUNDER DECISION
  NEEDED (recommended default on record: a hypothetical company with labelled inputs).
- **Timeline (founder's words):** 12 Oct deploy+copy+Rishi wording; 13–15 Oct Today
  view, activation events, demo spec, lint; 16–19 Oct formula tests, performance and
  accessibility, `/demo` once approved; 20 Oct 18:00 IST freeze (demo-path fixes
  only after); 21 Oct rehearsal; 22 Oct demo, from main, probe green.
- **Blocked on the founder:** the demo approach; the venue (live site recommended);
  FD-1, FD-8, FD-5, the NSE answer, the monitoring vendor (deferred until after
  22 October).

## Round 52 (2026-10-12, evening order) — the stale-quote P0 + probe liveness + formula text, words verbatim

Founder's order (12 Oct 2026), recorded verbatim before the first change of this
round (the Constitution's standing record rule):

> Read CONSTITUTION.md (Core) before the next change. English only.
>
> Now (12–13 Oct)
>
> Fix the stale quote (new P0, C1). Find out why /stock/RELIANCE serves a 13:28
> render: check x-vercel-cache and age, and check whether ISR regeneration fails
> on that route. Add a freshness rule in lib/pricePresentation.ts. A quote older
> than 15 minutes shows "as of <time> · stale" and never "market open · intraday
> quote". Compute market status from IST trading hours at display time.
> Acceptance: a test with a six-hour-old quote shows "stale", and the live page
> shows the current time.
>
> Make the probe prove liveness (C6, C5). It currently passes an old page. Add
> presence checks for each release: the CHAT-ONLY tag on /rishis, the licence
> label where it applies, and a render time no more than 15 minutes old.
> Positive control: the probe must fail on the 02eac31 HTML and pass on dcd4c06.
>
> Fix the /rishis formula. Jhunjhunwala's displayed formula (P/CF 25%, growth
> 25%, quality 20%, conviction 20%, sentiment 10%) doesn't match his council
> criteria. Generate the text from the scorer config. Acceptance: a test that
> the displayed formula matches the code.
>
> Next (14–16 Oct)
>
> 4. Today view (DEMO-4): build it on the public dashboard with an honest empty
>    state, "No live verdicts yet", and no seed rankings.
> 5. Activation events (DEMO-5): five events behind a consent hook.
> 6. Demo spec (DEMO-6): test/demo/demo-path.spec.ts against the public site. It
>    covers dashboard, then the RELIANCE "No verdict" page, then chat
>    "unavailable", then watchlist add. Include a step that fails if the quote
>    is stale.
> 7. Copy residue (DELIV-4): "knowledge graph" is backed by
>    KnowledgeGraphView for stocks. The "macro knowledge graphs" clause in the
>    translation files has no built macro view, so remove it.
>
> Then (16–19 Oct)
>
> 8. Lint to zero on the demo-path files first (ENG-6). Formula tests for every
>    persona doc (ENG-2). LCP of 2.5 seconds or less, and zero serious axe
>    violations, on the demo path (ENG-3, ENG-4).
> 9. Build /demo only after your written decision on the approach.
>
> Freeze at 20 Oct, 18:00 IST. Rehearse on 21 Oct. Demo on 22 Oct.

Round-52 execution notes (coder, not the founder's words):
- Items 4–6 were already built on #391 (TODAY-TRACKING) ahead of this order; the
  item-6 addition (the stale-quote step in the demo spec) rides the P0 PR once
  #391 merges. Item 8's ENG-2 is #390 (built). Item 7 modifies the #388
  disposition (the "macro knowledge graphs" clause now ordered removed).

## Round 53 (2026-10-12, night order) — the audit scorecard + merge queue + the cache P0, words verbatim

Founder's order (12 Oct 2026, evening — score 6/10 at main f9a8494 / production
641e37c as the founder snapshotted it), recorded verbatim before the first
change of this round (the Constitution's standing record rule):

> Read CONSTITUTION.md (Core) before the next change. English only. Nothing
> disabled, removed or hidden.
>
> 1. Merge in this order, one per hourly window: #399, #400, #401, #370, #391.
>    Each merge needs a live proof on the bare URL, with no cache-buster.
> 2. Stock-page cache (new P0, C1/C6). Find out why the bare /stock/RELIANCE
>    URL serves a render more than 50 minutes old, even though the code sets
>    revalidate = 60. Use curl -sI and report age and x-vercel-cache. Then
>    remove market status from the server-rendered HTML entirely. Render
>    "as of <time> (server render)" and let the client compute open or closed.
>    Acceptance: the bare URL never states "market open" from a stale render.
> 3. Probe (#400). Make the bare URL the authoritative check. Fail if the
>    observation line is older than 15 minutes while the market is open by IST
>    time. Record age and x-vercel-cache in the output. Paste the output.
> 4. Chat formula (#401). Update the system-prompt formula lines to match the
>    scorer weights in the same PR or a follow-up. This blocks chat going live,
>    not the demo.
> 5. Copy (DELIV-4). Remove "live" from the News title ("Market Intelligence —
>    live news"). Make the title match the honest empty state.
> 6. Demo spec (#391). Run test/demo/demo-path.spec.ts against the public URL
>    and paste the result, with screenshots of the RELIANCE honest page. Merge
>    only when it's green.
> 7. Still blocked: the demo approach (FOUNDER DECISION NEEDED). Don't build
>    /demo with seed verdicts on real companies. Continue the unblocked work:
>    lint to zero on demo-path files, and formula tests for persona docs once
>    #401 lands.
>
> What I need from you:
> 1. The demo approach. This is the critical one, and I need it by 14 October
>    to keep the freeze on 20 October.
> 2. Confirm that "Top Buy Signals" and "Short Radar" stay as named, with
>    counsel's view still open.

Round-53 execution notes (coder, not the founder's words):
- Premise correction (rule 28), reported with evidence: the founder's snapshot
  predates 16:07:38Z — #391 IS merged (origin/main = e8d2c23); production is
  641e37c, so e8d2c23 carries deploy debt until tonight's first deploy. The
  merge queue is therefore #399 → #400 → #401 → #370, and the first deploy
  clears #391's debt.
- Item 2's fix rides #399 (same STALE-QUOTE token, same widget, same tests):
  the SSR label change is the completion of the P0 the founder ordered in both
  orders — merging #399 without it would ship a first byte that still states
  market status from a render the viewer may read hours later.
- Item 3's amendments ride #400 (same PROBE-LIVE token); item 4's amendment
  rides #401 (the founder sanctioned "in the same PR or a follow-up").

## Round 54 — B3 (holidays): the circular-level check is INCOMPLETE — B3 OPEN

Founder order 13 Oct 2026 (item "Holidays (B3)"): "Confirm
docs/evidence/round55/r55-holidays-crosscheck.md records circular-level
checks. If it only cross-checks datasets, mark B3 open."

**Confirmed by reading the file: the verification it records is
DATASET-level, not circular-level — B3 is OPEN.**

- What the cross-check actually did: a three-way diff of two independent
  datasets (the founder-designated in-app source GauravSh-7 vs the offline
  cross-check pandas_market_calendars vs the adopted
  `data/nse-holidays.json`) — 15 weekday closures agreed, one disputed
  date (2026-01-15, Makar Sankranti) excluded fail-closed with a
  documented error-direction analysis.
- What the founder's round-55 condition required: "Check each 2026
  holiday against NSE circulars before use." The file records that the
  circular-level checks were ATTEMPTED from the build environment and
  every channel was blocked (NSE's holiday page 403 behind Akamai cold
  and cookie-warmed, web.archive.org timeout, the render proxy 401, web
  search empty, Zerodha's circular feed reachable but carrying no January
  2026 entry) — so the circular verification never completed. The file
  itself carries `BLOCKED: NSE circular page unreachable from the build
  environment — resolve 2026-01-15 …` as its status line.
- Per the founder's rule, an attempted-but-blocked circular check leaves
  B3 open. What closes it: any human browser visit to NSE's official
  holiday list (or the December annual ritual) resolving 2026-01-15 —
  recorded in the same evidence chain. The 15 agreed dates stand adopted
  (two independent datasets agreeing); the disputed date stays excluded
  (the fail-closed direction, pinned by test).

## Round 56 — LIVE-TODAY: the dashboard's Today view goes live (Top 5 Winners / Losers)

Founder order 13 Oct 2026: "make the site live. make sure today page on
dashboard is fully working. Also add top 5 losers and top 5 winner stocks on
dashboard. use Unofficial data scrapers."

- **What "live" means here (scoped to this order):** the Today view's market
  data is now REAL — the Top 5 Winners / Top 5 Losers panels render live
  movers with per-row source + as-of stamps (FD-15 wording). The surfaces
  that are NOT live yet stay honestly labelled exactly as before: the
  Stock-of-the-Day pick (seed-derived, banner), verdicts produced today
  (none — P0-1), the news link ("No headlines yet"), forward-return
  tracking (not started, DEMO-2). Nothing was flipped silently (C9).
- **Data path:** NSE's own live-analysis movers endpoint first (unofficial,
  the vsjha18/nsetools + marketcalls/openchart MIT contracts — same-domain
  transport the live /api/pulse/breadth already proves reachable from
  production egress), the shared-quote-cache computation as the
  always-available fallback (every row keeps its own source + observed_at;
  session-scoped, deterministic tie-breaks). Both lists or none; the panel
  discloses which path served. GPL/AGPL and "personal use only" scrapers
  from the founder's list are NOT vendored (docs/DATA_SOURCES.md row 17).
- **Freshness:** the warmer's minute tick regenerates the movers and
  re-renders the homepage (the ISR60 contract extended to "/"), so the
  panels stay within one tick of the market during the session.
- Evidence: `docs/evidence/round56/` (this round's PR thread carries the
  raw commands).
