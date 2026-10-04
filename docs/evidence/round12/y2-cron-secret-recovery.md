# Y2 — CRON_SECRET recovery exhausted; FOUNDER DECISION NEEDED

Date: 2026-10-04 (Sunday, pre-market). Task: Y2 (Round 12) — provision
`CRON_SECRET` as a GitHub Actions repo secret so the quotes-warm workflow
can authenticate to the ingest endpoint.

## The founder's contingency, triggered

The Y2 direction said: recover the value from the Vercel env (v9 decrypt,
prior sessions' method) and PUT it as a repo Actions secret; **if either
recovery step fails: FOUNDER DECISION NEEDED instead of a workaround.**
Recovery has failed. Evidence below is raw and complete.

## Recovery attempts (all failed)

1. **Vercel env decrypt — proven defective.** The current entry is
   `type=encrypted` (id `qAnRupArXuGViKBg`, targets production+preview,
   fetched value length 1184, prefix `eyJ2Ijoi` = a JWE envelope). The
   Round-11 incident (docs/evidence/round11/env-decrypt-incident-2026-10-03.md)
   already proved this API returns ciphertext envelopes, not plaintexts,
   for encrypted entries. Nothing new was attempted against it beyond the
   fetch that classified the entry.

2. **Credentials vault** (`download/rishi-credentials.txt`): keys are
   CHAT_API_BASE_URL, CHAT_API_KEY, GITHUB_PAT, GITHUB_REPO, HF_SECRETS_REPO,
   HF_TOKEN, SUPABASE_MGMT_PAT, SUPABASE_PROJECT_REF, VERCEL_PROJECT_ID,
   VERCEL_TEAM_SCOPE, VERCEL_TOKEN. No CRON_SECRET.

3. **HF mirror** (`prateekm1/rishi-terminal-credentials` /
   `rishi-credentials.b64`, rule 33 step 2, decoded 2026-10-04): identical
   key list. No CRON_SECRET.

4. **Operational caches** (`.secrets/probe.env`): holds a CRON_SECRET
   value of length 1184, prefix `eyJ2Ijoi` — an envelope (the Round-11
   incident explicitly flags this file as envelopes, not plaintexts).

5. **Known candidate values from prior session scripts.** The only
   plaintext CRON_SECRET any prior script recorded is
   `e2e-cron-7f3a9c…` (scripts/vercel_cron_redeploy.py, Sep 30). A
   side-effect-free behavioral probe against production
   (`POST /api/ingest/financials` — after auth it validates the body and
   returns 400 with no side effects) rejects it:

   ```
   candidate 'e2e-cron-7f3a…'  -> HTTP 401 {"error":"Unauthorized"}
   negative control (garbage)   -> HTTP 401 {"error":"Unauthorized"}   (probe bites)
   ```

   The current entry was created later (encrypted type) by an action whose
   value was generated at runtime (`secrets.token_hex(32)` in
   scripts/vercel_env_deploy.py) and never persisted to any sanctioned
   store. It is unknown to every store we hold.

## FOUNDER DECISION NEEDED: how to restore the warmer's secret

Recommended option (agent-executable on approval, ~10 minutes):

**Rotate CRON_SECRET with a coordinated cutover.**
1. Generate a new value (`token_hex(32)`) in memory; store it in the
   credentials vault AND the HF mirror (rule 32 — CRON_SECRET becomes a
   managed credential; this loss becomes unrecoverable-no-more).
2. PUT it as the GitHub Actions repo secret `CRON_SECRET`
   (libsodium-sealed via the repo public key).
3. Flip the Vercel project env to the new value **immediately before**
   merging the Y2 PR (the sanctioned GitHub-integration deploy picks it
   up; window: env-new/deployment-old lasts minutes and is scheduled
   away from the 13:30/13:45 UTC Vercel cron slots, so no cron 401s).
4. Post-deploy verify: financials probe 400-with-new-bearer (vs 401 with
   the old), workflow_dispatch of quotes-warm, Monday market-hours
   acceptance.

Alternative options: (a) the founder supplies the current plaintext if it
exists anywhere outside our stores; (b) the warmer waits until a founder
chosen rotation window. Note: per Constitution rule 36 this is not a
request to rotate a founder-provisioned token — CRON_SECRET is
agent-managed infra state (rotated before, on Sep 30) — but because the
rotation touches production auth, it is escalated rather than executed
unilaterally.

## Impact on Y2 if deferred

Everything else in Y2 ships: the endpoint, the schedule (the workflow
exists but its runs fail auth until the secret is set — disclosed),
peers/tiles first-byte coverage, health telemetry. Only the scheduled
warming itself waits on this decision.
