# E5 — the post-fix production AI battery (2026-10-06)

The after-measurement for PR #208 (`fix(E5): model-output contract at the
correct layer`), run against the deployed fix with the #203 battery
tooling (PoW solved in-loop, anonymous mode, per-row `powMs` recorded —
the challenge cost is reported separately per the founder's directive 11).

## Run conditions

- Artifact: `ai-battery-r18-after.json` (this directory, full raw rows).
- Bound to production `/api/version` = `b2d2b795` (the #210 merge —
  contains #208's fix; the chat path is untouched by #210).
- Run window 2026-10-06 02:00-04:57 UTC, resumed across 14 checkpointed
  chunks (the sandbox reaps process groups between tool calls — the
  battery's own R9-11 resumable-state design handled it; the state file
  never lost a row).
- Measurement environment was materially harsher than the R16 run: 28 of
  70 rows lost to provider 502s and burst-429s (vs 14/70 in R16). The
  EFFECTIVE sample (42) carries the quality comparison; the loss rate is
  a measurement-environment fact, recorded not hidden.

## Headline results (vs the R16 fresh battery, 2026-10-05)

| Metric | R16 fresh (before) | R18 after (this) |
|---|---|---|
| effective / n | 55/70 | 42/70 |
| firstPassGrounded | 6 (10.9%) | **15 (35.7%)** |
| grounded after repair | 17 (30.9%) | **19 (45.2%)** |
| repaired rows | 31 (56% of effective) | **7 (17%)** |
| malformed-json repairs | 7 | **0** |
| unsupported-numeric-prose | 11 | **0** |
| field-value-mismatch | 7 | 4 |
| missing-claims | 5 | 1 |
| forecast-advice-wording | 0 | 1 |
| zero-tool-engagement | 0 | 1 |
| provider attempts / effective row | 2.4 | **1.86** |

**The two dominant failure classes are ELIMINATED**: malformed-json (the
wire-level `response_format: json_object`) and unsupported-numeric-prose
(the signed-value contract rules) both went to zero. First-pass grounded
tripled (10.9% → 35.7%); eventual grounded rose to 45.2%; repairs dropped
from 31 to 7; provider completions per row dropped 22% (2.4 → 1.86) —
fewer wasted model turns, exactly the founder's directive-9 shape
("optimization means fewer unnecessary model turns and better first-pass
correctness").

By class (effective): financial 12/15 grounded (8 first-pass),
toolRequest 3/3 (3 first-pass), multitool 3/3 (3 first-pass — the R16
run had 0/5), hostile 1/5, philosophy 0/7 (context-only mode — the
grounding validator cannot ground claim-free prose; reported as measured,
NOT reclassified, per the protected list), invalid 0/5 (correct), 
financialNoSymbol 0/4 (correct — no invented numbers).

## Latency

wallP50 14.5 s / wallP95 35.5 s / avg 15.1 s — NOT comparable to R16's
11.1/25.0: the run includes the harsher retry environment (502/429
backoffs inflate wall times of affected rows) and the in-loop PoW solve.
Stage averages (effective rows): initial 7.0 s, post-tool 8.8 s,
repair 10.4 s. The next latency step is measured at the DOMINANT component
(provider completion time) with a cleaner environment (authenticated mode
against a fresh IST day, per the R16 note) before any further optimization
— no latency claim is made from this run.

## Remaining work (the next dominant class)

field-value-mismatch (4/7 repairs) is now the top class — the R15-priority
order continues. The measured shape (from the R16 artifact rows) is the
attribution window matching a number to the wrong field mention in prose
(e.g. "1.601 is attributed to price in the claim text but no price
assertion was provided"). The fix belongs in the attribution heuristics'
contract teaching (naming the exact phrasing the validator accepts), NOT
in validator strictness (protected).

## Honesty notes

- 28 lost rows are recorded with every attempt status in the artifact —
  nothing was dropped silently.
- The battery ran while the ranked-picks/screener work deployed mid-window
  (#210 at 04:11Z); the chat path is untouched by those merges (the
  artifact's version binding records b2d2b795 for the final chunk).
- No grounding, schema, retry-budget, or provenance check was weakened at
  any point (git diff of lib/ai/evidence.ts across #208: empty).
