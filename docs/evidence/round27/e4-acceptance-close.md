# E4 scheduled in-session acceptance — CLOSED (round 27, 2026-10-08)

Verdict: **E4 acceptance GREEN** per the pre-registered round-25 runbook
(`docs/evidence/round25/e4-acceptance-runbook.md`), unchanged. Both
batteries (early + late) pass ALL FOUR checks at fresh >= 807, against
the real scheduled in-session pg_cron runs, with zero manual dispatch
and the exact production SHA recorded in the raw artifacts.

## The numbers (raw artifacts in this directory)

```
universe: 896 STOCKS keys | gate: >= 807 (ceil(0.9 x 896))
early battery @ 2026-10-08T09:43:35Z (production 2d74e064):
  pass.freshness=true  sqlUniverseFresh=822  health fresh=822 total=896
  pass.healthAgreement=true (health 822 == SQL 822, total 896 exact)
  pass.bankbarodaFresh=true (CACHED, observedAt 09:42:12Z, yahoo-bulk)
  pass.unavailableHonest=true (LTIM + CENTURYTEX stay UNAVAILABLE)
  sweep: live 2 | cached 833 | freshServed 822 | unavailable 61 | wall 48.8s
late battery @ 2026-10-08T09:44:26Z (same production SHA):
  all four pass=true; sqlUniverseFresh=822; health 822/896 exact
  sweep: live 275 | cached 560 | freshServed 822 | unavailable 61 | wall 51.5s
  BANKBARODA LIVE (observedAt 09:43:37Z); alias controls served LIVE/CACHED
alias controls (both batteries): BRAINBEES GANESHHOUC SOMDISTILL TECHNO
  SANDUMANG ELDECO JSLHISAR LAXMIMACH NAMINDIA — all priced through the
  registry aliases.
honest-unavailable controls: LTIM, CENTURYTEX — UNAVAILABLE both batteries.
```

## Scheduled-run proof (durable, read-only SQL)

- pg_cron job `quotes-warm` (schedule `7-52/15 3-10 * * 1-5` UTC):
  2026-10-08 fires 03:07 -> 09:37 = **27 SUCCEEDED, 0 failed**; 24 of
  them in-session (between 03:45 and 10:00 UTC). The observer recorded
  runids 40..64 live during the window (`e4-session-state.jsonl`).
- Zero manual dispatch: the observer is read-only (grep-pinned; it never
  calls `/api/ingest/quotes-warm`), and no manual warmer call was made
  by the session. Every recorded fire is the schedule's own.
- `ingestion_log` (`quotes_warm`): grew 7 -> 151 rows across the window
  with `finished_at` tracking every fire; pre-open fires logged honestly
  (G6 behavior intact).

## During-window production advance (recorded honestly)

Production advanced TWICE during the observation window by parallel
merge-and-deploy activity: `fd17886e` -> `345134c` (#261, this session's
observer instrument fix) at ~04:55Z, then -> `2d74e064` (#262) at
~06:30Z. Both battery artifacts carry the exact serving SHA
(`version.sha` = `2d74e064b2c45d6630dc94220861231f57c1b037`). No
freshness-relevant behavior changed across the advances (fresh stayed
814-823 through both).

## Instrument fix inside this window (kept for the record)

The FIRST early battery attempt (04:29Z) recorded all 896 symbols as
unavailable — the observer still sent the pre-U2 bare-array body to
`/api/prices/batch` (contract changed by 6b02dd3); every POST got HTTP
400 and the sweep classified empty responses as 896 unavailable. The
defect and fix are PR #261 (`batchPricesRequestBody` + loud
instrument-failure guard, fail-first tests). The 04:29 defective record
remains in `e4-session-state.jsonl` — an instrument failure must stay
visible, never be scrubbed. Post-fix batteries measured honestly from
05:02Z onward.

## Provider-pass honesty note

Freshness fluctuates pass-to-pass with the bulk provider's
timestamp coverage: runs through 04:13Z held 820-822; the 04:22 and
04:37 passes wrote ~160 stale-timestamped rows (fresh dipped to
679-687); passes from 04:52 onward recovered to 816-823 and held. The
gate holds when the provider delivers >= 807 fresh observations in the
30-minute window — as it did for every battery measurement here. The
dip is recorded, not smoothed: `e4-session-state.jsonl` 04:28-04:56
polls show the full arc.

## Companion evidence in this directory

- `price-latency-pa2.json` — priceLatencyProbe run during the window
  (PA2 latency leg: cold-fill coverage curve provider-bound, warm
  serving path healthy, hooks async-batched by construction).
- `cache-drift-evidence.json` — quote_cache vs registry diff: the 46
  non-896 symbols are the G5 "legitimate non-equity/reference" class
  (indices, commodities, crypto — served outside the equities
  universe); 0 registry symbols missing; the 94 `source='claim'` rows
  are the U2 cold-claim mechanism's live rows. No silent disagreement.
