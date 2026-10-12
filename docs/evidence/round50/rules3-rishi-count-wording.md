# RULES-3 — the one Rishi-count wording (founder order 12 Oct 2026)

Founder's words, verbatim: "Use one wording everywhere: '21 Rishis: 20 scored,
Jim Chanos chat-only'. The copy still says 'All 21' in 8 files and 'All 20' or
'VIEW ALL 20' in 4. The CHAT-ONLY label on /rishis is correct."

## RED (pre-fix catalogs, re-pinned test)
```
$ npx vitest run test/rishiCount.unification.test.ts   # messages/ + StockPageClient stashed to pre-fix
 Tests  3 failed | 6 passed (9)
 × the count-bearing dead locale keys are deleted from EVERY locale (live neighbours stay)
 × the /pricing roster copy equals the ACTUAL roster length (copy-vs-data drift gate)
 × RULES-3: the canonical count wording rides every count-bearing copy surface
```

## GREEN (the fix applied)
```
$ npx vitest run test/rishiCount.unification.test.ts
 Tests  9 passed (9)
```

## The pre-fix claim inventory (main @ dcd4c06, this session measured)
```
$ rg -l 'All 21' messages  -> bn en gu hi mr pseudo ta te  (8 files, matches the founder's count)
$ rg -n 'All 20|VIEW ALL 20' messages/en.json messages/pseudo.json
 messages/en.json:65:    \"wisdomDesc\": \"All 20 Philosopher Scores\",
 messages/en.json:71:    \"viewAll20\": \"VIEW ALL 20\",
 messages/en.json:375:    \"viewAll20\": \"View All 20\",
 (+ pseudo mirrors; the 6 Indic locales carry translated 20-count claims on the same keys)
```

## Disposition
- stock.wisdomDesc + pricing.free.allRishis -> the canonical sentence (translated per locale).
- stock.viewAll20 -> RENAMED stock.viewAllRishis ("VIEW ALL RISHIS"): the button drops its
  count claim; the canonical sentence rides in stock.wisdomDesc on the same tab definition;
  the grid header keeps rendering the live "{n} of {totalRishis} sages" from server data.
- asset.viewAll20 -> DELETED from every locale (count-bearing, zero renderers — the
  round-44 dead-key pattern, rule 17).
- metadata rows stand per FD-28: "21 legendary investors" (display sense), "20 Rishi
  frameworks" (scored sense) — not count-claim copy in the RULES-3 sense.
- Copy-vs-data drift gate strengthened: the canonical sentence's 21 and 20 are forced to
  equal ALL_RISHIS.length and RISHI_WEIGHT_CONFIG.length in the test.
