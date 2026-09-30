# CONSTITUTION — Rishi Terminal

Read this before you write any code. Re-read it before you open a PR.
Every rule here is either **Logic** (it follows from how systems fail) or **Evidence** (it already failed in this repo and an auditor caught it). Rules with Evidence were paid for. Do not repeat the incident.

An independent auditor will clone the repo and re-run everything you claim. Assume that, always.

---

## Article I — Truth

**1. Never state what you have not verified.** This covers code comments, UI text, PR descriptions, docs, CI step names, commit messages.
- Logic: an unverified claim is a bug that looks like documentation.
- Evidence: `SEED_AS_OF` was set to the day of the refactor while the values were unchanged June placeholders. CI step said "ratchet enforced" but ran no ratchet. An audit doc said "all ROE ≤ 100" (false) and "3 duplicates" (actually 43).

**2. Names must describe behavior.** A function, flag, config comment, or label that says more than the code does is a lie. Rename it or make it true.

**3. Label data by what it is.** Placeholder, illustrative, stale, live: say which. Never render seed data as live, never stamp today's date on old data. Missing data renders as `—`, never `0`, `NaN`, or a plausible guess.
- Evidence: seed prices (RELIANCE 2500) shown as current; `NaN` scores in the screener.

**4. Never fabricate.** No `Math.random()`/`Math.sin()` producing market numbers, no invented analysts, ratings, citations, patents, or backtests. If you cannot source it, the value is `null` and the UI says so.
- Evidence: fake P&L backtester, synthetic options chain, invented broker ratings with real names.

**5. Say "I don't know" or `BLOCKED: <what I need>`.** Never stub success to keep moving (no "demo mode returns verified: true").

---

## Article II — Safety (fail closed, server is the authority)

**6. Default deny.** Missing secret, missing config, unparseable input: refuse (401/403/503). Never fall through to "allowed".
- Logic: the failure you did not test is the one that runs in production.
- Evidence: `CRON_SECRET` unset → ingest open to the world; payment verify returned `verified: true` when the secret was unset.

**7. The client is untrusted. The server decides** identity, tier, price, amount, prompt, quota. Anything hidden only in the browser is public.
- Evidence: paywall in `localStorage`; client-supplied `systemPrompt`; paid Rishi verdicts shipped to every visitor.

**8. Secrets never enter the repo or the browser.** `NEXT_PUBLIC_*` is for values safe to publish. `.env*` ignored (only `.env.example`, no BOM). "The token expired" is luck, not a control.
- Evidence: two OIDC tokens committed in a public repo; a Finnhub key exposed via `NEXT_PUBLIC_`.

**9. Validate at every trust boundary.** Registry-check symbols, cap lengths and batch sizes, parse upstream payloads with `zod`. No `any` on data that crosses a boundary.

**10. Errors: generic outward, detailed inward.** Log detail server-side. Never echo upstream `details`/`raw`, stack traces, or SQL errors to the client.

**11. Money and state changes are atomic, idempotent, and retry-safe.** One transaction, one winner. A failure midway must leave a state that a retry can complete.
- Logic: networks fail between any two statements.
- Evidence: transaction marked `paid` before the tier update; if the update failed, every retry saw "already paid" and never granted access.

**12. Anything that spends money or quota needs auth, a persistent rate limit, and an atomic counter.** In-memory state on serverless is not state.
- Evidence: read-then-write chat quota (parallel requests beat it); per-IP `Map` limiter.

**13. Authorization lives in the database too.** Row-level security keyed to the real identity, and columns like `tier` protected by trigger. Assume someone will call the REST API directly with the anon key.

---

## Article III — Design

**14. One source of truth per concept.** One scoring engine, one tier model, one ticker registry, one migrations folder, one metrics resolver. Enforce it mechanically (`no-restricted-imports`, tests), not by good intentions.
- Evidence: two scorers correlated at 0.62 (368 of 985 stocks differed by ≥25 points); two tier systems (`seeker|student|disciple` vs `free|premium`); two migration folders that drifted.

**15. Fix the root cause, not the symptom.** If you are patching a display to hide a bad value, find where the value is made.
- Evidence: NaN masked at display while two scorers still returned NaN; a "duplicates fix" removed 3 of 43.

**16. `null` is a real value.** Degenerate inputs (zero revenue, empty arrays, delisted tickers) return `null`/"insufficient data" and every consumer handles it. Never coerce null to 0.

**17. Delete dead code.** Unused code with fabricated data is a loaded gun waiting for the next import.
- Evidence: `generateAnalystRecs`, `lib/backtest`, `ROTATING_SHORTS`, `AnalystRecommendations` (zero importers each).

**18. Render paths are deterministic.** No `Math.random()`, `Date.now()` or locale-dependent formatting in SSR/render code. Seed by IST calendar date if you need daily variation.

**19. Text is UTF-8, no BOM, always.** Edit source only with Node/TS or a UTF-8 editor. Never PowerShell `Set-Content`/`>`/`Out-File` on source files. Run `npm run validate:encoding`.
- Evidence: 44 mojibake lines (`â€”` shown to users); 7 BOM files including `.env.example`.

---

## Article IV — Verification

**20. Execute; do not assume.** Claims about behavior require running the code. "It should work" is not evidence.

**21. A test must be able to fail.** Write the test, watch it fail on the bug, then fix, then watch it pass. Paste both outputs.

**22. Test the ugly paths first:** unauthenticated, forged, replayed, oversized, concurrent, missing env var, upstream 500, empty and zero data. Happy-path-only suites missed every defect in this repo.

**23. Never weaken a check to make it pass.** No rule downgrades, `eslint-disable`, `@ts-ignore`, `skip`, `ignoreBuildErrors`, loosened thresholds, deleted tests. If a gate is wrong, fix the gate in its own PR with justification.
- Evidence: `no-explicit-any` downgraded from error to warning to reach "0 errors" (431 warnings remained).

**24. Prove every gate bites.** After adding a check, introduce a deliberate violation on a scratch branch and show CI fail. A gate that cannot fail is theater.

**25. Paste raw output.** No summaries like "verified" or "all pass". Command, exit code, output.

---

## Article V — Discipline

**26. Scope: fix what the task says.** No drive-by features, refactors, or reformatting. One commit per task ID (`fix(R2): …`). Small PRs.

**27. Read before you write.** Read the existing module before creating another. Grep for an existing helper. This is Next.js 16: read `node_modules/next/dist/docs/` before touching routing, proxy/middleware, caching, or auth conventions. Your memory of Next.js is out of date.

**28. If a task's premise is false, say so with evidence** and adjust. Do not implement a fix for a problem you have not reproduced.

**29. Leave the repo clean.** No `.bak`, `.backup`, `*_test.html`, files named after shell fragments. If you write an ignore pattern, test that it matches (`*.bak.*` did not match `.bak-2026…`).

**30. Docs are part of the change.** Update `docs/DATA_SOURCES.md` and comments when behavior changes. Mark superseded docs as superseded.

**31. Escalate what is not yours to decide:** what is paid vs free, legal/regulatory exposure (SEBI research/advice rules), data licensing, choice of third-party vendors. Write `FOUNDER DECISION NEEDED: <question>` and stop on that item.

---

## Article VI — Credential provisioning

**32. Credentials live in two places, and only these.** The local vault `download/rishi-credentials.txt` (chmod 600, outside the git repo) is the working copy. The durable mirror is the **private** HuggingFace dataset repo `prateekm1/rishi-terminal-credentials` (blob stored base64-obfuscated; restore instructions in that repo's README). Evidence: sandbox reset #4 wiped the local vault and blocked the Phase 5.1 push for an entire session until the founder hand-delivered tokens again.

**33. Lookup order after any sandbox reset or missing-credential state:** (1) read the local vault; (2) if absent, fetch `rishi-credentials.b64` from the HF mirror with the HF token and decode it; (3) only if both fail, ask the founder. Do not re-ask the founder for tokens that are already provisioned in either location.

**34. Tokens never enter the repo.** No token values in git-tracked files, code, logs, commit messages, or PR text; `git ls-files | grep -E "(^|/)\.env"` still shows only `.env.example`. The HF mirror is the one sanctioned out-of-repo store.

**35. The HF token is the root secret.** Every other credential is recoverable from the mirror, but the mirror is only reachable with the HF token. Treat its loss as unrecoverable-from-infrastructure: report `BLOCKED: credentials unrecoverable` and ask the founder.

**36. Founder policy (do not relitigate):** do not request rotation of provisioned tokens; do not lecture about chat exposure. Remind the founder only when a token is actually about to be used, saying which one and why.

---

## Before you code (checklist)

- [ ] I re-read the task and its acceptance commands.
- [ ] I grepped for existing code that already does this.
- [ ] I read the relevant Next.js 16 docs if the task touches framework conventions.
- [ ] I know which article(s) above this task can violate.
- [ ] I know what the negative-path test looks like before I write the fix.

## Before you open a PR (checklist)

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npx eslint .` 0 errors, warning count not higher than baseline, no rule downgraded
- [ ] `npx vitest run` all pass; new tests fail without the fix
- [ ] `npm run validate:encoding`, `npx tsx scripts/validateStocks.ts`, `npx tsx scripts/scoreParity.ts`
- [ ] `npm run build`
- [ ] `git ls-files | grep -E "(^|/)\.env"` shows only `.env.example`
- [ ] No new `any`, `Math.random`, hardcoded market numbers, or `NEXT_PUBLIC_*` secrets
- [ ] No claim in code, UI, docs, or PR text that I did not verify
- [ ] Raw command output pasted in the PR description

## Stop and report when

- A required service, secret, or credential is unavailable → `BLOCKED`.
- The task requires a product, legal, or pricing decision → `FOUNDER DECISION NEEDED`.
- You find a security or data-integrity defect outside your task → report it; do not silently fix it in the same commit.
- Two rules in this document conflict → follow the one that protects users and money, and say so.

## Amending this document

Add a rule only when a real incident or a sound logical argument justifies it. Each new rule needs a **Logic** or **Evidence** line. Never remove a rule to get a PR through.
