# Short Radar validation contract (pre-registered) — round 20

Founder directions 2026-10-06 (items 1–19). This file is the validation
contract required by direction 6: the pass/fail criteria below were fixed
and committed BEFORE any battery result was produced. No threshold may be
changed after seeing results; if the model fails, it stays honestly
labelled per the status contract.

## 1. Audit findings (direction 3) — measured on main @ 25dec82

Reproduction: `npx tsx --conditions react-server scripts/shortRadarProbe.ts`
(raw output preserved in the PR). Live radar: DELHIVERY 15.76,
GMRAIRPORT 15.75, NAZARA 15.55 — the founder's screenshot.

| Question (direction 3) | Answer (verified) |
|---|---|
| Inputs the model uses | Resolved seed metrics only: pe, pb, roe, roce, opm, fcfMargin, revenueCAGR3Y, epsCAGR3Y, debtToEquity, promoterHolding, marketCap + static sector benchmarks (`lib/scorers/config.ts`) |
| Live vs seed/static | 100% seed. `computeShortRadar` calls `resolveStockMetrics(sym)` with NO live argument; no live price or fundamental reaches Short Radar |
| Scoring formula / thresholds | 6 pillars, weights 0.25/0.22/0.20/0.18/0.10/0.05, hand-set cutoffs (pe vs sector ratio 1.5/2/3, pb 6/10, roe 8/12, fcf<0, opm 8, catalyst base 20), trend multiplier ±4% |
| Signal overlap / double-count | Trigger flags use pe>40, revcagr<0, de>2, fcf<0, promo<25. The score uses pe, pb, roe, fcfMargin, opm ONLY. D/E, revCAGR, promoter holding are DISPLAYED but contribute ZERO to the ranking; pe is counted in both gate and score |
| Calibrated to any historical outcome | NO. Never backtested. Weights/cutoffs are hand-set (probe + git history) |
| Deterministic reproduction | YES — pure sort, stable tie-breaks (test/rankings.test.ts pins stability) |
| Displayed reasons derived from model facts | NO. DELHIVERY displays "Low promoter skin-in-game (22.6%)" — promoterHolding contributes 0.00 to its score (governance pillar input absent). GMRAIRPORT displays "High leverage (D/E 3.00x)" — debtToEquity contributes 0.00 (decay pillar reads debtEbitda, which is absent) |

Structural defects proven by the probe:

- D1 — Dead weight: governanceRisk (0.20), moatDestruction (0.18),
  growthMirage (0.10) receive NO resolvable inputs (promoterPledge,
  accountingFlags, relatedPartyPct, usfdaWarnings, chinaApiDependence,
  dpcoRisk, patentCliffRisk, debtorDays, cashConversion, inventoryDays are
  all absent from `resolveStockMetrics` output). 48% of declared weight can
  never fire; with the constant catalyst term the effective model is two
  pillars.
- D2 — Constant term: catalyst scores exactly 20 for every stock (base 20;
  shortInterest/above200DMA/rsi all absent) = +1.00 for everyone. No
  information.
- D3 — Unreachable calibration: max achievable finalScore = 0.25*100 +
  0.22*100 + 1 = 48.0. The SHORT conviction bands (65/75/85) are
  mathematically unreachable; a "/100" score that cannot exceed 48 is
  mislabelled.
- D4 — Placeholder zeros scored as observations: NAZARA roe=0 (seed
  placeholder) is read as "ROE < 8% — value destruction" (+25); NAZARA
  promo=0.0% is displayed as a fact. The X6 unknown-fields contract exists
  at the consensus boundary but the QVPS path never applies it (rule 3/C1
  violation on the short surface).
- D5 — Rationale/ranking divergence: the displayed reasons are not the
  features that determined the order (see table).

## 2. Data reality and the real-historical criterion (directions 5, 8)

Direction 5 requires real historical out-of-sample evidence. The repo has
no historical point-in-time fundamentals for the NSE universe: the
licensed sources (D1-04/D1-05, Nifty 500 TRI) are FD-1-blocked, and free
providers expose no filedAt-gated fundamental history. Direction 8 forbids
manufacturing validation from the seed dataset. Therefore:

- The battery below runs on SYNTHETIC walk-forward worlds built by the
  canonical S2-02 machinery (`lib/backtest/engine.ts` + a new short-world
  generator in `scripts/backtest/`) — the same standard the harness itself
  was accepted at (Round-16 C7: "S2-02 backtest harness on synthetic
  data").
- The world's data-generating process is PRE-REGISTERED here (section 4)
  before any run. It encodes the economic hypothesis (expensive valuation,
  decaying fundamentals, weak skin-in-game -> lower forward returns) with
  sector structure, filing lag, delistings and regimes. It is NOT derived
  from the model's thresholds.
- **R1 (real-historical criterion) stays OPEN**: full-model validation
  requires point-in-time NSE fundamentals (FD-1). Until R1 runs, the model
  status cannot rise above `structure-evaluated`, and the UI must say so.

## 3. Pass/fail criteria (fixed before results)

Notation: shortIC = −spearman(factor score, forward return) over the gated
candidate cross-sections (high score must predict LOW forward return).
The candidate gate mirrors the product: >= 2 trigger flags on resolved
fields, ranked by score.

- **P1 Harness validity (positive control)** — on the short world: a
  prophet factor (knows next period's return) achieves shortIC > 0.999; a
  shuffled-label factor over 1000 trials at a mid-window rebalance has
  |mean shortIC| < 0.05 and mean |shortIC| < 0.05. The battery is void if
  P1 fails.
- **P2 Information beyond the hand-written heuristic** — model shortIC >=
  0.10 over the full window AND model shortIC >= heuristic shortIC + 0.05,
  where the heuristic is the trigger-flag COUNT ranked descending (the
  pre-existing hand-written ranking), on the same worlds, same gate.
- **P3 No duplicate information** — max pairwise Spearman between pillar
  weighted contributions across the pooled cross-section <= 0.90, AND
  model shortIC >= best single-pillar shortIC + 0.02 (the combination must
  add information beyond its best component).
- **P4 Signal stability** — |shortIC(first half) − shortIC(second half)|
  <= 0.10.
- **P5 No look-ahead leakage** — shifting every filedAt forward one
  quarter drops shortIC by >= 0.03 (information decays when delayed).
- **P6 Survivorship** — the survivor-only universe CAGR exceeds the honest
  universe CAGR by >= 50 bps annualized (the honest universe must hold the
  delisted crashes).
- **P7 Calibration reachability** — a constructed maximal-risk fixture
  (all fields at adverse values) scores >= 90; on the world cross-section
  at least 3 distinct SHORT conviction bands are populated. (v1 fails by
  construction: max 48.)
- **P8 Regimes** — split the window into 4 benchmark-drift epochs; shortIC
  > 0 in >= 3 of 4.
- **P9 Concentration** — across rebalance dates with >= 3 gated
  candidates, the mean rate that the top-3 share one sector <= 2/3.
- **P10 Rationale traceability (mechanical, unit-level)** — every flag
  displayed for a radar candidate maps to a feature with nonzero
  contribution to that candidate's ranking score; placeholder-zero fields
  fire no flag and contribute no score; verified on the seed universe and
  specifically on DELHIVERY, GMRAIRPORT, NAZARA.
- **R1 Real-historical OOS (OPEN, FD-1)** — on licensed point-in-time NSE
  fundamentals: shortIC >= 0.05 with P1–P9 controls re-run on real data.
  Pre-registered now; executable when D1-04/D1-05 unblock.

## 4. Pre-registered short-world DGP (before any run)

`scripts/backtest/shortWorld.ts`, seed 20261006, 300 symbols, 96 monthly
rebalances (8 years), 4 pre-window filing quarters, filing lag 1 month,
30% delistings with a −70% final crash, 6 sectors (avgPE 28/16/32/45/22/18
— mirrors `SECTOR_BENCHMARKS_CONFIG` structure), benchmark drift epochs
(+1.2%/mo, +0.2%, −0.8%, +0.6% — 24 months each).

Hidden short-quality s[i][q] ~ quarterly AR(1), rho = 0.6. Monthly return:
r = −0.06*(s_current − 0.5) + uniform(−0.05, +0.05); delisting month r =
−0.70. High s = deteriorating name = lower forward returns.

Fundamentals per quarter = sector-typical base + partial loading on the
PREVIOUS quarter's s (the model can only see filed history) + uniform
noise:

- pe = sectorAvgPE * exp(0.9*(s_prev − 0.5) + U(−0.15,0.15))
- pb = 2 * exp(0.7*(s_prev − 0.5) + U(−0.2,0.2))
- roe = 15 − 12*s_prev + U(−3,3); roce = roe + U(−2,2)
- opm = 14 − 10*s_prev + U(−3,3)
- fcfMargin = 4 − 12*s_prev + U(−3,3)
- debtToEquity = 0.5 + 2.5*s_prev + U(−0.3,0.3)
- revenueCAGR3Y = 12 − 20*s_prev + U(−4,4); epsCAGR3Y = revenueCAGR3Y + U(−3,3)
- promoterHolding = 55 − 25*s_prev + U(−8,8)
- marketCap = lognormal (no loading)

The loadings are the economic hypothesis, fixed here; they are not tuned
to the model's cutoffs, and no parameter may be changed after a battery
run.

## 5. Model repair spec (qvps-short-v2) — root-cause fixes, pre-registered

Direction 7: fix the identified defect class (dead feature construction,
constant offset, placeholder-as-zero, rationale divergence). No weight was
chosen to improve any backtest number; weights renormalize the DECLARED
architecture onto the resolvable input set, and the new sub-feature
thresholds are the product's already-declared trigger cutoffs.

- v2-1 Pillars fed from resolvable inputs only:
  - overvaluation (unchanged logic: pe vs sector ratio, pb) — weight 0.35
  - fundamentalDecay: roe, fcfMargin, opm (unchanged cutoffs) + debtToEquity
    (>2x +12, >3x +20) + revenueCAGR3Y (<0 +12, <−5 +20) — weight 0.40
  - governanceRisk: promoterHolding skin-in-game (<25% +20, <15% +30) —
    weight 0.25
  - moatDestruction, growthMirage, catalyst — weight 0.00, enabled=false,
    documented reason: no resolvable inputs in the current data contract
    (re-enable at D1-04/D1-05 when their fields resolve). Catalyst's
    constant base 20 is deleted (D2).
  - Weights sum to 1.00. SHORT conviction bands (65/75/85), getGrade,
    getAction, trend multiplier: UNCHANGED.
- v2-2 Placeholder-nulling at the QVPS boundary: a field with
  source==='seed' && value===0 is UNKNOWN (X6 semantics) — passed as null
  to the scorer; nulls fire no sub-feature and no flag (D4).
- v2-3 Rationale contract: the displayed reason is generated from the same
  resolved-field flags that gate the candidate; each flag names its field
  value; a flag may only render when its feature contributes to the score
  (D5/P10).
- v2-4 Version identity: `QVPS_SHORT_MODEL = { id: 'qvps-short', version:
  2 }` exported from lib/scorers/modelVersion.ts and rendered by the UI.

## 6. Status contract (directions 9–12, 15)

`lib/scorers/modelStatus.ts` (isomorphic, single source) maps the checked-in
artifact summary (`lib/scorers/shortRadarValidation.ts`) to a status and
exact UI copy. The battery test re-runs the battery deterministically and
fails CI if the artifact's claims ever diverge from a fresh run — a
validated status is therefore only renderable while the evidence actually
passes (direction 15).

- `unvalidated` — battery not green (or artifact absent):
  `Research signal — QVPS short screen v<version> — model not validated;
  inputs seed-derived. Not investment advice.`
- `structure-evaluated` — P1–P10 green, R1 open:
  `Research signal — QVPS short screen v<version> — passed the
  pre-registered synthetic walk-forward battery (round 20); not yet
  validated on real historical outcomes; inputs seed-derived. Not
  investment advice.`
- `validated` — P1–P10 AND R1 green on licensed data:
  `Research signal — QVPS short screen v<version> — historically evaluated
  out of sample; not investment advice.`

Banned unless the acceptance test establishes the claim: "validated",
"proven", "accurate", "predictive", "high-confidence" (direction 10).
Seed/sample provenance stays explicit while inputs are seed-derived
(direction 12). The investment disclaimer communicates: research/screening
signal, data provenance, model evaluation status, not investment advice
(direction 11) — precise, not alarmist.

## 7. Guardrails preserved (direction 16)

`dataQuality === 'OK'` gating, deterministic ordering with tie-breaks, the
ranked-picks feature flag, honest seed banner, and the existing scoring
one-source rules are preserved. Latency guard (direction 17): Short Radar
remains pure server-side computation — no new provider/model call; timing
captured before/after in the PR.
