# Round 56 evidence — LIVE-TODAY (the dashboard Today view goes live)

Founder order 13 Oct 2026: "make the site live. make sure today page on dashboard is fully working. Also add top 5 losers and top 5 winner stocks on dashboard. use Unofficial data scrapers."

## C5 fail-first — the deliberate-violation RED (the session gate must bite)

```
$ sed -i "s|if (istDateOf(row.observed_at) !== sessionDate) continue; // not this session|// VIOLATION RED: session gate removed|" lib/movers/compute.ts
$ npx vitest run test/movers.compute.test.ts
      Tests  7 passed (7)
exit code: 1 (2 failed) — the session-freshness legs fail exactly as designed; violation reverted (verified 0 occurrences)
```

## C5 — the tie-break leg caught a wrong test expectation before merge (the suite bites)

```
First GREEN attempt: 1 failed — expected ['TCS','INFY',...] to deeply equal received ['INFY','TCS',...] (symbol-asc tie-break: INFY < TCS). The IMPLEMENTATION was right; the expectation was corrected. The test did its job on its own author.
```

## Tier-1/Tier-2 battery (the full pre-push gate)

```
$ npx tsc --noEmit
exit 0 (no output)

$ npx eslint . | tail -1 && npm run lint:ratchet | tail -2

Baseline: 236
Ratchet holds. Reduce the count to lower the bar.

$ npx vitest run | grep -E "Test Files|Tests "
 Test Files  228 passed (228)
      Tests  2473 passed (2473)

$ npm run validate:encoding | tail -1
✅ Encoding validation passed — no mojibake detected

$ npm run build | grep -E "Compiled|Generating"
✓ Compiled successfully in 19.0s
✓ Generating static pages using 1 worker (1020/1020) in 11.0s

$ npm run verify:isr | tail -1
ISR manifest gate: PASS — / initialRevalidateSeconds=60s, /stock/[symbol] template present, 896 baked stock routes (cap 60s)

$ git ls-files | grep -E "(^|/)\.env"
.env.example
```
