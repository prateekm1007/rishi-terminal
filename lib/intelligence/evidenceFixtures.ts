/**
 * lib/intelligence/evidenceFixtures.ts (INT-A8) — the ONE source of
 * the canned RishiInsight fixtures for the non-indexed fixture route
 * and the test suite. Pre-registration: docs/intelligence/evidence.md
 * (founder fixture-route scope 2026-10-09).
 *
 * One fixture per pre-registered closed state: conflict-with-
 * contradictions, bounded-model provenance, deterministic provenance,
 * empty-uncertainty, minimal artifact. Raw objects (no imports) so
 * both the route and the test can consume them; the TEST asserts every
 * fixture parses through the ONE A1 parser (parse-valid by
 * construction, CI-enforced) and the ROUTE parse-or-refuses at render
 * (a failing fixture is an honest refusal + a red CI, never a runtime
 * guess).
 */

export const EVIDENCE_FIXTURES = {
  conflictWithContradictions: {
    id: "insight:stock-intelligence:RELIANCE:conflict-2026-10-07",
    feature: "stock-intelligence",
    subject: "RELIANCE",
    generatedAt: "2026-10-07T09:30:00.000Z",
    observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
    status: "conflict",
    confidence: "high",
    materiality: "medium",
    summary: "Two sources disagree about the price move during the window.",
    whyItMatters:
      "A named contradiction is the honest state: the surface says so instead of picking a side.",
    whatChanged: [{ field: "price", change: "1204.1 inr -> 1210.1 inr" }],
    invalidators: ["A provider clock correction that re-dates either observation"],
    evidence: [
      {
        id: "price:RELIANCE:src-a",
        text: "price = 1204.1 inr per source A",
        facts: [
          { field: "price", value: 1204.1, unit: "inr", source: "live", observedAt: "2026-10-07T04:00:00.000Z" },
          { field: "volume", value: 1000, unit: "sh" },
        ],
      },
      {
        id: "price:RELIANCE:src-b",
        text: "price = 1210.1 inr per source B",
        facts: [
          { field: "price", value: 1210.1, unit: "inr", source: "derived", observedAt: "2026-10-07T09:30:00.000Z" },
        ],
      },
    ],
    contradictions: [
      {
        field: "price",
        items: ["price:RELIANCE:src-a", "price:RELIANCE:src-b"],
        description: "The two sources report different closing prices for the same session.",
      },
    ],
    uncertainty: ["Whether source B's feed applies a different adjustment convention"],
    nextInvestigations: ["Which source the canonical ingest prefers"],
    provenance: { synthesisPath: "deterministic" },
    modelStatus: "deterministic",
  },

  deterministicProvenance: {
    id: "insight:stock-intelligence:TCS:delta-2026-10-07",
    feature: "stock-intelligence",
    subject: "TCS",
    generatedAt: "2026-10-07T09:30:00.000Z",
    observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
    status: "ok",
    confidence: "high",
    materiality: "low",
    summary: "The price moved during the window; both sources agree.",
    whyItMatters: "An agreed price move is the baseline every downstream judgement starts from.",
    whatChanged: [{ field: "price", change: "3100.0 inr -> 3105.5 inr" }],
    invalidators: ["A restated prior close"],
    evidence: [
      {
        id: "price:TCS:src-a",
        text: "price = 3100.0 inr at window open",
        facts: [{ field: "price", value: 3100.0, unit: "inr", source: "live", observedAt: "2026-10-07T04:00:00.000Z" }],
      },
      {
        id: "price:TCS:src-b",
        text: "price = 3105.5 inr at window close",
        facts: [{ field: "price", value: 3105.5, unit: "inr", source: "live", observedAt: "2026-10-07T09:30:00.000Z" }],
      },
    ],
    contradictions: [],
    uncertainty: [],
    nextInvestigations: [],
    provenance: { synthesisPath: "deterministic" },
    modelStatus: "deterministic",
  },

  boundedModelProvenance: {
    id: "insight:watchtower:INFY:bounded-2026-10-07",
    feature: "watchtower",
    subject: "INFY",
    generatedAt: "2026-10-07T09:30:00.000Z",
    observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
    status: "ok",
    confidence: "moderate",
    materiality: "medium",
    summary: "Bounded synthesis over the evidence rows, fully disclosed.",
    whyItMatters: "Model-involved prose is labelled with its full provenance trio or not shown.",
    whatChanged: [],
    invalidators: [],
    evidence: [
      {
        id: "evidence:INFY:row-1",
        text: "guidance reiterated at the session call",
        facts: [{ field: "guidance", value: 1, unit: "flag", source: "derived", observedAt: "2026-10-07T08:00:00.000Z" }],
      },
    ],
    contradictions: [],
    uncertainty: ["The call transcript summary is one provider's reading"],
    nextInvestigations: [],
    provenance: {
      synthesisPath: "bounded-model",
      provider: "openai",
      model: "gpt-4o-mini",
      synthesizedAt: "2026-10-07T09:29:00.000Z",
    },
    modelStatus: "model-grounded",
  },

  emptyUncertainty: {
    id: "insight:stock-intelligence:WIPRO:clean-2026-10-07",
    feature: "stock-intelligence",
    subject: "WIPRO",
    generatedAt: "2026-10-07T09:30:00.000Z",
    observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
    status: "ok",
    confidence: "high",
    materiality: "low",
    summary: "Nothing stated uncertain and nothing stated invalidating for this window.",
    whyItMatters: "Empty honesty blocks render their honest empty states, never invented caveats.",
    whatChanged: [],
    invalidators: [],
    evidence: [
      {
        id: "evidence:WIPRO:row-1",
        text: "no material change observed in the window",
        facts: [],
      },
    ],
    contradictions: [],
    uncertainty: [],
    nextInvestigations: [],
    provenance: { synthesisPath: "deterministic" },
    modelStatus: "deterministic",
  },

  minimal: {
    id: "insight:watchtower:HDFCBANK:minimal-2026-10-07",
    feature: "watchtower",
    subject: "HDFCBANK",
    generatedAt: "2026-10-07T09:30:00.000Z",
    observationWindow: { from: "2026-10-07T04:00:00.000Z", to: "2026-10-07T09:30:00.000Z" },
    status: "unknown",
    confidence: "low",
    materiality: "low",
    summary: "Nothing observed in this window.",
    whyItMatters: "The unknown stays unknown — the surface says so plainly.",
    whatChanged: [],
    invalidators: [],
    evidence: [],
    contradictions: [],
    uncertainty: [],
    nextInvestigations: [],
    provenance: { synthesisPath: "deterministic" },
    modelStatus: "deterministic",
  },
} as const;
