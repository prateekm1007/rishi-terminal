# The two parallels datasets — classification and non-merge decision

Round-15 entropy item (founder §8): "historicalParallels.ts vs parallels.ts —
duplicated conceptual datasets; do not merge silently because semantics
differ". This note classifies both, proves they are NOT duplicates, and
records the standing rule until a founder decision says otherwise.

## Classification

| | `lib/wisdom/historicalParallels.ts` | `lib/wisdom/parallels.ts` |
|---|---|---|
| Surface | Stock page wisdom rail (`/stock/[symbol]`) | Consensus layer: `eliteGraph.ts`, `graph.ts` (Rishi Council / wisdom graph) |
| Shape | `HistoricalParallel { companies: string[]; era; lesson; rishis: string[]; quote; author }` | `HistoricalParallel { id; title; era; companies: {name, year, outcome, returnPct?}[]; lesson; rishiPerspectives: {rishiName, quote, reasoning}[]; archetype; warningLevel? }` |
| Detection | `detectArchetype(stock)` — sector/qualitative keys, resolved SERVER-side per regeneration (A1, Round 14: moved out of the client bundle) | archetype-keyed records consumed by the consensus graph builders |
| Pinned by | stock-page SSR content (smoke/ssr suite) | `test/y4.nullNotZero.test.ts` and consensus tests |
| Data character | Narrative copy (companies, era, lesson, one quote) | Structured outcomes incl. **returnPct figures** and per-rishi reasoning |

## Why they must not be merged silently

1. **Different render contracts.** The rail renders one resolved parallel as
   copy; the consensus graph consumes typed outcomes. Unifying the shape
   changes what renders on the stock page — a product decision, flagged in
   the A1 PR (Round 14) and restated here, not a refactor.
2. **Different consumers, different provenance needs.** `returnPct` figures
   in `parallels.ts` are historical outcome claims; they belong to the
   consensus layer's existing labelling, not to the stock-page rail.
3. **One export name, two types.** Both export `HISTORICAL_PARALLELS` /
   `HistoricalParallel`; a merge is a rename-and-migrate across every
   consumer — exactly the kind of change that must carry its own PR and
   tests, not ride along.

## Standing rule

- Keep BOTH modules; each stays the single source for its own surface
  (rule 14 is per-concept, and these are two concepts).
- Dead-code sweeps must NOT delete either while its consumers above exist.

## FOUNDER DECISION NEEDED (registered on the Round-15 decision list)

Should the two datasets be unified into one typed parallels model (a D1-era
data-model decision — the same foundation as FD-13's seed-data work), or kept
as separate surface-specific datasets permanently? Recommended default: defer
to the D1 data-model work; do not unify beforehand.
