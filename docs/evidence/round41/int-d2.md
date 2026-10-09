# INT-D2 — Stock Intelligence, the per-row intelligence drawer (round 41)

Pre-registration: `docs/intelligence/stockIntelligence.md` (PR #296,
merged `4270e1f`, committed BEFORE any evaluation — the binding
contract). Implementation PR **#299** (`7ef6427` → merge `c238e83`,
merge-guard gates 0–6 with the pinned head SHA, CI green on the exact
head). Styling-repair follow-up PR **#300** (`4c3f733` → merge
`12be644`, 2 files, zero behavior change). Final production legs on
`aea75f6a` (= the exact main tip carrying the shared presentation
repair INT-A8-PRES, PR #302): ALL PASS (raw: `prod-legs-api.txt`,
`prod-legs-presentation.txt`, `prod-legs-d2-supplement.txt`).

## What shipped (one item = one PR)

- `components/screener/IntelligenceBadge.tsx` — the per-row OPENER on
  `/stocks`: a static badge in the SYMBOL cell of every row. Carries NO
  computed intelligence value (no score, no verdict, no recommendation
  — the A8 absence discipline at breadth), fetches NOTHING, imports no
  intelligence module. `data-intelligence-badge={symbol}` DOM contract.
- `components/screener/IntelligenceDrawer.tsx` — the B1 panel pattern
  verbatim, breadth-adjusted: fetches THE ONE
  `/api/intelligence?capability=thesis&subject=<symbol>` for the ONE
  opened subject (user-initiated on drawer open); 12 s bounded wait
  through the SAME `AbortController` that serves the close/switch abort
  (timeout → honest unavailable vs close → no setState at all; the
  last-opened subject wins via the mount re-key — no state bleed across
  subjects); renders the route's A1-VALIDATED artifact through the A8
  composition; NO second parser, no zod on the client, no chain import,
  no router. DOM contract
  `data-intelligence-drawer[={phase}]` +
  `data-intelligence-drawer-subject`.
- `components/screener/StockTable.tsx` — the badge rides the SYMBOL
  cell; defensive guard `onOpenIntelligence && stock.symbol`; the table
  imports no intelligence module and never the drawer.
- `components/screener/ScreenerClient.tsx` — mounts the drawer ONCE via
  `next/dynamic` with `ssr: false`: the drawer adds ZERO first-load JS
  to `/stocks` (the drawer chunk is an async chunk absent from the
  page's first-load script tags — verified against the built output).
- **The exact-surface scan grows** (in #299, never silent) to EXACTLY
  `{components/stock/IntelligencePanel.tsx (B1), components/dashboard/
  DashboardBrief.tsx (C1), components/screener/IntelligenceDrawer.tsx
  (D2)}` — a FOURTH undeclared `/api/intelligence` consumer breaks the
  build.

## Fail-first (rule 21, raw capture committed)

`red1-output.txt` (round 39, commit `49fc35f`): **10 failed / 6
passed** on the pre-implementation tree — badge + drawer ENOENT,
wiring/mount pins absent, exact-surface scan mismatch (2 surfaces vs
the three declared). The 6 passing are C1's frozen baseline the growth
must not disturb. GREEN: **16/16 D2+C1 pins** (`d125ca6`).

## GREEN

`test/intelligenceScreenerDrawer.test.ts` 16 pins: badge presentational
(no fetch, no intelligence imports, no chain, no computed value, no
advice); drawer fetches ONLY `/api/intelligence` with
`capability=thesis` (ONE fetch per opened subject, abort-on-close
discipline, re-key per subject); honest loading/unavailable states; the
exact-surface scan pins the three-surface consumer set. Battery
(#299): **189 files / 2108 tests ALL PASSING**, tsc 0, eslint 0 errors
/ 283 warnings (ratchet holds), encoding PASS, aiLoopAudit 8/8,
routeIntegrity PASS (no new endpoint), verify:isr PASS, scoreParity
0/896, T12 896/896, build clean; bundleBudget `/stocks` 162.8 kB vs
162.0 ratchet (+0.8, within +2 tolerance), the drawer chunk NOT among
`/stocks` first-load script tags. Disclosed in #299: a data-REGENERATION
step (`t12consolidate.ts`) run by mistake during the battery was
reverted byte-exact before any commit.

## The styling repair (#300 — a production-leg catch, disclosed)

The D2 production legs caught a REAL defect the CI battery could not:
this tree has NO utility-CSS pipeline — utility-style class names
(`h-7`, `fixed inset-0`, …) render dead on the live page. Consequences:
the badge's touch target existed only in class names (computed box
42×17, below the WCAG 2.2 24 px minimum), the drawer's
overlay/panel geometry existed only in class names. Fix: styling moved
to INLINE styles (the established convention of the exact tree — the
screener pills, the lab tabs), colors from the `globals.css` design
tokens; all DOM contracts, the ONE-route fetch, the AbortController
state machine, and the A8 composition UNCHANGED (all 16 pins re-run
green; smoke 41/41; `/stocks` 162.9 kB ratchet holds).

## Production legs

Session R41 (on the deployed `12be644`, the #300 merge): the 9 main
legs ALL PASS — thesis deterministic (`9831f19a` changeKey), refusals
400/400, honest 404, breadth ZERO intelligence fetches across 896
openers, drawer open = ONE fetch + A8 composition, re-key discipline,
forced-failure honest unavailable, /stocks TTFB p50 80 ms; supplement
legs — badge computed 50×28 (target met), visible keyboard focus, the
fixed/z-50 drawer geometry, mid-flight abort (`net::ERR_ABORTED`) with
re-key and no stale render.

**Final re-verification on the exact deployed SHA `aea75f6a`** (the
closeout session; raw committed here):

- Deploy gate: `/api/version` sha == `aea75f6a…` — 13/13 API legs PASS
  (`prod-legs-api.txt`): thesis positive 200 (wallMs ~1010–1076,
  chainMs ~672–798); determinism (all composed fields identical across
  calls; only `generatedAt`/`observationWindow.to` clock fields move);
  honest badges `status=unknown / confidence=low / materiality=low /
  modelStatus=deterministic`; provenance `synthesisPath=deterministic`
  + 64-hex changeKey; refusals 400/400/400 (`Unknown symbol`, `Invalid
  capability`); capability=insight honest 404 (A4 fail-closed, zero AI
  spend pre-window); `/evidence-fixtures` 200.
- Browser legs, committed presentation spec
  `test/smoke/a8-presentation.spec.ts` run against production:
  **5/5 PASS** (`prod-legs-presentation.txt`) — the fixture-route
  computed-style controls; the stock panel + dashboard brief honest
  states styled (`.insight-surface__empty` padding from the shared
  stylesheet); the drawer close button's DESIGNED `:focus-visible`
  (solid, ≥2 px) with close-detaches.
- Browser legs, D2 supplement (`d2-supplement.spec.ts`,
  `prod-legs-d2-supplement.txt`): **3/3 PASS** — L1 breadth honesty:
  896-row table renders with ZERO `/api/intelligence` fetches on load;
  L2 drawer open = EXACTLY ONE
  `capability=thesis` fetch for the clicked subject with the A8
  composition visible and the subject re-keyed (`data-intelligence-
  drawer-subject` + aria-label); L3 badge computed box ≥ 24×24,
  `cursor: pointer`; L4 mid-flight close aborts and reopening another
  row re-keys with no stale subject; L5 the fixed/z-50 overlay + 640 px
  panel geometry is real.
- Visual positive controls: `prod-drawer-ready.png` (the drawer READY
  on `/stocks` — badges as a pill row, Summary / Why it matters / What
  changed prose under labels, the provenance line "deterministic
  artifact, no model involved", the honest EvidenceList empty state,
  and the per-reason uncertainty breakdown), `prod-brief-ready.png`,
  `prod-panel-ready.png`.
- `/stocks` TTFB warm p50 100 ms (98–111, 5 samples) on `aea75f6a`.
- Live uncertainty breakdown on `aea75f6a` (`prod-breakdown.txt`): the
  conflated sentence is REPLACED by the deterministic per-reason
  breakdown — "885 observed transition(s) did not qualify as material
  evidence in this window and are excluded from the ledger." + "885
  transition(s) were refused fail-closed by the materiality engine
  (non-comparable)." (A4's actual verdicts; ≤ 10 lines bound holds.)
- Scanner disclosure: the raw outputs as MERGED carry the changeKey
  TRUNCATED (first 8 hex + `…`, the round-35 house pattern) — the
  required gitleaks gate flags the full-value assignment pattern
  (`generic-api-key`). The change key is NOT a secret (a deterministic
  sha256 over the chain window, publicly re-derivable from the ONE
  endpoint); the branch history was rewritten BEFORE merge (one clean
  commit replaces the pair that transiently carried the full values on
  the unmerged branch) so the merged history never contains them, and
  the gate is not weakened. No other byte of the raw outputs was
  altered.

## Honest boundaries

- The drawer renders the DETERMINISTIC thesis artifact (A2→A7 chain,
  zero AI by construction). `capability=insight` stays unmounted until
  the A4 baseline window (~2026-11-03) and arrives by its own
  pre-registered change — the honest 404 remains the production state
  until then; no fixture masquerades as live intelligence anywhere.
- The shared presentation landed via the INT-A8-PRES corrective PR
  (#301 pre-registration + #302 implementation) BEFORE this closeout's
  final legs — the D2 surface renders the repaired six-step composition
  (see `round41/int-a8-pres.md`).
- No per-row fetching at breadth (production-proven); the ONE-surface
  consumer set is CI-pinned at exactly {B1 panel, C1 brief, D2 drawer}.
- Open isolated item: #267 health-semantics — untouched.
