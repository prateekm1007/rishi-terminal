# Post-W4 entropy / leakage audit (directive 21)

Date: 2026-10-03 · Tree: `main` at the W4 merge (`34353d3`) · Method: the
directive-21 category sweep (scripted greps; raw hits triaged by reading
each context). Anything outside the W4 task is RECORDED here as a scoped
task, not mixed into the W4 commits.

## Category results

1. **Direct provider fetches** — CLEAN. The only provider URLs live in
   `lib/ai/providers/{openaiCompatible,gemini}.ts`; every other hit is a
   test stub asserting those URLs.
2. **Duplicated ticker registries** — CLEAN as validation boundaries. Three
   hand-written lists exist, all DISPLAY/DEFAULT selections that flow
   through the canonical resolver, none used to validate symbols:
   `app/api/prices/route.ts` `DEFAULT_SYMBOLS` (the no-query batch default),
   `app/news/page.tsx` `tickerSymbols` (ticker-strip selection via
   `useLivePrices` → `/api/prices`), `app/api/news/route.ts`
   `extractTags` (editorial NEWS keyword tagging incl. cricket/macro words
   — not an instrument registry).
3. **Duplicated persona/system-prompt registries** — CLEAN. `systemPrompt`
   definitions exist only under `lib/chat/`.
4. **Seed fallbacks on live paths** — CLEAN. No `SEED_AS_OF`/seed-price
   fallback hits outside data/tests.
5. **`?? 0` on financial observations** — no NEW sites (W4 touched none);
   pre-existing sites triaged (scoped tasks below): predicate/matching
   coercions only, none displayed as an observed value.
6. **Browser-generated timestamps for market data** — CLEAN. Client
   `Date.now()`/`new Date()` uses are elapsed-time staleness display
   (`DashboardClient`), user-action timestamps (lab holdings/watchlist
   save dates), and a generic invalid-Date fallback in a formatting helper
   — never a market-data observation time.
7. **`String(err)` / raw upstream leakage** — CLEAN. All remaining
   `String(err)` uses are server-side `console.error`; the client-facing
   leak sites are comments documenting the already-fixed defects.
8. **Direct client fetches around market data** — CLEAN. Every browser
   fetch targets this app's `/api/*` routes; no provider or vendor URL is
   reachable from the browser.
9. **Route-specific hand-maintained symbol lists** — see 2: none used as a
   validation boundary (the canonical `lib/registry` gate owns validation).
10. **Stale/superseded modules** — `generateAnalystRecs`, `lib/backtest`,
    `ROTATING_SHORTS`, `AnalystRecommendations` all absent. One candidate:
    `lib/chat/stockEvidence.ts` (the seed-only N3 evidence builder,
    superseded by `buildAiEvidencePackage`; retained only for its
    labeling-contract tests — see scoped task E-2).

## Scoped tasks recorded (NOT fixed in W4 — directive 21)

- **E-1 (low)**: `lib/wisdom/stockParallels.ts` `getMetricBasedParallel`
  coerces eight null metrics to 0 for parallel-matching. No fabricated
  value is displayed, but a null-metric stock can match a "ROE ≈ 0"
  pattern instead of falling back to the sector/qualitative path. Scoped
  fix: treat null metrics as non-matching for that dimension.
- **E-2 (low)**: `lib/chat/stockEvidence.ts` is a superseded seed-only
  module retained for its labeling tests. Scoped decision: fold the
  labeling contract into the canonical assembler's tests and delete the
  module (rule 17), or document the retention as load-bearing.
- **E-3 (info)**: `lib/scorers/rishiScoreV2.ts` uses `(metric ?? 0)`
  inside three boolean predicates (`revenueCAGR3Y/5Y`, `opm > 15`,
  `piotroskiScore >= 7`). Null fails each predicate conservatively; if
  rule-16 strictness is wanted for predicates, scope an explicit
  null-handling pass. No user-visible fabrication today.
- **E-4 (info)**: `lib/fno/strategyEngine.ts` sums option greeks with
  `?? 0`. F&O is the documented honest-thin area behind the data gate;
  revisit together with the licensed-derivatives-data decision (FD
  boundary), not piecemeal.
