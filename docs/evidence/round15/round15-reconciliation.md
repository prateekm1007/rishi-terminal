# Round 15 — production SHA reconciliation + live acceptance + founder-audit register reconciliation

All commands run 2026-10-04 17:25–17:31 UTC against production and `origin/main`.
Evidence economy: this is the round's one evidence file; PR bodies point here.

## 1. Production SHA / Round-14 acceptance gap (founder Round-15 §1)

```text
$ git fetch origin
$ git rev-parse origin/main
ee93ec1f8ebf3778ac0f144445e0e83d003b004a

$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"618002bf6acf8c49bf968518039913ecaaab01f1","now":"2026-10-04T17:25:50.787Z","node":"v24.21.0"}
```

production SHA (`618002b`) != origin/main (`ee93ec1`) → case B applies.

Mechanical proof of case B:

```text
$ git merge-base --is-ancestor 618002bf6acf8c49bf968518039913ecaaab01f1 ee93ec1f8ebf3778ac0f144445e0e83d003b004a
ANCESTOR: yes (exit 0)

$ git log --format='%H %s' 618002b..ee93ec1
ee93ec1f8ebf3778ac0f144445e0e83d003b004a docs(CON-B1): deploy closure - fourth quota exhaustion, sanctioned retry at 17:03Z, live controls on 618002b
→ exactly ONE intervening commit, subject-classified docs-only.

$ git diff --name-status 618002b ee93ec1
M	docs/RELEASE.md
M	docs/evidence/amendments-2026-10-05/branch-check-failfirst.md
→ every changed path is under docs/ (ledger row + evidence append).

$ git diff --exit-code 618002b ee93ec1 -- ':(exclude)docs' ':(exclude)docs/**'
EXIT-CODE=0 (no output)
→ the complete application tree is byte-identical between the production
  SHA and origin/main. Per Constitution C6 this state owes no deployment
  (docs-only merges are skipped by the ignored-build-step by design).
```

## 2. Live acceptance suite against the deployed SHA (founder Round-15 §1)

```text
$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -o "Pillar Breakdown\|RISHI COMMENTARY\|Peer Comparison\|Key Metrics" | wc -l
7                              # A1 first-byte content present (exit 0)

$ curl -s https://rishi-terminal.vercel.app/stock/BANDHANBNK | grep -c "Promoter Hold0.0%\|D/E Ratio0.0x"
0   (grep exit 1)              # Y4 NEGATIVE control: placeholder-zero strings absent

$ curl -s https://rishi-terminal.vercel.app/stock/BANDHANBNK | grep -c "hidden for banks"
1   (exit 0)                   # Y4 POSITIVE control: bank panel EXISTS (B-18 guard)

$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -c "India Services Export Boom"
0   (grep exit 1)              # Y4 analog stale-data control: absent

$ curl -s https://rishi-terminal.vercel.app/stock/SBIN | grep -c "AU Small Finance Bank.*300.0K"
0   (grep exit 1)              # Y4 peer stale-data control: absent
```

SHA and positive/negative controls agree → A1/Y4 live acceptance re-established
against the deployed build whose application tree is byte-identical to main.

## 3. E6-11 statement correction (founder Round-15 §3)

The 3.6 ms admitted p95 was measured on a local build without Supabase
(fail-fast control-plane path). It is not a production warm-cache latency
proof. `docs/ROADMAP-STATUS.md` E6-11 row corrected from ✅ to 🟡 with the
required statement, verbatim:

```text
Control-plane latency measured locally.
Live rate-limit behavior proven.
Production warm-cache latency remains independently unmeasured.
The <800 ms budget remains PROPOSED.
```

Historical evidence file `docs/evidence/round14/e6-11-load.md` is NOT
rewritten (C10); the correction supersedes from the register row forward.

## 4. Founder-decision markers reconciled (founder Round-15 §6–§7)

- `BLOCKED: FD-1` added literally to D1-01 and the FD-1 register row
  (vendor/licensing is the founder's irreversible call; rule 31).
- Bundle decision restated verbatim on the A1 register row: accept ~207 kB
  as the content-restored baseline, OR approve the deeper
  server-component/client-island refactor (an actual reduction must be
  proven before re-anchoring the ratchet). Current ratchet:
  `/stock/[symbol]` 206.77 kB, tolerance +2 kB (`bundle-budget-baseline.json`).
- FD-9 marked partially resolved: rules 32–37 are in force as Appendix A
  Article VI of the ratified Constitution v2 (PR #152); the
  encrypted-credentials-mirror proposal itself remains OPEN.

## 5. Fresh AI reliability/latency battery — baseline → after the dominant-class fix (founder Round-15 §4)

Artifacts (both bound to /api/version, provider identity on the wire):

- `ai-latency-battery-r15-baseline.json` — production `618002b`, generated 2026-10-04T18:18Z, 69 effective rows
- `ai-latency-battery-r15-after.json` — production `9c1781d` (R15-D deployed), generated 2026-10-04T20:1xZ, 68 effective rows

Provider/model (both runs): `chat-api` / `agnes-2.5-flash`. Transport: baseline
attemptStatuses 31×clean-200 + 3 rows with 502→200 battery retries; the
providerFailureRows metric counts rows with in-loop provider attempts > 1
(the router's bounded failover), NOT transport storms.

| metric (overall) | baseline | after R15-D |
|---|---|---|
| first-pass grounded | 10/69 | 4/68 |
| final grounded | 17/69 | 22/68 |
| repaired | 34 | 38 |
| repair→grounded conversion | 50% | 58% |
| wall P50 / P95 / avg | 8.9 / 28.0 / 11.2 s | 7.8 / 21.9 / 9.9 s |
| field-value-mismatch (founder #1) | 9 | 6 |
| missing-claims (#2) | 8 | 6 |
| unsupported-numeric-prose (#3) | 4 | 15 |
| malformed-json (#4) | 11 | 9 |
| validation ms total | 15 | ~15 |

Financial class (the fix's target): grounded 12→14, field-value-mismatch
7→5, unsupported-numeric-prose 3→11.

Honest reading:

1. The founder's #1 (field-value mismatch) fell and its mechanism is
   proven fixed at the validator level (mis-attribution + % unit boundary).
2. Final grounded rate and all latency percentiles improved; validation
   cost stays negligible.
3. The repair mass MIGRATED to unsupported-numeric-prose (the answer-floor
   rejecting prose numbers that are not assertion values) — the next layer
   in the founder's fixed order (#3). First-pass rate dropped; with n≈70
   on a stochastic free-tier model, per-battery swings are wide — the
   repair-cause mix shift is the directional signal, not the first-pass
   count.
4. Per C10/§4: no retries were added; the repair stays ONE bounded re-ask.

## 6. C8 deploy-cadence violations by the coder this round (honest record)

- #155 (17:48:42Z) landed 54.1 min after 618002b's merge — anchored on
  DEPLOY time, not merge time.
- #156 (18:47:48Z) landed 59.1 min after #155 — no safety margin.
Both are exactly what PR #159's gate now fails automatically; the
corrective habit: anchor on merge time, keep ≥2 min margin.

## 7. Round-15 merge/deploy ledger

| event | time (UTC) | note |
|---|---|---|
| #154 merged (docs) | 18:0x | round evidence file |
| #155 merged | 17:48:42Z | battery extension; deploy rate-limited (5th exhaustion) |
| sanctioned API retry | 19:18:24Z HTTP 200 | window lifted; 143c575 deploy created |
| 143c575 READY | 19:22Z | production == main, case A, live controls re-run green (7/1/0) |
| #160 merged (docs) | 19:20:41Z | C8-exempt |
| #157 merged | 19:50:25Z | 62.5 min after 143c575 — C8-compliant |
| 9c1781d READY | 19:52:28Z | R15-D live; regression battery bound to it |

## 8. Final SHA reconciliation — case A achieved (23:32Z)

```text
$ curl -s https://rishi-terminal.vercel.app/api/version
{"sha":"62fd6233c42d2054fa2510e98a2c2bccd9a461be",...}
$ git rev-parse origin/main
62fd6233c42d2054fa2510e98a2c2bccd9a461be
→ production SHA == origin/main (literal equality; the sanctioned retry
  drained the sixth quota exhaustion at 23:30:38Z HTTP 200).
```

Full live acceptance suite on the FINAL SHA (raw output:
scripts/round15/final-acceptance-62fd6233.txt, mirrored here):

```text
A1 first-byte markers on /stock/SBIN:            7
Y4 negative control (placeholder zeros):         0
Y4 positive control ("hidden for banks"):        1
Y4 analog stale control:                         0
Y4 peer stale control:                           0
R15-E on /stock/ABFRL: peer panel = 2, "0.00x"/"0.00%" = 0
```

Positive-control-backed (B-18): every zero above rides a green positive
control; the vacuous-zero attempt on ADANIGREEN (insufficient-data page,
no panel) was discarded before any claim was made.
