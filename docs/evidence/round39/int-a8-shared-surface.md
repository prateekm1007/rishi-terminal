# Round 39 — INT-D2 closeout legs (#300) + the INT-A8 shared-surface repair

## 1. PR #300 (INT-D2 styling repair) — merged, deployed, live-proven

Merged `12be644` (CI run 37978726029 re-run after the C8 window opened
19:54:31Z — all five jobs green: quality incl. cadence gate, migrations,
docker, smoke 41/41, lighthouse). Production deploy verified:

```
$ curl -s https://rishi-terminal.vercel.app/api/version | jq -r .sha
12be644e2f218ee64764d626b1bfea132aedd82c
```

Production legs (real browser against the deployed site; raw session
in the worklog; probes at scripts/d2-probe.cjs):

- Badge touch target: computed box 50x28 px (was 42x17 pre-#300) —
  the WCAG 2.2 24 px minimum met by construction; `display:
  inline-flex`, pill radius, pointer cursor.
- Visible focus: keyboard Tab focus -> `outline-style: auto`; VLM
  screenshot verification ("clearly visible focus ring... white"
  against the dark row; screenshots badge-kbd-focus.png).
- No per-row fetch fan-out: `/stocks` renders 896 badges; the page
  load issues ZERO `/api/intelligence` requests (36 prices batches +
  2 fundamentals + 2 screens only).
- Drawer geometry: fixed overlay inset 0, z-50, rgba(0,0,0,0.6)
  scrim; panel 640 px max-width, 85vh max-height, overflow-y auto,
  1 px var(--border), var(--bg-primary), radius 12, shadow — panel
  center x = viewport center (measured 640 in 1280).
- A8 composition in the drawer: badges -> provenance ->
  (contradiction conditional) -> evidence -> uncertainty, rendered
  from the real 200 artifact for GUFICBIO.
- Single fetch: exactly ONE
  `GET /api/intelligence?capability=thesis&subject=GUFICBIO -> 200`.
- Abort on close: Playwright delayed-response probe — close while
  pending -> `net::ERR_ABORTED`, drawer unmounted, NO resurrection
  after the delayed response lands (checked 3.2 s after close).
- Abort on switch (the modal's real flow: open -> close -> open
  another): GUFICBIO aborted, RELIANCE issued, drawer re-keyed to
  RELIANCE.
- Honest unavailable: injected 503 (the route's documented failure
  contract) -> "Intelligence is not available for this subject right
  now." and the ready state never shown (no fake artifact).

## 2. The A8 shared-surface repair — RED first, then green

RED on the pre-repair tree (`npx vitest run
test/intelligenceEvidence.test.ts`):

```
Tests  13 failed | 15 passed (28)
```

(the 13 new pins: prose passthrough, excludedVerdicts, ThesisProse
rendering, empty-evidence wording, breakdown data attributes, CSS
selector presence, bullet removal, three-surface pins; raw listing in
scripts/a8-red-output.txt).

GREEN after the repair: 28/28 on the file; full suite 189 files /
2122 tests; tsc 0; eslint 0 errors / 283 warnings (ratchet holds);
encoding, stocks (896), parity 0 mismatches; build + ISR gate pass;
full Playwright smoke 44/44 (41 existing + 3 new directive-9 specs,
`--workers=1` in the 4 GB sandbox; CI's 16 GB runners run the
config's default parallelism).

## 3. The bundle ratchet bit (correctly) — and the fix

First implementation (two eager prose primitives) failed the
/stock/[symbol] ratchet: 171.7 kB vs baseline 169.2 (+2.5 > +2.0
tolerance, C3 founder Round 16). Root fix, not a re-lock: the ONE
canonical `ReadyComposition` (the A8 closed set in the A8 order,
defined once) mounted by all three surfaces via `next/dynamic`
ssr:false — the #299 C1 bundle pattern. The ready state is
client-only by construction (it renders only after each surface's
fetch resolves), so ssr:false changes zero SSR output. Final
measurements (CI-exact env):

```
/                       159.4 kB   (ratchet 159.0)  OK
/stocks                 163.2 kB   (ratchet 162.0)  OK
/stock/[symbol]         170.8 kB   (ratchet 169.2)  OK
```

## 4. A DOM-contract defect the new tests exposed (fixed in the same PR)

`[data-intelligence-panel]` resolved to TWO elements in the
unavailable state: the surface section carries the phase attribute
AND the inner unavailable paragraph carried the same attribute name
(`data-intelligence-panel="unavailable"`) — the drawer
(`data-intelligence-drawer` on the dialog + the inner P + the ready
div) and the brief (`data-dashboard-brief`) had the identical
collision. Renamed the inner state markers
(`data-intelligence-unavailable`, `data-brief-unavailable`,
`data-intelligence-drawer-state`) — the surface-level phase
attribute is now unambiguous everywhere.
