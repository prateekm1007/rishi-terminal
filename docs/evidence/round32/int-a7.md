# INT-A7 — Insight Cache / deterministic change key (round 32)

Roadmap item A7; dependencies A3/A4 (changeIds flow through; A1 contract
guards the payload). Execution rule 4: "A7 means a deterministic change
key + persistent cache — never in-memory memoization."

## The substrate (PR #278, merged `a3685a7`)

Branch `feat/int-a7-insight-cache` (parallel session), audited then
rebased onto `0b720f0b` (#281) by this session — the two stale commits
were docs-only; zero conflicts. Commit order proves the rule-21
sequence: pre-registration (`b67562c`) → fail-first tests (`78cee0e`,
RED: module-missing import) → implementation (`40d58e0`) → the
PUBLIC-grant revoke fix (`e6e5569`, a CI-invariant bite: anon EXECUTE
via the PUBLIC default) → renumber 031→032 after #279 claimed 031
(`a7199a0` + `209abbd`, honest parallel-session repair) → completion of
the missed module-header pointer (`05e3339`, this session).

Delivered surface:

- `lib/intelligence/insightCache.ts` — the ONE `changeKeyOf` (sha256
  over `feature|subject|sortedUnique(changeIds)`, registry-member and
  A1-bounds enforced, every refusal returns null — the honest no-key);
  `parseInsightPayload` = A1's `parseRishiInsight` (never a second
  parser); `writeCachedInsight` (parse-or-REFUSE before any write) and
  `readCachedInsight` (miss = null, rule 16) over the migration's two
  atomic SQL functions via `getAdminSupabase()` (service_role — the app
  path). No Map, no module cache, no clock, no randomness, no model
  surface (pinned by a static source scan in the suite).
- `lib/db/migrations/032_insight_cache.sql` — `insight_cache`:
  64-hex UNIQUE `change_key`, feature/subject bounds, jsonb-object
  payload CHECK, monotone `hit_count` (CHECK >= 0), DB-clock
  timestamps; RLS enabled with NO policies (deny-by-default client
  roles); `REVOKE ALL` on table and functions from
  anon/authenticated/PUBLIC; two atomic SQL functions — write (upsert:
  payload + generated_at replaced, hit_count PRESERVED) and read-hit
  (single-statement UPDATE…RETURNING — the B-10 no-read-then-write
  rule).
- `scripts/ci/insight_cache_invariants.sql` — real-Postgres proof:
  idempotent upsert collapse, atomic increment, regeneration preserving
  the counter, JSON-null / format / negative-counter rejection, RLS
  deny, function lockdown.
- CI wiring: the invariants run in the migrations job after 001…032.
- Tests: 9 fail-first pins (determinism, format, set semantics,
  cross-input divergence, closed registry over ALL features, bounds
  refusals, parse-or-refuse incl. the provider pin, input
  non-mutation, forbidden-surface scan).

Battery on the rebased head `05e3339`: tsc 0; eslint 0 errors / ratchet
283 holds; vitest **179 files / 1941 tests all passing** (main's 1932 +
the 9 A7 pins = exact). CI on the PR head: all six checks success
(incl. Migrations & RLS invariants on Postgres 16). One C8 cadence bite
on the stale-base head (recorded, honored — earliest safe merge passed
before the rebase landed). Merge: gates 0-6 printed, `a3685a7`
(2026-10-09 00:10:14Z); CI on the merge commit all success.

## The audit fix (PR #282, merged `433cc34`)

**Finding (this session, before any production apply):** 032 revoked the
two functions from PUBLIC/anon/authenticated but never re-granted
EXECUTE to `service_role` — the ONE role `getAdminSupabase()` uses.
REVOKE from PUBLIC removes the default grant for every role, so the
first A8+ consumer would have hit SQLSTATE 42501 at
`rpc('insight_cache_write')`. The 019/022 precedent pairs every such
revocation with an explicit service_role grant (the live chat spend
control proves the pattern on production).

**Honest gate note:** the CI harness's `ALTER DEFAULT PRIVILEGES … GRANT
ALL ON FUNCTIONS TO service_role` masks the omission on CI — a
service_role-positive assertion cannot bite on a missing grant there.
Disclosed inside the new invariant block (8b); it still bites any future
REVOKE-side regression. The production-side proof below is the true
red-then-green.

**Fix path:** DR.md fix-forward — 032 was never applied to production,
so the amended PR landed BEFORE first application (the sanctioned
amended-PR branch of rule "never edit an applied migration").
Pre-registration schema section amended to carry the grant. One C8
cadence bite on the fix head (22.3 min after #278; honored, job re-run
at window open → all green). Merge: gates 0-6, `433cc34` (01:25Z).

## Production leg (2026-10-09 ~01:26-01:30Z)

```
Deploy landed            -> /api/version sha 433cc342… (= main tip)
post-deploy-smoke        -> success (workflow 37869927735, C2 honored)
CI on merge commit       -> all success incl. Live content smoke (production)
Pre-apply probe          -> insight_cache absent; 031 present; users=11
PITR timestamp (DR.md)   -> 2026-10-09 01:28:48.463052+00
Apply (sanctioned path)  -> exact amended 032, one transaction, HTTP 201
```

Structural verification:

```
table public.insight_cache        -> exists
RLS                               -> relrowsecurity = true
policies                          -> 0 (deny-by-default client roles)
functions                         -> 2 (insight_cache_write / _read_hit)
ACLs                              -> {postgres=X/postgres,service_role=X/postgres}
                                    on BOTH functions — owner + service_role
                                    ONLY; no PUBLIC/anon/authenticated entry
                                    (the #282 grant materially present)
```

Live mechanical verification — `scripts/liveVerify032.mjs`, the EXACT
app path (PostgREST rpc with the service key = service_role), ALL PASS:

```
write#1  (service_role) -> HTTP 200, hit_count = 0   (fresh insert)
read_hit#1              -> row returned, hit_count = 1, last_hit_at = DB clock
write#2  (regenerate)   -> hit_count PRESERVED = 1, payload replaced
read_hit#2              -> hit_count = 2 (monotone), regenerated payload served
write#anon              -> HTTP 401, {"code":"42501",
                           "message":"permission denied for function
                           insight_cache_write"} — the revokes BITE on prod
cleanup                 -> DELETE 204; residue 0 rows (self-cleaned)
```

The first call is the decisive one: without #282 it would have failed
exactly like the anon probe does. The grant fix is proven on production,
not assumed.

## Final tuple

| Fact | Value |
| --- | --- |
| Substrate PR | #278 `a3685a7` (rebased `05e3339`; gates 0-6) |
| Grant-fix PR | #282 `433cc34` (DR fix-forward before first application) |
| Production serving | `433cc342…` — version, health, post-deploy-smoke, live content smoke all verified |
| Migration 032 | applied 01:29Z, sanctioned path, PITR 01:28:48.463052Z |
| Live verification | structural (RLS/policies/ACLs) + mechanical (write/read-hit/regenerate-preserve/refuse-anon/cleanup) via the real app path — ALL PASS |
| Tests | 9 new pins; battery 179 files / 1941 tests all passing |

A7 is CLOSED: deterministic change key + persistent cache exist, are
CI-pinned, merged, deployed, applied, and live-verified through the
exact runtime path. Consumers arrive at A8 (shared evidence UI reads
the A1/A7 contracts) and A9/A10.
