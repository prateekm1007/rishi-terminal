# G5 round-24 — ten relic rows merged out of the registry

Follow-up to the round-23 duplicate merge (#239, merged eb2d7f4). The E4
residual classification (same round, `e4-residual-classification.md` §3)
found ten MORE seed rows whose symbol is a dead relic of a renamed or
merged listed entity, while the CURRENT ticker is itself a STOCKS key
serving a fresh quote. The round-23 name-similarity census could not find
these: the old and new names differ materially (renames, mergers), so the
near-name grouping never fired. The discovery path was per-symbol provider
probing over the whole never-observed set, plus successor-ticker analysis
against the seed.

## Verification table (probes 2026-10-07 ~09:39 UTC, Yahoo v8 chart)

| relic (dead) | probe | current key (STOCKS) | probe | corporate event |
|---|---|---|---|---|
| MCXINDIA | .NS 404 | MCX | 3362.2 INR @ 09:39 | same instrument, two spellings |
| TORNT | .NS 404 | TORNTPHARM | 4687.8 INR @ 09:39 | ticker normalization |
| MACROTECH | .NS 404 | LODHA | 1114.0 INR @ 09:39 | Macrotech = erstwhile Lodha Developers |
| GMRINFRA | .NS 404 | GMRAIRPORT | 91.4 INR @ 09:39 | GMR Infrastructure -> GMR Airports |
| INOXLEISURE | .NS 404 | PVRINOX | 1349.0 INR @ 09:39 | INOX Leisure merged into PVR (2023) |
| MAGMA | .NS 404 | POONAWALLA | 449.2 INR @ 09:39 | Magma Fincorp -> Poonawalla Fincorp |
| TATACOFFEE | .NS 404 | TATACONSUM | 967.4 INR @ 09:39 | Tata Coffee merged into Tata Consumer |
| IIFLWAM | .NS 404 | 360ONE | 1063.9 INR @ 09:39 | IIFL Wealth -> 360 One WAM |
| TV18BRDCST | .NS 404 | NETWORK18 | 25.7 INR @ 09:39 | TV18 Broadcast merged into Network18 |
| JSWISPL | .NS 404 | JSWSTEEL | 1228.0 INR @ 09:39 | JSW Ispat merged into JSW Steel (2014) |

Every current key was FRESH in the classification snapshot (09:13 UTC);
every relic row was a claim placeholder (never observed live,
`source='claim'`, price 0) — the relic symbols could never have priced.

## What changed

- `data/stocks/index.ts`: 10 relic rows removed (906 -> 896).
- `lib/registry/tickerAliases.json`: 10 relic -> current mappings added
  (T12 machinery: /stock/[symbol] redirects, user-data migration, ingest
  canonicalization).
- `scripts/validateStocksImpl.ts`: gate [6c] pins the relics out (a
  re-added row fails validation).
- `test/g5.relicMerge.test.ts`: fail-first suite (RED below).
- `test/g5.registryMerge.test.ts` + `test/x6.nemishPlaceholders.test.ts`:
  universe pins updated (906 -> 896; honest-null 254 -> 248 — six relics
  carried a placeholder zero: GMRINFRA pe, IIFLWAM de, JSWISPL pe, MAGMA
  pe/promo/epscagr, MCXINDIA promo, TV18BRDCST pe).

## RED -> GREEN (raw)

```
$ npx vitest run test/g5.relicMerge.test.ts        # pre-fix
  Test Files  1 failed (1)
       Tests  21 failed | 1 passed (22)            # RED

$ npx vitest run test/g5.relicMerge.test.ts test/g5.registryMerge.test.ts \
    test/x6.nemishPlaceholders.test.ts test/lp3.providerAliases.test.ts
       Tests  79 passed (79)                        # GREEN
```

## Battery on the exact tree

```
$ npm run validate:stocks
  Validation complete — all T12 gates passed.       # incl. new gate [6c]
$ npx tsx scripts/scoreParity.ts
  Checked 896 symbols across 4 entry paths.
  0 mismatches / 0 non-finite of 896
```

Full CI battery (tsc, eslint + ratchet, vitest suite, encoding, build,
docker, migrations) runs on this PR's exact head.

## E4 arithmetic after this merge

Universe 896; structurally-out = 58 provider coverage + 11 stale
observation + 3 ambiguous identities (+ the 9 aliases from #242 recover
their rows). Steady state ≈ 822/896 = 91.7% ≥ 90% with the flake tail as
the only downward pressure. The pre-registered acceptance reruns on the
merged deployment during the next NSE session.

## Data-integrity note

The relic rows were never rendered with wrong prices (claim placeholders,
read-guarded); no user data referenced the relic symbols at measurement
time; watchlist/portfolio/alert symbol migration rides the existing T12
silent-redirect machinery. The orphaned quote_cache rows require no
migration — the health RPC counts STOCKS keys only, and claim rows carry
no observation to preserve.
