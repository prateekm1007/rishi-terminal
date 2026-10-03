# V2 evidence — Greenblatt scorer units fix + scorer-health gate

## RED (before fix) — `npx vitest run test/scorerHealth.test.ts`

```
 FAIL  test/scorerHealth.test.ts > ... > np 280 / mktcap 3200 -> ROC 14.583% (rocS 58.3), EY 8.75% (eyS 87.5), score 73
 FAIL  ... hits the 25% ROC and 10% EY caps without exceeding 100
 FAIL  ... every scorer has sd >= 3 and <= 90% of scores outside 5-95
 FAIL  ... Greenblatt participates in the consensus with a real spread of its own
AssertionError: expected 0.5019671613688019 to be greater than or equal to 3
 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

(The 1 pass is the T11 zero-mktcap null guard, which pre-existed.)

## GREEN (after fix) — `npx vitest run test/scorerHealth.test.ts`

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

## Full-universe distribution — BEFORE the fix

universe size: 916
┌─────────┬──────────────────┬─────┬───────┬───────┬───────┬─────┬─────┬─────┬─────┬─────┬────────┬─────────┬──────────────────┐
│ (index) │ name             │ n   │ nulls │ mean  │ sd    │ min │ p25 │ p50 │ p75 │ max │ pct<=5 │ pct>=95 │ pct outside 5-95 │
├─────────┼──────────────────┼─────┼───────┼───────┼───────┼─────┼─────┼─────┼─────┼─────┼────────┼─────────┼──────────────────┤
│ 0       │ 'Nemish'         │ 916 │ 0     │ 87.54 │ 12.65 │ 15  │ 85  │ 93  │ 94  │ 100 │ 0      │ 18.8    │ 18.3             │
│ 1       │ 'Raamdeo'        │ 916 │ 0     │ 85.7  │ 10.33 │ 8   │ 82  │ 88  │ 92  │ 100 │ 0      │ 9.4     │ 8.5              │
│ 2       │ 'Porinju'        │ 916 │ 0     │ 81.07 │ 16.26 │ 16  │ 70  │ 87  │ 94  │ 100 │ 0      │ 23.8    │ 23               │
│ 3       │ 'Munger'         │ 916 │ 0     │ 78.76 │ 15.31 │ 0   │ 76  │ 82  │ 85  │ 100 │ 0.2    │ 7.9     │ 8                │
│ 4       │ 'Pabrai'         │ 916 │ 0     │ 84.79 │ 16.31 │ 20  │ 79  │ 89  │ 97  │ 100 │ 0      │ 35.6    │ 31.4             │
│ 5       │ 'Howard Marks'   │ 916 │ 0     │ 82.68 │ 14.07 │ 34  │ 77  │ 88  │ 93  │ 100 │ 0      │ 13.1    │ 11.8             │
│ 6       │ 'Basant'         │ 916 │ 0     │ 75.78 │ 8.13  │ 43  │ 73  │ 77  │ 79  │ 97  │ 0      │ 0.1     │ 0.1              │
│ 7       │ 'Philip Fisher'  │ 916 │ 0     │ 71.76 │ 9.71  │ 25  │ 69  │ 72  │ 75  │ 100 │ 0      │ 1.9     │ 1.5              │
│ 8       │ 'Seth Klarman'   │ 916 │ 0     │ 79.42 │ 12.62 │ 28  │ 70  │ 78  │ 93  │ 100 │ 0      │ 4.7     │ 4.6              │
│ 9       │ 'Buffett'        │ 916 │ 0     │ 58.36 │ 11.97 │ 15  │ 54  │ 60  │ 66  │ 75  │ 0      │ 0       │ 0                │
│ 10      │ 'Lynch'          │ 916 │ 0     │ 73.89 │ 12.63 │ 29  │ 63  │ 75  │ 85  │ 95  │ 0      │ 3.7     │ 0                │
│ 11      │ 'Jhunjhunwala'   │ 916 │ 0     │ 73.31 │ 11.95 │ 29  │ 63  │ 75  │ 84  │ 91  │ 0      │ 0       │ 0                │
│ 12      │ 'Kedia'          │ 916 │ 0     │ 65.58 │ 11.54 │ 26  │ 63  │ 63  │ 70  │ 90  │ 0      │ 0       │ 0                │
│ 13      │ 'Kacholia'       │ 916 │ 0     │ 63.13 │ 14.44 │ 5   │ 60  │ 60  │ 72  │ 94  │ 0.1    │ 0       │ 0                │
│ 14      │ 'Walter Schloss' │ 916 │ 0     │ 62.38 │ 19.06 │ 8   │ 52  │ 58  │ 78  │ 96  │ 0      │ 0.2     │ 0.1              │
│ 15      │ 'Damani'         │ 916 │ 0     │ 50.57 │ 12.43 │ 5   │ 49  │ 49  │ 56  │ 76  │ 0.7    │ 0       │ 0                │
│ 16      │ 'Soros'          │ 916 │ 0     │ 50.26 │ 7.08  │ 15  │ 48  │ 48  │ 54  │ 78  │ 0      │ 0       │ 0                │
│ 17      │ 'John Templeton' │ 916 │ 0     │ 62.83 │ 21.32 │ 14  │ 47  │ 67  │ 80  │ 100 │ 0      │ 0.9     │ 0.8              │
│ 18      │ 'Graham'         │ 916 │ 0     │ 42.61 │ 11.83 │ 0   │ 35  │ 43  │ 53  │ 75  │ 1.4    │ 0       │ 1                │
│ 19      │ 'Greenblatt'     │ 916 │ 0     │ 26.01 │ 24    │ 0   │ 5   │ 20  │ 39  │ 100 │ 26.9   │ 1.7     │ 24.7             │
└─────────┴──────────────────┴─────┴───────┴───────┴───────┴─────┴─────┴─────┴─────┴─────┴────────┴─────────┴──────────────────┘

── Greenblatt inputs for 5 stocks (deterministic sample: first, last, +3 spread across mktcap) ──
360ONE       np=    3000 mktcap=    985000 | ROC = np/(0.6*mktcap) = 0.508% -> rocS=2.0 | EY = np/mktcap = 0.305% -> eyS=3.0 | engine total=2.5 | scorer.score=3 | comps=[Return on Capital=2, Earnings Yield=3]
EXCELCROP    np=    3000 mktcap=   1150000 | ROC = np/(0.6*mktcap) = 0.435% -> rocS=1.7 | EY = np/mktcap = 0.261% -> eyS=2.6 | engine total=2.2 | scorer.score=2 | comps=[Return on Capital=2, Earnings Yield=3]
MRF          np=    3000 mktcap= 128500000 | ROC = np/(0.6*mktcap) = 0.004% -> rocS=0.0 | EY = np/mktcap = 0.002% -> eyS=0.0 | engine total=0.0 | scorer.score=0 | comps=[Return on Capital=0, Earnings Yield=0]
KTKBANK      np=     280 mktcap=      3200 | ROC = np/(0.6*mktcap) = 14.583% -> rocS=58.3 | EY = np/mktcap = 8.750% -> eyS=87.5 | engine total=72.9 | scorer.score=73 | comps=[Return on Capital=58, Earnings Yield=88]
ZYDUSWELL    np=     400 mktcap=     12000 | ROC = np/(0.6*mktcap) = 5.556% -> rocS=22.2 | EY = np/mktcap = 3.333% -> eyS=33.3 | engine total=27.8 | scorer.score=28 | comps=[Return on Capital=22, Earnings Yield=33]

universe=916 scored=916 insufficient=0
spread >= 80 (Sharp Division+): 45.1%
spread >= 90:                   20.7%
  <20 Strong Consensus     0 (0.0%)
  20-39 Mild               0 (0.0%)
  40-59 Moderate           164 (17.9%)
  60-79 Significant        339 (37.0%)
  >=80 Sharp Division      413 (45.1%)


NOTE: the table above is AFTER the fix (the repro script runs live code).
The BEFORE table, captured from the identical script on the pre-fix tree:

```
│ 19      │ 'Greenblatt'     │ 916 │ 0     │ 0.18  │ 0.5   │ 0   │ 0   │ 0   │ 0   │ 5   │ 100    │ 0       │ 99.6             │
universe=916 scored=916 insufficient=0
spread >= 80 (Sharp Division+): 98.6%
spread >= 90:                   88.2%
  <20 Strong Consensus     0 (0.0%)
  20-39 Mild               0 (0.0%)
  40-59 Moderate           0 (0.0%)
  60-79 Significant        13 (1.4%)
  >=80 Sharp Division      903 (98.6%)
```

## Full-universe distribution — AFTER the fix (acceptance)

```
│ 19      │ 'Greenblatt'     │ 916 │ 0     │ 26.01 │ 24    │ 0   │ 5   │ 20  │ 39  │ 100 │ 26.9   │ 1.7     │ 24.7             │
universe=916 scored=916 insufficient=0
spread >= 80 (Sharp Division+): 45.1%
spread >= 90:                   20.7%
  <20 Strong Consensus     0 (0.0%)
  20-39 Mild               0 (0.0%)
  40-59 Moderate           164 (17.9%)
  60-79 Significant        339 (37.0%)
  >=80 Sharp Division      413 (45.1%)
```

Acceptance: share of stocks with spread >= 90 dropped 88.2% -> 20.7% (well below 88%). Labels now differ across stocks. Greenblatt sd 0.5 -> 24.0. The 5-stock input dump above shows the scorer output matching the stated arithmetic exactly (KTKBANK total 72.9 -> score 73).

## Scorer-health allow-list

`SCORER_HEALTH_ALLOWLIST` in test/scorerHealth.test.ts is currently EMPTY: no scorer fails sd >= 3 or the 90%-outside-5-95 rule after the fix. Re-populate only with founder-approved justification.
