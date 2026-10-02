# ROADMAP status register

**Purpose:** one place to see where every `docs/ROADMAP.md` task stands, with the
evidence that closed it. The auditor re-runs acceptance commands at each gate
(G-A/G-B/G-C/G-D) from a fresh clone; this register points at what to re-run.
It complements `docs/ROADMAP.md` (the task definitions, kept verbatim as
delivered) and `CONSTITUTION.md` (the governing rules).

**Statuses:** ✅ done (evidence linked) · 🟡 partial (what remains, who blocks it) ·
⬜ not started · 🚫 blocked on an FD · ➖ not applicable yet.

Last updated: 2026-10-02 (Commit M — founder decision: ALL FEATURES FREE, no tiers; pricing/payment surface retired; FD-7 resolved. Prior: Commit L — AI tool loop, grounding/provenance closure, eval harness; FD-9..FD-18 reconciled).

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
| D1-01 Vendor and licence decision | 🚫 FD-1 | Founder task. Blocks D1-04/D1-05 (and D1-08's secondary source). |
| D1-02 ISIN-keyed security master ★ | 🟡 (was ✅ — round 4 found binding defects) | **Q3:** direct symbol matches trusted symbol equality; the auditor found 5 wrong-company bindings and 12 renames; the implemented gate found 4 more wrong bindings (KALYANI, SUNDARAM, SUVEN, VSTL). Remediation (PR #28, applied live): name-agreement gate (`lib/db/nameAgreement.ts`), migration 014 (`NAME_MISMATCH`), `name_overrides.json` with 55 sourced decisions, 8 seed records removed (944→936), 4 seed names updated, CI `D1-02.7` + validator V5–V7; validator V1–V7 all PASS against live. Stays 🟡 until the auditor re-verifies. |
| D1-03 Corporate actions + adjusted prices | ⬜ | Depends D1-02 (remediation in review, 🟡) — but real action *data* needs the vendor (D1-01). Schema+adjustment math can start. |
| D1-04 Price ingestion (EOD) ★ | 🚫 FD-1 | Vendor adapter. |
| D1-05 Fundamentals ingestion, PIT ★ | 🚫 FD-1 (schema can start) | `fundamentals_pit` schema is vendor-independent. |
| D1-06 Shareholding ingestion | ⬜ | Depends D1-05. |
| D1-07 Validation rules + quarantine | ⬜ | Rules engine is vendor-independent; can start against D1-05's schema. |
| D1-08 Reconciliation vs second source | ⬜ | Needs D1-04+D1-05 data. |
| D1-09 Universe: Nifty 500 done properly ★ | ⬜ | Depends D1-02 (🟡, remediation in review) + D1-04/05/07/08. |
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
| E6-01 Lighthouse CI budgets | ⬜ | |
| E6-02 Bundle budgets | ✅ (ratchet half) | `scripts/bundleBudget.ts` wired into CI + ratchet; gate bite-proven (scratch PR #18, CI run 36801733290). The PROPOSED 200 kB budgets are still exceeded (274/273/310 kB) — tracked, needs founder confirmation of the number. |
| E6-03 RSC + streaming /screener /lab | 🟡 | N1 moved pages to RSC with slim indexes; streaming + the `<tr` -in-initial-HTML acceptance remain. |
| E6-04 ISR for stock pages | 🟡 | Stock pages are SSG (`generateStaticParams`); on-demand revalidation on ingestion remains. |
| E6-05 Observability | ⬜ | |
| E6-06 SLOs + dashboards | ⬜ | |
| E6-07 Blocking e2e, contract tests, drills | 🟡 | Playwright smoke is blocking (since round 2); contract tests + upstream-failure drills remain. |
| E6-08 Accessibility (WCAG 2.2 AA) | ⬜ | |
| E6-09 Flags, migrations in CI, rollback drill | 🟡 | Migrations 001–014 run in CI (PG16 job, since N2; populates + validates the security master; Q1/Q3 invariants live). Feature flags + documented rollback drill remain. |
| E6-10 Type safety everywhere | 🟡 | `no-explicit-any` is ERROR in `hooks/**` + `scripts/**` (N9); repo-wide promotion remains (318 warnings baseline). |
| E6-11 Load + abuse testing | ⬜ | |

## Phase 7 — Growth (only after G-A and G-B)

G7-01..G7-06: all ⬜ / 🚫 (G7-01 needs FD-4, G7-06 needs D1-01 licence terms). **G7-03 (pricing experiments): ➖ NOT APPLICABLE — superseded by the FD-7 resolution (all features free, 2026-10-02). There are no plans to experiment with; any future paid surface would require a NEW founder decision.**

## Founder decisions register (blocks tasks above)

| FD | Decision | Blocks | Status |
|---|---|---|---|
| FD-1 | Data vendor(s) + budget | D1-01 → D1-04/05/08, L5-04, G7-06 | **OPEN** — the critical-path decision for G-A. |
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
| FD-9 | Constitution rules 32–37 ratification + encrypted-credentials-mirror proposal (detail below) | Article VI governance | OPEN (Constitution frozen pending ratification). |
| FD-10 | `/rishis` general chat scope: philosophy-only vs symbol-aware evidence-grounded (detail below) | `app/rishis` product contract | OPEN. |
| FD-11 | Matured bond instruments (IN91DTB and successors) (detail below) | `data/bonds.ts` | OPEN. |
| FD-12 | Non-equity heuristic-reference scores: promote to official scores or keep labelled heuristic reference | crypto/forex/commodity/bond score surfaces | OPEN (they remain explicitly labelled heuristic reference; do not silently redesign). |
| FD-13 | Seed-dataset residual placeholders (~416 boilerplate clones, ~422 mktcap artifacts) — impossibility gate + seed banner is interim | D1 live-fundamentals project | OPEN (real fix is D1, not more placeholder edits). |
| FD-14 | `/terms` + `/privacy` minimal honest drafts — counsel review of the free-product wording; refund wording sign-off | legal copy | OPEN (the "before paid tiers scale" trigger is moot — there are no paid tiers; the drafts were updated for the free product in Commit M and still need counsel review). |
| FD-15 | Non-equity asset classes in main nav (keep for traffic vs demote for focus) | nav/product scope | OPEN. |
| FD-16 | Banks scored with non-bank metrics — NIM/GNPA/CRAR modelling needs a data-source decision | bank scoring surfaces | OPEN. |
| FD-17 | Soft-404 on unknown stock symbols (HTTP 200 + not-found UI) — fix vs leave | SEO hygiene | OPEN. |
| FD-18 | `data/security-master/populate.sql` mirrors the pre-round-5 symbol list — regeneration owned by the D1 pipeline | D1-04/D1-05 (must not resurrect removed symbols) | OPEN (flagged). |

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
