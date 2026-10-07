# G7 canonical measurement baseline — Direction-13 corrective artifact (2026-10-07)

Founder direction 13 (round 26): the supplied G7 evidence carried
inconsistencies — a row-level P50 vs report-text P50 gap, an artifact
aggregate mismatch, different 429/413 counts between narrative and rows,
and a disagreement about PoW inclusion in wall time. This artifact adds
ONE canonical calculation over the round-23 battery's raw rows and fixes
the measurement method going forward. **Historical evidence is not
rewritten** (C10); `round23/g7-latency-battery.{md,json}` stand as
recorded, with their defects now named here.

## What changed in the method (this PR)

- `scripts/g7CanonicalStats.mjs` — ONE canonical calculator: raw rows are
  the only source; refusals are counted by exact status from the rows
  (never silently dropped); BOTH wall variants are reported
  (`wallInclPoW` = browser-experienced, `wallExclPoW` = the AI-loop cost);
  attribution percentages are computed against `wallExclPoW` totals.
- `scripts/aiLatencyBattery.mjs` — embeds the SAME canonical block in
  every future artifact (`artifact.canonical`), records `ttfbMs` per row
  (the historical 18% "unattributed" bucket now shrinks to the truly
  unattributed remainder), and states `powIncludedInWallMs` explicitly.
- `test/g7CanonicalStats.test.ts` — pins the calculator on a
  hand-computed fixture. Bite-proof (rule 24): a deliberate
  refusal-dropping mutation failed 4/5 pins; restored, 5/5 pass.

## Canonical baseline (from the round-23 raw rows — unchanged data)

Command and raw output (rule 25):

```
$ node scripts/g7CanonicalStats.mjs docs/evidence/round23/g7-latency-battery.json
{
  "n": 70,
  "usable": 53,
  "refusals": 17,
  "refusalStatusCounts": { "413": 1, "429": 16 },
  "wallInclPoW": { "p50Ms": 15476, "p95Ms": 37143, "meanMs": 17255 },
  "wallExclPoW": { "p50Ms": 15443, "p95Ms": 37083, "meanMs": 17232 },
  "attribution": {
    "basis": "usable rows, wallExclPoW totals",
    "wallExclPoWTotalMs": 913286,
    "completionsInitialMs": 189502,  "completionsInitialPct": 20.7,
    "completionsPostToolMs": 378256, "completionsPostToolPct": 41.4,
    "completionsRepairMs": 171946,   "completionsRepairPct": 18.8,
    "completionsTotalPct": 81,
    "toolExecutionMs": 8881,   "toolExecutionPct": 1,
    "validationMs": 31,        "validationPct": 0,
    "unattributedMs": 164670,  "unattributedPct": 18
  },
  "grounded": 23, "repaired": 21,
  "repairCauses": { "unsupported-numeric-prose": 7, "missing-claims": 7,
                    "schema-mismatch": 3, "field-value-mismatch": 2,
                    "provenance-wording": 2 }
}
financial: usable=19/22 wallExclPoW p50=15126ms p95=34082ms refusals={"429":3}
philosophy: usable=7/11 wallExclPoW p50=7646ms p95=12925ms refusals={"429":4}
invalid: usable=10/11 wallExclPoW p50=14258ms p95=29746ms refusals={"429":1}
hostile: usable=5/8 wallExclPoW p50=15443ms p95=23676ms refusals={"413":1,"429":2}
financialNoSymbol: usable=4/6 wallExclPoW p50=8438ms p95=25044ms refusals={"429":2}
toolRequest: usable=5/6 wallExclPoW p50=32109ms p95=37083ms refusals={"429":1}
multitool: usable=3/6 wallExclPoW p50=43091ms p95=45530ms refusals={"429":3}
```

## The four inconsistencies, resolved canonically

1. **P50 rounding**: row-level P50 is **15,476 ms incl PoW / 15,443 ms
   excl PoW** — the report's "15.5 s" was a rounded rendering of the same
   rows. No numeric disagreement survives; both canonical variants are now
   first-class.
2. **Artifact aggregate mismatch**: the round-23 artifact's `classes`
   block was empty (resume-path shape bug). The canonical block above is
   recomputed from the artifact's own `raw` rows — which the round-23
   artifact DOES carry — so the gap is closed without touching history.
   Future artifacts embed the canonical block at write time.
3. **Refusal counts**: the narrative said "429 ×14, 502 ×3"; the rows say
   **429 ×16, 413 ×1, zero 502s**. Canonical = row-derived counts. The
   413 is the hostile class's oversized-padding row (an expected 413 from
   the route's message-length boundary — a refusal by class design, not
   an infrastructure failure).
4. **PoW inclusion**: the narrative said excluded; the artifact's
   measurementMode said included. Both were describing the same rows: the
   solve time IS inside `wallMs`, and it is small — **33 ms at the P50**
   (15,476 → 15,443 when excluded). Future artifacts state
   `powIncludedInWallMs` explicitly, and every headline reports both
   variants.

## Verdict against the founder's gate (unchanged by canonicalization)

**P50 = 15.44 s (excl PoW) vs the ≤8 s target — FAILS.** The threshold is
not weakened and was fixed before any optimization experiment
(direction 14). Attribution is confirmed: provider completions are 81.0%
of wall; tools 1.0%; validation ~0%; 18.0% unattributed (ttfbMs capture
now splits this). Per-class P50s (excl PoW): financial 15.1 s, philosophy
7.6 s, invalid 14.3 s, hostile 15.4 s, financialNoSymbol 8.4 s,
toolRequest 32.1 s, multitool 43.1 s.

## The one-driver experiment this baseline anchors (direction 14)

Driver 1 of the latency program: **eliminate the redundant post-tool model
synthesis for deterministic singleton outcomes** (the FDN 1(b) default
logged in `round23/g7-latency-battery.md`, proceeded under founder
direction 10's explicit instruction to attack "redundant completions" —
reversible, logged here per C10/B-26). Scope: the no-initial-evidence
loop; exactly one tool executed; (a) ok outcome carrying typed facts for
the intent-detected singleton ask → the server serves its OWN verified
surface (the same builder `validateGrounding` uses), no model synthesis;
(b) deterministic failure states (unknown-symbol / no-data / failed /
invalid-args / unknown-tool) → the server serves the bounded honest
disclosure. Acceptance: the SAME 70-question battery distribution, same
pacing, same percentile code, gate fixed at ≤8 s P50 (excl PoW headline,
incl-PoW reported alongside). Everything else (prompt payload, model
choice, timeouts, multitool composition) is explicitly NOT this
experiment and stays for the next driver.
