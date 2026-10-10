# Methodology docs

One document per registered consensus scorer, named by the DERIVED slug of
the scorer's canonical name (kebab-case — the same names
`RISHI_WEIGHT_CONFIG` and the scorer registry use). Plus:

- `dispersion.md` — the S2-06 disagreement metric.

Every scorer doc carries the same six sections (enforced by
`test/methodology.coverage.test.ts`): **Inputs**, **Formula**,
**Thresholds**, **Rationale**, **Known failure modes**, **Sectors where it
does not apply**.

What these documents claim: they describe what the CODE computes
(`lib/scorers/*.ts`), including the constants, the ramp shapes and the
provenance contracts. They are not claims about what the real investors
would do — the panel is an educational simulation (rule 1: this page says
what it is, and the docs say it too).

Public render: `/methodology` (index) and `/methodology/<slug>` —
statically generated from these files at build time by
`lib/methodology/index.ts` (a markdown-subset renderer; no HTML is
generated anywhere in that pipeline).
