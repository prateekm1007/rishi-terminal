# C1 Dashboard Brief — the dashboard mounts the ONE surface (pre-registration)

> **Amended 2026-10-10 (rule 30):** the B1 stock-page panel cited below as the
> surviving first surface was REMOVED from `/stock/[symbol]` by the founder's
> explicit order (round 45, after the D3 dossier removal) — see
> `docs/evidence/round45/b1-removal.md`. The C1 brief described here SURVIVES
> (with the D2 drawer, one of the two remaining declared surfaces). The text
> below is the historical pre-registration, preserved verbatim.

Roadmap item C1 ("PHASE C — Dashboard Brief"; frozen rule 3: "Dashboard
Brief depends on A1–A10"). Dependencies: A1 (contract), A8 (evidence
primitives), A10 (the ONE intelligence API), B1 (the mounted-surface
precedent) — all CLOSED on `origin/main` = `bbaab5d`. Phase B is
complete (B1 CLOSED); the frozen sequence names Phase C next, and B2+
has no definition in the frozen architecture — no roadmap reorder, no
invented scope. This document is committed BEFORE any evaluation (the
A5–B1 precedent). The surface pins, the no-second-surface scan and the
mount pin are enforced by test — a silent change breaks the build.

## What exists today (surveyed, reused — nothing rebuilt)

- `/api/intelligence` (A10): the ONE intelligence API surface.
  `capability=thesis` serves the deterministic A2→A5 artifact (zero AI
  by construction) — verified live for a dashboard-resolvable subject;
  `capability=insight` honestly 404s until A4 baselines accumulate
  (~2026-11-03).
- `components/stock/IntelligencePanel.tsx` (B1): the FIRST real product
  surface — the stock page fetches the ONE route client-side and
  renders through the A8 primitives. Its fetch/render state machine is
  the pattern C1 follows; it stays untouched (its B1 pins scan its own
  source).
- `components/intelligence/*` (A8): five thin primitives + the ONE
  presentational mapping (`lib/intelligence/evidence.ts`
  `buildEvidenceView`) — the only rendering path for an A1 artifact.
- The dashboard (`app/page.tsx` → `components/dashboard/
  DashboardClient.tsx` → `components/dashboard/DashboardTail.tsx`):
  the home page is a server component (ISR, revalidate 60 s); the
  ranked trio (Stock of the Day / Top Buy Signals / Short Radar) is
  gated by `RANKINGS_ENABLED` (U4, fail-closed) and lives in
  DashboardTail (next/dynamic, ssr:false — below the fold, zero
  first-load JS). The Stock of the Day subject is the deterministic
  IST-calendar-day pick (`pickStockOfTheDay`), computed server-side
  from the ONE seed registry, passed down as an RSC prop.

## What C1 is

1. **The dashboard brief surface** (`components/dashboard/
   DashboardBrief.tsx`): a thin client component that takes the
   server-resolved subject (the Stock of the Day symbol) and fetches
   THE ONE route (`/api/intelligence?capability=thesis&subject=
   <symbol>`), rendering the A1-validated artifact through the A8
   primitives in the A8 composition order (InsightBadges →
   ProvenanceLine → ContradictionBanner → EvidenceList →
   UncertaintyBlock). The component owns NO interpretation: the A1
   parse stays the SERVER boundary (the route serves only
   parse-or-refused artifacts — the A10 pinned contract); the client
   adds NO second parser and NO zod (the B1/C9 bundle discipline); no
   chain import (the A10 single-consumer scan unchanged); no advice
   strings.
2. **The mount** (`components/dashboard/DashboardTail.tsx`): inside
   the ranked branch (`rankingsEnabled && stockOfDay`), directly after
   the Stock of the Day section — the brief briefs the day's pick, so
   it renders where the pick renders. `subject={stockOfDay.symbol}` —
   the symbol the server already resolved; the client invents no
   subject.
3. **Absence honesty (U4 alignment)**: when the flag is off or no
   qualified pick exists, NO brief renders — there is no subject to
   brief, and the ranked trio's disabled panel already explains why.
   The component takes a non-null `subject` (no dead null branch, no
   fabricated fallback subject). Absence of the section IS the honest
   state.
4. **State machine (the B1 pattern, pinned)**: loading → the honest
   resolving state; any non-200 (400 unknown symbol / 404 / 429 /
   5xx), network failure, timeout (12 s) or contract mismatch
   (`ok !== true` / no `insight`) → the honest unavailable state; 200
   + contract-valid → the A8 composition over `buildEvidenceView`.
   DOM contract for verification: `data-dashboard-brief={phase}` +
   `data-dashboard-brief-subject={subject}`.
5. **Bundle placement (C9, by construction)**: the brief lives inside
   DashboardTail's dynamic (ssr:false) chunk — it adds ZERO first-load
   JS to "/" (the bundle ratchet measures the HTML's first-load script
   tags; a dynamically-imported chunk is not among them). Verified at
   build time. SSR renders nothing for the tail — the brief's first
   paint and fetch are client-side; this is disclosed and verified via
   the deployed-bundle DOM control, not the HTML.

## What C1 is NOT

- not a new capability: the registry stays `{thesis, insight}`;
  `capability=insight` mounting waits for the A4 baseline window
  (~2026-11-03) and arrives by its own item if needed;
- not a second intelligence endpoint and not a page-side chain
  consumer: the brief fetches the ONE route; no page/component imports
  the chain runner;
- not a second parser: no `parseRishiInsight`, no zod on the client;
- not a multi-subject digest: ONE subject per view (the deterministic
  pick). N-symbol breadth would multiply 403-row chain reads against
  the route's 30/60 s per-IP burst guard for no honest gain; broader
  per-symbol surfaces arrive at Phase D by their own pre-registrations;
- not a styling amendment to the A8 primitives (they render exactly as
  delivered; only the wrapper section carries the dashboard's card
  idiom);
- not a materiality or subject heuristic: which subject the dashboard
  briefs is the server's deterministic pick (U4-gated); the client
  never chooses.

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| flag off / no qualified pick | NO brief renders (the disabled panel explains the ranked trio) — never a fabricated subject |
| route 400 (unknown symbol / invalid capability) | honest unavailable state |
| route 404 / 429 / 5xx | honest unavailable state |
| network failure or 12 s timeout | honest unavailable state |
| contract mismatch (`ok !== true`, no `insight`) | honest unavailable state |
| non-deterministic or empty chain state | the artifact's own honest states render verbatim (A8's empty-state discipline — `status: "unknown"` renders as `unknown`, never upgraded) |

## No-second-path pins (static, CI)

- the set of surfaces fetching `/api/intelligence` across
  app/lib/components is EXACTLY {`components/stock/
  IntelligencePanel.tsx`, `components/dashboard/DashboardBrief.tsx`} —
  a third undeclared consumer breaks the build;
- `DashboardBrief.tsx` imports no chain module, no parser, no zod, no
  router; renders no advice strings;
- `DashboardTail.tsx` passes the server-resolved symbol and imports no
  intelligence module beyond the brief component itself.

## Verification plan

- RED: fail-first source pins on the pre-implementation tree (the
  component does not exist → scans fail; the mount is absent; the
  exact-surface scan returns a count mismatch) — captured raw (rule
  21);
- GREEN: component pins (the ONE-route fetch with `capability=thesis`,
  the A8 composition, honest states, no advice, no second parser), the
  mount positive control (B-18), the exact-surface scan; battery + CI;
- production legs on the exact deployed SHA: (a) the deployed DOM
  positive control on `/` via a headless browser — the brief renders,
  its subject equals the RSC-payload Stock of the Day symbol, the
  phase machine ends in the honest ready/unavailable state, and the
  rendered composition is the A8 markup (ssr:false is disclosed: the
  proof is the hydrated DOM, not the HTML); (b) the route leg for the
  live pick (`capability=thesis` 200, deterministic, no model label,
  latency captured); (c) local build scan — the dynamic chunk carries
  the ONE-surface fetch URL; (d) regression controls: the stock-page
  panel (B1) and the A8 fixture route still PASS.
