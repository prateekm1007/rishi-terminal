# Architecture Inventory — Coder Directions §1 gate (2026-10-07)

> **CURRENT-STATE ADDENDUM (2026-10-08, `origin/main` = `345134c`).** This
> file was written against `3ef7237` (merge of #231) and is preserved as the
> pre-roadmap audit artifact. What changed since it was written:
> - §3 "Missing" item 1 (temporal memory) **now exists**: migration 030 +
>   `lib/intelligence/stateLog.ts` (PR #253), production ingestion proven
>   (`docs/evidence/round27/pa2-production-ingestion-proof.md`) — roadmap
>   item **A2 CLOSED**.
> - The `RishiInsight` contract **now exists**: `lib/intelligence/types.ts`
>   (PR #247, 28 fail-first tests) — roadmap item **A1** (contract
>   complete; consumers arrive at A8+).
> - §3 "Missing" item 2 (event model + materiality) is **built on a branch**
>   (`feat/pa3-event-model`, not merged) and is being re-partitioned into
>   the roadmap's one-PR-per-item shape (INT-A3 events, INT-A4
>   materiality — `lib/intelligence/materiality.ts` as §4 originally
>   designed).
> - §3 "Missing" items 3–5 (insight cache, /api/intelligence, per-symbol
>   news) remain missing — A7, A10, B1 respectively.
> - G-program state: G7 Driver-1 and Driver-2 closed with production
>   verdicts (#249, #257/#258, #260: gate MET −29.4%, first-pass grounding
>   improved); #256 advice-guard production proof filed (round27); E4/NS1
>   scheduled-run closures pending their pre-registered runs.
> - **Sequencing authority moved**: `docs/INTELLIGENCE_ROADMAP.md` is now
>   the master roadmap (founder-ratified 2026-10-08); its §4 fit map below
>   remains accurate as MODULE design, but its ordering is superseded by
>   the roadmap's frozen phase sequence.

Written against `origin/main` = `3ef7237` (merge of #231). Mandate: the
founder's Coder Directions (2026-10-07, 57 sections) §1 — produce an
architecture inventory showing where each new intelligence capability fits
**before** any feature implementation. This file is that artifact; it is a
planning document, not evidence. Companion to `docs/AI_LOOP.md` (which
documents the chat loop itself in full).

Verification basis: `lib/ai/router.ts`, `lib/ai/tools.ts`,
`lib/ai/evidence.ts`, `lib/ai/financialIntent.ts`, `app/api/chat/route.ts`,
`lib/chat/globalSpend.ts`, `lib/modelStatus.ts`,
`lib/shortRadarValidation.ts`, `app/page.tsx`, `app/stocks/page.tsx`,
`app/chat/page.tsx`, `app/news/page.tsx` (head), `app/commodities/page.tsx`
(head), plus the round-22 session reads (lib/quotePath.ts, lib/quoteCache.ts,
lib/registry/yahooAliases.json, app/api/prices/batch/route.ts,
hooks/useLivePrices.ts, app/api/ingest/quotes-warm/route.ts,
lib/health/probe.ts). Anything not personally re-read this session is marked
*(prior-session read)* or *(unverified here)*.

---

## 1. The ONE AI architecture (verified, unchanged)

The absolute chain is already embodied end-to-end:

```
canonical data                (seed registry + live fundamentals + quote_cache price path)
  ↓
deterministic transformation  (resolveStockMetrics/getStockScore — one scoring engine;
  ↓                            CanonicalStockState = ONE memoized observation per request)
bounded AI reasoning          (lib/ai/router.ts: generateEvidenceGroundedAnswer —
  ↓                            ≤2 provider candidates, ≤4 tool iterations, ≤1 repair)
server tool execution         (lib/ai/tools.ts: closed allowlist getStock/getFinancials/
  ↓                            getPrices/getScore/getPeers; STRICT zod; registry-checked;
                               explicit failure states — no plausible fallbacks)
validation/grounding          (validateGrounding — deterministic ids, per-claim assertions,
  ↓                            closed-vocabulary source states, anti-provenance-upgrade)
provenance-aware UI           (provider · model · grounding mode · verified surface +
                               labelled unverified commentary; modelStatus wording authority)
```

Hard bounds already in code (verified): `MAX_TOOL_ITERATIONS = 4`,
`MAX_PROVIDER_CANDIDATES = 2`, 20 s provider timeout, 64 000-char serialized
input bound, 2 048-token output cap, global daily reservation caps
(2 000 requests / 2 000 000 tokens, `lib/chat/globalSpend.ts`), per-identity
150/day + per-IP 12/60 s burst (`app/api/chat/route.ts`). Latency attribution
exists (§11 `LoopTimings`: per-completion stage, tool executions, validation
ms, repair causes — R9 taxonomy), so the G7 latency work has its instrument
already.

**Rule for every new capability (Coder Directions §0/§43):** extend THIS
stack; never add a second router, tool registry, evidence system, provenance
format, or feature-specific LLM path. `npm run aiLoopAudit` enforces the
single entry point.

## 2. Surface-by-surface chain inventory

Format: §1's required diagram, filled with what exists today.

### `/` Dashboard
```
app/page.tsx (server, ISR 60 s, build fetches nothing)
  → rankTopBuy/computeShortRadar/pickStockOfTheDay (deterministic, RANKINGS_ENABLED
    fail-closed flag — FD-22) + resolveStockMetrics/getQvps commentary
  → initialPriceSnapshot (lib/dashboardSnapshot → shared quote_cache; never a vendor fetch)
  → DashboardClient (RSC props) → hooks/useLivePrices revalidation
  → POST /api/prices/batch (50-symbol chunks, sequential) → serveQuote/quote_cache
  → provenance labels per value (observation time, honest unavailable states)
```
AI today: none on this surface. Fit: Today's Rishi Brief + What Changed
(§4) slot directly under Market Overview as server-computed intelligence fed
by the deterministic state layer (new `lib/intelligence/marketBrief.ts`),
rendered through the new primitive set (§3).

### `/stocks` (canonical; `/screener` 308s here)
```
app/stocks/page.tsx (server) → getSlimIndex (slim free-fields projection, R16 C5)
  → toScreenerRows (lib/transport/slimWire) → ScreenerClient (flat fields only)
  → on-demand custom queries: POST /api/screener/query (JSON superset)
```
AI today: none. Fit: natural-language screening (§7) parses intent into
**deterministic filters over the slim index** (never an LLM-chosen list);
AI Stock Intelligence signals (§5) annotate rows via a compact badge that
opens the intelligence drawer; AI Stock Dossier (§6) sits on
`/stock/[symbol]`.

### `/chat` + `/rishis` (Chat with Rishis)
```
app/chat/page.tsx (server, slim picker) → ChatClient → POST /api/chat
  → server-built persona system prompt (canonical registry; client prompt rejected)
  → symbol validated through the ONE registry gate (equities + full price registry)
  → buildAiEvidencePackage / no-evidence path with financialIntent backstop
  → router bounded loop (tools → structured claims → grounding → ≤1 repair)
  → ChatWire: verified surface + provenance + labelled unverified commentary
  → quotas: per-identity 150/day (chat_usage, RLS), per-IP burst, global spend caps
```
AI today: the full loop (above). Fit: Rishi Council (§17) = same evidence
packet, persona-specific reasoning constraints, agreement/disagreement
extraction — a new bounded orchestration INSIDE `lib/ai` reusing the same
tools/evidence/grounding, not parallel persona calls. Philosophy mode (G7)
extends the no-evidence contract without bypassing grounding for factual
claims.

### Market surfaces (`/commodities`, `/crypto`, `/forex`, `/bonds`, `/pulse`)
```
page (server/client mix) → useLivePrices → /api/prices/batch → serveQuote/quote_cache
  → G4 provenance chips (LIVE n/6, LAST OBSERVED MARKET DATA, dated unavailable)
```
AI today: none. Fit: cross-asset divergence statements in the Dashboard
Brief consume the same quote_cache state; no new data path.

### `/news`
```
app/news/page.tsx (CLIENT component — the one heavy client surface)
  → data/news static feed + lib/newsApi fetchAllNews (market-level RSS)
  → useLivePrices ticker hydration
```
AI today: none; the evidence package carries an explicit news-unavailable
note (per-symbol news wiring is documented as pending in
`lib/ai/evidence.ts`). Fit: News Intelligence (§9) has a **prerequisite
gap** — per-symbol news wiring (`news:<stable-id>` items) must land before
event clustering/entity linking can be grounded. Sequence it inside Phase B,
not before.

### `/lab` (Portfolio Lab) + `/stock/[symbol]`
*(prior-session read; component internals not re-verified this session)*
Portfolio state is DB-backed with RLS (rule 13). Fit: Portfolio Doctor (§13),
Why Did My Portfolio Move (§14), Stress Lab (§16) are deterministic-first
computations over holdings + quote_cache, with one bounded synthesis call
each; Since-Last-Visit (§15) needs the persistence gap below.

## 3. Canonical data/state inventory (what new modules may consume)

| Asset | Role | Consumers allowed |
|---|---|---|
| `data/stocks` registry + `lib/registry/validateInput` | THE security master | everything (never re-enumerate) |
| `lib/scoring` (resolveStockMetrics/getStockScore, rishi-merit-v1) | THE scoring engine | evidence builder, tools, surfaces |
| `lib/livePrice` + `lib/quoteCache` + `serveQuote` | THE price observation path | tools, batch API, SSR snapshots |
| `lib/liveFundamentals` (NSE/Yahoo; Screener.in removed by G4) | fundamentals overlay | resolver, tools |
| `lib/ai/evidence.ts` builders | THE evidence id/fact contract | any new intelligence module |
| `lib/modelStatus.ts` | THE model-status wording authority | every model-driven signal (§33) |
| Supabase: quote_cache, chat_usage, portfolios, challenges, rate limits | persistent state | server routes with RLS |
| pg_cron `quotes-warm` (G3 pending approval) | in-session freshness | no app dependency beyond quote_cache |

**Missing (must be built in Phase A, honestly named):**
1. **Temporal memory (§28)** — no observation-timeline persistence exists
   today (quote_cache holds current observations only). ChangeSince,
   Watchtower, Truth Tracker, Since-Last-Visit all need a deterministic
   state-snapshot store (new tables via the ONE migrations folder).
2. **Event model + materiality engine (§34/§36)** — does not exist; the
   deterministic detectors (price/volume anomaly, fundamental change) must
   be pure functions over persisted state, not LLM judgments.
3. **Insight cache (§29/§30)** — event-driven generation with a change key
   needs a generated-insight store + reuse accounting; precomputed insights
   render sub-second, generation is async/event-triggered.
4. **Intelligence API surface (§44/§45)** — one `/api/intelligence` route
   with a constrained capability enum; server-authoritative for evidence,
   status, provenance, entitlement (ALL FREE — no tier gates, §44), rate
   limits. **Token spend must extend the globalSpend reservation machinery**
   (rule 12: anything that spends quota needs persistent atomic bounding —
   today globalSpend is chat-keyed; the capability enum needs its own
   reservation key or a shared ceiling).
5. **Per-symbol news wiring** — prerequisite for News Intelligence (gap
   documented in evidence.ts today).

## 4. Phase A fit map (Coder Directions §51 — foundation before features)

| New module | Consumes | Produces | UI primitive |
|---|---|---|---|
| `lib/intelligence/types.ts` | evidence item schema | `RishiInsight` canonical object (§2) | — |
| `lib/intelligence/events.ts` | persisted state snapshots | typed events (entity/timestamp/oldState/newState/evidence) | — |
| `lib/intelligence/materiality.ts` | events | deterministic pass/filter (§36) | — |
| `lib/intelligence/thesis.ts` | events + evidence | thesis state (supports/weakens/conflicts/invalidators, §35) | — |
| `lib/intelligence/changeSince.ts` | previous vs current state | deterministic deltas (§15) | `ChangeSince.tsx` |
| `lib/intelligence/marketBrief.ts` | quote_cache + events + materiality | 3–5 ranked developments (§4) | `RishiInsight.tsx` |
| synthesis call | material events | ONE bounded router call per insight (§30) | `EvidenceDrawer.tsx`, `UncertaintyPanel.tsx`, `ContradictionPanel.tsx`, `AskRishi.tsx` |

Every module: fail-first tests (§46) — deterministic layer (same evidence →
same state), AI contract (schema-valid, required fields), grounding (bad
claim rejected), unknown → UNKNOWN, contradiction surfaced, stale labelled,
provenance complete, latency measured (cold/warm/hit/miss/no-op/material).
Adversarial battery (§47) and the synthetic world (§48) with quantitative
thresholds fixed BEFORE tuning (§49).

## 5. Constraints carried into implementation

- **G1–G8 stay open as the acceptance program** (§52): G1 closed;
  G2 merged (#231); G3 merged-as-draft, apply gated on `APPROVED: pg_cron`;
  G4 live (positive controls passed 2026-10-07); G5/G6/G7/G8 open.
- No new paid tier, no new spend, no Vercel migration, no HF production
  cutover (G8 guardrails). All intelligence features free (§44).
- Authenticated chat P50 ≤ 8 s target unchanged (G7); event-driven
  generation is the structural protection for it (§29).
- No sidebar additions (§25); deepen existing routes only (§38: AI
  annotates existing UI, never replaces it).
- Delivery per §57: scope frozen → baseline → fail-first → implement →
  regression → CI → deploy → exact SHA → real production request → UI/
  provenance/latency verification → closeout. One item, one PR (C7); no
  manual SQL (founder rule); every gate bites (C5/rule 24).
