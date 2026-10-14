// test/verdicts.rank.test.ts — TODAY-NIFTY (founder order, 2026-10-14:
// "eventually rank 'Top Buy Signals / Short Radar' from the verdicts
// ledger as coverage grows"): the LEDGER-SOURCED rankings for the
// dashboard's two ranked panels.
//
// The registry path (lib/scoring/rankings.ts) stays the seed-gated
// engine it is — its pools are honestly EMPTY on the current dataset
// (P0-1 nulls every seed consensus), which is why the panels render the
// awaiting copy. The verdicts LEDGER now carries live-fundamentals
// verdicts; these pure functions rank TODAY'S produced rows:
//
//   - Top Buy Signals: highest consensus first;
//   - Short Radar: lowest consensus first (the weakest live records);
//   - deterministic tie-breaks (symbol A-Z) — rule 18 clean;
//   - a COVERAGE GATE: the panels populate only when the day's pool
//     reaches VERDICT_RANKINGS_MIN_COVERAGE (a "top of 3" is not a
//     ranking — the coverage line discloses progress toward the gate,
//     and the gate must BITE (C5): a 4-row pool renders awaiting).
//
// The wording (basis + coverage lines) lives in the same module — one
// wording owner (rule 14), the same FD-15 class as verdictsRowText.

import { describe, expect, it } from "vitest";

import {
  rankVerdictTopBuy,
  rankVerdictShortRadar,
  verdictTopBuyBasis,
  verdictShortRadarBasis,
  verdictCoverageLine,
  VERDICT_RANKINGS_MIN_COVERAGE,
} from "@/lib/verdicts/rank";
import type { VerdictsTodayFace } from "@/lib/verdicts/types";

function face(count: number): VerdictsTodayFace {
  // count verdicts with staggered consensus + produced_at, deterministic.
  const today = Array.from({ length: count }, (_, i) => ({
    symbol: `SYM${String(i + 1).padStart(2, "0")}`,
    name: `Symbol ${i + 1}`,
    consensus: 40 + ((i * 13) % 45), // 40..84, deterministic spread with ties
    category: i % 2 === 0 ? "Value-Aligned Consensus" : "Balanced Risk-Reward",
    dataQuality: "delayed" as const,
    fundamentalsSource: "screener",
    producedAt: new Date(Date.parse("2026-10-14T04:00:00.000Z") + i * 60_000).toISOString(),
    baseline: null,
  }));
  return {
    count: today.length,
    today,
    candidates: ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"],
    lastRunAt: "2026-10-14T04:05:00.000Z",
    lastRunSummary: "5 produced, none refused",
    candidateSource: "founder-five",
    candidateUniverseSize: null,
  };
}

describe("TODAY-NIFTY — rankVerdictTopBuy (highest consensus first, deterministic)", () => {
  it("ranks the eligible pool by consensus desc, symbol asc on ties", () => {
    const r = rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE + 2), 3);
    expect(r.eligible).toBe(true);
    expect(r.coverage).toBe(VERDICT_RANKINGS_MIN_COVERAGE + 2);
    const consensuses = r.rows.map((x) => x.consensus);
    expect(consensuses).toEqual([...consensuses].sort((a, b) => b - a));
    // Each row carries the provenance the card renders.
    expect(r.rows[0].fundamentalsSource).toBe("screener");
    expect(r.rows[0].category).toBeTruthy();
    expect(r.rows[0].producedAt).toBeTruthy();
  });

  it("slice to n; a pool smaller than n renders every row (no padding, no fabrication)", () => {
    const r = rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE), 6);
    expect(r.rows.length).toBe(VERDICT_RANKINGS_MIN_COVERAGE);
  });

  it("THE COVERAGE GATE BITES — a pool below the minimum is NOT eligible (the awaiting copy renders, with the count disclosed)", () => {
    const r = rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE - 1), 6);
    expect(r.eligible).toBe(false);
    expect(r.rows).toEqual([]);
  });

  it("a null face (infrastructure miss) is not eligible — never a fabricated ranking", () => {
    const r = rankVerdictTopBuy(null, 6);
    expect(r.eligible).toBe(false);
    expect(r.rows).toEqual([]);
    expect(r.coverage).toBe(0);
  });
});

describe("TODAY-NIFTY — rankVerdictShortRadar (lowest consensus first)", () => {
  it("ranks the eligible pool by consensus ASC — the weakest live records", () => {
    const r = rankVerdictShortRadar(face(VERDICT_RANKINGS_MIN_COVERAGE + 4), 3);
    expect(r.eligible).toBe(true);
    const consensuses = r.rows.map((x) => x.consensus);
    expect(consensuses).toEqual([...consensuses].sort((a, b) => a - b));
  });

  it("the same coverage gate as Top Buy", () => {
    expect(rankVerdictShortRadar(face(VERDICT_RANKINGS_MIN_COVERAGE - 2), 3).eligible).toBe(false);
  });
});

describe("TODAY-NIFTY — the wording (one owner, FD-15 class)", () => {
  it("the basis lines state exactly what is ranked and the not-advice framing", () => {
    const r = rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE), 6);
    expect(verdictTopBuyBasis(r)).toContain(`${r.coverage} live-fundamentals verdicts produced today`);
    expect(verdictTopBuyBasis(r)).toContain("not investment advice");
    const s = rankVerdictShortRadar(face(VERDICT_RANKINGS_MIN_COVERAGE), 3);
    expect(verdictShortRadarBasis(s)).toContain("lowest consensus first");
    expect(verdictShortRadarBasis(s)).toContain("not investment advice");
  });

  it("the coverage line discloses progress toward the gate", () => {
    const line = verdictCoverageLine(3, VERDICT_RANKINGS_MIN_COVERAGE);
    expect(line).toContain("3");
    expect(line).toContain(String(VERDICT_RANKINGS_MIN_COVERAGE));
    const zero = verdictCoverageLine(0, VERDICT_RANKINGS_MIN_COVERAGE);
    expect(zero).toContain("No live-fundamentals verdicts produced today yet");
  });
});

// ---------------------------------------------------------------------
// The rendered panels (DashboardTail) — the fail-first behavioral pin:
// pre-change, the tail rendered ONLY the awaiting copy (the registry
// pools are empty, so the old single trio-branch keyed on stockOfDay
// never populated); with an ELIGIBLE ledger ranking the two named
// panels render the verdict cards, and below the gate the awaiting copy
// gains the live coverage line.
// ---------------------------------------------------------------------

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider, type Messages } from "@/lib/language";
import { DashboardTail } from "@/components/dashboard/DashboardTail";
import { dashboard, dashboard2 } from "@/messages/en.json";

const EMPTY_RANKING_PROPS = {
  prices: {} as Record<string, never>,
  rankingsEnabled: true,
  stockOfDay: null,
  sodCommentary: null,
  sodFund: null,
  rotatingStocks: [],
  rotatingShorts: [],
  buyFund: {},
};

function renderTail(verdictBuy: ReturnType<typeof rankVerdictTopBuy>, verdictShorts: ReturnType<typeof rankVerdictShortRadar>): string {
  // LanguageProvider's props type declares children as REQUIRED (the
  // JSX transform always supplies it in app code); createElement's
  // rest-children overload cannot satisfy a required-children prop at
  // the type level, and passing children AS a prop trips
  // react/no-children-prop. The test-local view makes children optional
  // so the rest-argument form type-checks — a cast in a test file, not a
  // production-type change.
  const shell: Record<string, Messages> = { dashboard, dashboard2 };
  const Provider = LanguageProvider as unknown as React.FC<{
    shell: Record<string, Messages>;
    children?: React.ReactNode;
  }>;
  return renderToStaticMarkup(
    React.createElement(
      Provider,
      { shell },
      React.createElement(DashboardTail, { ...EMPTY_RANKING_PROPS, verdictBuy, verdictShorts }),
    ),
  );
}

describe("TODAY-NIFTY — the DashboardTail panels render the ledger ranking", () => {
  it("an ELIGIBLE ranking renders both named panels with the verdict cards + per-row provenance (pre-change RED: only the awaiting copy rendered)", () => {
    const html = renderTail(
      rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE + 3), 6),
      rankVerdictShortRadar(face(VERDICT_RANKINGS_MIN_COVERAGE + 3), 3),
    );
    expect(html).toContain("data-verdict-buy-panel");
    expect(html).toContain("data-verdict-short-panel");
    expect((html.match(/data-verdict-rank-row=/g) ?? []).length).toBe(9); // 6 buy + 3 short
    // The panel basis lines (one wording owner).
    expect(html).toContain(`among ${VERDICT_RANKINGS_MIN_COVERAGE + 3} live-fundamentals verdicts produced today`);
    expect(html).toContain("lowest consensus first");
    // The per-row provenance (FD-15 class).
    expect(html).toContain("fundamentals via Screener.in (unofficial)");
    expect(html).toContain("produced");
    // The awaiting copy is GONE on the populated panels.
    expect(html).not.toContain("rankingsAwaiting");
  });

  it("below the coverage gate, the awaiting copy renders WITH the live coverage line (the gate bites, the count disclosed)", () => {
    const html = renderTail(
      rankVerdictTopBuy(face(VERDICT_RANKINGS_MIN_COVERAGE - 2), 6),
      rankVerdictShortRadar(face(VERDICT_RANKINGS_MIN_COVERAGE - 2), 3),
    );
    expect(html).not.toContain("data-verdict-buy-panel");
    expect(html).not.toContain("data-verdict-short-panel");
    expect(html).toContain("Rankings are on");
    expect((html.match(/data-verdict-rankings-note/g) ?? []).length).toBe(2);
    expect(html).toContain(`${VERDICT_RANKINGS_MIN_COVERAGE - 2} live-fundamentals verdicts produced today`);
    expect(html).toContain(`daily pool reaches ${VERDICT_RANKINGS_MIN_COVERAGE}`);
  });
});
