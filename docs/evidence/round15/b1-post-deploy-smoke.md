# B1 — live parity proven, acceptance recalibrated, post-deploy smoke gate (Round 15)

Evidence for the B1 PR. All raw outputs as run 2026-10-04 22:13–22:30 UTC.
The founder's premise ("the live site doesn't show it") was TRUE at audit
time and is now resolved: production was stale when audited, and the
acceptance command itself could never reach its own bar. Both halves are
proven below.

## 1. The founder's exact commands, run from a clean shell (2026-10-04 22:29 UTC)

```text
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"9c05a963757fb2081ecc0e3504746fc1a87c10c4","now":"2026-10-04T22:29:48.815Z","node":"v24.21.0"}

$ curl -s -H 'Cache-Control: no-cache' https://rishi-terminal.vercel.app/stock/BANKBARODA | grep -c "Key Metrics\|Peer Comparison\|RISHI COMMENTARY\|Pillar Breakdown"
2
(exit 0)

$ curl -sI -H 'Cache-Control: no-cache' https://rishi-terminal.vercel.app/stock/BANKBARODA | grep -i "x-vercel-cache\|age\|x-nextjs"
age: 96
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: STALE
content-length: 182611
```

Live SHA `9c05a96` == `origin/main` tip. The page IS the prerendered ISR
document (x-nextjs-prerender: 1), 182.6 kB of raw HTML.

## 2. What live actually serves — occurrence counts, not line counts

```text
$ for p in "Key Metrics" "Peer Comparison" "RISHI COMMENTARY" "Pillar Breakdown" "PRICE UNAVAILABLE"; do
    printf '%-18s %s\n' "$p:" "$(curl -s "https://rishi-terminal.vercel.app/stock/BANKBARODA?cb=$RANDOM" | grep -o "$p" | wc -l)"
  done
Key Metrics:         3
Peer Comparison:     2
RISHI COMMENTARY:    1
Pillar Breakdown:    1
PRICE UNAVAILABLE:   0

$ wc -l < (the fetched HTML)
14
```

All four sections are in the live first byte. Same counts on /stock/SBIN.

## 3. Root cause — two independent reasons the founder's probe undercounted

**(a) Production was stale at audit time.** The audit ran against the
deploy-cap backlog (B-22/B-26): at the `1dcc66c` audit the tip had not
deployed; the sanctioned API retries then caught production up in steps
(recorded in `docs/RELEASE.md` §2026-10-04 and
`docs/evidence/round14/rate-limit-catchup.md`). Production now equals the
main tip, and the sections are present — the "live vs local" disagreement
is gone.

**(b) The acceptance command is miscalibrated.** `grep -c` counts matching
LINES, and the stock-page SSR HTML is 14 lines (minified) — the command
returns 2 on the FULLY FIXED page (section 1 above) and can never reach
the intended ">= 4". A passing build would have been reported as failing.
The corrected acceptance (also used by the parallel session's round15
reconciliation §2):

```text
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -o "Pillar Breakdown\|RISHI COMMENTARY\|Peer Comparison\|Key Metrics" | wc -l
7
```

## 4. The gate — scripts/ci/postDeploySmoke.mjs + post-deploy-smoke workflow

`deployment_status` (Production/success) and `workflow_dispatch`. Checks,
each with its control:

- version: /api/version serves a 40-hex sha; `--expect-sha` compares it to
  the deployment's SHA (C6).
- sections: each of the four A1 sections >= 1 occurrence on /stock/SBIN and
  /stock/BANKBARODA — occurrence-counted (`grep -o | wc -l` semantics), so
  minified line geometry cannot hide a missing section.
- price: "PRICE UNAVAILABLE" == 0 on both pages, behind a page-integrity
  control (`<h1` + "Rishi Terminal" marker) so the zero cannot come from a
  missing page (B-18).
- nullzero: "Promoter Hold0.0%" / "D/E Ratio0.0x" == 0 on BANDHANBNK with
  the "hidden for banks" panel control >= 1.

## 5. Fail-first (rules 21/24) — the gate bites on the actual defect

**Synthetic bite** (a required section that is not on the page):

```text
$ node scripts/ci/postDeploySmoke.mjs --section "NOT A REAL SECTION — fail-first probe"
…
FAIL  section /stock/SBIN "NOT A REAL SECTION — fail-first probe" — 0 occurrence(s)
FAIL  section /stock/BANKBARODA "NOT A REAL SECTION — fail-first probe" — 0 occurrence(s)
post-deploy-smoke: FAIL — 2 failed check(s)
EXIT: 1
```

**Real bite** — the pre-A1 build (c29dd81, `npm run build` + `next start`
locally, exactly the state the founder could not distinguish from live):

```text
$ node scripts/ci/postDeploySmoke.mjs --base http://localhost:3211
FAIL  version — HTTP 200, body not JSON with a 40-hex sha: {"sha":"unknown",…}
PASS  page-integrity /stock/SBIN — <h1 present: true; title marker: true; 96973 bytes
PASS  section /stock/SBIN "Key Metrics" — 2 occurrence(s)
PASS  section /stock/SBIN "Peer Comparison" — 1 occurrence(s)
FAIL  section /stock/SBIN "RISHI COMMENTARY" — 0 occurrence(s)
FAIL  section /stock/SBIN "Pillar Breakdown" — 0 occurrence(s)
PASS  price /stock/SBIN "PRICE UNAVAILABLE" — 0 occurrence(s) (must be 0)
PASS  page-integrity /stock/BANKBARODA — <h1 present: true; title marker: true; 97032 bytes
PASS  section /stock/BANKBARODA "Key Metrics" — 2 occurrence(s)
PASS  section /stock/BANKBARODA "Peer Comparison" — 1 occurrence(s)
FAIL  section /stock/BANKBARODA "RISHI COMMENTARY" — 0 occurrence(s)
FAIL  section /stock/BANKBARODA "Pillar Breakdown" — 0 occurrence(s)
PASS  price /stock/BANKBARODA "PRICE UNAVAILABLE" — 0 occurrence(s) (must be 0)
PASS  nullzero "Promoter Hold0.0%" — 0 occurrence(s) (must be 0)
PASS  nullzero "D/E Ratio0.0x" — 0 occurrence(s) (must be 0)
FAIL  nullzero panel control "hidden for banks" — 0 occurrence(s) (must be >= 1)
post-deploy-smoke: FAIL — 6 failed check(s)
EXIT: 1
```

The pre-A1 page is 97 kB (vs 182 kB fixed): RISHI COMMENTARY and the Pillar
Breakdown are absent from the first byte, and the bank metrics panel control
is absent — the exact class the founder's audit hit. The green run against
production is section 6.

## 6. The green run (production, this SHA)

```text
$ node scripts/ci/postDeploySmoke.mjs
PASS  version — live sha 9c05a963757f
PASS  page-integrity /stock/SBIN — <h1 present: true; title marker: true; 181997 bytes
PASS  section /stock/SBIN "Key Metrics" — 3 occurrence(s)
PASS  section /stock/SBIN "Peer Comparison" — 2 occurrence(s)
PASS  section /stock/SBIN "RISHI COMMENTARY" — 1 occurrence(s)
PASS  section /stock/SBIN "Pillar Breakdown" — 1 occurrence(s)
PASS  price /stock/SBIN "PRICE UNAVAILABLE" — 0 occurrence(s) (must be 0)
PASS  page-integrity /stock/BANKBARODA — <h1 present: true; title marker: true; 182110 bytes
PASS  section /stock/BANKBARODA "Key Metrics" — 3 occurrence(s)
PASS  section /stock/BANKBARODA "Peer Comparison" — 2 occurrence(s)
PASS  section /stock/BANKBARODA "RISHI COMMENTARY" — 1 occurrence(s)
PASS  section /stock/BANKBARODA "Pillar Breakdown" — 1 occurrence(s)
PASS  price /stock/BANKBARODA "PRICE UNAVAILABLE" — 0 occurrence(s) (must be 0)
PASS  nullzero "Promoter Hold0.0%" — 0 occurrence(s) (must be 0)
PASS  nullzero "D/E Ratio0.0x" — 0 occurrence(s) (must be 0)
PASS  nullzero panel control "hidden for banks" — 1 occurrence(s) (must be >= 1)
post-deploy-smoke: PASS (https://rishi-terminal.vercel.app, sha 9c05a963757f)
EXIT: 0
```

## 7. Incidents and corrections recorded while proving B1

- **Main-tip push run for 9c05a96 is RED by design** — the C8 cadence gate
  recorded that #159 merged 59.55 min after #158 (33 s short of the 60-min
  rule). The gate's contract says the check run IS the audit trail; it
  cannot retroactively unmerge. Any merge >= 60 min after 21:53:40 UTC
  clears cadence again.
- **A tooling false positive, retracted before merge (C1).** While proving
  B1 I briefly reported `LivePriceWidget.tsx:88` as a corrupted
  destructuring (`const arket, setMarket]`) that the TS parser silently
  recovered. That was an artifact of this audit shell: its Bash output
  channel consumes literal `[m`-style sequences (verified:
  `printf 'A[mB'` displays as `AB`; `printf 'A[market B'` as `Aarket B`),
  so the real line `const [market, setMarket] = useState<...>(...)`
  displayed with its `[m` eaten in every sed/cat/git-show view. The Read
  channel shows the true bytes; tsc, CI and production were never in
  conflict; no repair is needed and none is shipped. Lesson recorded:
  verify literal source bytes through a second channel before reporting a
  syntax defect.
- The Rishi Grid's "Zero Debt · D/E 0" tiles on bank pages trace to the
  SEED's `de: 0` for banks (data/stocks/index.ts) — placeholder-data
  accuracy inside the known G-A/FD-1 seed trust gap, not a render-layer
  regression. Not a new defect; flagged for the founder's FD-1 decision.
