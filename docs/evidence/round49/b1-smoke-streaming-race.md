# Round 49 evidence — INT-B1 smoke strict-mode violation (streaming-SSR reveal race)

One topic, one file (evidence economy, Appendix C). The RED is CI run 38176708451
(GitHub's log is the durable record; the excerpts below are copied from it).

## RED (the failing main push-CI, 2026-10-11T21:36:16Z)

Run: https://github.com/prateekm1007/rishi-terminal/actions/runs/38176708451
(merge commit 7682263 = PR #372; job "Playwright smoke (blocking since round 2)").

```
1) test/smoke/b1-panel-removed.spec.ts:25:7 › INT-B1 ... › the honest no-verdict record renders
    Error: expect(locator).toBeVisible() failed
    Locator: getByText('NO VERDICT — ILLUSTRATIVE SEED DATA')
    Error: strict mode violation: getByText('NO VERDICT — ILLUSTRATIVE SEED DATA') resolved to 2 elements:
        1) <div>NO VERDICT — ILLUSTRATIVE SEED DATA</div> aka getByRole('main').getByText('NO VERDICT — ILLUSTRATIVE')
        2) <div>NO VERDICT — ILLUSTRATIVE SEED DATA</div> aka getByText('NO VERDICT — ILLUSTRATIVE').nth(1)
    Call log:
      - waiting for getByText('NO VERDICT — ILLUSTRATIVE SEED DATA')
        2 × locator resolved to <div>NO VERDICT — ILLUSTRATIVE SEED DATA</div>
          - unexpected value "hidden"
  1 failed
  53 passed (1.5m)
```

The poll sequence — a single element reported `hidden`, then two elements —
with element 1 uniquely resolvable inside `<main>` and element 2 only as
`.nth(1)`, matches React's streaming-SSR reveal mechanics: the boundary
completion arrives in a hidden completion container outside `<main>`; on a
contended runner the hydrated in-`<main>` copy and the not-yet-cleared
streamed copy coexisted for one poll.

## Reproduction matrix (local, this session, ~250 loads — never 2 elements)

| Probe | Runs | Result |
|---|---|---|
| `b1-panel-removed.spec.ts` isolated (`SMOKE_BASE_URL`, warm server) | 10 | 10 PASS |
| goto+assert loop probe (25 iterations, DOM inspected every poll) | 25 | 25 PASS, count=1 |
| Full smoke suite, warm server | 1 | 54/54 PASS |
| Full smoke suite, COLD server (kill → start → suite, CI sequence) | 3 | 3× 54/54 PASS |
| goto+assert under CDP network throttling (400 ms RTT, ~60 kb/s) | 12 | 12 PASS, count=1 |

The race never reproduced locally; the app has exactly one conditional render
path for the record (`components/stock/StockPageClient.tsx` — the two mounts
are tab-gated, only one tab can be active; nothing else mounts
`NoVerdictRecord` — grep-verified).

## The sibling control

`test/smoke/smoke.spec.ts:47` asserts the SAME positive control with
`.first()` and PASSED in the SAME CI run — the bare strict locator in the b1
spec was the only one that could throw on the transient.

## GREEN (with the fix)

```
$ SMOKE_BASE_URL=http://localhost:3000 npx playwright test test/smoke/b1-panel-removed.spec.ts --reporter=line
  1 passed (1.2s)
$ SMOKE_BASE_URL=http://localhost:3000 npx playwright test --reporter=line
  54 passed (2.3m)
$ npx tsc --noEmit
  (exit 0)
```

The fix scopes the positive control to `getByRole('main')` — the pin's
contract (the honest record is VISIBLE in the page's main content) is
unchanged; the absence pins and the no-thesis-fetch pin are untouched.
