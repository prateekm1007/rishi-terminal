# Round-46 P0-3 — THE SECTOR GATE (2026-10-11)

Founder order (audit 2026-10-11): "banks must not be scored on
D/E/OPM/FCF/P-NCAV/current-ratio; Greenblatt must refuse banks."

## The defect

Lender rows were scored on corporate ratios their balance sheets do not
have. SBIN (Banking) earned Greenblatt 66 on an earnings-yield test that
presumes a non-lender; Buffett/Lynch/Basant scored its OPM 42 and FCF
80,000; Graham's NCAV/current-ratio arithmetic ran on the loan book
(P/NCAV 69.62x). The P0-2 null class only caught the rows the P0-2b data
surgery had nulled (Banking de 22 / Banking opm 4) — 82 of the 84 lender
rows still carried NON-NULL inapplicable fields that scored as facts
(measured: lender rows 84 = Banking 36 + NBFC 38 + Finance 10; rows with
at least one non-null inapplicable field: 82).

## The fix (one declaration, rule 14)

- `lib/scorers/sectorGate.ts` — the closed lender vocabulary
  `LENDER_SECTORS = [Banking, NBFC, Finance]` and the closed
  inapplicable-field list `LENDER_INAPPLICABLE_FIELDS = [de, opm, fcf,
  ca, tl]` (the Stock fields behind D/E, OPM, FCF, P/NCAV and the
  current ratio), plus `describeFields` (the founder's ratio vocabulary
  for the insight text, raw field ids kept machine-checkable).
- `lib/scorers/verdictGuards.ts` — `sectorRefusal(stock, scorerName)`:
  the ONE refusal a scorer consults before its P0-2 placeholder guard.
  Inapplicability is STRUCTURAL — the metric does not exist for the
  sector, on any data quality; no live observation can cure it, which is
  a stronger refusal than "unknown". The contract table gains
  `lenderPolicy`; Greenblatt declares `lenderPolicy: "refuse"` — it
  refuses EVERY lender row even though np/mktcap computes (founder:
  "Greenblatt must refuse banks"). `noVerdictScore` renders the sector
  reason honestly ("D/E, OPM (fields de, opm) are not applicable to a
  Banking company; the Warren Buffett framework does not score lender
  balance sheets on them."), attribution shell preserved, comps empty.
- All 20 scorers — a 4-line pre-step after the function opens (minimal
  diff: every P0-2 guard line stays byte-identical). Wiring script:
  `scripts` history; Nemish and Greenblatt (bespoke guards) got the same
  pre-step with their placeholder logic untouched.

## Scope decision (logged)

Banking + NBFC + Finance are the lending family the founder's audit
names (the checklist's "bank/NBFC gate"); Fintech rows are platform
businesses whose corporate ratios can be observed — they stay scorable
until the sector-taxonomy item says otherwise.

## Proof

Fail-first RED (rule 21) — `npx vitest run test/p03.sectorGate.test.ts`,
EXIT 1, 9 failed / 2 passed
(`docs/evidence/round46/red-p03-sectorGate-vitest.txt`):

```
× the founder's finding: SBIN's Greenblatt verdict is null, not 66
AssertionError: expected 66 to be null
```

GREEN after the fix — 11/11 on the new file; full battery:
`npx vitest run` → 202 files / 2256 tests ALL PASSING; tsc 0; eslint
0 errors / 283 warnings (ratchet exact); validate:encoding clean;
validateStocks 896/896; scoreParity 0/896; build clean; ISR PASS
(896 baked routes); bundle budget OK (/ 159.4, /stocks 163.4,
/stock/[symbol] 170.4 — ratchet intact); aiLoopAudit 8/8; env gate
`.env.example` only.

Rule-23 re-pin (the ONE collateral pin, order named in the test):
`test/x6.nemishPlaceholders.test.ts` — the honest Nemish null census
248 → 296. Composition measured (`p03-lender-census.txt`): 48 lender
rows newly refuse (NBFC 31, Finance 5, Banking 12) — D/E observed seed
values with no placeholder pillar, refused now because D/E does not
exist for their balance sheets.

Behavioral pins on the new file (`test/p03.sectorGate.test.ts`):

- the implementation vocabulary equals the founder's words (drift pin);
- SBIN Greenblatt: null, insight names "does not apply to a Banking
  company", the string "66" absent;
- EVERY lender row (84): no scorer requiring an inapplicable field
  returns a number; Greenblatt refuses all 84 with the sector named;
- a fully-observed bank is scored ONLY by the four survivors (Kacholia,
  Philip Fisher, Porinju, John Templeton) — exactly the contracts
  needing no inapplicable field;
- the sector flip differential: the SAME observed body scores 20/20 as
  FMCG and only 4/20 as Banking; sector-blind survivors keep exact
  scores (Templeton's own pre-existing sector leg pinned equal across
  Banking/NBFC/Energy);
- refusals keep the attribution shell, never fabricate comps, carry no
  advice wording (STRONG BUY / Long / Short / REDUCE / Avoid: zero
  hits);
- consensus consequence: a fully-observed bank yields NO consensus
  verdict (4 finite < MIN_VALID_SCORERS 12 — fail closed, C2) while the
  same body as a non-lender still forms one.

## Constitution compliance

- C1/rules 1-4: the refusal insight names the real reason (structural
  inapplicability) in the founder's own ratio vocabulary; nothing
  fabricated; attribution shells preserved.
- C2/rule 6: fail closed — an unregistered scorer name in the gate
  throws; a bank with 4/20 finite scores gets NO consensus.
- C4/rule 14: ONE gate module, ONE refusal helper, ONE contract field;
  enforced by the scorers' single call site, pinned by tests.
- C5/rules 21-25: RED captured raw, GREEN raw, the re-pin named with
  the order, the census measured.
- C10: one evidence file for the round-46 P0-3 topic; the re-pin's
  count change is measured, not asserted.

## Post-merge C6 legs (2026-10-11, production serving `791c7b6db7c2`)

Deploy proof: `GET /api/version` → `{"sha":"791c7b6db7c2d144b2134e6fbf4d53601bbd8fd2",...}`
(polled ~2 min after the merge).

Production legs — 10/10 PASS
(`p03-production-legs.txt`, runner `scripts/p03/prodVerifyP03.mjs`):

- deploy gate: /api/version == the merge SHA;
- SBIN (Banking) flight-payload positive controls — the NEW content is
  present: Greenblatt's lender-formula refusal ("does not apply to a
  Banking company"), Buffett's "OPM (fields opm) is not applicable to a
  Banking company", Lynch's FCF refusal, and Graham's refusal switched
  from the placeholder reason to the sector reason ("fields ca, tl, de");
  the pre-fix "Magic Formula: ROC …" SBIN insight is ABSENT;
- non-lender positive control: RELIANCE (Energy) keeps its Greenblatt
  "Magic Formula: ROC 5.9% · EY 3.5%" insight — the gate is a no-op off
  the lender vocabulary, live;
- P0-1 regression: both stock pages still render the honest NO VERDICT
  record; /stocks 200.

CI note: the first CI attempt on #341 was FAILED by the C8 deploy-cadence
gate (window closed by #338's 09:16Z merge — the gate biting as designed);
the attempt-1 job was re-run after the window opened (~10:16Z) → all five
jobs green; the #340 docs-only merge landed mid-flight (deploy-exempt),
the branch was rebased onto it and all six checks re-greened on the exact
rebased head before merging.
