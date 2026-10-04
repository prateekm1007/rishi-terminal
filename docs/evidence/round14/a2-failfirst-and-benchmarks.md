# A2 evidence — fail-first, gate bite, benchmark numbers

## 1. Fail-first (rule 21): the default-difficulty pin fails pre-fix

`npx vitest run test/x7.powBenchmark.test.ts` BEFORE the fix (difficulty still 20):

```
 ❯ test/x7.powBenchmark.test.ts (5 tests | 1 failed) 357ms
   ✓ produces SHA-256 digests byte-identical to Node crypto (200 mixed inputs) 8ms
   ✓ a nonce found by the worker passes the server's verifyPow (round-trip) 4ms
   ✓ a WRONG nonce never passes (the check is real, not decorative) 0ms
   ✓ median solve time at the chosen difficulty is under 2 s (benchmark) 337ms
AssertionError: expected 20 to be 15 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

## 2. Gate bite (rule 24): the PRE-FIX shipping solver at the PRE-FIX difficulty

Scratch harness (`test/scratch.bite.test.ts`, deleted after the run — output
verbatim below) benchmarking the pre-fix `solvePow` (async Web Crypto loop,
one `await` per hash — the exact code the auditor measured at ~79k hashes/s)
at the pre-fix default (20 bits). It cannot meet the 2 s acceptance at all —
5 solves do not finish inside the 30 s vitest test timeout:

```
 ❯ test/scratch.bite.test.ts (1 test | 1 failed) 30005ms
   ❯ A2 bite — the PRE-FIX solver at the PRE-FIX difficulty (1)
     × median solve time is under 2 s (this must FAIL pre-fix) 30004ms
Error: Test timed out in 30000ms.
 Test Files  1 failed (1)
      Tests  1 failed (1)
exit: 1
```

## 3. Post-fix benchmark (Node harness, the shipped worker file, difficulty 15)

```
[a2-benchmark] runs=29.8, 29.9, 30.1, 30.2, 30.5, 30.5, 30.8, 30.9, 30.9, 31.0, 32.3 ms | median=30.5 ms | p95=32.3 ms @ 15 bits
 Test Files  2 passed (2)   (x7.powBenchmark + x7.challenge together: 20 tests)
```

(The same harness at the OLD 20-bit default measured median 30.4 ms — for
this token the first 20-bit solution happens to sit at the same depth; the
EXPECTED work differs 32×, which is what matters for the unlucky cases.)

## 4. Browser, CPU-throttled mobile profile (Playwright + CDP, production build)

`node scripts/measurePowBrowser.mjs` against `next start` of the production
build; the page spawns the SHIPPED `/pow.worker.js`; difficulty 15; 9 solves
per rate (fresh token each — the honest distribution, not a cached best):

```
rate=1x  runs=[112.2, 380.8, 123.4, 115.4, 256.8, 398.2, 146.0, 100.5, 15.5] ms  median=123.4 ms  p95=398.2 ms
rate=4x  runs=[127.1, 244.3, 301.2, 90.3, 117.3, 137.9, 110.6, 63.4, 67.1] ms  median=117.3 ms  p95=301.2 ms
rate=6x  runs=[84.1, 48.5, 147.9, 143.1, 46.1, 96.5, 53.5, 205.8, 194.8] ms  median=96.5 ms  p95=205.8 ms
```

Every median is ~100× under the 2 s acceptance; the worst single run
observed (398.2 ms) is 5× under it. Small-sample medians wobble between
rates — the raw runs are pasted rather than a smoothed story.
