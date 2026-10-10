# INT-D3 Stock Dossier — the compiled dossier on /stock/[symbol] (pre-registration)

> **SUPERSEDED 2026-10-10 (rule 30):** the product surface this pre-registration describes was
> REMOVED from `/stock/[symbol]` by the founder's explicit order (round 45) — the removal record, the
> revert range, and the substrate-intact verification live in `docs/evidence/round45/d3-removal.md`.
> The text below is the historical pre-registration, preserved verbatim.

Roadmap item D3 ("PHASE D — Screening · Stock Intelligence · Stock
Dossier", third item in the frozen order — the position-within-phase
id scheme of B1/C1). Dependencies: A1 (contract), A7 (change key),
A8 (evidence primitives), A9 (Ask Rishi — the existing /api/chat with
the insightRef reference contract), A10 (the ONE intelligence API),
B1 (the mounted thesis panel this item sits beside) — all CLOSED on
`origin/main` = `e8db343`. This document is committed BEFORE any
evaluation (the A5–C1 precedent). The unlock mechanics, the absence
discipline and the reference-only client contract are enforced by
test — a silent change breaks the build.

## What exists today (surveyed, reused — nothing rebuilt)

- `/api/intelligence` (A10): `capability=thesis` (the deterministic
  artifact, live today — B1's panel consumes it on this very page);
  `capability=insight` (cache-hit parse-or-serve / miss + A4-material
  → ONE bounded generation / miss + non-material → honest 404, zero
  spend, the A4 gate BEFORE any cache read or spend control). A4 is
  fail-closed until ~20-day baselines accumulate (~2026-11-03) —
  until then EVERY verdict is non-material and `capability=insight`
  is an honest 404 for every subject. This is the A4 design, not a
  gap.
- `components/stock/IntelligencePanel.tsx` (B1): the stock page's
  always-on intelligence panel (thesis, A8 composition). Untouched by
  this item.
- A9 (`lib/intelligence/chatContext.ts` + the /api/chat insightRef
  path): the client supplies ONLY the deterministic 64-hex change key
  — never an insight object, never evidence text, never prompt
  content; the server resolves the artifact through the ONE cache and
  the ONE A1 parser; missing/stale/invalid/unauthorized references
  fail closed with named refusals, all before any quota consumption.
  The affordance itself ("mounts on product surfaces at A10+/
  Phase B–J") has NO product mount yet — D3 is its first.
- A1 (`lib/intelligence/types.ts`): the artifact carries an optional
  `changeKey` — the bounded identifier the affordance forwards.
- Bundle ratchets: `/stock/[symbol]` = 169.2 kB first-load
  (+2 tolerance, 200 kB fatal — C9).

## What D3 is

1. **The dossier** (`components/stock/IntelligenceDossier.tsx`): a
   client component mounted on the scored-surface branch of
   `/stock/[symbol]`, directly after the B1 IntelligencePanel. It
   adds the compiled dossier's two missing pieces:
   - **The generated-insight section**: fetches THE ONE route
     (`/api/intelligence?capability=insight&subject=<symbol>`); a 200
     + contract-valid response renders through the A8 primitives in
     the A8 composition order (no second parser, no zod, no chain
     import — the B1 pattern); a 404 renders the section ABSENT.
   - **The Ask Rishi affordance** (`components/stock/
     AskRishi.tsx`): mounted ONLY when the generated-insight section
     displays an artifact that carries a `changeKey`. It is a thin
     one-shot composer over the EXISTING `/api/chat`: the client
     sends ONLY `{ message, insightRef: <the artifact's 64-hex
     changeKey>, symbol }` — the A9 reference contract verbatim; the
     response's verified surface, provenance labels and named
     refusals render honestly (a refusal text is shown as the
     refusal it is — never reworded into content). No conversation
     state machine is rebuilt: each ask is one POST; the /chat page
     remains the full conversation surface.
2. **The unlock mechanics (pinned)**: on/after ~2026-11-03 the A4
   baselines make material verdicts possible → a chain miss + A4-
   material → the route's ONE bounded generation → `writeCachedInsight`
   → the dossier's next `capability=insight` fetch returns 200 → the
   section and the affordance render. NO code change and NO redeploy
   at the window: the surface is pre-built and data-unlocked. The
   unlock is verified in CI (cache-hit fixture path) and will be
   verified live in a production leg once the first real generation
   lands after the window (recorded as a standing follow-up
   obligation, not part of this item's closeout).
3. **Absence honesty (the U4 discipline applied to data)**: before
   the window, `capability=insight` 404s for EVERY subject — the
   dossier's insight section and affordance render NOTHING (no
   placeholder, no "coming soon", no promise, no fabricated
   summary). Absence of the section IS the honest state; the B1
   thesis panel above it remains the page's always-on intelligence.
   The DOM contract distinguishes the states for verification only:
   `data-dossier-insight={"absent"|"error"|"ready"}` + `data-dossier-
   subject` — `absent` (404: no artifact exists) and `error` (5xx/
   network/timeout) are visually the same nothing, but verifiably
   different.
4. **Placement discipline**: the dossier mounts ONLY on the scored-
   surface branch (where the B1 panel mounts). The insufficient-data
   page (`InsufficientDataRecord`) gets NOTHING — no intelligence
   claims on a page that promises none.

## What D3 is NOT

- not a second chat path: Ask Rishi = the EXISTING `/api/chat` with
  the A9 reference contract (one contextual chat path — rule 14); no
  new endpoint, no client-supplied prompt content, no client-supplied
  insight data (only the 64-hex change key crosses);
- not a second intelligence surface beyond the named capabilities on
  the ONE route (thesis stays B1's panel; the dossier adds the
  insight fetch — the exact-surface scan grows to FOUR declared
  consumers);
- not a rewrite or restyle of the B1 panel (untouched; its pins
  hold);
- not a news surface: B1's rule stands — news is EVIDENCE, not a
  capability; a per-symbol news product path would be its own
  pre-registration (never invented here);
- not a cache writer, not a generation trigger: the dossier only
  READS the ONE route; generation eligibility remains A4's EXCLUSIVE
  call (the dossier adds no heuristic, no "should the model run?"
  decision — direction 11);
- not an entitlement change (ALL FREE stands — chat quota/burst/
  global-spend controls apply to every ask, exactly as on /chat);
- not a bundle event: the dossier and affordance ride the stock
  page's client tree reusing the already-shipped A8 imports (no new
  zod, no parser); the 169.2 kB ratchet must hold at build time (a
  dynamic ssr:false chunk if measurement demands it).

## Fail-closed table (all named)

| Case | Treatment |
|---|---|
| `capability=insight` → 404 (miss + non-material — the pre-window state) | the section renders ABSENT (`data-dossier-insight="absent"`) |
| `capability=insight` → 5xx / network / timeout / contract mismatch | the section renders ABSENT (`data-dossier-insight="error"`) — never a fake artifact |
| artifact without a `changeKey` | the section renders; the affordance does not (it cannot anchor — honest absence) |
| `/api/chat` refusal (the A9 named vocabulary: missing/stale/invalid/unauthorized reference, quota, burst, challenge, spend) | the refusal renders as the refusal it is — never reworded, never retried automatically |
| `/api/chat` 5xx / network failure | the affordance's honest unavailable state; the insight section is unaffected |
| empty question | the affordance's submit is disabled (nothing sent) |
| INCOMPLETE-record stock page | the dossier does not mount at all |

## No-second-path pins (static, CI)

- the exact-surface scan grows to EXACTLY {`components/stock/
  IntelligencePanel.tsx`, `components/dashboard/DashboardBrief.tsx`,
  `components/screener/IntelligenceDrawer.tsx` (INT-D2),
  `components/stock/IntelligenceDossier.tsx`} — a fifth undeclared
  consumer breaks the build;
- `IntelligenceDossier.tsx` fetches ONLY
  `/api/intelligence?capability=insight`; imports no chain module,
  no parser, no zod; renders no advice strings;
- `AskRishi.tsx` fetches ONLY `/api/chat`; sends ONLY
  `{ message, insightRef, symbol }` (no history replay, no system
  prompt, no persona injection beyond the route's own resolution);
  imports no intelligence module beyond types;
- the stock page passes the already-server-resolved symbol; no
  client invention of subjects;
- `app/api/chat/route.ts` and `lib/intelligence/chatContext.ts` are
  UNTOUCHED by this item (the A9 pins hold verbatim).

## Verification plan

- RED: fail-first pins on the pre-implementation tree — the dossier
  and affordance do not exist (scans fail), the mount is absent, the
  exact-surface scan count mismatches — captured raw (rule 21);
- GREEN: dossier pins (the ONE-route insight fetch, the A8
  composition, the absence discipline incl. the absent/error DOM
  distinction), affordance pins (mounts only with a changeKey-
  bearing artifact; sends ONLY the bounded triple; renders refusals
  as refusals), mount pins (scored-surface branch only, after the
  B1 panel), the exact-surface scan growth, the CI cache-hit
  fixture path proving the unlock mechanics end-to-end (write →
  dossier-ready) through the EXACT A7 functions; battery + CI;
- production legs on the exact deployed SHA (pre-window): the
  deployed `/stock/<live symbol>` in a headless browser — the B1
  thesis panel renders (positive control), the dossier's insight
  section is ABSENT with `data-dossier-insight="absent"`, the
  network log shows the insight fetch returning the honest 404 with
  ZERO AI spend, the affordance is absent; refusal legs on
  `/api/chat` with a forged/malformed `insightRef` fail closed
  (the A9 named refusals, unchanged); the stock page ratchet +
  TTFB captured. Post-window: a standing follow-up leg verifies the
  first REAL generated artifact rendering in the dossier (the
  unlock proof; recorded in the roadmap row when it happens).
