# INT-D2 Stock Intelligence — the per-row intelligence drawer (pre-registration)

Roadmap item D2 ("PHASE D — Screening · Stock Intelligence · Stock
Dossier", second item in the frozen order — the position-within-phase
id scheme of B1/C1). Dependencies: A1 (contract), A8 (evidence
primitives), A10 (the ONE intelligence API), B1 (the mounted-surface
pattern), C1 (the exact-surface scan discipline) — all CLOSED on
`origin/main` = `e8db343`. This document is committed BEFORE any
evaluation (the A5–C1 precedent). The drawer contract, the
no-per-row-fetch rule and the exact-surface scan growth are enforced
by test — a silent change breaks the build.

## What exists today (surveyed, reused — nothing rebuilt)

- `/api/intelligence` (A10): the ONE intelligence API surface.
  `capability=thesis` serves the deterministic A2→A7 artifact (zero
  AI by construction) for any registry-resolvable subject;
  `capability=insight` honestly 404s until A4 baselines accumulate
  (~2026-11-03). The registry stays `{thesis, insight}`.
- `components/stock/IntelligencePanel.tsx` (B1): the FIRST real
  product surface — the fetch/render state machine and A8
  composition that every later surface follows. Untouched by this
  item (its pins scan its own source).
- `components/dashboard/DashboardBrief.tsx` (C1): the SECOND surface
  (server-resolved subject, zero first-load JS). Untouched.
- `components/screener/StockTable.tsx`: the screener table — server
  slim rows (registry symbols), live price/fundamentals overlays;
  renders one row per registry record. It fetches NO intelligence
  today ("AI today: none" on `/stocks` — the inventory's fit map).
- The exact-surface scan (C1): the set of surfaces fetching
  `/api/intelligence` across app/lib/components is pinned to EXACTLY
  {B1 panel, C1 brief} — a third undeclared consumer breaks the
  build. This item GROWS the declared set in the same PR (declared,
  never silent).
- Bundle ratchets: `/stocks` = 162.0 kB first-load (+2 kB tolerance,
  200 kB fatal — C9).

## What D2 is

1. **The per-row affordance** (`components/screener/
   IntelligenceBadge.tsx`): a small, static badge rendered on each
   table row — an OPENER, not a signal. It carries NO computed
   intelligence value (no score, no verdict, no recommendation — the
   A8 absence discipline at breadth: the page computes nothing per
   row). Clicking it opens the intelligence drawer for that row's
   symbol.
2. **The intelligence drawer** (`components/screener/
   IntelligenceDrawer.tsx`): a thin client component that fetches
   THE ONE route (`/api/intelligence?capability=thesis&subject=
   <symbol>`) for the ONE opened subject and renders the
   A1-validated artifact through the A8 primitives in the A8
   composition order (InsightBadges → ProvenanceLine →
   ContradictionBanner → EvidenceList → UncertaintyBlock) — the B1
   panel pattern verbatim: no second parser, no zod on the client,
   no chain import, honest loading/unavailable states, 12 s timeout,
   no advice strings. The symbol comes from the row the SERVER
   rendered (the registry master) — the client invents no subject.
3. **No per-row fetching (the breadth contract)**: the table fetches
   NOTHING on render — zero chain reads, zero intelligence requests
   for the 896-row universe. The ONE fetch happens on drawer open,
   ONE subject at a time, user-initiated (the C1 breadth note
   honored: no N×403-row chain reads, no burst-guard pressure).
   Closing the drawer or opening another row aborts the in-flight
   fetch (AbortController) — the last-opened subject wins, no state
   bleed across subjects.
4. **Mount + placement**: the badge is rendered inside StockTable's
   row; the drawer is mounted once in `ScreenerClient` via
   `next/dynamic` (`ssr: false`) — the C1 bundle pattern — so the
   drawer code adds ZERO first-load JS to `/stocks` (measured at
   build time; the 162.0 kB ratchet must hold). The badge itself is
   a few DOM nodes, not a chunk.
5. **Honest scope vs `capability=insight`**: the drawer pins
   `capability=thesis` — the deterministic artifact, available for
   every subject today. The generated-insight upgrade waits for the
   A4 baseline window (~2026-11-03, when the A4 fail-closed gate
   stops forcing every verdict non-material) and arrives by its own
   pre-registered change — never silently.

## What D2 is NOT

- not a per-row signal column: no per-row chain reads, no per-row
  judgment, no precomputed signal table (a batch/cross-subject
  capability would be a NEW primitive + NEW capability id — its own
  pre-registration with founder visibility; not invented here);
- not a new capability: the registry stays `{thesis, insight}` —
  D2 mounts the existing thesis capability on a new surface;
- not a second intelligence endpoint or a page-side chain consumer:
  the drawer fetches the ONE route; nothing in the screener imports
  the chain runner;
- not a second parser: no `parseRishiInsight`, no zod on the client
  (the B1/C9 finding held — the server boundary stays the ONE
  parse);
- not a change to B1's panel or C1's brief (both untouched; their
  pins hold);
- not an entitlement change (ALL FREE stands — the A10 decision);
- not a data-source change: the rows, the registry and the slim
  index are exactly today's.

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| route 400 (unknown symbol / invalid capability) | honest unavailable state inside the drawer |
| route 404 / 429 / 5xx | honest unavailable state inside the drawer |
| network failure or 12 s timeout | honest unavailable state inside the drawer |
| contract mismatch (`ok !== true`, no `insight`) | honest unavailable state inside the drawer |
| row without a resolvable symbol | the badge does not render for that row (defensive, honest) |
| drawer closed mid-fetch | fetch aborted; no setState after abort (no state bleed) |
| non-deterministic or empty chain state | the artifact's own honest states render verbatim (`status: "unknown"` stays unknown — never upgraded) |

## No-second-path pins (static, CI)

- the exact-surface scan grows to EXACTLY {`components/stock/
  IntelligencePanel.tsx`, `components/dashboard/DashboardBrief.tsx`,
  `components/screener/IntelligenceDrawer.tsx`} — a fourth
  undeclared consumer breaks the build;
- `IntelligenceDrawer.tsx` imports no chain module, no parser, no
  zod, no router; renders no advice strings; fetches ONLY
  `/api/intelligence?capability=thesis`;
- `StockTable.tsx` imports no intelligence module (the badge is a
  presentational affordance; the drawer is not imported by the
  table);
- `ScreenerClient.tsx` imports the drawer only via `next/dynamic` (
  `ssr: false`) and imports no intelligence module;
- no fetch of `/api/intelligence` anywhere in the screener outside
  the drawer component (the scan already proves this).

## Verification plan

- RED: fail-first pins on the pre-implementation tree — the badge
  and drawer do not exist (scans fail), the exact-surface scan count
  mismatches, the mount is absent — captured raw (rule 21);
- GREEN: drawer pins (the ONE-route fetch with `capability=thesis`,
  the A8 composition, the 12 s timeout, honest states, no advice, no
  second parser, abort-on-close), badge pins (presentational only —
  no computed value, no fetch), mount pins (dynamic ssr:false,
  single mount), the exact-surface scan growth, bundle leg (the
  `/stocks` ratchet holds; the drawer chunk is not among the
  first-load script tags); battery + CI;
- production legs on the exact deployed SHA: the deployed `/stocks`
  in a headless browser — open the drawer for a live row symbol; the
  captured network log shows exactly ONE `/api/intelligence` fetch
  for that subject; the A8 composition renders; the unavailable
  state leg (a subject forced to fail renders the honest state);
  zero intelligence fetches in the table's initial network log (the
  breadth contract, positive-controlled); `/stocks` TTFB + bundle
  size captured.
