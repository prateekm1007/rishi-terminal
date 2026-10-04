# CONSTITUTION — Rishi Terminal (v2)

**Ratified 2026-10-05** from the founder's amendment proposal (12 amendments plus a
"keep as is" set, delivered in-session; the PR that carries this file is the record).
Supersedes v1 (Articles I–VI, rules 1–37). Nothing was weakened by the restructure:

- Every v1 rule keeps its original number in **Appendix A** — cross-references like
  "rule 24" still resolve.
- Every v1 Evidence line is preserved in the **Appendix B incident log** (B-01…B-27);
  rules now point at log entries instead of carrying them inline.
- The founder's keep-as-is set — fail-first tests, root-cause fixes, default-deny,
  never weakening a check, honesty and provenance — is carried unchanged in C1–C5.

**How to read this document**

- **Core (C1–C10)** — the one-page rulebook. Re-read every session, before writing
  code and before opening a PR.
- **Appendix A** — the full rulebook (v1 rules 1–37, normative text preserved).
  Read on demand: before working in an area it governs (credentials → Article VI is
  mandatory reading first), before arguing a Core rule's edge case, before proposing
  a new rule.
- **Appendix B** — the incident log. Read it when tempted to bend a rule "just this
  once", and when adding a rule (an incident is the strongest justification a rule
  can carry).
- **Appendix C** — the PR template and evidence-economy rules.

Every rule is **Logic** (it follows from how systems fail) or **Evidence** (it
already failed in this repo and an auditor caught it). Rules with evidence were paid
for. Do not repeat the incident.

An independent auditor will clone the repo and re-run everything you claim. Assume
that, always.

---

## Core — read every session

**C1 — Verified truth only.** (rules 1–5)
Never state what you have not verified — this covers code comments, UI text, docs,
CI step names, commit messages, PR descriptions. Label data by what it is
(placeholder, illustrative, stale, live); missing data renders as `—`, never `0`,
`NaN`, or a plausible guess; never fabricate. If a task's premise is false, say so
with evidence. Say "I don't know" or `BLOCKED: <what I need>` — never stub success
to keep moving.

**C2 — Fail closed; the server is the authority.** (rules 6–10)
Missing secret, missing config, unparseable input: refuse (401/403/503), never fall
through to "allowed". The client is untrusted — the server decides identity, tier,
price, amount, prompt, quota; anything hidden only in the browser is public. Secrets
never enter the repo or the browser. Validate at every trust boundary
(registry-checked symbols, capped lengths and batch sizes, zod-parsed upstream
payloads). Errors: generic outward, detailed inward.

**C3 — Money and state changes are atomic, idempotent, retry-safe.** (rules 11–13)
One transaction, one winner; a failure midway must leave a state that a retry can
complete. Anything that spends money or quota needs auth, a persistent rate limit,
and an atomic counter — in-memory state on serverless is not state. Authorization
lives in the database too: RLS keyed to the real identity, tier columns
trigger-protected.

**C4 — Design integrity.** (rules 14–19)
One source of truth per concept, enforced mechanically, not by good intentions. Fix
the root cause, not the symptom. `null` is a real value — never coerced to 0. Delete
dead code. Render paths are deterministic (seed by IST calendar date for daily
variation). Text is UTF-8, no BOM, always.

**C5 — Verification is fail-first, and every gate must bite.** (rules 20–25)
Execute; do not assume. Write the test, watch it fail on the bug, fix, then watch it
pass — paste both raw outputs (command, exit code, output). Test the ugly paths
first: unauthenticated, forged, replayed, oversized, concurrent, missing env var,
upstream 500, empty and zero data. Never weaken a check to make it pass — if a gate
is wrong, fix the gate in its own PR with justification. Prove every new gate bites
(deliberate violation on a scratch branch, shown failing) before relying on it.

**C6 — Done = merged + deployed + live.** [amendment 2, 2026-10-05]
An item is done only when all three hold, each with evidence pasted in the PR:

- **Merged** — the commit is on `origin/main`.
- **Deployed** — `curl -s https://rishi-terminal.vercel.app/api/version | jq -r .sha`
  equals the latest deployment-relevant main SHA. Docs-only merges are skipped by the
  ignored-build-step by design; they do not redeploy and do not owe a deployment.
- **Live** — positive-control probes pass against the deployed site: the expected
  NEW content is present, not merely a defect string absent.
- Logic: "merged" was reported as done twice while production still served the
  pre-fix build (B-20, B-21).

**C7 — One item, one PR, one branch.** [amendments 4 + 8]
Before opening a PR, list open PRs and recent branches, and close anything
superseded in the same session (B-23). Always branch from `origin/main`, and assert
the branch name carries the task token before the first commit (`npm run
check:branch`) (B-25). Commit subjects carry the same token (`fix(TOKEN): …`). One
PR per item; small PRs.

**C8 — Deploy budget.** [amendment 3]
At most one production-relevant merge per hour; related PRs are stacked and land in
sequence. Docs-only merges are exempt (the ignored build step skips them). Before
merging, check remaining Vercel quota against the ledger in `docs/RELEASE.md`. When
quota is exhausted anyway, retry sporadically — the counter expires on
oldest-event age, not on a fixed clock (B-22, B-26).

**C9 — An optimization may not trade away a stated goal.** [amendment 5]
Every size/speed/budget gate gets a paired guard on what the optimization could
sacrifice: bundle budget ↔ first-byte content (B-24); ISR speed ↔ price freshness;
caching ↔ honest labels. When a legitimate optimization breaks a stated goal, the
goal is renegotiated with `FOUNDER DECISION NEEDED` — never silently re-anchored,
never fixed by weakening the check.

**C10 — Evidence discipline.** [amendments 6, 7, 9, 10, 11, 12]
- Every zero-count acceptance grep is paired with a **positive control** proving the
  surrounding content exists (B-18: a missing panel passes any absence check).
- Measure the **user-facing metric**: page TTFB p50/p95, cold + warm, over 10 pages
  (`scripts/measureTtfb.sh`) and Lighthouse LCP — a single API's p95 never stands in
  for the page (B-19).
- PRs use the fixed template — What / Why / Proof / Risk / Rollback, 15 lines max
  (Appendix C). One evidence file per round (`docs/evidence/roundN/`), not one per
  claim. Historical evidence files are never rewritten.
- **Tiered verification**: before every push run the fast gate (typecheck, lint +
  ratchet, tests for changed files); CI runs the full battery on every PR; hand-run
  the full battery only before reporting a round or merging.
- **Decision protocol**: escalate with a recommended default, keep working on
  unblocked items, and proceed with the default when the founder has not answered by
  the next session — if and only if the action is reversible and the decision is
  logged in the PR thread (B-26). Irreversible actions (data migrations, secret
  rotation, vendor selection) still wait.
- **English only**: code, comments, commits, PRs, docs, and replies to the founder.
- Scope discipline (fix what the task says, no drive-bys), read before you write
  (Next.js 16 docs — your memory of Next.js is out of date), leave the repo clean,
  docs are part of the change, and escalate what is not yours to decide — rules
  26–31 in Appendix A.

Credentials are governed by Article VI (rules 32–37, Appendix A): two stores only
(local vault + HF mirror), rule-37 caches, tokens never in the repo. Read it before
any credential handling.

---

## Appendix A — Full rulebook (v1 rules 1–37, numbering unchanged)

Normative text preserved from v1; each rule's Evidence line moved to Appendix B and
replaced by a pointer. Rules without a pointer rest on Logic alone.

### Article I — Truth

**1. Never state what you have not verified.** This covers code comments, UI text,
PR descriptions, docs, CI step names, commit messages. (Evidence: B-01, B-02, B-03.)

**2. Names must describe behavior.** A function, flag, config comment, or label that
says more than the code does is a lie. Rename it or make it true. (Logic.)

**3. Label data by what it is.** Placeholder, illustrative, stale, live: say which.
Never render seed data as live, never stamp today's date on old data. Missing data
renders as `—`, never `0`, `NaN`, or a plausible guess. (Evidence: B-04.)

**4. Never fabricate.** No `Math.random()`/`Math.sin()` producing market numbers, no
invented analysts, ratings, citations, patents, or backtests. If you cannot source
it, the value is `null` and the UI says so. (Evidence: B-05.)

**5. Say "I don't know" or `BLOCKED: <what I need>`.** Never stub success to keep
moving (no "demo mode returns verified: true"). (Logic.)

### Article II — Safety (fail closed, server is the authority)

**6. Default deny.** Missing secret, missing config, unparseable input: refuse
(401/403/503). Never fall through to "allowed".
- Logic: the failure you did not test is the one that runs in production.
- Evidence: B-06.

**7. The client is untrusted. The server decides** identity, tier, price, amount,
prompt, quota. Anything hidden only in the browser is public. (Evidence: B-07.)

**8. Secrets never enter the repo or the browser.** `NEXT_PUBLIC_*` is for values
safe to publish. `.env*` ignored (only `.env.example`, no BOM). "The token expired"
is luck, not a control. (Evidence: B-08.)

**9. Validate at every trust boundary.** Registry-check symbols, cap lengths and
batch sizes, parse upstream payloads with `zod`. No `any` on data that crosses a
boundary. (Logic.)

**10. Errors: generic outward, detailed inward.** Log detail server-side. Never echo
upstream `details`/`raw`, stack traces, or SQL errors to the client. (Logic.)

**11. Money and state changes are atomic, idempotent, and retry-safe.** One
transaction, one winner. A failure midway must leave a state that a retry can
complete.
- Logic: networks fail between any two statements.
- Evidence: B-09.

**12. Anything that spends money or quota needs auth, a persistent rate limit, and
an atomic counter.** In-memory state on serverless is not state. (Evidence: B-10.)

**13. Authorization lives in the database too.** Row-level security keyed to the
real identity, and columns like `tier` protected by trigger. Assume someone will
call the REST API directly with the anon key. (Logic.)

### Article III — Design

**14. One source of truth per concept.** One scoring engine, one tier model, one
ticker registry, one migrations folder, one metrics resolver. Enforce it
mechanically (`no-restricted-imports`, tests), not by good intentions.
(Evidence: B-11.)

**15. Fix the root cause, not the symptom.** If you are patching a display to hide a
bad value, find where the value is made. (Evidence: B-12.)

**16. `null` is a real value.** Degenerate inputs (zero revenue, empty arrays,
delisted tickers) return `null`/"insufficient data" and every consumer handles it.
Never coerce null to 0. (Logic.)

**17. Delete dead code.** Unused code with fabricated data is a loaded gun waiting
for the next import. (Evidence: B-13.)

**18. Render paths are deterministic.** No `Math.random()`, `Date.now()` or
locale-dependent formatting in SSR/render code. Seed by IST calendar date if you
need daily variation. (Logic.)

**19. Text is UTF-8, no BOM, always.** Edit source only with Node/TS or a UTF-8
editor. Never PowerShell `Set-Content`/`>`/`Out-File` on source files. Run
`npm run validate:encoding`. (Evidence: B-14.)

### Article IV — Verification

**20. Execute; do not assume.** Claims about behavior require running the code. "It
should work" is not evidence. (Logic.)

**21. A test must be able to fail.** Write the test, watch it fail on the bug, then
fix, then watch it pass. Paste both outputs. (Logic.)

**22. Test the ugly paths first:** unauthenticated, forged, replayed, oversized,
concurrent, missing env var, upstream 500, empty and zero data. Happy-path-only
suites missed every defect in this repo. (Evidence — general: B-06, B-09, B-10.)

**23. Never weaken a check to make it pass.** No rule downgrades, `eslint-disable`,
`@ts-ignore`, `skip`, `ignoreBuildErrors`, loosened thresholds, deleted tests. If a
gate is wrong, fix the gate in its own PR with justification. (Evidence: B-15.)

**24. Prove every gate bites.** After adding a check, introduce a deliberate
violation on a scratch branch and show CI fail. A gate that cannot fail is theater.
(Logic.)

**25. Paste raw output.** No summaries like "verified" or "all pass". Command, exit
code, output. (Logic.)

### Article V — Discipline

**26. Scope: fix what the task says.** No drive-by features, refactors, or
reformatting. One commit per task ID (`fix(R2): …`). Small PRs. (Logic; C7 adds the
branch-side rules.)

**27. Read before you write.** Read the existing module before creating another.
Grep for an existing helper. This is Next.js 16: read `node_modules/next/dist/docs/`
before touching routing, proxy/middleware, caching, or auth conventions. Your memory
of Next.js is out of date. (Logic.)

**28. If a task's premise is false, say so with evidence** and adjust. Do not
implement a fix for a problem you have not reproduced. (Logic.)

**29. Leave the repo clean.** No `.bak`, `.backup`, `*_test.html`, files named after
shell fragments. If you write an ignore pattern, test that it matches.
(Evidence: B-16.)

**30. Docs are part of the change.** Update `docs/DATA_SOURCES.md` and comments when
behavior changes. Mark superseded docs as superseded. (Logic.)

**31. Escalate what is not yours to decide:** what is paid vs free, legal/regulatory
exposure (SEBI research/advice rules), data licensing, choice of third-party
vendors. Write `FOUNDER DECISION NEEDED: <question>` and stop on that item.
(Logic; C10 adds: with a recommended default, and keep working on unblocked items.)

### Article VI — Credential provisioning

**32. Credentials live in two places, and only these.** The local vault
`download/rishi-credentials.txt` (chmod 600, outside the git repo) is the working
copy. The durable mirror is the **private** HuggingFace dataset repo
`prateekm1/rishi-terminal-credentials` (blob stored base64-obfuscated; restore
instructions in that repo's README). (Evidence: B-17.)

**33. Lookup order after any sandbox reset or missing-credential state:** (1) read
the local vault; (2) if absent, fetch `rishi-credentials.b64` from the HF mirror
with the HF token and decode it; (3) only if both fail, ask the founder. Do not
re-ask the founder for tokens that are already provisioned in either location.
(Logic.)

**34. Tokens never enter the repo.** No token values in git-tracked files, code,
logs, commit messages, or PR text; `git ls-files | grep -E "(^|/)\.env"` still shows
only `.env.example`. The HF mirror is the one sanctioned out-of-repo store. (Logic.)

**35. The HF token is the root secret.** Every other credential is recoverable from
the mirror, but the mirror is only reachable with the HF token. Treat its loss as
unrecoverable-from-infrastructure: report `BLOCKED: credentials unrecoverable` and
ask the founder. (Logic.)

**36. Founder policy (do not relitigate):** do not request rotation of provisioned
tokens; do not lecture about chat exposure. Remind the founder only when a token is
actually about to be used, saying which one and why. (Founder policy.)

**37. Operational caches are derived, never canonical.** Single-value credential
caches used by tooling live under `/home/z/my-project/.secrets/` (chmod 700 dir,
600 files, outside the git repo): `hf.token` (the root secret — bootstraps the rule
33 mirror fetch after a vault wipe) and `git-credentials` (git credential-store for
push/pull). Each holds exactly one credential, must be regenerable from the vault,
and never counts as a new store; the vault and HF mirror remain the only sources of
truth. *Logic: rule 33 step (2) is unexecutable after a sandbox reset unless the HF
token has a documented local home outside the wiped vault — otherwise every reset
ends in a founder interruption, against rule 36's spirit.* (Evidence: B-17.)

## Appendix B — Incident log

Read on demand. "v1" rows are the evidence lines carried in the v1 rule text
(pre-Round 10, undated there — recorded here without invented dates); "founder
audit 2026-10-05" rows come from the founder's amendment message, cross-checked
against repo evidence where a pointer exists. Historical entries are never
rewritten; supersede with a new entry.

| ID | When | Incident | Rule(s) | Source |
|---|---|---|---|---|
| B-01 | pre-R10 (v1) | `SEED_AS_OF` was set to the day of the refactor while the values were unchanged June placeholders | 1 | v1 rule 1 |
| B-02 | pre-R10 (v1) | CI step said "ratchet enforced" but ran no ratchet | 1, 25 | v1 rule 1 |
| B-03 | pre-R10 (v1) | An audit doc said "all ROE ≤ 100" (false) and "3 duplicates" (actually 43) | 1 | v1 rule 1 |
| B-04 | pre-R10 (v1) | Seed prices (RELIANCE 2500) shown as current; `NaN` scores in the screener | 3, 16 | v1 rule 3 |
| B-05 | pre-R10 (v1) | Fake P&L backtester, synthetic options chain, invented broker ratings with real names | 4 | v1 rule 4 |
| B-06 | pre-R10 (v1) | `CRON_SECRET` unset → ingest open to the world; payment verify returned `verified: true` when the secret was unset | 6 | v1 rule 6 |
| B-07 | pre-R10 (v1) | Paywall in `localStorage`; client-supplied `systemPrompt`; paid Rishi verdicts shipped to every visitor | 7 | v1 rule 7 |
| B-08 | pre-R10 (v1) | Two OIDC tokens committed in a public repo; a Finnhub key exposed via `NEXT_PUBLIC_` | 8 | v1 rule 8 |
| B-09 | pre-R10 (v1) | Transaction marked `paid` before the tier update; every retry saw "already paid" and never granted access | 11 | v1 rule 11 |
| B-10 | pre-R10 (v1) | Read-then-write chat quota (parallel requests beat it); per-IP `Map` limiter | 12 | v1 rule 12 |
| B-11 | pre-R10 (v1) | Two scorers correlated 0.62 (368 of 985 stocks differed by ≥25 points); two tier systems; two migration folders drifted | 14 | v1 rule 14 |
| B-12 | pre-R10 (v1) | NaN masked at display while two scorers still returned NaN; a "duplicates fix" removed 3 of 43 | 15 | v1 rule 15 |
| B-13 | pre-R10 (v1) | Dead modules with fabricated data, zero importers each: `generateAnalystRecs`, `lib/backtest`, `ROTATING_SHORTS`, `AnalystRecommendations` | 17 | v1 rule 17 |
| B-14 | pre-R10 (v1) | 44 mojibake lines (`â€”` shown to users); 7 BOM files including `.env.example` | 19 | v1 rule 19 |
| B-15 | pre-R10 (v1) | `no-explicit-any` downgraded from error to warning to reach "0 errors" (431 warnings remained) | 23 | v1 rule 23 |
| B-16 | pre-R10 (v1) | `*.bak.*` ignore pattern did not match `.bak-2026…` | 29 | v1 rule 29 |
| B-17 | 2026-10-01 | Sandbox reset wiped the local vault and blocked a push; recovery only avoided a founder round-trip because the tokens happened to be re-sent in chat | 32, 33, 37 | v1 rules 32/37; worklog |
| B-18 | Round 12 | Y4 acceptance grep `Promoter Hold0.0%` passed because the whole panel was missing — a zero count without a positive control proves nothing | C6, C10 | founder audit 2026-10-05 |
| B-19 | Round 11 | "114 ms warm p95" reported as page speed was the single-symbol price API, not the page | C10 | founder audit 2026-10-05 |
| B-20 | Rounds 13–14 | The "Connecting…" homepage fix was reported while production was still pre-fix | C6 | founder audit 2026-10-05 |
| B-21 | Round 12 | The quotes warmer was documented as working but had never run (remediated Round 14 A4: forced dispatch + verification, `docs/evidence/round14/a4-warmer-run.md`) | C6 | founder audit; repo evidence |
| B-22 | 2026-10-03/04 | The 100/day Vercel cap locked production three times; 10 of 12 merges in one six-hour stretch never deployed | C8 | founder audit; `docs/RELEASE.md` ledger, `docs/evidence/round14/rate-limit-catchup.md` |
| B-23 | Rounds 9–13 | #123 and #124 opened for the same item; #83 conflicted with #84 and #86; #32 left open for days | C7 | founder audit 2026-10-05 |
| B-24 | Round 14 | Hitting the 200 kB bundle budget moved metrics, peers and commentary out of the server HTML (first-byte regression; fixed in A1, PR #140) | C9 | founder audit; `docs/evidence/round14/a1-*` |
| B-25 | pre-R9 (v2/N9) | V2 and N9 each landed on the wrong branch and had to be rescued | C7 | founder audit 2026-10-05 |
| B-26 | 2026-10-03/04 | `CRON_SECRET` rotation and the live migration stalled waiting on the founder; deploy-counter lesson: retry sporadically — resets on oldest-event expiry, not a fixed clock | C10 | founder audit; `docs/evidence/round12/y2-cron-secret-recovery.md`, `docs/evidence/commit-o/deploy-blocker-and-closure-runbook.md` |
| B-27 | Rounds 9–14 | The commit-scope registry added a push-blocking step and constant per-task registry maintenance; retired in favor of the branch-name check (founder amendment 10 — a sanctioned gate replacement, not a weakening-by-stealth) | C7 | founder audit; `scripts/ci/commit-scope-registry.json` (retired) |

## Appendix C — PR template and evidence economy

Every PR description uses the fixed template (`.github/pull_request_template.md`),
15 lines max across the five sections:

```
## What
## Why
## Proof
## Risk
## Rollback
```

- **What** — the change, one to three lines.
- **Why** — the task ID, the defect, or the amendment that justifies it.
- **Proof** — raw command output (command, exit code, output) for the acceptance
  commands, including the positive control (C10) and fail-first evidence for new
  gates (C5).
- **Risk** — what could break, and the paired guard that covers it (C9).
- **Rollback** — the exact command or the revert range.

Evidence economy: one evidence file per round (`docs/evidence/roundN/<topic>.md`),
not one per claim — PR descriptions carry pointers, not payloads. "Proof" lines
that name a production state must come from the deployed site, not the local
machine, whenever the claim is about production (C6).

---

## Checklists

### Before you code

- [ ] I re-read the task and its acceptance commands.
- [ ] I grepped for existing code that already does this.
- [ ] I read the relevant Next.js 16 docs if the task touches framework conventions.
- [ ] I know which Core rules and Appendix rules this task can violate.
- [ ] I know what the negative-path test looks like before I write the fix.
- [ ] I branched from `origin/main` and the branch name carries the task token
      (`npm run check:branch`).

### Tier 1 — fast gate, before every push

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npx eslint .` 0 errors, warning count not above the ratchet baseline, no rule
      downgraded
- [ ] Tests for the files I changed pass; new tests fail without the fix
- [ ] Diff contains no secrets, no new `any`, no `Math.random()`, no hardcoded
      market numbers, no `NEXT_PUBLIC_*` secrets
- [ ] Commit subjects carry the task token; the branch still carries it

### Tier 2 — full battery (CI runs it on every PR; hand-run before reporting or merging)

- [ ] `npx vitest run` all pass
- [ ] `npm run validate:encoding`, `npx tsx scripts/validateStocks.ts`,
      `npx tsx scripts/scoreParity.ts`
- [ ] `npm run build` (plus the ISR manifest gate and the bundle budget)
- [ ] `git ls-files | grep -E "(^|/)\.env"` shows only `.env.example`
- [ ] No claim in code, UI, docs, or PR text that I did not verify
- [ ] Raw command output pasted in the PR description (What / Why / Proof / Risk /
      Rollback)

### Stop and report when

- A required service, secret, or credential is unavailable → `BLOCKED`.
- The task requires a product, legal, or pricing decision →
  `FOUNDER DECISION NEEDED` with a recommended default; keep working on unblocked
  items (C10).
- You find a security or data-integrity defect outside your task → report it; do
  not silently fix it in the same commit.
- Two rules in this document conflict → follow the one that protects users and
  money, and say so.

## Amending this document

Amendments are proposed by the coder or the founder and take effect with the
founder's approval recorded in the PR thread (the 2026-10-05 round was delivered by
the founder in-session; the PR carrying this file is the record). Every new rule
needs a **Logic** or **Evidence** line — an incident-log entry is the strongest
justification a rule can carry. Never remove or weaken a rule to get a PR through;
gate replacements (e.g. B-27, the commit-scope registry → branch-name check) need
the founder's explicit authorization and are recorded in the incident log.


