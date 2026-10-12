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

## Straggler sweep (second commit — hardcoded, non-locale count claims)

Live-probed while verifying the demo path: GET /api/chat/personas serves 21
personas; the /chat hero claimed "7 legendary investors" (stale), the /chat and
/rishis route metadata claimed "20 legendary investors" (scored count on a
display-sense surface — the roster renders 21), and the F&O radar card's
Rishi-panel tag said "7 Rishis".

```text
$ rg -n "\b(7|19|20|21|22)\s+(legendary|Rishis|sages|philosophers|investors)" app components | grep -v test
 app/layout.tsx:27: ... from 21 legendary investors        (correct, display sense)
 app/rishis/layout.tsx:8: ... of 20 legendary investors    (FIXED -> 21)
 app/chat/page.tsx:15: ... from 20 legendary investors.    (FIXED -> 21)
 components/chat/ChatClient.tsx:65: ... with 7 legendary investors.  (FIXED -> canonical)
 app/fno/page.tsx:15: tag: "7 Rishis"                      (FIXED -> "21 Rishis")
 app/manifest.ts:17: ... from 21 legendary investors       (correct)
```

RED (stragglers stashed, pins in place):
```text
$ npx vitest run test/rishiCount.unification.test.ts
 Tests  1 failed | 9 passed (10)
 × RULES-3 (straggler sweep): every HARDCODED count claim carries the
   canonical wording or the display-sense 21
```

GREEN (the fix applied):
```text
$ npx vitest run test/rishiCount.unification.test.ts
 Tests  10 passed (10)
$ npx vitest run
 Test Files 215 passed (215); Tests 2362 passed (2362)
```

## Reported, NOT fixed here (rule 26 — outside RULES-3's scope)

- components/chat/ChatClient.tsx:65 still reads "Get investment advice in
  their distinct voice." — advice vocabulary on a live surface, directly
  contradicted by pricing.free.signUpNote ("Not investment advice; educational
  tool only"). FD-2 (positioning) is counsel-owned; R5 (#362) is the open
  advice-identifier PR. FOUNDER DECISION NEEDED, recommended default: reword
  to "investment wisdom in their distinct voice" (the root metadata's own
  term) in the R5/counsel track.
- messages/bn.json is missing 3 keys present in en (common.qvpsScore,
  dashboard.observationTimeNotDisclosed, nav.methodology) — pre-existing on
  main, unrelated to counts; falls back to en at runtime.
