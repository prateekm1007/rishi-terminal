# E4 — the 102-symbol residual, deterministically classified (round 24)

Founder directives 8–13 (2026-10-07 session): the E4 freshness gate FAILED
at 814/916 (88.86% < the pre-registered 825). This file root-causes every
not-fresh symbol with exactly ONE terminal cause from the fixed taxonomy
`provider coverage | alias/identifier | registry identity | refresh
failure | cache/write failure | stale observation | unavailable`, and
carries the fixes that follow from it. Snapshot: **2026-10-07 09:13 UTC**
(read-only SQL) with a production-path batch sweep at 09:13–09:14 UTC —
the same in-session conditions as the failed battery (814 fresh at
snapshot; 102 not-fresh).

## Verdict table

| class | count | disposition |
|---|---:|---|
| fresh | 814 | — (one of them, ANUPAM, is fresh-but-wrong-identity; see §5) |
| provider coverage | 58 | FOUNDER DECISION NEEDED (second provider / acceptance) — §6 |
| registry identity | 19 | 9 bogus pairs already removed by #239 (merged eb2d7f4); **10 newly found relic rows** → G5 follow-up PR — §3 |
| alias/identifier | 12 | **9 provider-verified renames** added to yahooAliases.json (this PR); 3 identity-ambiguous → founder decision — §4 |
| stale observation | 11 | honest old provider clocks (suspended/frozen instruments) — §7 |
| refresh failure | 2 | transient per-symbol provider misses; recovered through the batch path during the sweep — §8 |
| cache/write failure | 0 | none found (the write path wrote every observation the provider disclosed) |
| unavailable | 0 | none (every symbol received a terminal cause) |

Total 916; not-fresh 102 — matching the failed battery's residual exactly.

## 1. Method (deterministic, re-runnable)

Three phases, `scripts/e4_classify_v3.py` (sandbox-side, read-only):

1. **Snapshot (SQL, read-only)** — `quote_cache` per-symbol state (BEFORE):
   row existence, price, `observed_at`, source; `now()` from the same query.
2. **Production batch sweep (AFTER)** — `POST /api/prices/batch` over the
   whole 916 universe in 50-symbol chunks (the page's own transport; the
   round-22 census methodology). For a stale row this is a live provider
   test through the product's real path — the authority for "can the app
   serve this symbol".
3. **Sandbox evidence probes** only for sweep-unserved symbols: Yahoo v8
   chart (`.NS` then `.BO`), the alias symbol if any, and Yahoo v1 search
   with three query variants (seed name, stripped name, symbol text);
   identity-matched candidates re-probed for a CURRENT INR quote.

Decision tree (normative order, first match wins): fresh (BEFORE within
30 min) → registry identity (relic rows) → cache/write failure (sweep
LIVE-current with no BEFORE row) → refresh failure (sweep LIVE-current
over a stale row, or sweep-miss with a <24 h row) → alias/identifier
(identity-matched current candidate) → stale observation (genuine
observation > 24 h old / frozen provider clock) → provider coverage
(claim placeholder, nothing serves) → unavailable (probes inconclusive;
zero in this run).

Identity gates for alias acceptance (all provider-verified, round-24
extensions of the round-21 gate): name token overlap ≥ 0.6; candidate
ticker text == seed company name (the FIRSTCRY lesson); seed-name tokens
⊂ provider-name tokens; candidate ticker == initialism of the seed name
(LMW); format-normalized ticker equality (NAM-INDIA). Raw artifacts:
`/home/z/my-project/e4-residual/{sweep.json, probes.jsonl,
classification.json}` + the committed
`docs/evidence/round24/unavailable-symbols-verification-round24.json`.

## 2. Why the morning battery failed — the arithmetic

916 − 92 structurally-unavailable (58 provider coverage + 19 registry
identity + 11 stale observation + 4 ambiguous/never-resolvable aliases)
= **824 < 825**. The 916-universe gate was mathematically unreachable
even with a perfect warmer: the residual was structural, not a scheduler
or refresh defect. The scheduler itself is proven (round-22: three
consecutive scheduled in-session runs, `/api/health` row-exact agreement,
BANKBARODA positive control). After #239 (universe 906) the ceiling is
906 − 82 = 824/906 = 90.9%; with this PR's 9 aliases and the G5
follow-up's 10 relic removals (universe 896) the steady state is
~822/896 = **91.7%**, with the observed flake tail (§8) as the only
downward pressure.

## 3. Registry identity — 10 newly found relic rows (G5 follow-up)

Each relic key 404s on Yahoo while its CURRENT ticker is itself a STOCKS
key serving a fresh quote (probes 2026-10-07 ~09:39 UTC, raw in the
artifact):

| relic (dead) | current key (fresh) | corporate event |
|---|---|---|
| MCXINDIA | MCX | seed carried both spellings of one instrument |
| TORNT | TORNTPHARM | ticker normalization |
| MACROTECH | LODHA | Macrotech Developers = erstwhile Lodha Developers (NSE: LODHA) |
| GMRINFRA | GMRAIRPORT | GMR Infrastructure renamed GMR Airports |
| INOXLEISURE | PVRINOX | INOX Leisure merged into PVR (2023) |
| MAGMA | POONAWALLA | Magma Fincorp renamed Poonawalla Fincorp |
| TATACOFFEE | TATACONSUM | Tata Coffee merged into Tata Consumer |
| IIFLWAM | 360ONE | IIFL Wealth renamed 360 One WAM |
| TV18BRDCST | NETWORK18 | TV18 Broadcast merged into Network18 |
| JSWISPL | JSWSTEEL | JSW Ispat merged into JSW Steel (2014) |

These are the same defect class as #239's ten pairs (the name-similarity
census missed them because the old/new names differ materially); the fix
is the same: remove the relic row, keep the current row, add a
user-typing alias. Delivered as the G5 follow-up PR in this round.

## 4. Alias/identifier — 9 verified renames added (this PR)

| seed symbol (dead) | Yahoo ticker (current) | identity evidence |
|---|---|---|
| BRAINBEES | FIRSTCRY | seed name "FirstCry" == ticker; provider "Brainbees Solutions Limited" |
| GANESHHOUC | GANESHHOU | provider "Ganesh Housing Limited", overlap 1.0 |
| SOMDISTILL | SDBL | provider "Som Distilleries & Breweries Limited", overlap 0.667 |
| TECHNO | TECHNOE | seed tokens {techno, electric} ⊂ provider name |
| SANDUMANG | SANDUMA | seed tokens {sandur, manganese} ⊂ provider name |
| ELDECO | ELDEHSG | provider "Eldeco Housing and Industries Limited", overlap 0.667 |
| JSLHISAR | JSL | provider "Jindal Stainless Limited", overlap 0.667; JSL not a seed key |
| LAXMIMACH | LMW | LMW = initialism of "Lakshmi Machine Works"; not a seed key |
| NAMINDIA | NAM-INDIA | NSE ticker is hyphenated; provider "Nippon Life India Asset Management" |

Alias-kept-out (identity not provider-establishable in-band — round-21
ADANITRANS precedent): TATAMOTORS (2025 demerger, TMCV/TMPV ambiguity),
COSMOFILMS → COSMOFIRST (overlap 0.5), MAHINDCIE → CIEINDIA (overlap
0.5), ADANITRANS → ADANIENS (name changed to Adani Energy Solutions).
FOUNDER DECISION NEEDED on each; recommended default: leave unavailable
until the founder confirms entity identity.

Rejected false match (recorded so it is not re-tried): WELSPUNIND →
WELCORP — different companies (Textiles vs Metals; the G5 census kept
both rows); the match was a suffix-stripping artifact.

## 5. ANUPAM — fresh-but-wrong-identity (data integrity note)

The ANUPAM key (removed from the registry by #239; universe-side fix
already merged) had a FRESH row at snapshot: Yahoo serves a different
Rs 1.57 instrument under ANUPAM.NS. The row was never rendered as the
seed's "Anupam Rasayan" price (the registry gate + #239 removal protect
every surface), and the key is gone from the universe — the orphaned
cache row is ignored by the health RPC. Recorded because a fresh count
that includes a wrong-identity observation must never be read as
coverage of the seed instrument.

## 6. Provider coverage — the 58 (FOUNDER DECISION NEEDED)

Claim-placeholder rows (never observed live, `source='claim'`), nothing
serves the instrument on any tested path (canonical `.NS`/`.BO` 404, no
identity-matched current search candidate; the production path has never
obtained a quote):

ADANITRANS, AKZOINDIA, ALLSEC, AROHAN, BALLARPUR, BARBEQUE, BECKBIES,
BOOKMYSHOW, BRAHMASTRA, CENTURYTEX, DRONEAERO, GATI, GUJGASLTD, HBLPOWER,
HIL, HOVS, IBREALEST, IBULHSGFIN, IIFLSEC, INFIBEAM, ISEC, ISMT, ITDCEM,
JBCHEMPHAR, JMCPROJECT, JMTAUTOLTD, JPASSOCIAT, KALPATPOWR, KALYANAJW,
KAPIL, KNESL, KSOLV, KWALITY, LINGFORGER, LTIM, MANGCHEFER, MEDHA, MERCK,
NAINITAL, PTON, RADICON, RANEENGINE, RRVL, SELAN, SEQUENT, SHREYASHIP,
SHRIRAMEPC, SMLISUZU, SUVENPHAR, SUVIDHAFIN, SWANENERGY, TCNSBRANDS,
TIPSIND, TMVFINANCE, UJJIVAN, WABCO, WELSPUNIND, ZUARIGLOB

Notes for the decision packet: several are liquid current instruments
(CENTURYTEX, GATI, BARBEQUE, AKZOINDIA, KALPATPOWR, UJJIVAN, JPASSOCIAT,
WELSPUNIND-class) that Yahoo simply does not serve from our paths — the
gap is real but NOT obviously permanent, and Yahoo's serving for such
symbols was observed flapping in-session (the morning's 818-fresh
afternoon decline). At least four (BOOKMYSHOW, RRVL, NAINITAL, AROHAN)
are believed UNLISTED instruments that arguably do not belong in a
live-price universe at all — registry review recommended. KAPIL remains
the G5-recorded founder decision. Second-provider introduction is a
founder decision (cost/licensing, C9); no second provider was added.

## 7. Stale observation — the 11 (honest old clocks)

CHEMFAB, DFL, SHEMAROO, STARPAPER (clock lags hours intraday); HEG
(2026-09-21), GSPL (2026-05-11); DRONE, INDIGRID, RMCL, SADHAV
(2024-07-23), TINPLATE (2024-01-18). The provider serves these but
discloses only an old `regularMarketTime`; the warmer writes the
provider's honest last word and the observation clock (G4B) displays it
as such. No application defect: refreshing harder cannot make a frozen
provider clock current. HEG/GSPL may be rename candidates (clock froze
near plausible rename dates) — listed in the decision packet with the
evidence, not silently aliased.

## 8. Refresh failure — the 2 (transient, recovered)

CORALFINAC (row 08:38, sweep recovered 09:13), ENIL (row 08:40, sweep
recovered 09:13). Per-symbol provider misses the warmer retries each
pass; both were LIVE-current again through the batch path during the
sweep. The intraday flake tail is the dynamic component of the coverage
curve (818 → 801 observed 08:21–08:37 UTC while Yahoo throttled), and
the reason the E4 acceptance battery must be read after consecutive
scheduled runs rather than at any single instant.

## 9. Fixes delivered in this round

- This PR: 9 verified aliases (yahooAliases.json 44 → 53 generated
  entries; STOCK_ALIASES 54 with the BGV01 hand entry), the round-24
  verification artifact, the generator's multi-artifact merge, and the
  fail-first test extension (RED 1 failed → GREEN 7/7).
- G5 follow-up PR: the 10 relic-row removals (§3).
- Decision packet (PR thread): provider coverage (§6), stale
  observations (§7), ambiguous identities (§4), unlisted-instrument
  review (§6) — each with a recommended default.
- E4 re-acceptance: scheduled for the next NSE session on the merged
  deployment (three consecutive scheduled in-session runs + the
  pre-registered ≥90% battery on the then-current universe).
