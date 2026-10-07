# G5 residual disposition — the 896-universe unavailable census (round 24)

Directive 5 (founder, 2026-10-07): establish the final disposition of every
residual unavailable instrument. Companion to
`e4-residual-classification.md` (the 916-era 102-symbol root-cause) and
`unavailable-symbols-verification-round24.json` — this file is the
POST-#242/#243 census against the current 896 universe, with new
provider-identity evidence gathered 2026-10-07 12:35-12:45 UTC.

## Method (re-runnable, read-only)

1. Universe: the 896 `STOCKS` keys on `origin/main` = `05ee441`.
2. Production availability sweep: `POST /api/prices/batch` in 50-symbol
   chunks over all 896 (the page's own transport). Result: **61
   unavailable** (request-key basis; raw list in this repo's evidence
   JSON companion `g5-residual-disposition-census.json`).
3. Identity probes for each of the 61: Yahoo v8 chart (`<SYM>.NS`, both
   query hosts), Yahoo v1 search, and targeted corporate-action candidates
   (each candidate probed for a CURRENT INR quote + longName). Raw:
   sandbox `g5-census-evidence.json` (committed extract below).

## Disposition table

| class | count | disposition |
|---|---:|---|
| rename/merger with provider-verified identity (NEW evidence) | 4 | alias candidates — FOUNDER DECISION NEEDED (evidence below; default: leave unavailable until confirmed, per the round-24 §4 precedent) |
| already founder-held as alias-kept-out (cross-referenced) | 4 | TATAMOTORS, COSMOFILMS, MAHINDCIE, ADANITRANS — evidence STRENGTHENED, disposition unchanged (founder holds) |
| provider coverage gap (Yahoo NSE hole) | 53 | FOUNDER DECISION NEEDED (second provider) — the round-24 §6 class, re-confirmed at 896; 4 + 4 + 53 = 61, the census exact |
| seed-identity corrections recorded | 1 | PTON = "Prime Textiles" (NSE) — counted inside the 53 (its own `.NS` is unserved); the US Peloton ticker collision is a FALSE lead, recorded so it is not re-tried |

## New identity evidence (Yahoo v8 longName + current INR quote, 2026-10-07)

| seed symbol (unavailable) | candidate (current, served) | provider longName | corporate action |
|---|---|---|---|
| SUVENPHAR | `COHANCE.NS` @ 455.45 | "Cohance Lifesciences Limited" | Suven Pharmaceuticals renamed Cohance Lifesciences (2024 consolidation) — ZERO name-token overlap; identity is corporate-action-based only |
| WABCO | `ZFCVINDIA.NS` @ 2172.2 | "ZF Commercial Vehicle Control Systems India Limited" | Wabco India acquired by ZF (2020-21) and renamed — overlap 0.5 ("India") |
| IBULHSGFIN | `SAMMAANCAP.NS` @ 132.94 | "Sammaan Capital Limited" | Indiabulls Housing Finance renamed Sammaan Capital — ZERO overlap |
| UJJIVAN | `UJJIVANSFB.NS` @ 64.94 | "Ujjivan Small Finance Bank Limited" | Ujjivan Financial Services (holdco) merged into Ujjivan SFB — partial overlap |

All four canonicals are NOT seed keys (no duplicate-row risk); the alias
machinery (T12 redirects + input canonicalization) is already wired and
proven by #239/#242/#243.

## Cross-referenced founder-held cases (evidence strengthened, no action)

- `TATAMOTORS.NS` 404s on Yahoo v8 (both hosts); `TMPV.NS` serves "Tata
  Motors Passenger Vehicles Limited" @ 283.0 — the demerger's surviving
  listing. The TMCV/TMPV entity question the founder raised stands; the
  probe does not resolve which entity the seed row meant.
- `COSMOFILMS.NS` 404s; `COSMOFIRST.NS` serves "Cosmo First Limited" @
  831.95 — the documented 2022 rename. Overlap stays 0.5; founder holds.
- `ADANITRANS.NS` 404s; `ADANIENSOL.NS` serves "Adani Energy Solutions
  Limited" @ 1318.8 — the documented rename. Founder holds.
- `MAHINDCIE.NS` 404s; `CIEINDIA.NS` serves "CIE Automotive India
  Limited" @ 378.70 — the documented Dec-2023 rename (Mahindra CIE
  Automotive → CIE Automotive India; the Mahindra stake exit). Round-24
  §4 kept the alias out at overlap 0.5; founder holds. (Added in the
  review pass: MAHINDCIE is in the census JSON but was missing from the
  original cross-reference — the arithmetic above is now exact.)

## Independent verification (review pass, 2026-10-07 ~13:59 UTC)

- `SUVENPHAR.NS` 404 / `COHANCE.NS` serves "Cohance Lifesciences Limited"
  @ 455.45 INR — reproduced exactly as recorded above.
- `MAHINDCIE.NS` 404 / `CIEINDIA.NS` serves "CIE Automotive India Limited"
  @ 378.70 INR — as recorded above.

## Honest corrections recorded

- `PTON` is "Prime Textiles" (NSE, Textiles) in the seed. The US Peloton
  (NASDAQ: PTON) search result is a ticker collision and was REJECTED as a
  false match — recorded so it is not re-tried. Prime Textiles itself is
  not served by Yahoo (provider-coverage class).
- Every one of the 61 404s on Yahoo v8 chart under its own `.NS` symbol
  (both query hosts) — the class boundary between "relic" (current ticker
  exists and serves) and "provider gap" (nothing serves) held for all 61.

## FOUNDER DECISION NEEDED (roll-up)

1. The four alias candidates above — approve each alias (the corporate
   action is the identity evidence; the provider longName confirms the
   entity) or hold per the round-24 default. Recommended default: APPROVE
   all four; each is a documented NSE corporate action, and the alias path
   is reversible (revert + the [6] pins).
2. The ~50 provider-coverage rows — unchanged from round-24 §6: a second
   provider or explicit acceptance of the coverage ceiling. With these
   resolved, the steady-state ceiling is ~846/846+ (100% of priced
   instruments); unresolved, the E4 90% gate remains structurally
   capped (verified arithmetic in e4-residual-classification.md §2).
3. KAPIL — held from #239; no new evidence this session; stays held.
