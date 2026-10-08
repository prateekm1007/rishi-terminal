# INTELLIGENCE ROADMAP — the entropy-locked master sequence (2026-10-08)

Founder-ratified 2026-10-08 (round-27 session). This file records the
**master execution architecture** for Rishi Terminal's intelligence program
and classifies the repository against it. It is the second of the three
sources of truth:

```
CONSTITUTION.md   = engineering law        (how work is allowed to happen)
THIS FILE         = intended architecture  (what gets built, in what order)
main              = actual implementation  (what exists)
```

Nothing else becomes a competing source of truth. `docs/ROADMAP.md` (the
round-1–round-2 remediation program) is COMPLETE history, not a competing
sequence; `docs/INTELLIGENCE_INVENTORY.md` is the pre-roadmap audit artifact
(this file supersedes its §4 fit map as the sequencing authority).

## 1. The frozen phase sequence

The phase IDs are immutable; the sequence is not casually reordered.

```
PHASE 0  — close remaining acceptance obligations of the current program
    ↓
PHASE A  — the shared intelligence substrate
  A1  RishiInsight (the canonical insight contract)
  A2  Temporal Memory (observation-state log)
  A3  Events (deterministic event projection)
  A4  Materiality (deterministic materiality engine)
  A5  Thesis (supports/weakens/conflicts/invalidators state)
  A6  ChangeSince (deterministic deltas)
  A7  Insight Cache / deterministic change key
  A8  Evidence / Uncertainty / Contradiction UI (shared primitives)
  A9  Ask Rishi (contextual continuation → existing /api/chat)
  A10 /api/intelligence (the one intelligence API surface)
    ↓
PHASE B  — B1 Per-symbol News Evidence
    ↓
PHASE C  — Dashboard Brief
    ↓
PHASE D  — Screening · Stock Intelligence · Stock Dossier
    ↓
PHASE E  — Watchtower · Since Last Visit
    ↓
PHASE F  — Earnings Copilot · Management Truth Tracker · Corporate Action
    ↓
PHASE G  — News Intelligence
    ↓
PHASE H  — Portfolio Doctor · Portfolio Movers · Stress Lab
    ↓
PHASE I  — Sector Intelligence · Ownership Detective
    ↓
PHASE J  — Research Room · Rishi Council
    ↓
PHASE K  — Short Radar Thesis
    ↓
PHASE L  — Technical Interpreter
```

## 2. The frozen canonical architecture (every intelligence feature enters this exact shape)

```
canonical observation → canonical state → temporal state history
  → deterministic event projection → deterministic materiality
  → deterministic change key → persistent insight cache
  → ONE canonical bounded AI loop → RishiInsight
  → grounding → contradiction / uncertainty → provenance
  → /api/intelligence → existing product surface
  → Ask Rishi → existing /api/chat
```

No feature may create its own version of a primitive: one history, one
event model, one materiality engine, one cache, one insight contract, one
AI router, one evidence model, one provenance model, one spend-control
architecture, one intelligence API, one contextual chat path.

## 3. Classification of the repository (as of `origin/main` = `345134c`, 2026-10-08)

**Rule (founder, 2026-10-08): existing code is classified against the
roadmap BEFORE anything is rebuilt. A phase is not complete because files
exist; a phase is not re-done because the roadmap names it. Audit against
the exit gate, repair only what is missing, advance.**

| Item | Repo state (verified this session) | Treatment |
|---|---|---|
| Phase 0 | **CLOSED 2026-10-08** — G7 Driver-1/2 closed (#249, #257+#258, #260 verdict: gate MET −29.4%, mechanism verified); #256 behavioral proof CLOSED (round27 evidence; defect found → #262 root fix + live verification); E4 CLOSED (#265: both batteries 822/896 ≥ 807, 27/27 scheduled runs, zero manual dispatch); NS1 CLOSED (first real scheduled run 2026-10-08: 896/896 rows in 5.012 s, exactly one `ingestion_log` record, delivery-deviation + runbook health-clause error recorded — `docs/evidence/round26/ns1-production-proof.md`); PA2 production ingestion proof CLOSED (26,593 real transitions, idempotent, chained, RLS deny-all) | **Advance to Phase A substrate (A3 next)** |
| A1 RishiInsight | Merged #247 (`e88dd14`): `lib/intelligence/types.ts` — zod-validated, closed vocabularies (5 status / 3 confidence / 3 materiality / 5 model roles / 20-feature registry), honesty couplings, 28 fail-first tests | **Existing — audit/close. Contract complete (code+tests+CI+merged+deployed). Runtime consumers arrive at A8+ by design; no rebuild** |
| A2 Temporal Memory | Merged #253: migration 030 + `lib/intelligence/stateLog.ts` + quote-cache hook. Production ingestion PROVEN live (round27 evidence) | **Existing — CLOSED** (ingestion proof filed; reader consumers are A6+) |
| A3 Events | **CLOSED 2026-10-08** — merged #263 (`6c61d4ae`, deployed, exact production SHA verified). Strict-audited per round-28 directions 5–7: one hard gap found (seed source-state projected instead of refused) and root-fixed IN the PR (RED→GREEN); entropy guard strengthened to the exact 13-key closed set; byte-stability pinned. Closeout: `docs/evidence/round28/int-a3-closeout.md` | **Done — consumers arrive at A4+** |
| A4 Materiality | BLOCKED on the founder's threshold confirmation (see standing blocked items). Architecture decided: `A3 event → deterministic threshold engine → material/non-material`; location `lib/intelligence/materiality.ts` + `docs/intelligence/materiality.md` + fail-first tests incl. the economic invariant (non-material → zero AI spend). Two competing pre-registrations exist (directive-10 statistical rules vs the PA3 branch's static v1) — the coder does not choose | **FOUNDER DECISION NEEDED before the task starts** |
| A5 Thesis | Does not exist | Depends on A3/A4 |
| A6 ChangeSince | Does not exist | Depends on A2/A3 |
| A7 Insight cache / change key | Does not exist | Depends on A3/A4 |
| A8 Shared evidence UI | Does not exist | After A1/A7 contracts stabilize |
| A9 Ask Rishi | Does not exist (contextual continuation into the EXISTING /api/chat — never a new chatbot endpoint) | After insight context exists |
| A10 /api/intelligence | Does not exist | After substrate contracts stable |
| B1+ | Do not exist | Feature breadth only after Phase A is proven |

## 4. Execution rules (binding on every PR from here)

1. **One roadmap item = one task = one PR = one closeout.** Never
   A3+A4+A5 in one PR; never A3, A3.1, A3-redux, A3-final.
2. **Roadmap IDs are permanent identifiers.** PR titles:
   `INT-A3 deterministic intelligence event projection`; evidence:
   `docs/evidence/int-a3-<round>.md` (or the round directory with the
   item in the filename); PR body carries `Roadmap item: A3;
   Dependencies: A1, A2`.
3. **No downstream implementation before its substrate.** A4 depends on
   A3; Dashboard Brief depends on A1–A10. A coder may not start an item
   because it looks easy — a missing prerequisite STOPS the downstream
   item and surfaces the prerequisite (or escalates
   `FOUNDER DECISION NEEDED` when the block is not a coder decision).
4. **No roadmap reinterpretation during coding.** A3 means deterministic
   projection — never "LLM decides an event happened". A4 means
   deterministic materiality — never "LLM decides importance". A7 means a
   deterministic change key + persistent cache — never in-memory
   memoization. A9 means the existing /api/chat — never a new endpoint.
5. **Every item runs the same loop:** read CONSTITUTION → read the item +
   dependencies → read the existing implementation → search for duplicate
   primitives → define the negative test → RED → root fix → GREEN →
   regression → full CI → merge → deploy → exact production SHA → real
   production execution → real UI verification → grounding → provenance →
   latency → raw evidence → ITEM CLOSED.
6. **Definition of Complete is strict:** code + fail-first test +
   regression + CI + merged + deployed + exact SHA + real prod execution +
   real prod UI + grounding + provenance + latency + evidence. Anything
   less is IMPLEMENTED, not CLOSED.
7. **Unexpected discoveries follow the hard protocol:** missing
   prerequisite → stop downstream, work the prerequisite; broken existing
   primitive → fail-first regression + repair (never a silent replacement);
   duplicate architecture → stop, determine canonical, consolidate;
   founder/legal/security decision → `FOUNDER DECISION NEEDED` + BLOCKED on
   that item; genuine roadmap-order impossibility → an explicit
   architecture change record in this file (never a quiet reorder inside
   a PR).
8. **Production automation is part of the architecture:** no manual SQL,
   no manual cron dispatch, no manual cache mutation, no dashboard repair.
   The chain is code → migration/repository automation → CI → merge →
   deployment → scheduled/requested production execution → automated
   evidence.

## 5. Standing blocked items (not coder decisions)

- **G3** (`029_quotes_warm_schedule_pin.sql`): stays unapplied until the
  founder comments `APPROVED: pg_cron` (the live DB scheduler currently
  running is the production authority).
- **G7 future drivers** (serial financials compositions, repair stage):
  pre-registered iteration, founder-authorized only (the #260 verdict's
  recorded candidate).
- **A4 materiality thresholds** (raised 2026-10-08, round 28): the
  founder must confirm the numerical thresholds before INT-A4 starts.
  Two competing pre-registrations exist — the founder's round-28
  statistical proposal (price ≥ 3σ of 20-day daily returns OR ≥ 4%
  intraday; volume ≥ 3× 20-day median; technical regime over 2 sessions;
  portfolio ≥ 2pp) vs the PA3 branch's static v1 (5%/2%, 5pp/2pp, 50%/20%).
  Statistical rules require 20-day baselines the temporal memory only
  began accumulating 2026-10-07 (~2026-11-03 readiness; fail-closed until
  then). Escalation with recommended default (the directive-10 statistical
  rules verbatim, fail-closed on insufficient baselines): #263 thread,
  `docs/evidence/round28/int-a3-closeout.md` links it. A5+ are blocked
  behind A4.
- **NS1 health semantics** (raised 2026-10-08, round 28): does the
  nightly consensus snapshot (computed from the static seed registry)
  count as "fundamentals ingestion" for `/api/health`? #267 (merged)
  says yes; #266's evidence says the label lies (rule 2) and the G6
  honest-null state should be restored. Recommended default: `git revert
  e5e75b76`. Escalation on the #267 thread. Phase 0 closure is unaffected
  either way.
