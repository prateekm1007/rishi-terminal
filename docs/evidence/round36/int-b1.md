# INT-B1 — Per-symbol News Evidence: the first real product surface (closeout evidence)

Round 36 (2026-10-09). Roadmap item B1 — the first Phase-B item, mounted on
the ONE `/api/intelligence` surface (A10). Pre-registration:
`docs/intelligence/newsEvidence.md` (6cf9f56, committed BEFORE any
evaluation). Fail-first RED: ade2bd0 (match-rule pins, import-fail) +
4e14f06 (wiring/panel/scan pins; 11 behavioral/scan failures + import-fail
on the pre-implementation tree — raw output preserved in the session
artifacts, `scripts/b1/RED-output2.txt`).

## What was built (PR #292, merged `ee90a844`)

- `lib/intelligence/newsMatch.ts` — THE deterministic symbol match:
  word-boundary registry token OR exact case-insensitive company name in
  headline/summary/tags; no stems, no partial tokens, no invented
  semantics; multi-symbol attribution verbatim; items with an empty
  source or headline refused from matching; cap 8, pubDate desc
  (unparseable sorts oldest), stable-id asc tie-break, same-content
  dedupe (the /api/news dedupe is headline-prefix based). The stable
  evidence id = sha256 over `source|url|pubDate|headline` — the
  pipeline's own id is time-seeded (`…-<epoch ms>`) and NOT
  identity-bearing. Pure: no fetcher/clock/randomness (scan-pinned).
- `lib/intelligence/newsEvidence.ts` — the ONE deps pass: company name
  from the ONE registry (`STOCKS`), items from the ONE `/api/news`
  fetcher over its existing HTTP surface, zod-validated at the boundary
  (a malformed item dropped individually — never a half-attributed
  citation), fail-closed to `[]` on any fetch/non-OK/non-JSON/no-origin
  failure; canonical origin derivation (`NEXT_PUBLIC_APP_ORIGIN` ??
  request URL — the alerts-evaluate precedent); 5 s timeout; the feed's
  impact label carried VERBATIM as FEED-provided (never recomputed; A4
  materiality is the exclusive engine and news never enters the A2→A7
  chain or any spend gate).
- `lib/ai/evidence.ts` — `EvidenceDeps.news` gains the optional
  FEED-provided impact field; `buildNewsItems` appends it only when
  present — the legacy matched-item text and the unavailable note stay
  BYTE-IDENTICAL (both pinned); the id-contract header updated to wired.
- `app/api/chat/route.ts` + `app/api/intelligence/route.ts` — the deps
  pass runs INSIDE the refund-protected evidence-assembly region (a
  throw must never consume a quota unit without reaching the provider).
  The intelligence route's thesis path is untouched — news adds NO chain
  input.
- `components/stock/IntelligencePanel.tsx` + the stock-page mount — the
  FIRST REAL PRODUCT SURFACE: client-side fetch of the ONE
  `/api/intelligence?capability=thesis&subject=<symbol>`, rendered
  through the A8 primitives (badges → provenance → contradiction →
  evidence → uncertainty — the fixture route's exact closed
  composition); honest loading + unavailable states; `key={subject}`
  remount; no advice strings; no chain import.

## The gate bite (C9 — bundle budget), honestly recorded

The panel initially re-validated the wire artifact through
`parseRishiInsight` client-side. The battery caught the regression:
`/stock/[symbol]` first-load **260.4 kB vs the 169.2 kB ratchet** (the
fatal 200 kB budget blown). Root cause measured by rebuilding the
pre-B1 tree (168.7 kB / 10 chunks) vs the B1 tree (258.4 kB / 10
chunks): the panel was the FIRST client consumer of zod (the A1 schema
module) — **~+90 kB gzip**. A client-side re-parse adds zero security
(the client is the least-trusted party; it enforces nothing — C2) and
trades away a stated goal (C9). The design was corrected IN the PR
before merge: the ONE A1 parse stays the server boundary (the route
serves only parse-or-refused artifacts — the A10 pinned contract); the
panel renders the route's A1-validated artifact through the total A8
mapping (unknowns degrade to the honest em-dash/empty states by
design). Post-fix: **170.9 kB ≤ 171.2 ratchet** (the panel costs
1.7 kB). Pin corrections each justified in-branch: the fetch-scan
regex made formatting-robust (checks MORE call sites); the panel parse
pin corrected to the no-second-parser design; the origin fail-closed
pin added.

## Battery (all raw outputs preserved in session artifacts)

- `npx tsc --noEmit` → exit 0.
- `npx eslint .` → 0 errors / 283 warnings; ratchet holds at baseline.
- `npx vitest run` → **186 files / 2058 tests ALL PASSING** (A10
  baseline 184/2028; +2 files, +30 tests).
- `npm run validate:encoding` → clean. T12 → 896/896. scoreParity →
  0 mismatches / 0 non-finite of 896. `aiLoopAudit` → **8/8** (no new
  router caller; the loop untouched). `routeIntegrity` → PASS.
- `npm run build` → clean; ISR manifest gate PASS (896 baked stock
  routes); bundle budget PASS (170.9 ≤ 171.2 ratchet; hard 200 kB).
- `git ls-files | grep -E "(^|/)\.env"` → `.env.example` only.
- `docs/PROVENANCE.md` regeneration → byte-identical (no new route).

## CI + merge

- CI on the PR head `ab1bc5a`: 5/5 blocking jobs + Vercel preview —
  all success (the C8 cadence check rode inside the Lint job).
- Merge-guard gates 0–6 (`scripts/ci/merge-guard.py`): gate 0 PR open
  base=main head=ab1bc5ac mergeable_state=clean; gate 1 fresh fetch
  main tip read #1 = 7bb2f00e; gate 2 merge-base == main tip (branch
  current); gate 3 all five required checks green on the EXACT head;
  gate 4 deploy-cadence PASS — last production-relevant merge 116.8
  min ago; gate 5 main tip read #2 unchanged; gate 6 merge via API
  pinned to the validated SHA → **merge commit `ee90a844`**.

## Production legs on the exact deployed SHA `ee90a844…`

Raw output: session artifact `scripts/b1/prodVerifyB1-output.txt`
(script `scripts/b1/prodVerifyB1.mjs`). ALL PASS:

- **Deploy gate**: `/api/version` = `ee90a8446e49…` = the exact merged
  main tip (C6 deployed; docs-only merges owe nothing).
- **The ONE fetcher live**: `/api/news` → 200, 250 items across 31
  feeds (5.47 s cold; warm edge hits measured 63–182 ms — the deps
  pass's `cache: 'no-store'` does not bypass the `s-maxage=120` edge
  cache, so the wiring is fast on warm cache and bounded fail-closed
  to the honest unavailable note on a true cold miss).
- **The panel IS mounted** on the baked `/stock/RELIANCE` route
  (positive control — B-18): `data-intelligence-panel` +
  `data-intelligence-subject="RELIANCE"` + the title in the served
  HTML; the honest loading state is the first-byte render; NO
  fabricated artifact server-side (the client fetches); and the
  deployed client bundle verifiably carries the ONE-surface fetch URL
  `/api/intelligence?capability=thesis` (the chunk was fetched back
  from production and checked). Page TTFB 1203 ms.
- **The panel's data path**: thesis → 200 `ok:true` — deterministic,
  no model label, timings disclosed (route wallMs 1283, chainMs 849);
  the artifact's `provenance.changeKey` EQUALS the independent A2
  derivation recomputed OUTSIDE the app from 403 live
  `observation_state_log` rows (`9831f19a4433…` both) — the live proof
  that news added NO chain input (the B1 changeKey-invariance pin,
  production-verified).
- **Refusal legs**: invalid capability → 400 `Invalid capability`;
  unknown symbol → 400 `Unknown symbol` (validation-first, zero
  consumption). The panel renders the honest unavailable state for
  every non-200 (A8 empty-state discipline).
- **Insight on the live chain**: honest 404 "No generated insight for
  this subject" — the pre-registered A4 fail-closed state (baselines
  accumulating; generation triggerable ~2026-11-03), zero AI spend.
- **Regression controls**: A8 fixture route 200; A9 forged insightRef
  → 400 (the refusal table holds after the import-split).

## Honest scope notes (disclosed, not hidden)

- The matched news items enter the AI evidence package (chat path
  today; the intelligence generation path when A4 baselines make it
  triggerable). They are not directly surfaceable through
  `capability=thesis` (deterministic chain evidence only — news is not
  a chain input by design); their production observability inside the
  loop's context arrives with the generation surface (~2026-11-03).
  The wiring itself is production-deployed and CI-pinned end to end.
- The unavailable note's "market-level feeds are not yet mapped to
  symbols" clause is now historical (B1 mapped them); its text stays
  byte-identical per the pre-registration — rewording requires its own
  pre-registered change, not a silent edit inside B1.
- The stock-page panel pins `capability=thesis`; an insight surface is
  a later PR by its own pre-registration (the registry stays
  `{thesis, insight}` — no new capability in B1).
