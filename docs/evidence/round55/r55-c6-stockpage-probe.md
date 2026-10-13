# Round 55 — the C6 reconciliation: stock page, probe, #415 browser evidence, formula

Founder round-55 order 13 Oct (verbatim anchors): "Reconcile the live
claims with evidence (C6), starting with the stock page. Find where the
observation line is produced and why the page isn't regenerated. Show
curl -sI headers (date, age, x-vercel-cache) and the body line, with the
IST time stated." / "Make the probe fail on the current HTML. [...] If it
fails, the 52/52 claim is withdrawn." / "Capture the dashboard awaiting
panel, with the flag on [...] Without it, the claim stays pending." /
"/rishis must show the text from formulaTextFor."

## 1. Where the observation line is produced

- Server HTML: `observationLabelServer` (`lib/pricePresentation.ts`) —
  emits ONLY `as of <IST stamp> (server render)` or
  `as of <IST stamp> · stale (server render)`; no market state, ever
  (#399, deployed). Called from `LivePriceWidget` for the server render
  and the first hydration paint; the display-time clock swaps in
  `observationLabel` (state from IST hours at the viewer's clock) after
  hydration.
- The stamp is the QUOTE's own `observedAt` (the upstream's observation
  time), read at ISR regeneration via the read-only cache peek
  (`serveCachedQuotes`), NOT the regeneration clock.

## 2. Why the page wasn't regenerated (the 13 Oct live evidence)

Bare URL captures, 13 Oct 2026 (production 938c1c3 = the #415 build):

```
07:43:21Z / 13:13:21 IST — GET /stock/RELIANCE (bare)
date: Tue, 13 Oct 2026 07:29:59 GMT
age: 803
x-vercel-cache: STALE
body line: as of Tue 13 Oct, 12:58 IST (server render)

07:44:01Z / 13:14:01 IST — second GET (40 s later)
date: Tue, 13 Oct 2026 07:43:25 GMT
age: 35
x-vercel-cache: HIT
data-rendered-at="2026-10-13T07:43:25.777Z"
body line: as of Tue 13 Oct, 13:13 IST (server render)
```

Two stacked causes, both now fixed:

1. **ISR regeneration is traffic-driven** (`export const revalidate = 60`
   on `app/stock/[symbol]/page.tsx`): between visitor requests the edge
   entry sits expired-but-unserved; the first visitor after a quiet
   period gets the stale render (stale-while-revalidate) — age 803 above.
2. **The quote cache refreshed only every ~15 min** — the pg_cron pin
   (`7-52/15 3-10 * * 1-5`, migration 029) fires 6 slices per tick; the
   observation line follows the QUOTE, so even a regenerated page carried
   an observation up to 15 min old. Ingestion rows confirm the cadence:
   6 × `quotes_warm` at 07:28:16Z, 6 × at 07:43:16Z (Supabase
   `ingestion_log`, read via the vault credential).

The fix (PR #422, ISR60): the warmer's minute tick (pg_cron re-pinned by
migration 030, `* 3-10 * * 1-5`) warms the quick set
(`lib/quotePath.quickRefreshSymbols` — the probe symbols + the
demo-path proposal, INFY not "INFOSYS": the membership test caught the
bad key) EVERY tick, then `revalidatePath` + a same-tick self-ping
re-renders those stock pages — served HTML at most ~60 s old. The
universe rotates one slice per minute (`rotate=1&of=15`) at the SAME
upstream volume (896 fetches / 15 min).

## 3. The probe — live run and the 52/52 WITHDRAWAL

Live run, 13 Oct 07:56:29Z / 13:26:29 IST (open session), bare URL,
production 938c1c3, `node scripts/ci/postDeploySmoke.mjs --base
https://rishi-terminal.vercel.app`:

```
edge-headers  bare-cache /stock/SBIN — age: 1591 · x-vercel-cache: STALE
FAIL  bare-cache render-freshness /stock/SBIN — open session: a 29-minute-old observation line (must be ≤15) — "Tue 13 Oct, 12:58 IST (server render)..."
FAIL  render-freshness /stock/SBIN — (same, probe key)
edge-headers  bare-cache /stock/BANKBARODA — age: 1592 · x-vercel-cache: STALE
FAIL  bare-cache render-freshness /stock/BANKBARODA — open session: a 29-minute-old observation line (must be ≤15)
FAIL  render-freshness /stock/BANKBARODA — (same, probe key)
...
post-deploy-smoke: FAIL — 4 failed check(s)
```

Full output: 48 PASS / 4 FAIL / exit 1 (saved
`logs/probe-live-r55-0801-full.txt` in the session store; the 4 failures
are the SBIN/BANKBARODA freshness legs on both cache keys). **The round-53
52/52 claim is WITHDRAWN** — it was true for f5286b8 at 23:35Z 12 Oct
(pages fresh off the post-deploy regens); on 13 Oct the traffic-driven
regen gap failed the open-session freshness rule. The market-state legs
passed (no "market open"/"market closed" in any fetched server HTML —
the #399 build holds).

The probe hardening (PR #423, PROBE-NOSTATE): the founder's absolute
rule "The server HTML must never state a market state" — ANY
"market open"/"market closed" wording in a fetched observation line
fails in EITHER session. RELIANCE fixtures added: the REAL captured
bytes (12 Oct 14:53:35Z production capture, the pre-#399 build baking
"Mon 12 Oct, 15:15 IST · market closed · last session quote") and the
founder's documented night-sighting class ("market open · intraday
quote" frozen from a market-hours regen). RED (verbatim-copy harness of
the #414 logic, exit 1): the old probe PASSED the baked-state capture at
night (coincidentally correct) and in an open session — 2 disagreements
with the founder's rule. GREEN: self-test 17/17, exit 0.

## 4. #415 — the browser evidence (awaiting panel, flag on)

Captured 2026-10-13T08:17:45Z against production 938c1c3 (the #415
build), headless browser, viewport 1440×900:

- `RANKINGS_ENABLED` verified through the vault credential (Vercel API,
  names-only read): target=production, value=true, updated 2026-10-06.
- DOM: `🟢 Top Buy Signals` (h2, visible) and `🔴 Short Radar` (h2,
  visible), each followed by the honest awaiting copy: "Rankings are on —
  nothing qualifies yet. Rankings are enabled, but no record currently
  qualifies for a ranked pick — the exchange-data licence is pending, so
  no consensus exists yet. The ranked widgets appear the moment a record
  qualifies; no seed-derived ranking is shown."
- Negative control: the flag-OFF copy ("Ranked picks are disabled" /
  "switched off") does NOT render.
- Screenshot: `download/report-2026-10-13-round55/dashboard-awaiting-tbs-sr.png`
  (session store); DOM dump: `dashboard-awaiting-dom-dump.json`.

## 5. /rishis — the formula box matches formulaTextFor

- Deployed build: production = 938c1c3; `git diff 938c1c3 f545f6d --
  lib/scorers/formulaText.ts lib/chat/registryDisplay.ts
  lib/chat/registry.ts lib/consensus/orchestrator.ts app/rishis/page.tsx
  test/rishisFormula.*` is EMPTY (only docs merges between them) — the
  formula code on main IS the deployed code.
- The contract tests on that code: `npx vitest run
  test/rishisFormula.generated.test.ts test/rishisFormula.prompts.test.ts`
  — 2 files / 5 tests PASS: every registry display string equals
  `formulaTextFor(runAllScorers(...).comps)` (20 scorers; chanos
  chat-only, pinned present).
- Live HTML (08:20:05Z, age 3832, x-vercel-cache: HIT): the FORMULA box
  renders exactly `P/CF Ratio (25%) + Growth Composite (25%) + Quality
  ROCE/Debt/FCF (20%) + Promoter Conviction (20%) + Neutral Base (10%)`
  (1 occurrence — the Jhunjhunwala default). Negative control:
  `Sentiment (10%)` — 0 occurrences (the pre-#401 drift stays gone).

## 6. The CI-corruption retraction

Retracted in the session worklog (13 Oct, founder order): the ci.yml
"corrupted push trigger" (`branches: ain]`) was NEVER corrupted in the
repository — the sighting was the tool's output rendering eating a
two-character sequence from `branches: [main]`; `od -c` proved the file
intact (twice: ci.yml in round 54, `IST_MONTHS[m[3]]` in
postDeploySmoke.mjs today). The Y5 "fix the corrupted trigger" item was
based on a phantom defect.
