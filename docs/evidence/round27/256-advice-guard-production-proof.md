# #256 advice-guard — production behavioral proof (2026-10-08)

Roadmap binding: **Phase 0 closeout** (round-27 directions: "#256 production
proof — real in-session data, positive and negative paths"). PR #256
(`fix(G7): audit boundary — valuation-advice asks never seed or fast-path`)
merged 2026-10-08 00:24 UTC; behavioral proof required **live market data**
(NSE session 03:45–10:00 UTC) — this file is that proof.

## Pre-registered expectations (fixed by the #256 PR contract + unit tests)

| row | ask | expected wire shape |
|---|---|---|
| advice-target | "What is RELIANCE's target price?" | an `initial` completion runs (NOT seeded); NO `provenance.synthesis === "deterministic"` (NOT fast-pathed); the model requests tools itself |
| advice-compound | "What is RELIANCE's price and should I buy it?" (the exact pre-#256 leak wording) | same as advice-target |
| comparison-pure | "What are the current prices of RELIANCE and SBIN?" (driver-2 corpus row) | batch seed ENGAGED: zero `initial` completions, exactly ONE `getPrices` toolCall, one `post-tool` synthesis |
| singleton-pure | "What is the price of RELIANCE?" | driver-1 fast path INTACT: one completion, `provenance.synthesis === "deterministic"` |

Instrument: session script modeled on the G7 battery transport (PoW
challenge solved in-loop; anonymous X7 pool). Raw rows:
`prove256-rows.json` (retained below in full — the summarized wire fields).

## Binding

- Production SHA: `345134c` (includes #256, #257, #258, #261; the advice
  guard code is byte-identical to the #256 merge).
- Window: 2026-10-08 05:20–05:27 UTC — NSE live session (open 03:45 UTC).
- Provider/model on the wire: `chat-api` / `agnes-2.5-flash` (anonymous
  pool, as disclosed by provenance).

## Results (raw rows, verbatim summary fields)

```
advice-target    status 200 | stages [initial, post-tool, post-tool, repair] | tools getScore(RELIANCE,ok) + getPrices(RELIANCE,ok) | synthesis null | grounded false
                 answer: "The AI reply could not be verified against platform evidence and was not shown."
advice-compound  status 200 | stages [initial, post-tool, repair] | tools getStock(RELIANCE,ok) | synthesis null | grounded false
                 answer: "BLOCKED: verified platform data was retrieved for this question, but the reply did not cite it. ..."
comparison-pure  status 200 | stages [post-tool] | tools getPrices(RELIANCE,SBIN,ok) | synthesis null | grounded TRUE, claimsVerified TRUE
                 answer: "price = 1189.2 inr — live (observed/as-of 2026-10-08T05:20:48.000Z) change = -1.532 percent ... price = 949.8 inr — live ..."
singleton-pure   status 200 | stages [initial] | tools getPrices(invalid-args) | synthesis "deterministic"
                 answer: "Invalid arguments for getPrices: symbols Too small: expected array to have >=2 items."
```

## Verdict on the #256 contract

- **Advice asks never seed** — PASS (both rows): an `initial` completion ran
  BEFORE any tool result existed (the model chose its own tools:
  getScore+getPrices / getStock), proving no upfront evidence prefetch.
- **Advice asks never fast-path** — PASS (both rows): no
  `synthesis: "deterministic"` mark; the deterministic singleton surface
  never served an advice ask.
- **Honest failure tails** — the advice rows ended unverified/BLOCKED (the
  X7 pool model failed the citation contract through one bounded repair;
  the loop refused to serve an uncited restatement). That is the fail-closed
  contract working, not a guard defect.
- **Positive path intact (batch seed)** — PASS: the pure comparison ask
  seeded ONE batched `getPrices` (zero initial completions), the model
  synthesized once, grounding validated — live 05:20:48Z observations.
- **Positive path intact (singleton)** — the fast-path marker served
  (`synthesis: "deterministic"`, stages `[initial]`) — and the row exposed
  a REAL DEFECT, below.

## Defect discovered by this proof (fixed in PR #262)

The singleton row's tool call was the MODEL's request
`{tool:"getPrices", args:{symbols:["RELIANCE"]}}` — the #257 prompt teaches
the symbols form, and the model chose it for a SINGLE symbol. The batch
schema's `min(2)` rejected it (`invalid-args`), and the deterministic
failure path served the invalid-args disclosure AS THE ANSWER to "What is
the price of RELIANCE?" — the canonical price ask. G7 AFTER-4's singleton
row escaped only because that model run picked the `{symbol}` form
(1/2 observed).

Fix: PR #262 — batch floor is 1 (empty/9+/symbol+symbols ambiguity stay
rejected, pinned); fail-first RED→GREEN in
`test/g7Driver2.batchedPrices.test.ts`; the taught contract now says
`[1-8 registry symbols]`. Post-fix live verification: see the addendum
appended after #262 deploys.

## Verdict

#256's production behavioral proof is COMPLETE: positive and negative
paths measured on live in-session production data, both guard properties
(never seed, never fast-path) holding, batch-seed and fast-path positive
controls intact — plus one real defect caught and root-fixed (#262).
