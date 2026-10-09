# INT-C1 — Dashboard Brief: the dashboard mounts the ONE surface (closeout evidence)

Round 37 (2026-10-09). Roadmap item C1 — the frozen sequence's next item
after Phase B (B1 CLOSED); frozen rule 3: "Dashboard Brief depends on
A1–A10" (all CLOSED). Pre-registration:
`docs/intelligence/dashboardBrief.md` (26a1113, committed BEFORE any
evaluation). Fail-first RED: 2187a1d (6 failures on the
pre-implementation tree — component absent: ENOENT ×4; mount absent;
exact-surface scan count mismatch — raw output preserved in the session
artifacts, `scripts/c1/RED-output.txt`).

## What was built (PR #294, merged `f89549a`)

- `components/dashboard/DashboardBrief.tsx` — the SECOND real product
  surface: a thin client component that takes the server-resolved
  Stock-of-the-Day subject and fetches THE ONE route
  (`/api/intelligence?capability=thesis&subject=<symbol>`, 12 s
  timeout), rendering the route's A1-validated artifact through the A8
  primitives in the A8 composition order (badges → provenance →
  contradiction → evidence → uncertainty). The client adds NO second
  parser and no zod (the B1/C9 bundle discipline); no chain import
  (the A10 single-consumer scan unchanged); no advice strings; the
  honest loading/unavailable states for every non-200, timeout, and
  contract mismatch. DOM contract: `data-dashboard-brief={phase}` +
  `data-dashboard-brief-subject={subject}`.
- `components/dashboard/DashboardTail.tsx` — the mount, inside the
  ranked branch directly after the Stock of the Day section:
  `<DashboardBrief subject={stockOfDay.symbol} />` — the symbol the
  server already resolved (the deterministic IST-date pick, U4-gated);
  the client invents no subject. When the flag is off or no pick
  exists, no brief renders (absence is the honest state; the ranked
  trio's disabled panel explains why — no fabricated subject, no dead
  null branch).
- Bundle placement (C9, by construction): the brief lives inside
  DashboardTail's dynamic (ssr:false) chunk — ZERO first-load JS on
  "/" (measured: 159.1 kB vs the 159.0 kB baseline, within the +2 kB
  tolerance; the delta is build-hash noise, not brief code). The
  ssr:false placement is disclosed and production-verified via the
  hydrated DOM, not the HTML.

## Battery (all raw outputs preserved in session artifacts)

- `npx tsc --noEmit` → exit 0.
- `npx eslint .` → 0 errors / 283 warnings; ratchet holds at baseline.
- `npx vitest run` → **187 files / 2065 tests ALL PASSING** (B1
  baseline 186/2058; +1 file, +7 C1 pins).
- `npm run validate:encoding` → clean. T12 → 896/896. scoreParity →
  0 mismatches / 0 non-finite of 896. `aiLoopAudit` → **8/8** (no new
  router caller; the loop untouched). `routeIntegrity` → PASS (77
  routes / 82 hrefs).
- `npm run build` → clean; `verify:isr` PASS (/, /stock/[symbol] 896
  baked, cap 60 s); bundle budget PASS (all three routes OK).
- `git ls-files | grep -E "(^|/)\.env"` → `.env.example` only.
- `docs/PROVENANCE.md` regeneration → byte-identical (no new route).
- i18n: no new namespace keys (component-local strings, the B1 panel
  precedent); the pre-existing ta-locale gaps are unchanged.

## CI + merge

- CI on the PR head `10fe54e`: the C8 cadence gate bit TWICE inside
  the Lint job (13:56:03Z at 54.8 min; rerun 13:59:10Z at 57.9 min —
  both before the 14:01:17Z window) — honored, honest waits; attempt 3
  (14:05Z, window open) → **5/5 blocking jobs + Vercel preview all
  success** on the exact head.
- Merge-guard gates 0–6 (`scripts/ci/merge-guard.py`): gate 0 PR open
  base=main head=10fe54e2 mergeable_state=clean; gate 1 fresh fetch,
  main tip read #1 = bbaab5d; gate 2 merge-base == main tip (branch
  current); gate 3 all five required checks green on the EXACT head;
  gate 4 deploy-cadence PASS — last production-relevant merge 69.6 min
  ago; gate 5 main tip read #2 unchanged; gate 6 merge via API pinned
  to the validated SHA → **merge commit `f89549a342…`**.

## Production legs on the exact deployed SHA `f89549a…`

Raw output: session artifacts `scripts/c1/prod-legs-api.txt` (script
`scripts/c1/prodVerifyC1.mjs`) + the browser DOM capture below. ALL
PASS:

- **Deploy gate**: `/api/version` = `f89549a34265…` = the exact merged
  main tip (C6 deployed).
- **SOD subject discovered from the live page**: the RSC payload
  carries `stockOfDay":{"symbol":"CANBK"` — the server-resolved
  deterministic pick, the exact subject the brief consumes.
- **The brief IS mounted and ready** (the hydrated DOM positive
  control — B-18, ssr:false disclosed): `data-dashboard-brief="ready"`,
  `data-dashboard-brief-subject="CANBK"`, heading "Rishi Intelligence —
  CANBK", the A8 badges rendering the exact closed vocabulary
  (`status=unknown, confidence=low, materiality=low,
  modelStatus=deterministic`), provenance line "deterministic artifact,
  no model involved", 0 evidence rows / 1 uncertainty line — the
  honest empty-state discipline verbatim (unknown renders as unknown,
  never upgraded). Exactly ONE brief section on the page.
- **The brief's data path, captured from the deployed page**: the
  network log shows exactly `GET
  /api/intelligence?capability=thesis&subject=CANBK (Fetch) 200` — the
  ONE surface, the ONE deterministic capability. Route timings
  disclosed: wallMs 1769, chainMs 1428; changeKey `a5fe14256015…`;
  page TTFB warm 73–77 ms.
- **Refusal legs**: invalid capability → 400 `Invalid capability`;
  unknown symbol → 400 `Unknown symbol` (validation-first, zero
  consumption). The brief renders the honest unavailable state for
  every non-200.
- **Insight on the live chain**: honest 404 "No generated insight for
  this subject" — the pre-registered A4 fail-closed state (baselines
  accumulating; generation triggerable ~2026-11-03), zero AI spend.
- **Regression controls**: the B1 stock-page panel ready on the baked
  `/stock/RELIANCE` route (same honest badges); A8 fixture route 200.
  Browser session closed — zero residue.

## Honest scope notes (disclosed, not hidden)

- The brief pins `capability=thesis` (the deterministic artifact, live
  today). An `capability=insight` dashboard surface waits for the A4
  baseline window (~2026-11-03) and arrives by its own
  pre-registration — the registry stays `{thesis, insight}`; no new
  capability in C1.
- The brief renders inside the ssr:false tail chunk: its first paint
  and fetch are client-side (disclosed in the pre-registration;
  production-verified through the hydrated DOM and the captured
  network request, not the HTML).
- One subject per view (the deterministic pick). Multi-symbol breadth
  would multiply 403-row chain reads against the route's 30/60 s burst
  guard for no honest gain; broader surfaces arrive at Phase D by
  their own pre-registrations.
