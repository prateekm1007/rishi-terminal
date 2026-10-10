# Round 39 (cont.) — INT-D2 closeout legs + the INT-A8-PRES follow-up

## 1. PR #300 (INT-D2 styling repair) — merged, deployed, live-proven

Merged `12be644` (CI run 37978726029 re-run after the C8 window opened
19:54:31Z — all five jobs green: quality incl. cadence gate, migrations,
docker, smoke 41/41, lighthouse). Production deploy verified:

```
$ curl -s https://rishi-terminal.vercel.app/api/version | jq -r .sha
12be644e2f218ee64764d626b1bfea132aedd82c
```

Production legs (real browser against the deployed site; probe script
persisted at scripts/d2-probe.cjs, failure injection clearly labelled
per leg):

- Badge touch target: computed box 50x28 px (was 42x17 pre-#300) —
  the WCAG 2.2 24 px minimum met by construction; `display:
  inline-flex`, pill radius, pointer cursor.
- Visible focus: keyboard Tab focus -> `outline-style: auto`; VLM
  screenshot verification ("clearly visible focus ring... white"
  against the dark row).
- No per-row fetch fan-out: `/stocks` renders 896 badges; the page
  load issues ZERO `/api/intelligence` requests (36 price batches +
  2 fundamentals + 2 screens only).
- Drawer geometry: fixed overlay inset 0, z-50, rgba(0,0,0,0.6)
  scrim; panel 640 px max-width, 85vh max-height, overflow-y auto,
  1 px var(--border), var(--bg-primary), radius 12, shadow — panel
  center x = viewport center (measured 640 in 1280).
- A8 composition in the drawer from the real 200 artifact for
  GUFICBIO; exactly ONE
  `GET /api/intelligence?capability=thesis&subject=GUFICBIO`.
- Abort on close: delayed-response probe -> `net::ERR_ABORTED`,
  drawer unmounted, NO resurrection after the delayed response
  lands (checked 3.2 s after close).
- Abort on switch (the modal's real flow open -> close -> open):
  GUFICBIO aborted, RELIANCE issued, drawer re-keyed to RELIANCE.
- Honest unavailable: injected 503 -> "Intelligence is not available
  for this subject right now." and the ready state never shown.

## 2. The parallel-session union (#301 + #302) and this follow-up

The #301 pre-registration (merged `4285ae6`) + #302 implementation
landed from the parallel session while this session's independent
repair was in flight (branch fix/int-a8-shared-surface, superseded by
the union — its unique value ported here). This follow-up carries the
pieces #302 leaves open, on top of `4425345`:

1. **The DOM-contract collision, root-fixed.** The inner state
   markers reused the surface-level phase attribute names, so the
   unavailable state produced TWO elements matching
   `[data-intelligence-panel]` (reproduced 3/3 runs:
   `section[data-intelligence-panel=unavailable]` + the nested
   `<p data-intelligence-panel="unavailable">`; the drawer and brief
   had the identical pattern; the #302 specs scoped AROUND it with
   `section[...]` selectors). Renamed to distinct names —
   `data-intelligence-unavailable`, `data-brief-unavailable`,
   `data-intelligence-drawer-state` — and pinned the absence of the
   colliding forms.
2. **The ONE canonical composition (rule 14).** The six-step sequence
   was repeated inline in four mounts; `ReadyComposition` defines it
   once. The three product surfaces mount it via next/dynamic
   ssr:false (the #299 C1 bundle pattern — the ready state is
   client-only by construction, so ssr:false changes zero SSR
   output); the fixture route imports it directly (SSR preserved for
   its assertions). Measured effect (CI-exact env):

```
/                       159.4 kB   (ratchet 159.1)  OK
/stocks                 163.2 kB   (ratchet 162.9)  OK
/stock/[symbol]         170.7 kB   (ratchet 171.2)  OK  — BELOW the re-locked baseline
```

3. **RED/GREEN for the follow-up**: the new pins
   (canonical-composition order + no-inline-copy +
   no-colliding-attributes) fail on the #302 tree (the inline
   composition and the colliding attributes are present there); all
   green after. Full battery on the follow-up tree: vitest 191 files
   / 2129 tests; tsc 0; eslint 0 errors / 283 warnings (ratchet
   holds); encoding PASS; smoke 46/46 (`--workers=1` in the 4 GB
   sandbox; CI runs the config's default parallelism); build + ISR +
   budget PASS.
