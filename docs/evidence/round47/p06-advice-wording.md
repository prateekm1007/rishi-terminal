# Round-47 P0-6 — the advice-wording sweep (founder order 2026-10-11)

**Item:** founder round-47 order 3: "Remove buy, sell and advice wording
from the UI: STRONG BUY, Long, Short, REDUCE, Avoid, 'Value Plays', and
'Short' in mode names. Test: a grep of UI strings returns zero hits."

## The replacement vocabulary (descriptive, never imperative)

| Was (advice)                     | Is (descriptive)                       |
|----------------------------------|----------------------------------------|
| STRONG BUY / BUY / HOLD / REDUCE / SELL (rendered) | Strongly Favorable / Favorable / Balanced / Unfavorable / Strongly Unfavorable (`actionLabel`, lib/scorers/types.ts — the one sanctioned render map) |
| STRONG_SHORT / SHORT (rendered)  | Severe / Marked / Early / Critical Deterioration |
| Grade "Avoid"                    | Grade "Weak"                           |
| 📈 Long / 📉 Short (mode toggles) | 📈 Upside / 📉 Downside                |
| "Short Risk Assessment"          | "Downside Risk Assessment"             |
| "Pharma Short Mode" (screener)   | "Pharma Deterioration Mode"            |
| "Strong Buy" / "Value Plays" (screener pills) | "High Conviction" / "Low P/E" |
| "Top Buy Signals" / "Short Radar" (dashboard) | "Top Ranked" / "Deterioration Radar" |
| LONG PICK / SHORT PICK (ritual)  | TOP PICK / BOTTOM PICK                 |
| consensus category "Avoid - …"   | "Low Conviction - Weak Framework Support" |
| knowledge-graph + elite-graph signals | STRONGLY FAVORABLE / FAVORABLE / BALANCED / UNFAVORABLE |
| macro stances (Strong Buy/Accumulate/Reduce/Avoid) | Strongly Supportive / Supportive / Critical / Opposed |
| block-deal sides BUY/SELL        | ACCUMULATION / DISTRIBUTION            |
| technical chips BUY/SELL         | UPTREND/DOWNTREND, POSITIVE/NEGATIVE   |

Plus every prose occurrence: commentary headlines, persona
philosophy/quote fields, wisdom-of-day bodies, glossary example,
WorldMarketsGrid readouts, bond theses, macro rationales (all locales),
bestFor tags (Multi-Year), fno tags (de-attributed, mechanical),
InsufficientDataRecord copy, terms-page copy, the dead rishiQuotes +
assetDetail i18n blocks (DELETED, rule 17 — zero consumers), and the
dead data/marketPulse module (DELETED — fabricated movers with BUY/HOLD/
AVOID signals, zero importers).

## Fail-first proof (rule 21)

The acceptance test was written first and run RED against the pre-sweep
tree — 52 residual hits, pattern-bite failures, and the runtime-label
failures, all visible in the test's own diagnostic output. GREEN:
`green-p06-advicewording-vitest.txt` — 5/5 passed, EXIT=0.

## The acceptance test — test/adviceWording.zero.test.ts

1. **The grep**: the founder's listed vocabulary as standalone words
   (hyphenated compounds excluded), over every UI-string file (app/,
   components/, lib/, data/, messages/ — all extensions), comments
   stripped, with each sanctioned exception documented inline:
   the terms-page legal disclaimer, the privacy policy, factual options
   strategy NAMES (Long Straddle / Short Strangle / Long Call / Long
   Put), the factual "Short Interest" metric, factual journalism
   ("short-seller Hindenburg"), historical position facts ("British
   Pound (Short)" — Soros 1992), internal enum keys (never rendered —
   `actionLabel` is the only render path), and server-side systemPrompt
   persona instructions (LLM instructions, not UI strings; the AI-loop
   stage governs model output vocabulary).
2. **Positive controls (B-18)**: the replacement vocabulary IS present
   (en.json keys, the Upside/Downside toggles, the Weak Framework
   Support label) — a gutted codebase cannot pass vacuously.
3. **The scan bites (C5)**: every pattern is proven against embedded
   pre-fix strings; sanctioned non-hits (long-term, top-down) stay
   non-hits.
4. **Runtime pins**: `actionLabel()` over the closed ActionType enum,
   `getGrade()`, the screener preset names.
5. **Mode names**: no preset name or description carries the vocabulary.

## Rule-23 re-pin (with the order named)

`test/pulseNullSemantics.round9.test.ts` — the block-deal side pins
read the old BUY/SELL vocabulary; re-pinned to ACCUMULATION/DISTRIBUTION
(the null semantics themselves unchanged and still biting).

## Full Tier-2 battery (GREEN)

tsc 0 · vitest **2250/2250** · eslint 0 errors / ratchet 283 exact ·
validateStocks PASS · scoreParity 0/896 · encoding PASS (UTF-8, all
locale rewrites) · build 1019 pages · ISR manifest PASS · Playwright
smoke **52/52** (navigation + SSR + breadcrumb + panel specs).

## Rollback

`git revert` of the single commit. The ActionType enum keys are
unchanged (stable internal contract); only rendered labels moved.
