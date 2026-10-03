# R11-04 — One-registry audit (directive 10) + AI_LOOP.md reconciliation (directive 11)

Date: 2026-10-03 · Auditor session: R11 · Tree audited: `b089923` (post
R11-02/R11-03 merges; identical findings on `faa2348` for the untouched
files).

## Directive 10 — one-registry sweep

Method: searched for every direct `STOCKS[...]` access, symbol whitelist,
ticker regex, asset-class map, and local symbol list in the AI loop
(`app/api/chat/route.ts`, `lib/ai/*`), the price layer (`lib/livePrice.ts`),
and every API route / market surface. Raw commands (summarized):

```
rg -n "STOCKS\[" app/api lib/ai lib/livePrice.ts app/        # 7 sites (below)
rg -n "normalizeSymbolInput|isValidSymbolInput|resolveTickerSymbol" <those files>
rg -n "new Set\(|SYMBOL_TOKENS|PRICE_REGISTRY" lib/ai/*.ts   # composed sets only
rg -n "<ticker-regex patterns>" lib/ai/ app/api/chat/ lib/livePrice.ts   # none
node scripts/aiLoopAudit.mjs                                 # 8/8 invariants OK
```

Findings — every site is either canonical or a documented stock-only
decision:

| Site | Gate before the stock-master access | Verdict |
|---|---|---|
| `app/api/chat/route.ts` | `normalizeSymbolInput` (R11-03 fix) | canonical — the outer chat contract now accepts the full registry and canonicalises (USDINR → USD/INR, aliases → NSE) |
| `app/api/fundamentals/route.ts` | `normalizeSymbolInput` (line 32) | stock-only BY DESIGN — the endpoint serves equity fundamentals; non-equity registry symbols pass the gate then miss the security master (honest miss, not a second registry) |
| `app/api/stock/[symbol]/route.ts` | `normalizeSymbolInput` (line 23) | stock-only BY DESIGN (equity profile surface) |
| `app/api/rishis/[symbol]/route.ts` | `normalizeSymbolInput` (line 58) | stock-only BY DESIGN (Rishi verdicts are per-equity) |
| `app/stock/[symbol]/page.tsx` | `resolveTickerSymbol` (canonical alias path) | stock-only BY DESIGN (equity detail page) |
| `lib/ai/tools.ts` | `isValidSymbolInput` + `normalizeSymbolInput` (R9-12) | canonical — registry instruments: getPrices serves them, stock-only tools answer honest `no-data` |
| `lib/ai/financialIntent.ts` | `SYMBOL_TOKENS = STOCKS ∪ PRICE_REGISTRY_TOKENS` (composed from the two registry exports, never re-enumerated) | canonical composition |
| `lib/ai/evidence.ts` | `isValidSymbolInput` / `PRICE_REGISTRY_TOKENS` / `SLASHED` / `isBondSymbol` (all imported from the registry/price layer) | canonical — the non-equity package branch is registry-membership driven |

Mechanical enforcement already exists and stays green:
`test/routes.validateInput.test.ts` fails when any route reads
`symbol`/`symbols` params without importing the canonical gate, and
`scripts/aiLoopAudit.mjs` verifies the single-loop invariants (8/8 OK on
this tree). No new duplicate registry was found; the one directive-10
defect (the chat route's second boundary) was fixed in R11-03.

## Directive 11 — AI_LOOP.md reconciliation

The doc's "Honest gaps" section still described the pre-Commit-M
architecture: "The general (non-symbol) chat path is context-only by
design pending FD-10; the tool loop engages only on the evidence-bound
path." That contradicted the runtime (every request runs the same bounded
loop; no-evidence financial asks get reactive tool seeding and the
zero-tool-engagement repair/BLOCK). Reconciled in `docs/AI_LOOP.md`:

- The stale bullet is removed and replaced by a RECONCILED paragraph
  describing the actual contract (same loop, reactive seeding, fail-closed
  backstop, registry-wide symbol parameter).
- The tool-layer section now names the canonical registry gate and the
  R9-12 semantics (unknown-symbol vs honest no-data).
- The evidence-package table gains the `instrument:<sym>:non-equity` id
  class (R11-03) and the instrument-derived price-fact units (Rule 3).

Rule 1 requires documentation to describe the shipped architecture; with
this change the doc matches the runtime.
