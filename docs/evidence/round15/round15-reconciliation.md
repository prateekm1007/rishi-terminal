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
