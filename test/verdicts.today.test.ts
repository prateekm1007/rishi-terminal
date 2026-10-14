// test/verdicts.today.test.ts — TODAY-VERDICTS (founder order,
// 2026-10-14): "make sure the full today panel is populated on
// dashboard."
//
// The two remaining honest-empty Today rows (verdicts produced today;
// forward-return tracking) go LIVE on the verdicts LEDGER. This suite
// pins the pipeline through the REAL code paths:
//
//   A. THE PRODUCER GATE — produceVerdictFor drives the SAME pipeline
//      a stock page runs (fetchFullFundamentals → resolveStockMetrics →
//      getStockScore, the P0-1 gate biting upstream). The decisive pin:
//      a Screener-shaped record MISSING the derived D/E (the pre-fix
//      transport state) goes seed-mixed and REFUSES — the D/E derivation
//      is load-bearing for every verdict this feature produces.
//   B. THE WARM STEP — the same-day gate, the force override, the
//      time-budget disclosure, the write-failure disclosure.
//   C. THE STORE — the ledger round-trip (upsert + today's slice +
//      tracking state) against an in-memory supabase emulation.
//   D. THE TRACKING LINE — the not-started literal vs the started
//      state (one wording source: lib/demoState).
//   E. THE PANEL ROW — the populated verdicts row renders the count +
//      the provenance sentence; the empty ledger keeps the P0-1 honesty.

import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  produceVerdictFor,
  produceVerdicts,
  VERDICT_CANDIDATES,
  type VerdictProducerDeps,
} from "@/lib/verdicts/produce";
import { refreshVerdicts } from "@/lib/verdicts/warm";
import { writeVerdictsRun, readVerdictsToday, readTrackingState } from "@/lib/verdicts/store";
import { trackingLineFor, trackingStatusFor, trackingLine, TRACKING_STATUS } from "@/lib/demoState";
import { TodayPanel } from "../components/dashboard/TodayPanel";
import type { FullFundamentals } from "@/lib/liveFundamentals";
import type { MoversSnapshot } from "@/lib/movers/types";

// ---------------------------------------------------------------------
// The switchable supabase emulation — ONE top-level vi.mock whose
// behavior each test configures through `adminState` (the mock factory
// runs once, hoisted; the client is rebuilt per CALL from the mutable
// state, so per-test setup sticks).
// ---------------------------------------------------------------------

type Row = Record<string, unknown>;
interface AdminState {
  tables: Record<string, Row[]>;
  /** Non-null → every upsert fails with this message (the outage leg). */
  upsertError: string | null;
}

const adminState: AdminState = {
  tables: { verdicts_produced: [], verdicts_meta: [], verdicts_refused: [] },
  upsertError: null,
};

function project(row: Row, cols: string): Row {
  const picked: Row = {};
  for (const c of cols.split(",").map((s) => s.trim())) picked[c] = row[c];
  return picked;
}

vi.mock("@/lib/services/supabaseAdmin", () => ({
  getAdminSupabase: () => ({
    from: (name: string) => {
      const rows = adminState.tables[name];
      if (!rows) throw new Error(`unexpected table ${name}`);
      return {
        upsert: async (rowOrRows: Row | Row[]) => {
          if (adminState.upsertError) return { error: { message: adminState.upsertError } };
          const incoming = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          for (const row of incoming) {
            const key = `${row.symbol}|${row.ist_date ?? row.id}`;
            const idx = rows.findIndex((r) => `${r.symbol}|${r.ist_date ?? r.id}` === key);
            if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
            else rows.push({ ...row });
          }
          return { error: null };
        },
        select: (cols: string) => ({
          eq: (col: string, val: unknown) => ({
            order: async () => ({
              data: rows.filter((r) => r[col] === val).map((r) => project(r, cols)),
              error: null,
            }),
            maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
          }),
          // The tracking read chains not().order().limit() synchronously
          // to the final await — order returns the builder, limit the
          // thenable (mirrors supabase-js's synchronous chain).
          not: () => ({
            order: () => ({
              limit: async () => ({
                data: rows.filter((r) => r.baseline_price != null).map((r) => project(r, cols)),
                error: null,
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

beforeEach(() => {
  adminState.tables = { verdicts_produced: [], verdicts_meta: [], verdicts_refused: [] };
  adminState.upsertError = null;
});

// ---------------------------------------------------------------------
// Fixtures — the REAL captured Screener values for RELIANCE (14 Oct
// 2026 page fetch): the derived D/E 0.4457 included. The quote is the
// cache-row shape the stock-page header renders.
// ---------------------------------------------------------------------

const RELIANCE_LIVE: FullFundamentals = {
  symbol: "RELIANCE",
  pe: 21.1,
  eps: null,
  marketCap: 1578705,
  roe: 8.91,
  roce: 10.3,
  bookValue: 668,
  dividendYield: null,
  faceValue: 10,
  debtToEquity: 0.4457,
  opm: 16,
  revCagr3y: 6,
  epsCagr: 5,
  promoterHolding: 50.5,
  fcf: null,
  roa: null,
  lastUpdated: null, // Screener discloses no observation timestamp — the delayed class
  source: "screener",
};

const RELIANCE_QUOTE = { price: 1167.0, source: "yahoo-bulk", observedAt: "2026-10-13T10:00:00.000Z" };

function depsWith(
  fundamentalsBySymbol: Record<string, FullFundamentals | null>,
  quoteBySymbol: Record<string, { price: number; source: string | null; observedAt: string | null } | null> = {},
): VerdictProducerDeps {
  return {
    fetchFundamentals: async (symbol) => fundamentalsBySymbol[symbol] ?? null,
    peekQuote: async (symbol) => quoteBySymbol[symbol] ?? null,
  };
}

// ---------------------------------------------------------------------
// A. The producer gate
// ---------------------------------------------------------------------

describe("TODAY-VERDICTS — the producer gate (the P0-1 gate upstream of every row)", () => {
  it("all-live Screener fundamentals (the derived D/E included) PRODUCE a verdict: delayed class, consensus number, baseline from the same quote cache", async () => {
    const { verdict, refusal } = await produceVerdictFor(
      "RELIANCE",
      Date.parse("2026-10-14T04:15:00.000Z"),
      depsWith({ RELIANCE: RELIANCE_LIVE }, { RELIANCE: RELIANCE_QUOTE }),
    );
    expect(refusal).toBeNull();
    expect(verdict).not.toBeNull();
    expect(verdict!.symbol).toBe("RELIANCE");
    // The P0-1 vocabulary: Screener discloses no observation timestamp —
    // undated live fields claim no freshness — the class is 'delayed'.
    expect(verdict!.dataQuality).toBe("delayed");
    expect(verdict!.consensus).toBeTypeOf("number");
    expect(Number.isFinite(verdict!.consensus)).toBe(true);
    expect(verdict!.category.length).toBeGreaterThan(0);
    // Every quality field resolved LIVE (that is what the gate demands).
    for (const f of ["pe", "roe", "roce", "opm", "de", "promo", "revcagr", "epscagr", "mktcap", "bvps"]) {
      expect(verdict!.fieldSources[f]).toBe("live");
    }
    expect(verdict!.fundamentalsSource).toBe("screener");
    // The baseline is the SAME cache observation (never a second source).
    expect(verdict!.baseline).toEqual(RELIANCE_QUOTE);
    // The IST calendar day of production (04:15Z = 09:45 IST, 14 Oct).
    expect(verdict!.istDate).toBe("2026-10-14");
  });

  it("THE GATE PIN — a Screener record MISSING the derived D/E (the pre-fix transport) goes seed-mixed and REFUSES: data-quality:seed. No verdict, ever, on a half-live record", async () => {
    const preFix = { ...RELIANCE_LIVE, debtToEquity: null };
    const { verdict, refusal } = await produceVerdictFor(
      "RELIANCE",
      Date.now(),
      depsWith({ RELIANCE: preFix }, { RELIANCE: RELIANCE_QUOTE }),
    );
    expect(verdict).toBeNull();
    expect(refusal).not.toBeNull();
    expect(refusal!.reason).toBe("data-quality:seed");
  });

  it("no transport (both upstreams missed) → no-live-fundamentals, never a seed verdict", async () => {
    const { verdict, refusal } = await produceVerdictFor("RELIANCE", Date.now(), depsWith({}));
    expect(verdict).toBeNull();
    expect(refusal!.reason).toBe("no-live-fundamentals");
  });

  it("a symbol outside the registry → not-in-registry (rule 9 — the tracked universe)", async () => {
    const { verdict, refusal } = await produceVerdictFor("NOTASTOCK", Date.now(), depsWith({ NOTASTOCK: RELIANCE_LIVE }));
    expect(verdict).toBeNull();
    expect(refusal!.reason).toBe("not-in-registry");
  });

  it("a missing cache quote produces the verdict with a NULL baseline (disclosed, never fabricated)", async () => {
    const { verdict } = await produceVerdictFor(
      "RELIANCE",
      Date.now(),
      depsWith({ RELIANCE: RELIANCE_LIVE }, { RELIANCE: null }),
    );
    expect(verdict).not.toBeNull();
    expect(verdict!.baseline).toBeNull();
  });

  it("the candidate set is the founder-confirmed five, deterministic", () => {
    expect([...VERDICT_CANDIDATES]).toEqual(["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK"]);
  });

  it("produceVerdicts returns every candidate's outcome — produced AND refused-with-reason", async () => {
    const run = await produceVerdicts(
      ["RELIANCE", "NOTASTOCK"],
      Date.now(),
      depsWith({ RELIANCE: RELIANCE_LIVE }, { RELIANCE: RELIANCE_QUOTE }),
    );
    expect(run.produced.map((v) => v.symbol)).toEqual(["RELIANCE"]);
    expect(run.refused).toEqual([{ symbol: "NOTASTOCK", reason: "not-in-registry" }]);
  });
});

// ---------------------------------------------------------------------
// B. The warm step
// ---------------------------------------------------------------------

describe("TODAY-VERDICTS — the warm step (gate, budget, disclosure)", () => {
  // TODAY-NIFTY: the warm step now resolves its candidate set FIRST
  // (the once-per-day NSE list, founder-five floor on a miss). These
  // legs exercise the FLOOR path hermetically — the NSE derivation has
  // its own suite (test/verdicts.nifty.test.ts); no test here touches
  // the network.
  const hermeticNiftyMiss = async () => null;

  it("the same-day gate skips candidates that already produced today (the (symbol, ist_date) TTL)", async () => {
    const outcome = await refreshVerdicts({
      nowMs: Date.now(),
      niftySource: hermeticNiftyMiss,
      alreadyProducedToday: async (candidates) => candidates.slice(0, 2),
      deps: depsWith({ RELIANCE: RELIANCE_LIVE }),
    });
    expect(outcome.skippedAlreadyProduced.length).toBe(2);
    expect(outcome.error).toBeNull();
    expect(outcome.candidateSource).toBe("founder-five");
  });

  it("force bypasses the same-day gate (the operator's acceptance run)", async () => {
    const outcome = await refreshVerdicts({
      nowMs: Date.now(),
      niftySource: hermeticNiftyMiss,
      force: true,
      deps: depsWith({ RELIANCE: RELIANCE_LIVE }, { RELIANCE: RELIANCE_QUOTE }),
    });
    expect(outcome.skippedAlreadyProduced).toEqual([]);
    expect(outcome.error).toBeNull();
  });

  it("a zero budget reaches no candidate — notReached discloses every one, nothing produced, no error", async () => {
    const outcome = await refreshVerdicts({
      nowMs: Date.now(),
      niftySource: hermeticNiftyMiss,
      force: true,
      budgetMs: 0,
      deps: depsWith({ RELIANCE: RELIANCE_LIVE }),
    });
    expect(outcome.notReached).toEqual([...VERDICT_CANDIDATES]);
    expect(outcome.produced).toBe(0);
    expect(outcome.error).toBeNull();
  });

  it("a store write failure is DISCLOSED, never thrown (the tick's critical path continues)", async () => {
    adminState.upsertError = "simulated ledger outage";
    const outcome = await refreshVerdicts({
      nowMs: Date.now(),
      niftySource: hermeticNiftyMiss,
      force: true,
      deps: depsWith({ RELIANCE: RELIANCE_LIVE }),
    });
    expect(outcome.error).toContain("simulated ledger outage");
    expect(outcome.produced).toBe(0);
  });
});

// ---------------------------------------------------------------------
// C. The store — the ledger round-trip against the in-memory emulation
// (the top-level vi.mock above; beforeEach resets the tables)
// ---------------------------------------------------------------------

describe("TODAY-VERDICTS — the ledger round-trip", () => {

  it("write → today's slice → tracking state: the full round-trip", async () => {
    const nowMs = Date.parse("2026-10-14T04:15:00.000Z"); // 09:45 IST
    const { verdict } = await produceVerdictFor(
      "RELIANCE",
      nowMs,
      depsWith({ RELIANCE: RELIANCE_LIVE }, { RELIANCE: RELIANCE_QUOTE }),
    );
    expect(verdict).not.toBeNull();

    await writeVerdictsRun([verdict!], [], VERDICT_CANDIDATES, new Date(nowMs).toISOString());

    const today = await readVerdictsToday(nowMs);
    expect(today).not.toBeNull();
    expect(today!.count).toBe(1);
    expect(today!.today[0].symbol).toBe("RELIANCE");
    expect(today!.today[0].consensus).toBe(verdict!.consensus);
    expect(today!.today[0].dataQuality).toBe("delayed");
    expect(today!.today[0].baseline).toEqual({ price: 1167, source: "yahoo-bulk", observedAt: "2026-10-13T10:00:00.000Z" });
    expect(today!.candidates).toEqual([...VERDICT_CANDIDATES]);
    expect(today!.lastRunAt).toBe(new Date(nowMs).toISOString());

    const tracking = await readTrackingState();
    expect(tracking).toEqual({ baselines: 1, startedOn: "2026-10-14" });
  });

  it("an empty ledger reads as the honest empty state (count 0, tracking not started)", async () => {
    const today = await readVerdictsToday(Date.now());
    expect(today!.count).toBe(0);
    expect(today!.today).toEqual([]);
    const tracking = await readTrackingState();
    expect(tracking).toEqual({ baselines: 0, startedOn: null });
  });
});

// ---------------------------------------------------------------------
// D. The tracking line — one wording source (lib/demoState)
// ---------------------------------------------------------------------

describe("TODAY-VERDICTS — the tracking line flips with the ledger state", () => {
  it("null state (nothing recorded / read failed) keeps the DEMO-2 literal, fail-closed", () => {
    expect(trackingStatusFor(null)).toBe(TRACKING_STATUS);
    expect(trackingLineFor(null)).toBe(trackingLine());
    expect(trackingLineFor({ baselines: 0, startedOn: null })).toBe("tracking: not started");
  });

  it("a recorded track states the start date, the baseline count, and when forward returns become measurable", () => {
    const line = trackingLineFor({ baselines: 5, startedOn: "2026-10-14" });
    expect(trackingStatusFor({ baselines: 5, startedOn: "2026-10-14" })).toBe("started");
    expect(line).toContain("started 2026-10-14");
    expect(line).toContain("5 verdict baselines recorded");
    expect(line).toContain("after the next session close");
    // singular grammar
    expect(trackingLineFor({ baselines: 1, startedOn: "2026-10-14" })).toContain("1 verdict baseline recorded");
  });
});

// ---------------------------------------------------------------------
// E. The panel row
// ---------------------------------------------------------------------

const EMPTY_MOVERS: MoversSnapshot = {
  gainers: [], losers: [], movers: [],
  moversDerivation: null, moversUniverseObserved: null,
  derivation: "computed", nseUniverse: null, pick: null,
  universeObserved: null, writtenAt: "2026-10-14T04:00:00.000Z",
};

describe("TODAY-VERDICTS — the Today panel rows", () => {
  it("a POPULATED ledger renders the count, the latest verdict, the transport, the candidate set — and the started tracking row", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: EMPTY_MOVERS,
        latestNews: null,
        verdicts: {
          count: 1,
          today: [{
            symbol: "RELIANCE",
            name: "Reliance Industries",
            consensus: 62.4,
            category: "High Conviction",
            dataQuality: "delayed",
            fundamentalsSource: "screener",
            producedAt: "2026-10-14T04:15:00.000Z",
            baseline: { price: 1167, source: "yahoo-bulk", observedAt: "2026-10-13T10:00:00.000Z" },
          }],
          candidates: [...VERDICT_CANDIDATES],
          lastRunAt: "2026-10-14T04:15:00.000Z",
          lastRunSummary: "1 produced, none refused",
          candidateSource: "founder-five",
          candidateUniverseSize: null,
        },
        tracking: { baselines: 1, startedOn: "2026-10-14" },
      }),
    );
    expect(html).toContain("data-today-verdicts-row");
    expect(html).toContain("data-today-verdicts-count");
    expect(html).toContain("Verdicts produced today:");
    expect(html).toContain("RELIANCE");
    expect(html).toContain("Screener.in (unofficial)");
    expect(html).toContain("candidate set: RELIANCE, TCS, INFY, ITC, HDFCBANK");
    expect(html).toContain("not investment advice");
    // the tracking row: the STARTED state
    expect(html).toContain('>started</strong>');
    expect(html).toContain("started 2026-10-14");
    expect(html).toContain("1 verdict baseline recorded");
    // the honest empty states are GONE
    expect(html).not.toContain("data-today-verdicts-empty");
    expect(html).not.toContain("not started");
  });

  it("an EMPTY ledger keeps the P0-1 honesty (the seed wording) and the not-started literal", () => {
    const html = renderToStaticMarkup(
      React.createElement(TodayPanel, {
        movers: EMPTY_MOVERS,
        latestNews: null,
        verdicts: null,
        tracking: null,
      }),
    );
    expect(html).toContain("data-today-verdicts-empty");
    expect(html).toContain("illustrative seed data");
    expect(html).not.toContain("data-today-verdicts-row");
    expect(html).toContain('>not started</strong>');
  });
});
