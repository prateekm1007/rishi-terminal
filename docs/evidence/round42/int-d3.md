# INT-D3 Stock Dossier — closeout (round 42, 2026-10-10)

Item: INT-D3 Stock Dossier per the frozen Phase D order. Contract:
`docs/intelligence/stockDossier.md` (pre-registered in #296 before any
evaluation). Implementation PR: **#310** (`feb07d0` RED capture →
`fb3babf` GREEN → `56b7b55` PROVENANCE regeneration; merge
`42fc24e9ac2b36b0ca75263bf26320bcd5acbff4`, 05:10:05Z, merge-guard gates
0–6 all green on the exact head, cadence 71.9 min after #309).

## What shipped

- `components/stock/IntelligenceDossier.tsx` — the compiled dossier on
  `/stock/[symbol]`, mounted inside the existing Rishi Intelligence
  section directly after the B1 panel (direction 6: compile INTO the
  existing section; the page's two seed verdict voices are untouched —
  the dossier introduces no third voice; it renders the ONE canonical
  `ReadyComposition` only). Fetches THE ONE
  `/api/intelligence?capability=insight`; `404 → ABSENT`
  (`data-dossier-insight="absent"`), other failures → `error`,
  verifiably different in the DOM; both visually nothing.
- `components/stock/AskRishi.tsx` — the FIRST Ask Rishi affordance
  mount, exclusively over the EXISTING `/api/chat` with the approved
  change-key reference (`{message, insightRef, symbol}` plus the
  route's own REQUIRED persona selector, disclosed in the RED commit);
  refusals render as refusals; no conversation state machine; the
  affordance mounts ONLY on a changeKey-bearing artifact.
- The exact-surface scan grows to EXACTLY the four declared consumers
  {B1 panel, C1 brief, D2 drawer, D3 dossier} in the same PR — a fifth
  undeclared consumer breaks the build (direction 8).
- Unlock mechanics by construction: NO code change and NO redeploy owed
  at the ~2026-11-03 A4 window — the surface is pre-built and
  data-unlocked.

## Fail-first

RED `docs/evidence/round42/red-d3-output.txt` (raw): **11/11 pins fail**
on the pre-implementation tree (scans, mount, exact-surface count).
GREEN `fb3babf`: all pins pass.

## Battery (union head `56b7b55`, hand-run before merge)

- `npx vitest run` — **194 files / 2155 tests ALL PASS** (the union with
  the merged INT-RECONCILE root repair #309; this exact union tree had
  never run the battery before).
- `npx tsc --noEmit` exit 0; `npx eslint .` 0 errors / 283 warnings
  (ratchet exact).
- `npm run validate:encoding` PASS; `npm run validate:stocks` — all T12
  gates, 896 symbols; `npm run score:parity` — 0 mismatches / 0
  non-finite of 896.
- `npm run build` exit 0; `npm run verify:isr` PASS (896 baked stock
  routes, cap 60s); `npm run bundle:budget` OK — `/stock/[symbol]`
  171.6 kB vs the 171.2 ratchet (+0.4, within the +2 kB tolerance),
  `/` 159.4, `/stocks` 163.2.
- `npm run check:branch` PASS (token INT-D3).

CI on the exact head `56b7b55` (run 38026221520): all five blocking
checks green.

## Gates honored (the cadence/U5 record)

1. **C8 cadence** — #309 merged 03:58:08Z; #310's first post-rebase CI
   run (03:59:49Z) bit the cadence gate (honored, never bypassed); the
   window opened 04:59:08Z; run-level rerun on the exact head per the
   house pattern. Merged at 05:10:05Z (71.9 min ≥ the founder's
   one-hour spacing; C8 held all night: #304 00:21Z, #306 01:28Z,
   #309 03:58Z, #310 05:10Z).
2. **U5 PROVENANCE drift gate** — surfaced on the rerun (it runs after
   the cadence step, which had always bit first on this branch): the
   gate's deterministic snapshot date is the committer date of the last
   `app/`-touching commit; the rebase onto post-#309 main re-committed
   D3's GREEN commit on 2026-10-10, so the regenerated stamp read
   2026-10-10 while the committed doc said 2026-10-09. Root-honest
   remediation per the gate's own instruction: `provenanceAudit` re-run
   and the regenerated file committed (`56b7b55`) — page classifications
   and counts unchanged (36 pages: seed 5, sourced 12, static-editorial
   1, none 18). No gate weakened.
3. **Quota ledger** (`docs/RELEASE.md` policy) — checked before BOTH
   merges tonight: 58–59 deployment-creation events / 24 h (≈41
   headroom under the 100/day cap), zero 402/ERROR states; both
   production deploys landed READY.

## Production legs on the deployed merge SHA `42fc24e…` (C6: merged + deployed + live)

Deploy verified: `/api/version` = `42fc24e9ac2b36b0ca75263bf26320bcd5acbff4`
at 05:12:18Z (this build also carried #309's repair and cleared the
`f7a2eb4` deploy debt from the #311 merge, whose auto-deploy never
fired).

- API legs (`scripts/a8pres/prodVerifyD3.py`, raw:
  `prod-legs-310-api.txt`) — **9/9 PASS**: deploy gate; thesis
  regression 200 + deterministic (two calls identical modulo clock);
  the designed 404 on `capability=insight` (honest pre-window state,
  zero AI spend); chat forged-insightRef → 400 "Invalid insight
  reference" refused BEFORE any generation (zero spend); chat
  missing-message 400; unknown persona 400; latency
  (edge 1197 ms, route wallMs 875 / chainMs 762); /stocks 200.
- Browser legs (committed `test/smoke/dossier.spec.ts` prod variant +
  committed `d2-supplement.spec.ts`, raw: `prod-legs-310-browser.txt`)
  — **4/4 PASS**: the B1 panel positive control renders FIRST
  (B-18); the dossier section carries the honest phase with the
  DOM/network coherence pin (exactly ONE insight fetch → 404 ⟺
  `absent`); `data-ask-rishi` count 0; no placeholder text; the D2
  supplement (breadth zero-fetch / 896 openers, drawer ONE fetch + A8
  composition, abort/re-key, computed geometry) holds with D3 on the
  page.
- Presentation legs (committed `a8-presentation.spec.ts` against
  production, raw: `prod-legs-310-presentation.txt`) — **5/5 PASS**.
- Visual positive control (`prod-dossier-absent.png`): the Rishi
  Intelligence section shows the B1 panel READY (badges
  UNKNOWN/LOW/LOW/DETERMINISTIC, the scoped Totals sentence, the
  partition "403 observed transition(s) … Of those excluded: 403 …
  (insufficient-history)") with the dossier section rendering
  visually nothing below it and zero Ask mounts.
- Page TTFB (10 pages, `scripts/measureTtfb.sh`, raw:
  `prod-legs-309-ttfb.txt` — measured on the #309 deploy the same
  night): warm p50 0.328 s / p95 0.342 s; no regression signal.

## The hydrated-dossier proof (the closeout's load-bearing wall)

The `/stock/[symbol]` SSR markdown shows only "Resolving
intelligence…" — the dossier and the B1 panel hydrate client-side by
design — so the absent-state legs above cannot prove the surface
renders. Founder direction (2026-10-10) made the browser-level proof
the closeout's load-bearing wall; the legs were added to this PR
before merge (raw: `prod-legs-312-hydrated-dossier.txt`, visual:
`prod-dossier-hydrated.png`; production serving `d2d14ab…`, whose
`app/` surfaces are byte-identical to the `42fc24e…` closeout merge —
#313 touched test/ + docs/ only):

- **Leg 1 — the hydrated dossier renders on the deployed stock page**
  (route-fulfilled, 200 OK): the B1 panel renders from the REAL
  production thesis 200 FIRST (positive control, unintercepted); the
  dossier settles `data-dossier-insight="ready"` through the ONE
  insight fetch (fulfilled with the LIVE production thesis artifact
  for the same subject — a REAL, contract-valid deterministic artifact
  carrying a REAL 64-hex changeKey; instrument disclosure in the raw
  file: A4's fail-closed pre-window 404 is NOT weakened or bypassed,
  and this leg does not claim a production-served generated insight);
  the artifact's real summary prose renders as visible content inside
  the A8 composition; the Ask Rishi affordance mounts with count 1 and
  its accessible name, anchored on the real changeKey; exactly ONE
  insight fetch was fulfilled. VLM verification of the screenshot
  confirms: badges + summary + Totals + "Of those excluded" partition
  all rendered, the Ask Rishi header and input visible, and NO loading
  spinner or "Resolving" placeholder anywhere.
- **Leg 2 — the Ask contract end-to-end on production**: submitting a
  question sends EXACTLY the bounded payload
  `{personaId, message, insightRef, symbol}` to the REAL `/api/chat`
  (64-hex reference, page symbol, the route's own default persona);
  the production route resolves the reference server-side and FAILS
  CLOSED with the A9 named refusal — `404 "Insight not available"`
  (the fulfilled artifact's thesis changeKey is not a
  production insight-cache key) — which the affordance renders
  VERBATIM (`data-ask-rishi="refused"`), never reworded. Zero AI
  spend: the refusal fires in the validation region before any
  challenge, quota or reservation (N4).

Both founder audit findings were ALSO independently re-verified on the
current deploy `d2d14ab…` (the #312 reconcile legs ran on `fd6e8c0…`;
raw re-verification: `prod-legs-312-reconcile-reverify.txt` — 14/14
assertions PASS across BANKBARODA + CANBK: the "Of those excluded:"
partition binds exactly (total == Σ(breakdown), class census
`insufficient-history` only, `non-comparable` 0), and the empty
`whatChanged`/`evidence` against `CHANGED` is verdict-explained with
the totals arithmetic reconciling (transitions + baselines == events
== excluded)).

## Standing obligation (post-window)

The first REAL generated insight artifact at the ~2026-11-03 A4 window
gets a standing post-window production leg: the dossier's ready state
(`data-dossier-insight="ready"`) from a PRODUCTION-SERVED artifact,
the Ask affordance answering end-to-end through the ONE `/api/chat`,
and the spend accounting. The route-fulfilled legs above prove the
deployed ready path with a real artifact; what remains owed at the
window is the production-served generation itself. Recorded here and
in the roadmap row; the unlock needs NO code change and NO redeploy.

## Boundary audit (founder direction 3, verified this session)

The chain surfaces (B1 panel, C1 brief, D2 drawer, D3 dossier) render
live observation → materiality → thesis artifacts keyed by changeKeys;
the seed surfaces (/stocks table, guru verdicts, QVPS pillars, Rishi
Council, commentary) render static seed methodology outputs and remain
labelled illustrative on the page. No data duplication found; seed
scores never enter the evidence ledger; chain artifacts never render as
guru verdicts. The dossier adds no materiality heuristic and no
generation trigger — A4's exclusivity is untouched (direction 7: no
second chat route, no per-feature model path, no seed-data answers).

## Rollback

`git revert 42fc24e9ac2b36b0ca75263bf26320bcd5acbff4` — three commits
(RED capture, GREEN, PROVENANCE regeneration), no migration, no schema
change.
