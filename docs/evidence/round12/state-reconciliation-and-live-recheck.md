# R12 round record (partial) — state reconciliation, V1 live re-check, one-registry sweep re-verification

Date: 2026-10-03 (session start ~05:5x UTC) · Tree: `main = 256622a`
(PR #93 merge) · Production at session start: `faa2348` (PR #84) —
**8 merges behind main**; the main-HEAD production deploy is
Vercel-free-tier rate-limited.

## 1. State reconciliation (founder directives 2, 3, 24)

The prior session's worklog claim "V1 and V2 delivered" was premature when
written (PRs #85/#87 were then open). The founder audit snapshot (main =
`b089923`, #85/#87 open, last good deploy `03ef7fe`) was also stale by the
time this session started. Verified current state (GitHub + Vercel APIs,
2026-10-03 ~06:04Z):

| PR | Title | Merge | CI |
|---|---|---|---|
| #84 | R11-02 rate/yield intent scoping | `faa2348` (**= production**) | 4/4 green |
| #85 | **V1** SECURITY DEFINER EXECUTE lockdown | `0e008a55` | 4/4 green |
| #86 | R11-03 chat symbol canonical registry | `b089923` | 4/4 green |
| #87 | **V2** Greenblatt units fix + scorer-health gate | `597a44ab` | 4/4 green |
| #88 | R11-04 AI_LOOP reconciliation (docs) | `1a49e86` | 4/4 green |
| #89 | V2 proxy disclosure (directive 9) | `6b622c6` | 4/4 green |
| #90 | R11-05 round evidence (docs) | `0706c4c` | 4/4 green |
| #91 | R11-05 tenor precision + directive-15 matrix | `e2ae7e5` | 4/4 green |
| #92 | R11-06 search canonical registries | `051b35e` | 4/4 green |
| #93 | R12-01 re-land PR #83 unique tests | `256622a` | 5/5 green |

Exact conclusion, per the founder's directive 2: **V1, V2, and R11-03 are
merged and CI-green but NOT production-proven** — production serves
`faa2348`; every main merge after #84 has had its Vercel production deploy
rejected by the free-tier deployment rate limit (402; statuses on
`b089923`, `0706c4c`, `051b35e`, `256622a` all read "Deployment rate
limited — retry in 24 hours"). No completion claim is made for V1/V2/R11-03
until the final tree is deployed and probed at the exact SHA.

PR #83 (open, base `2eca197`, `dirty`) was closed superseded with a
commit→PR mapping comment: its R10-08/R10-09/R10-11 parts landed via
#84/#86/#88; its two unique test files (multi-tool composition proof =
directive 16; provider-401 refund proof = directive 24 lesson) were
re-landed byte-identical in #93 against `051b35e` and pass unmodified
(3/3, raw output in the #93 PR body).

## 2. V1 live-database re-check (post-merge, this session)

Full raw record: `docs/evidence/v1/live-recheck-2026-10-03.json`
(Supabase Management API `database/query`, same method as the original
V1 live audit). Results on the production database:

1. SECURITY DEFINER inventory: 9 functions; `try_quote_cache_refresh`
   **absent** — migrations 016/017/018 are still NOT applied live
   (`018 code ready` ≠ applied; the distinction directive 5 requires).
2. `quote_cache` table: absent (nothing to clean up — consistent with 1).
3. anon/authenticated EXECUTE on the 002 trigger functions
   (`handle_new_user`, `enforce_tier_write_protection`): **all false** —
   the live correction applied during the V1 session HOLDS.
4. V1.1 catalog invariant scan (as shipped in
   `scripts/ci/security_definer_invariants.sql`): **PASSES** on live.
5. `SET ROLE anon; SELECT public.handle_new_user()`: HTTP 400
   `42501 permission denied for function handle_new_user` — the
   direct-call vector stays closed.

Verdict: the live trigger lockdown holds; the full 016/017/018
application remains **FOUNDER DECISION NEEDED** (017 makes `quote_cache`
the serving surface — an architecture change, not a security patch).

## 3. One-registry sweep re-verification (directive 11)

- `node scripts/aiLoopAudit.mjs` → **OK, 8/8 checks** (unified AI-loop
  architecture invariants hold).
- Grep sweep for entropy sources outside the canonical registry:
  `STOCKS[...]` direct access, hand-rolled symbol regexes, alias maps,
  asset-class hand-lists. Findings:
  - Every API route touching `STOCKS` imports the canonical gate
    (`normalizeSymbolInput` / `resolveTickerSymbol`) before access
    (fundamentals, stock, rishis, chat, stock page).
  - `lib/consensus/stockResolver.ts`, `lib/scoring/*`,
    `lib/services/rishiMemory.ts` access the stock master directly —
    each is a documented stock-only concept layer (equity scoring,
    equity snapshots), per the R11-04 one-registry audit record.
  - Provider-specific symbol normalization (`.NS` Yahoo suffixing) lives
    only inside the `lib/livePrice` provider adapter — applied after
    canonical validation, which is the sanctioned boundary.
  - No hand-rolled symbol regexes found outside `lib/registry`.

## 4. Gates re-run on `256622a` (main, this session)

```
$ npx tsc --noEmit                                                    exit 0
$ npx eslint .                              0 errors, 303 warnings (< 305 ratchet)
$ npx vitest run                                    1008 tests, 1008 passed
$ npm run validate:encoding                                          PASS
$ npx tsx scripts/validateStocks.ts                     all T12 gates passed
$ npx tsx scripts/scoreParity.ts            0 mismatches / 0 non-finite of 916
$ npm run build                                              1012/1012 pages
$ npx vitest run test/scorerHealth.test.ts test/chatPersonaGreenblattDisclosure.test.ts
                                                          9/9 passed (V2 gates)
$ node scripts/aiLoopAudit.mjs                                    OK 8/8
$ git ls-files | grep -E "(^|/)\.env"                          .env.example
```

## 5. What remains for round closure (deploy-gated)

1. Production deploy of the final tree (this PR's merge is the trigger;
   the Vercel free-tier window decides timing — preview capacity was
   observed flowing again at 06:15:46Z).
2. `/api/version` == merged SHA (three-way identity).
3. Production proofs on that SHA: R9-12 4-case registry proof, ugly-path
   matrix, price provenance sweep, WTI symbol-context chat probe
   (directive 9 outer contract), Greenblatt distribution spot-check.
4. AI AFTER battery consideration on the final tree per directive 14
   (the 44/44 AFTER battery already ran on `7dbe1e8` = the R10-03 tree;
   the intent/symbol changes since then are behavior-relevant for the
   battery's financial rows — a re-run is warranted when quota permits).
