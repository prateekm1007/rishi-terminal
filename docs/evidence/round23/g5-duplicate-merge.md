# G5 — duplicate-seed-instrument registry merge (round 23)

Founder G-series item: "G5 duplicate-symbol cleanup and provider decision."
This file is the verification record and the merge table. The merge itself is
deliberate and reviewed; nothing was silently deleted.

## Census (reproduced from the current tree, C1)

`scripts/g5_duplicate_census.py` over `data/stocks/index.ts` (pre-fix main
@ 3ef7237): 916 rows, 6 exact-normalized-name groups, 11 token-overlap
near-groups, 3 duplicated master-list entries, 10 master-list entries with no
STOCKS row.

## Provider name-match verification (the merge criterion)

Same Yahoo v8 chart endpoint the production provider uses; in-session
2026-10-07 (~06:45Z). Canonical = provider-served with the matching company
name; bogus = HTTP 404 (or, for ANUPAM, a stale wrong-price cache serve).

| bogus row (removed) | kept canonical | provider longName @ canonical | bogus probe |
|---|---|---|---|
| ANUPAM "Anupam Rasayan" | ANURAS | Anupam Rasayan India Ltd (1162.9) | HTTP 404 (app cache held a stale ₹1.56 — a wrong-company serve) |
| BAYER "Bayer CropScience India" | BAYERCROP | Bayer CropScience Limited (3516.8) | HTTP 404 |
| BLUESTAR "Blue Star Limited" | BLUESTARCO | Blue Star Limited (1547.8) | HTTP 404 |
| COLGATE "Colgate Palmolive" | COLPAL | Colgate-Palmolive (India) Limited (1768.6) | HTTP 404 |
| INFOEDGE "Info Edge" | NAUKRI | Info Edge (India) Limited (1234.9) | HTTP 404 |
| TASYBITE "Tasty Bite Eatables" | TASTYBITE | Tasty Bite Eatables Limited (9445.0) | HTTP 404 |
| GODAWARI "Godawari Power & Ispat" | GPIL | Godawari Power & Ispat Limited (213.66) | HTTP 404 (round-21 NSE search had found GPIL but rejected it as a name mismatch) |
| RAILVIKAS "Rail Vikas Nigam (RVNL)" | RVNL | Rail Vikas Nigam Limited (196.6) | HTTP 404 |
| JINDALSTPP "Jindal Steel and Power" | JINDALSTEL | Jindal Steel Limited (1060.0) | HTTP 404 |
| JAINIRRIG "Jain Irrigation" | JISLJALEQS | Jain Irrigation Systems Limited (26.79) | HTTP 404 |

NOT duplicates (kept, evidence-recorded): WELCORP/WELSPUNIND (Welspun Corp vs
Welspun India — distinct companies), CMSINFO/MAPMYINDIA (CMS Info Systems vs
CE Info Systems/MapmyIndia), DALBHAT/DALMIASUG, AUBANK/EQUITAS/SURYODAY,
CUB/UNIONBANK.

KAPIL ("Kapil Raj Feeds (Avanti)"): no provider serve, no NSE-search candidate
(round-21 unresolved), NOT a name-duplicate of anything — left in place as an
honestly-unavailable row. Disposition: `FOUNDER DECISION NEEDED` (verify the
company exists / drop the row) — recommended default: leave as-is, honestly
unavailable, until the founder confirms.

## What the merge does

1. `data/stocks/index.ts` — the 10 bogus rows above removed (916 → 906).
2. `lib/registry/tickerAliases.json` — 10 bogus→canonical mappings added
   (67 total). This drives the T12 machinery: 308 redirects on
   `/stock/[symbol]`, silent read-migration of watchlist/portfolio/alerts,
   canonicalization at `/api/fundamentals` and ingest.
3. `data/stocks/master-list.ts` — deduped (LTIM/ADANIPORTS/GILLETTE),
   9 stale symbols pruned (no row, no alias), ZENSARTECH → ZENSAR.
4. `scripts/validateStocksImpl.ts` — new gate [6]: master list must be unique
   and fully resolve; the 10 merged symbols are pinned out of the registry.
5. `test/x6.nemishPlaceholders.test.ts` — universe pin updated 259/916 →
   254/906 (five removed rows carried a placeholder-zero pillar; re-measured).

## Fail-first (C5)

New gate + tests on pre-fix data (before the data edits, same tree):

```
$ npx vitest run test/g5.registryMerge.test.ts
 Tests  20 failed | 16 passed (36)      # every MUST FAIL PRE-FIX row + alias absence
$ npm run validate:stocks
  FAIL  master list symbol SHRIRAMFIN does not resolve to a STOCKS row (got null)
  FAIL  master list duplicate entry: LTIM
  FAIL  master list duplicate entry: ADANIPORTS
  FAIL  master list symbol IRB / ZOMATO / CSBANK / SONATSOFTW / JETAIRWAYS /
        JUBLPHARMA / GSKCONS / BAJAJCORP …
  FAIL  G5 pin: ANUPAM was merged away as a duplicate row … (× 10)
  Validation FAILED with 25+ problem(s).
```

## Post-fix battery (raw)

```
$ npx vitest run test/g5.registryMerge.test.ts test/seo.sitemap.test.ts
      Tests  45 passed (45)
$ npm run validate:stocks
  Total stocks: 906 / Valid: 906 / [6] OK master list unique (159) and resolves; 10 merged symbols pinned out
  Validation complete — all T12 gates passed.
$ npx tsx scripts/scoreParity.ts
  Checked 906 symbols across 4 entry paths. 0 mismatches / 0 non-finite of 906
$ npx tsc --noEmit                 → exit 0
$ npx eslint .                     → 0 errors, 283 warnings (baseline 284)
$ npx vitest run                   → Test Files 162 passed (162); Tests 1663 passed (1663)
$ npm run build                    → exit 0
$ npm run validate:encoding        → ✅ no mojibake
$ git ls-files | grep -E "(^|/)\.env"   → .env.example   (only)
```

## Provider decision (the G5 second half) — FOUNDER DECISION NEEDED

The provider-coverage gap class (real instruments Yahoo does not serve —
LTIM-class, KAPIL, the round-21 unresolved set) is a provider limitation, not
a code defect; coverage is never fabricated for it. Whether to add a second
price provider (vendor choice, cost, licensing — rule 31) is the founder's
call. **Recommended default:** stay single-provider (Yahoo), keep labeling
gaps honestly, revisit only if the founder approves a specific vendor.

## Notes

- The `/api/health` equities total auto-adjusts 916 → 906 after deploy (it
  counts registry symbols); the E4/R21 acceptance records keep their
  historical 916 numbers — historical evidence is never rewritten.
- quote_cache rows for the removed symbols age out by TTL; the batch API's
  registry gate rejects them meanwhile (the stale ANUPAM ₹1.56 row stops
  serving immediately — it was a wrong-company observation).
