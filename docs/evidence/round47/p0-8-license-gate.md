# Round-47 — P0-8 (score leg): THE PRICE-LICENSE GATE

**Founder directive 2026-10-11 (the licensing message), verbatim scope:**
"Treat any price-based score as unresolved until NSE answers in writing."
"Until those answers are in writing, use price-based scores for your own
use only."

Basis recorded by the founder: NSE's published domestic price list charges
fixed annual fees per website and per mobile app for displaying market
data, and its non-display policy defines automated calculations on its
market data as a separate usage needing its own agreement — valuation
frameworks (P/E, earnings yield, price-to-NCAV) ARE automated calculations
on prices.

## The change

- `lib/licensing.ts` — the closed license-state vocabulary
  (`unresolved | licensed`), `PRICE_DATA_LICENSE` (status `unresolved`,
  asOf 2026-10-11, authority + enquiry named), `priceScoresPublic()`
  fail-closed (rule 6). Client-safe like `lib/dataQuality.ts`. ONE switch;
  it flips only in the PR recording NSE's written answer — no env var, no
  client-controlled value (rule 7).
- `SCORER_VERDICT_CONTRACT` gains a REQUIRED `priceBased: boolean` —
  declared per scorer, compile-enforced. 18 of 20 declare `true`;
  Damani and Munger declare `false` (audited by grep, table below).
  Nemish declares `true` even though `pe` is absent from its `required`
  list — its Valuation pillar (15%) reads P/E; the honest classification
  is the code's behavior, not the required-list accident.
- `licenseRefusal(scorerName)` in `lib/scorers/verdictGuards.ts` — the
  honest null verdict naming the hold; consulted by all 20 scorers AFTER
  the P0-3 sector gate and the P0-2 placeholder guard, so the row-specific
  refusal reasons keep their exact evidence text (SBIN's lender-formula
  line, KWALITY's placeholder-zero line) and the license is the LAST line
  nothing price-based crosses.
- The stock page: `qvpsDual` is produced only when
  `priceScoresPublic()` (the QVPS pillars read P/E, P/B, market cap), and
  the live/delayed metadata branch names the hold instead of promising
  consensus + QVPS the page does not render (rule 1).

## The price-read audit (rule 1: the declaration is the code's behavior)

grep over `lib/scorers/*.ts` for `\.price|\.mktcap|\.pe\b|\.pb\b|marketCap`:

| Scorer | price-derived reads | priceBased |
|---|---|---|
| Graham | `s.pe`, `s.price` (NCAV discount) | true |
| Buffett | `s.mktcap` (owner-earnings yield) | true |
| Howard Marks | `s.pe`, `s.price/s.bvps`, `s.mktcap` | true |
| Jhunjhunwala | `s.mktcap` (price/cash-flow) | true |
| Basant | `s.pe` | true |
| Kacholia | `s.mktcap` (size band) | true |
| Kedia | `s.mktcap` (size) | true |
| Lynch | `s.pe` (PEG) | true |
| Pabrai | `s.pe` | true |
| Philip Fisher | `s.mktcap` (market-size band) | true |
| Porinju | `s.pe`, `s.price/s.bvps` | true |
| Raamdeo | `s.pe` (Price leg) | true |
| Walter Schloss | `s.price/s.bvps`, `s.mktcap` | true |
| Seth Klarman | `s.pe`, `s.price/s.bvps` | true |
| Soros | `s.price` (price-to-NCAV) | true |
| John Templeton | `s.pe`, `s.price/s.bvps`, `s.mktcap` | true |
| Greenblatt | `s.mktcap` (ROC cap, EY = np/mktcap) | true |
| Nemish | `s.pe` (Valuation 15%) | true |
| Damani | — | false |
| Munger | — | false |

Consequence while unresolved: 2 valid scorers < `MIN_VALID_SCORERS` 12 →
no consensus is reachable on ANY row (fail-closed, C2).

## Rule 21 — watched FAILING before the fix

```
$ npx vitest run test/licenseGate.test.ts
 FAIL  test/licenseGate.test.ts > ... > no consensus is reachable while unresolved: 2 valid < MIN_VALID_SCORERS 12
AssertionError: expected 78 to be null
 Test Files  1 failed (1)
      Tests  3 failed | 4 passed (7)
```

(The consensus assertion demonstrates the defect: an observed row produced
consensus 78 while price-based scores were unresolved.)

## GREEN

```
$ npx vitest run test/licenseGate.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

## Rule 24 — the gate bites

Deliberate violation: removed Graham's `licenseRefusal` consultation on
the working tree:

```
$ npx vitest run test/licenseGate.test.ts
 FAIL  ... > an observed non-lender row: every price-based verdict refuses with the license named
 FAIL  ... > no consensus is reachable while unresolved: 2 valid < MIN_VALID_SCORERS 12
      Tests  2 failed | 5 passed (7)
```

Restored the consultation:

```
$ npx vitest run test/licenseGate.test.ts
      Tests  7 passed (7)
```

## Full battery (Tier 2)

```
$ npx vitest run
 Test Files  203 passed (203)
      Tests  2263 passed (2263)
$ npx tsc --noEmit          # exit 0
$ npx eslint .              # 0 errors, 283 warnings (ratchet unchanged)
$ npm run validate:encoding # passed — no mojibake
$ npx tsx scripts/validateStocks.ts   # 896 symbols, all T12 gates passed
$ npx tsx scripts/scoreParity.ts      # 0 mismatches / 0 non-finite of 896
$ npm run build             # exit 0; 896 stock routes pre-rendered
```

Parity holds because the engine and the wire refuse identically.

## The test-file layering (why 8 files gained a licensed-state mock)

The 8 arithmetic-world suites (scorerBoundaries, scorerHealth,
scoring.finite, x6.nemishPlaceholders, x6.consensusGates,
placeholderRanking.round5, p02.nullNeverZero, p03.sectorGate) pin scorer
arithmetic on observed fixtures. The hold is a PUBLICATION policy, not
arithmetic — so those files pin the licensed state via a hoisted
`vi.mock('@/lib/licensing')` with a header comment pointing at
`test/licenseGate.test.ts`, and every assertion inside them is UNCHANGED
(no pin weakened — rule 23). Three layers result:

- hold-world pins (unresolved): `test/licenseGate.test.ts` — per-scorer
  refusal loop, consensus unreachability, row-specific reason precedence
  (SBIN keeps the sector text, placeholder rows keep the placeholder
  text), the licensed positive control, the classification pin.
- arithmetic-world pins (licensed): the 8 mocked suites — byte-identical
  assertions, differential proofs preserved (the sector gate's lender vs
  non-lender flip still proves itself).
- seed-world pins: run unmocked inside p02/p03 (those refusals precede
  the license gate).

## Not in this PR

- The display leg of P0-8 (source + as-of on every price; the "live"
  copy on /pricing, /forex, /crypto, /news) — separate PR.
- The delegated data-routing decision (launch universe, ticker master,
  macro series) — docs PR + the two enquiry drafts to the founder.
- Found defect, NOT silently fixed here (rule: report, don't drive-by):
  Nemish's `required` list omits `pe` while the scorer reads it — a
  P0-2 contract gap to reconcile in its own PR (behavior unchanged by
  this PR: the hold refuses Nemish everywhere today regardless).
