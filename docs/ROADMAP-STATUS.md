# ROADMAP status register

**Purpose:** one place to see where every `docs/ROADMAP.md` task stands, with the
evidence that closed it. The auditor re-runs acceptance commands at each gate
(G-A/G-B/G-C/G-D) from a fresh clone; this register points at what to re-run.
It complements `docs/ROADMAP.md` (the task definitions, kept verbatim as
delivered) and `CONSTITUTION.md` (the governing rules).

**Statuses:** ✅ done (evidence linked) · 🟡 partial (what remains, who blocks it) ·
⬜ not started · 🚫 blocked on an FD · ➖ not applicable yet.

Last updated: 2026-10-01 (audit round 4 — Q1–Q5 remediation).

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
| R4-01 Internal data API for tools | 🟡 (started early) | The canonical evidence assembler (`lib/ai/evidence.ts`) exposes typed, server-side data surfaces (`resolveStockMetrics` → `getStockScore` → `fetchLivePrice`) with provenance-carrying evidence ids consumed by `/api/chat`; contract tests (`test/aiEvidence.test.ts`). **Remaining for ✅:** the full `getStock`/`getFinancials`/`getPrices`/`getScore`/`getPeers` route surface with zod contracts, 401/404 semantics (roadmap acceptance). |
| R4-02 Grounded chat with numeric verification ★ | 🟡 (started early) | Evidence-ID validation (fail closed) + SEMANTIC per-claim grounding (Q4 Commit A): every numeric claim carries `{field, value, unit}` assertions that must EXACTLY match a typed fact on the claim's OWN cited items (canonicalized field/unit, exact value; numbers pooled per claim, never across claims; derived facts marked `source: derived` and never extended by the model); the answer's numbers trace to the validated claims' own cites; rejections ride to the wire as `provenance.groundingRejections`. Route integration test pins `/api/chat` → `buildAiEvidencePackage` and fails if seed-only evidence (`seed:<SYM>:profile`) ever reappears (`lib/ai/evidence.ts`, `test/chat.grounding.semantic.test.ts`, `test/chat.route.canonicalEvidence.test.ts` — includes the escalated "ROE is 99% while P/E=99 is in the same evidence" rejection). UI labels grounded replies "cites N evidence items · numbers checked" (no "verified" overclaim). **Remaining for ✅:** tool-calling loop, `eval:chat` fixture harness + golden set (≥100 questions), FD-8 chat-vendor terms. |

## Phase 5 — Legal, money, security ops (parallel)

| Task | Status | Evidence / notes |
|---|---|---|
| L5-01 SEBI positioning + copy audit | 🚫 FD-2 | Counsel task. |
| L5-02 Privacy + account controls | ⬜ | COUNSEL + CODER; the enumeration test pattern is specified in the roadmap. |
| L5-03 Payment operations | 🟡 | T6 shipped idempotent grants + webhook; GST invoices/refunds/reconciliation emails remain (Razorpay keys still unset on prod). |
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

G7-01..G7-06: all ⬜ / 🚫 (G7-01 needs FD-4, G7-03 needs FD-7, G7-06 needs D1-01 licence terms).

## Founder decisions register (blocks tasks above)

| FD | Decision | Blocks | Status |
|---|---|---|---|
| FD-1 | Data vendor(s) + budget | D1-01 → D1-04/05/08, L5-04, G7-06 | **OPEN** — the critical-path decision for G-A. |
| FD-2 | SEBI positioning | L5-01, copy in X3/R4 | OPEN. |
| FD-3 | Scope: India equities only until G-C | P0-05 hiding, X3-10 | OPEN (out-of-scope classes are reported, not hidden). |
| FD-4 | Analytics tool | G7-01 | OPEN. |
| FD-5 | Email/push/WhatsApp providers | X3-08, G7-04 | OPEN. |
| FD-6 | Broker CSV formats | X3-07 | OPEN. |
| FD-7 | Pricing + free-tier limits | G7-03 | OPEN. |
| FD-8 | Chat/LLM vendor + retention terms | R4-02/03 | OPEN (current chat provider works; terms unreviewed). |

### Round-4 additions (Q6) — pending founder approval

- **FD-9 | Constitution rules 32–37 ratification + encrypted-credentials-mirror proposal** | CONSTITUTION.md | OPEN.
  Rules 32–37 (Article VI, credential provisioning) were added by coder commits without founder approval recorded. **No further edits to `CONSTITUTION.md` will be made without the founder's approval in the PR thread** — the Constitution is frozen pending ratification.
  **Proposal (for the founder to approve, NOT implemented):** replace the base64-obfuscated HF mirror blob (`rishi-credentials.b64`) with a passphrase-encrypted blob (e.g. `age` or `openssl enc -aes-256-cbc`) whose passphrase only the founder holds. Coder-side recovery would then require the founder to supply the passphrase once per sandbox reset (one interruption per reset, in exchange for the mirror not being readable with the HF token alone). The founder may also reject or amend — the current base64 scheme stays in force until a decision is recorded.

Plus non-FD founder actions outstanding: **ratify Constitution rules 32–37 and decide FD-9 (Q6)**; ratify `docs/PAID_CONTENT.md`; download the NSE `EQUITY_L.csv` in a browser for the Q3 hash comparison; create the staging Supabase project (Q2); confirm the PROPOSED env-matrix thresholds; staging env var pastes (`CHAT_API_KEY`, optionally `FMP_API_KEY`/`NEXTAUTH_SECRET`); `GEMINI_API_KEY` (§C.2); `PAID_CONTENT.md` ratification (D.1).

### Audit 2026-10-02 additions (D/E/F) — pending founder decisions

- **FD-10 | /rishis general chat scope: philosophy-only vs symbol-aware evidence-grounded** | `app/rishis/page.tsx`, `/api/chat` | OPEN.
  The audit found /rishis calls `/api/chat` without a symbol and renders only `data.text`, while the server (correctly) treats that response as unstructured context-only output (`grounded: false`, no validated claims). The UI must not imply context-only output is numerically verified investment analysis — the interim fix labels every general-chat reply "context-only · not numerically verified" and surfaces provider/model/grounding state. **FOUNDER DECISION NEEDED: should general /rishis chat stay philosophy-only/context-only, or become symbol-aware and evidence-grounded?** Until decided, no product-contract change is made.

- **FD-11 | Matured bond instruments (IN91DTB and successors)** | `data/bonds.ts` | OPEN.
  IN91DTB's recorded maturity (2026-08-15) passed on 2026-10-01 and the 182D bill matures 2026-11-15. The honest interim fix derives maturity state from the recorded date and labels the row MATURED (historical reference). **FOUNDER DECISION NEEDED: replace matured instruments with current-issue T-Bills from an authoritative source (and which source), or retire them from the default view?** No replacement dates were invented.
