// test/verdicts.nifty.test.ts — TODAY-NIFTY (founder order, 2026-10-14:
// "expand the candidate set toward the licensed Nifty 50 (the pipeline
// needs only a list change), add the ITC promoter-shareholding
// fallback"): the CANDIDATE-SET DERIVATION and the WARM STEP's new gates.
//
// Pins:
//   A. candidateSetFromNifty — the licensed-universe derivation: NSE's
//      own Nifty-50 constituent list, registry-filtered (rule 9 — the
//      tracked universe), deduped, deterministically sorted; the founder
//      five as the honest floor whenever the NSE source is missing,
//      truncated (< MIN_NIFTY_CONSTITUENTS — a real payload carries ~50),
//      or empty. The universe size (pre-filter) is carried for the
//      disclosure.
//   B. the warm step's threading — refreshVerdicts consults the NSE
//      source when the day's cached candidate set is missing, records
//      the derived set + its provenance in the outcome, and reuses the
//      cached set for the rest of the day (one fetch per day, gentle on
//      the transport).
//   C. the refusal backoff — a candidate that refused within the
//      reason-classed retry window is NOT re-fetched on every tick (the
//      coverage-expansion guard: ~10 banks refusing per tick would burn
//      the 25 s budget on known refusers and starve the tail); a refusal
//      OLDER than the window is retried; force bypasses both gates (the
//      operator's acceptance run exercises everything).
//
// Fail-first (C5): legs B1/B2 and C1 were written BEFORE the warm-step
// change and run against the pre-change code — the unknown options were
// ignored, the NSE source was never consulted, and the refused candidate
// was re-fetched every tick (the REDs captured in the round evidence).

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  candidateSetFromNifty,
  MIN_NIFTY_CONSTITUENTS,
} from "@/lib/verdicts/candidates";
import { refreshVerdicts, REFUSAL_RETRY_DEFAULT_MS, REFUSAL_RETRY_MS } from "@/lib/verdicts/warm";
import { VERDICT_CANDIDATES } from "@/lib/verdicts/produce";
import type { FullFundamentals } from "@/lib/liveFundamentals";
import type { VerdictProducerDeps } from "@/lib/verdicts/produce";

// The switchable supabase emulation (the verdicts.today.ts pattern) —
// the warm step's store reads/writes land here.
type Row = Record<string, unknown>;

const adminState: { tables: Record<string, Row[]>; upsertError: string | null } = {
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
      const rows = adminState.tables[name] ?? (adminState.tables[name] = []);
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
// Fixtures — the all-live Screener record (the round-58 RELIANCE shape)
// and a bank-shaped record that REFUSES on data quality (the HDFCBANK
// class: the D/E cannot be read from a bank page).
// ---------------------------------------------------------------------

const LIVE_RECORD: FullFundamentals = {
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
  lastUpdated: null,
  source: "screener",
};

/** The bank-shaped record: no D/E derivable → the P0-1 gate refuses
 * (data-quality:seed) — the honest HDFCBANK class. */
const BANK_RECORD: FullFundamentals = { ...LIVE_RECORD, symbol: "HDFCBANK", debtToEquity: null };

function depsWith(
  fundamentalsBySymbol: Record<string, FullFundamentals | null>,
): VerdictProducerDeps {
  return {
    fetchFundamentals: async (symbol) => fundamentalsBySymbol[symbol] ?? null,
    peekQuote: async () => null,
  };
}

// ---------------------------------------------------------------------
// A. the candidate-set derivation
// ---------------------------------------------------------------------

describe("TODAY-NIFTY — candidateSetFromNifty (the licensed universe, registry-gated)", () => {
  it("derives the set from NSE's own constituent list: registry-filtered, deduped, sorted, universe size disclosed", () => {
    // A REAL-shaped Nifty 50 payload: ~50 sanitized symbols, case-dirty,
    // duplicated, plus a couple the registry does not track.
    const niftySymbols = [
      "RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK",
      "axisbank", "AXISBANK", "KOTAKBANK", "LT", "BHARTIARTL", "HINDUNILVR",
      "MARUTI", "SUNPHARMA", "TATAMOTORS", "TATASTEEL", "WIPRO", "TECHM",
      "HCLTECH", "NTPC", "POWERGRID", "ONGC", "COALINDIA", "NESTLEIND",
      "BRITANNIA", "CIPLA", "DRREDDY", "DIVISLAB", "APOLLOHOSP", "EICHERMOT",
      "HEROMOTOCO", "BAJAJ-AUTO", "BAJAJFINSV", "ASIANPAINT",
      "ULTRACEMCO", "GRASIM", "HINDALCO", "JSWSTEEL", "TATACONSUM",
      "ADANIENT", "ADANIPORTS", "BEL", "JIOFIN", "SHRIRAMFIN", "TRENT",
      "M&M", "SBILIFE", "HDFCLIFE", "JSWENERGY", "UNTRACKED-XYZ",
    ];
    const set = candidateSetFromNifty({ symbols: niftySymbols, observedAt: "2026-10-14T03:30:00.000Z" });
    expect(set.source).toBe("nifty50-nse");
    // Deterministic order, deduped, registry-gated.
    expect(set.symbols).toEqual([...set.symbols].sort());
    expect(new Set(set.symbols).size).toBe(set.symbols.length);
    expect(set.symbols).not.toContain("UNTRACKED-XYZ");
    expect(set.symbols).not.toContain("JIOFIN"); // a genuinely untracked constituent
    expect(set.symbols).toContain("AXISBANK");
    // The hyphen convention: NSE's BAJAJ-AUTO is the registry's BAJAJAUTO
    // — the REGISTRY key is the candidate (the producer looks up by it).
    expect(set.symbols).toContain("BAJAJAUTO");
    expect(set.symbols).not.toContain("BAJAJ-AUTO");
    expect(set.symbols.length).toBeLessThan(niftySymbols.length);
    // The universe size is the NSE count (pre-filter), disclosed as-is.
    expect(set.universeSize).toBe(51);
  });

  it("the floor — a missing NSE source falls back to the founder-confirmed five (fail-closed, disclosed)", () => {
    const set = candidateSetFromNifty(null);
    expect(set.source).toBe("founder-five");
    expect(set.symbols).toEqual([...VERDICT_CANDIDATES]);
    expect(set.universeSize).toBeNull();
  });

  it("a truncated payload (< MIN_NIFTY_CONSTITUENTS) is rejected — a real Nifty 50 carries ~50; a shrunken parse is a schema-drift class, not a candidate set", () => {
    const set = candidateSetFromNifty({ symbols: ["RELIANCE", "TCS", "INFY"], observedAt: null });
    expect(set.source).toBe("founder-five");
    expect(set.universeSize).toBeNull();
    expect(MIN_NIFTY_CONSTITUENTS).toBeGreaterThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------
// B. the warm step's candidate-set threading
// ---------------------------------------------------------------------

describe("TODAY-NIFTY — the warm step consults the licensed universe (once per day)", () => {
  it("B1 (fail-first leg): with a fresh NSE source and no cached set, the run's candidates ARE the derived Nifty set — source and universe size disclosed in the outcome", async () => {
    const niftySymbols = [
      "RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK",
      "AXISBANK", "LT", "BHARTIARTL", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TATAMOTORS",
      "TATASTEEL", "WIPRO", "TECHM", "HCLTECH", "NTPC", "POWERGRID", "ONGC", "COALINDIA",
      "NESTLEIND", "BRITANNIA", "CIPLA", "DRREDDY", "DIVISLAB", "APOLLOHOSP", "EICHERMOT",
      "HEROMOTOCO", "BAJAJ-AUTO",
    ];
    const niftySource = vi.fn(async () => ({
      symbols: niftySymbols,
      observedAt: "2026-10-14T03:30:00.000Z",
    }));
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T04:00:00.000Z"),
      force: true,
      deps: depsWith({ RELIANCE: LIVE_RECORD, TCS: LIVE_RECORD, INFY: LIVE_RECORD, ITC: LIVE_RECORD, HDFCBANK: BANK_RECORD }),
      niftySource,
      candidateSetCache: async () => null,
    });
    expect(outcome.error).toBeNull();
    // Pre-change RED: the outcome carried the static five and no source.
    expect(outcome.candidateSource).toBe("nifty50-nse");
    expect(outcome.candidateUniverseSize).toBe(32);
    expect(outcome.candidates).toEqual([...outcome.candidates].sort());
    // Registry-truth-driven: BAJAJ-AUTO maps to the registry key
    // BAJAJAUTO; every candidate is a real registry key.
    expect(outcome.candidates).toContain("BAJAJAUTO");
    expect(outcome.candidates.length).toBe(
      new Set(niftySymbols.map((s) => (s === "BAJAJ-AUTO" ? "BAJAJAUTO" : s))).size,
    );
    expect(outcome.candidates).not.toEqual([...VERDICT_CANDIDATES]);
    // The bank refused honestly; the screener-transport budget reached it.
    expect(outcome.refused.map((r) => r.symbol)).toContain("HDFCBANK");
  });

  it("B2 (fail-first leg): the day's cached NSE set is REUSED — the NSE source is NOT fetched again within the same IST day", async () => {
    const niftySource = vi.fn(async () => ({ symbols: [], observedAt: null }));
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T06:30:00.000Z"),
      force: true,
      deps: depsWith({ RELIANCE: LIVE_RECORD }),
      niftySource,
      candidateSetCache: async () => ({
        source: "nifty50-nse",
        fetchedOn: "2026-10-14",
        symbols: ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK"],
        universeSize: 50,
      }),
    });
    expect(outcome.error).toBeNull();
    expect(niftySource).not.toHaveBeenCalled();
    expect(outcome.candidateSource).toBe("nifty50-nse");
    expect(outcome.candidates).toEqual(["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK"]);
  });

  it("a stale cache (yesterday's set) triggers exactly one fresh fetch", async () => {
    const niftySource = vi.fn(async () => ({
      symbols: ["RELIANCE", "TCS", "INFY", "ITC", "HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK",
        "AXISBANK", "LT", "BHARTIARTL", "HINDUNILVR", "MARUTI", "SUNPHARMA", "TATAMOTORS",
        "TATASTEEL", "WIPRO", "TECHM", "HCLTECH", "NTPC", "POWERGRID", "ONGC", "COALINDIA",
        "NESTLEIND", "BRITANNIA", "CIPLA", "DRREDDY", "DIVISLAB", "APOLLOHOSP", "EICHERMOT"],
      observedAt: "2026-10-14T03:30:00.000Z",
    }));
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T04:00:00.000Z"),
      deps: depsWith({ RELIANCE: LIVE_RECORD }),
      niftySource,
      candidateSetCache: async () => ({
        source: "nifty50-nse",
        fetchedOn: "2026-10-13", // yesterday — stale
        symbols: ["RELIANCE"],
        universeSize: 50,
      }),
    });
    expect(niftySource).toHaveBeenCalledTimes(1);
    expect(outcome.candidateSource).toBe("nifty50-nse");
  });
});

// ---------------------------------------------------------------------
// C. the refusal backoff
// ---------------------------------------------------------------------

describe("TODAY-NIFTY — the refusal backoff (the coverage-expansion guard)", () => {
  const refusedHdfc = (minutesAgo: number) => ({
    symbol: "HDFCBANK",
    reason: "data-quality:seed",
    lastTriedAt: new Date(Date.parse("2026-10-14T06:30:00.000Z") - minutesAgo * 60_000).toISOString(),
    attempts: 3,
  });

  it("C1 (fail-first leg): a candidate refused 40 minutes ago (within the structural window) is NOT re-fetched — disclosed as skippedRefusedBackoff", async () => {
    const fetchFundamentals = vi.fn(async (symbol: string) =>
      symbol === "RELIANCE" ? LIVE_RECORD : BANK_RECORD,
    );
    const deps: VerdictProducerDeps = { fetchFundamentals, peekQuote: async () => null };
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T06:30:00.000Z"),
      force: true,
      deps,
      refusedToday: async () => [refusedHdfc(40)],
    });
    expect(outcome.error).toBeNull();
    // Pre-change RED: HDFCBANK was re-fetched and re-refused EVERY tick.
    expect(fetchFundamentals).not.toHaveBeenCalledWith("HDFCBANK");
    expect(outcome.skippedRefusedBackoff).toContain("HDFCBANK");
    expect(outcome.refused.map((r) => r.symbol)).not.toContain("HDFCBANK");
  });

  it("a refusal OLDER than the window is retried (a new day's page format may have changed)", async () => {
    const fetchFundamentals = vi.fn(async (symbol: string) =>
      symbol === "RELIANCE" ? LIVE_RECORD : BANK_RECORD,
    );
    const deps: VerdictProducerDeps = { fetchFundamentals, peekQuote: async () => null };
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T06:30:00.000Z"),
      force: true,
      deps,
      refusedToday: async () => [refusedHdfc(7 * 60)], // 7 h ago — past the 6 h window
    });
    expect(fetchFundamentals).toHaveBeenCalledWith("HDFCBANK");
    expect(outcome.refused.map((r) => r.symbol)).toContain("HDFCBANK");
    expect(outcome.skippedRefusedBackoff).not.toContain("HDFCBANK");
  });

  it("a TRANSIENT refusal (no-live-fundamentals) retries on the 30-minute window, not the structural one", async () => {
    expect(REFUSAL_RETRY_MS["no-live-fundamentals"]).toBe(30 * 60 * 1000);
    expect(REFUSAL_RETRY_DEFAULT_MS).toBe(6 * 60 * 60 * 1000);
  });

  it("force does NOT bypass the refusal backoff for the operator's FULL acceptance run — the backoff gate is data-shape, not production state", async () => {
    // The force flag's contract is the SAME-DAY gate only; the refusal
    // window is a transport-gentleness gate that force keeps (the
    // operator can clear verdicts_refused in the DB for a true cold
    // run). Pinned so the semantics cannot drift silently.
    const fetchFundamentals = vi.fn(async (symbol: string) =>
      symbol === "RELIANCE" ? LIVE_RECORD : BANK_RECORD,
    );
    const deps: VerdictProducerDeps = { fetchFundamentals, peekQuote: async () => null };
    const outcome = await refreshVerdicts({
      nowMs: Date.parse("2026-10-14T06:30:00.000Z"),
      force: true,
      deps,
      refusedToday: async () => [refusedHdfc(5)],
    });
    expect(fetchFundamentals).not.toHaveBeenCalledWith("HDFCBANK");
    expect(outcome.skippedRefusedBackoff).toContain("HDFCBANK");
  });
});
