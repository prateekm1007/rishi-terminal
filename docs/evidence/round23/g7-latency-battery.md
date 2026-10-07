# G7 latency battery — production rerun (2026-10-07)

Run: `node scripts/aiLatencyBattery.mjs https://rishi-terminal.vercel.app`
against production. Bound SHA at start: `405e637`; production advanced to
`05ee441e` (founder merges #242/#243) during the run — the chat loop under
measurement is unchanged by those registry commits. Raw artifact:
`docs/evidence/round23/g7-latency-battery.json` (class aggregates in the
artifact are empty — a resume-path artifact-shape bug found this run; the
per-class numbers below are recomputed from the run's JSONL checkpoint,
which is the row-level truth). Sample: 70 rows planned ~69; 53 usable
(status 200); 17 limiter/upstream refusals (429 ×14, 502 ×3 — recorded,
excluded from latency statistics, reported as its own number).

## Verdict against the founder's gate (G7: authenticated P50 ≤ 8 s)

**P50 = 15.5 s — FAILS the target.** P95 35.7 s, mean 17.3 s, max 45.6 s.
Philosophy class alone: P50 7.8 s (meets it); financial 15.2 s;
tool-request 32.1 s; multitool 43.1 s.

## Stage attribution (the founder's six-way breakdown)

| Stage | Total ms | Share of wall |
|---|---|---|
| Provider completions — initial | 189,502 | 20.7% |
| Provider completions — post-tool | 378,256 | 41.4% |
| Provider completions — repair | 171,946 | 18.8% |
| **Completions subtotal** | **739,704** | **80.9%** |
| Tool execution (47 executions) | 8,881 | 1.0% |
| Evidence assembly (incl. price fetches) | 2,328 | 0.3% |
| Grounding/validation | 31 | 0.003% |
| Unattributed (HTTP/queue/serialize/pacing gap) | 165,903 | 18.1% |

Tool execution and grounding are already fast (the quote_cache path works:
79 ms tool calls). **The dominant component is provider model completions —
81% of wall** — with the post-tool synthesis call the single largest block
(41%), and repair cycles adding 19%.

## Repair mass (21 repaired rows)

unsupported-numeric-prose 7, missing-claims 7, schema-mismatch 3,
field-value-mismatch 2, provenance-wording 2. Each repair adds one full
model round-trip (~15-20 s).

## FOUNDER DECISION NEEDED

The 8 s target is not reachable by tooling/evidence optimization: the data
path (tools + evidence + grounding) is ~1.3% of wall. Every remaining
second is model time. Two levers exist:

1. **Reduce model calls per row** (in the loop's contract): (a) extend the
   E5 first-pass contract for the two dominant residual causes
   (unsupported-numeric-prose, missing-claims — 14 of 21 repairs);
   estimated P50 gain 1-2 s (insufficient alone); (b) a bounded one-
   completion fast path for SINGLE-tool singleton asks (e.g. getPrices-
   only): the server already synthesizes the verified surface from its own
   typed facts, so for that class the post-tool model synthesis could be
   skipped and the verified surface served directly — estimated financial-
   simple P50 ≈ 4-6 s. This changes the validated loop's model-facing
   contract and needs founder sign-off plus its own fail-first cycle.
2. **Model/provider selection** (rule 31 — not mine to decide): the
   attested model averages 3.4 s (initial) / 9.4 s (post-tool, larger
   input) per completion on production. Reaching ≤8 s on 2-completion rows
   needs ≤3 s/completion — a model or hosting decision.

Recommended default: approve 1(b) (the scoped fast path) + 1(a); hold 2
until 1 is measured. All reversible; logged here per C10.

Instrument notes (recorded, not hidden): the battery ran in anonymous mode
(X7 challenge solved in-loop; PoW ≈30 ms, excluded from wall by the E5
measurement design) because no signed-in account cookie exists in the
vault; the challenge's extra request doubles the effective request rate
and produced the 429 refusals despite 6-30 s pacing — a signed-in cookie
run would clean the sample. The battery's per-class aggregate shape broke
under resume (row objects replayed into `overall` only) — the script fix
(bounded fetch, 180 s) landed this run after row 2 of the first attempt
hung 12+ minutes on an upstream that never answered.
