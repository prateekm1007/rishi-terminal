// lib/verdicts/warm.ts — TODAY-VERDICTS: the warmer's verdicts step.
// Runs INSIDE the authenticated quotes-warm tick (Bearer
// QUOTES_WARM_SECRET) after the movers step, so the Today panel's
// verdicts row and the tracking line stay current on the same 60-second
// contract as every other live surface.
//
// Cadence discipline (gentle on the unofficial transport): a candidate
// that already produced a verdict TODAY (IST) is NOT re-fetched on the
// same day — fundamentals move quarterly, not hourly; the (symbol,
// ist_date) unique key is the natural TTL. `force` bypasses the gate
// for the operator's acceptance run (the C6 proof), re-producing the
// day's rows.
//
// TODAY-NIFTY (founder order, 2026-10-14: "expand the candidate set
// toward the licensed Nifty 50 (the pipeline needs only a list
// change)"): the candidate set derives from NSE's OWN Nifty-50
// constituent list — fetched ONCE PER IST DAY (cached in verdicts_meta;
// membership changes on semi-annual reviews, not intraday), registry-
// filtered and deterministically ordered by lib/verdicts/candidates.
// Any honest miss on the NSE source serves the founder-confirmed five,
// disclosed as the source it is. The REFUSAL BACKOFF (this round): a
// candidate that refused within its reason-classed retry window is not
// re-fetched on every tick — without the backoff, the ~10 structural
// refusers in an expanded set (banks: no Borrowings/OPM rows to parse)
// would burn a third of the step's budget EVERY tick and starve the
// untried tail, the exact coverage this round exists to grow (C9's
// paired guard). `force` does NOT bypass the backoff (its contract is
// the same-day production gate; the operator can clear
// verdicts_refused for a true cold run).
//
// A verdicts failure NEVER fails the warm tick (the same class as the
// movers step): the tick's equity coverage is the critical path, and
// the panel keeps serving the previous ledger state (the rows carry
// their own production stamps) until a later tick succeeds.

import { produceVerdictFor, VERDICT_CANDIDATES, type VerdictProducerDeps } from "./produce";
import { candidateSetFromNifty, type CandidateSet } from "./candidates";
import {
  writeVerdictsRun,
  readVerdictsToday,
  readVerdictsRefusedToday,
  readCandidateSetCache,
  type RefusedTodayRow,
} from "./store";
import { fetchNiftyConstituents } from "@/lib/movers/nse";
import { istParts } from "@/lib/marketHours";
import type { ProducedVerdict, VerdictRefusal } from "./types";

/** The step's wall-time budget (ms). The warm route's maxDuration is
 * 60s and the equity slice + movers + ISR pings run first — a stalled
 * Screener fetch must never blow the tick. Candidates not reached
 * within the budget are retried on a LATER tick (the same-day gate
 * skips the ones already produced, so the run resumes where it
 * stopped — incremental by design, disclosed as not-reached). */
export const VERDICTS_STEP_BUDGET_MS = 25_000;

/**
 * TODAY-NIFTY: the reason-classed refusal retry windows (ms). A
 * TRANSSPORT miss (no-live-fundamentals — Screener hiccup, timeout) is
 * worth a timely retry; a STRUCTURAL refusal (data-quality: the bank
 * balance-sheet class, a missing promoter row) will not change
 * intraday — fundamentals move quarterly. `not-in-registry` never fires
 * on an NSE-derived set (the registry filter removes those candidates
 * upstream) and rides the default window on the founder-five path.
 */
export const REFUSAL_RETRY_MS: Record<string, number> = {
  "no-live-fundamentals": 30 * 60 * 1000, // transient transport — 30 minutes
};
export const REFUSAL_RETRY_DEFAULT_MS = 6 * 60 * 60 * 1000; // structural — 6 hours

/** The window for ONE refusal reason (the class map above). */
export function refusalRetryWindowMs(reason: string): number {
  return REFUSAL_RETRY_MS[reason] ?? REFUSAL_RETRY_DEFAULT_MS;
}

export interface VerdictsWarmOutcome {
  /** Produced this run (after the same-day gate). */
  produced: number;
  /** Refused this run, reasons disclosed. */
  refused: Array<{ symbol: string; reason: string }>;
  /** Candidates skipped because they already produced today. */
  skippedAlreadyProduced: string[];
  /** TODAY-NIFTY: candidates skipped because they refused within the
   * retry window (the backoff — the coverage-expansion guard). */
  skippedRefusedBackoff: string[];
  /** Candidates not reached within the step's time budget (retried on
   * a later tick — the honest incremental continuation). */
  notReached: string[];
  candidates: string[];
  /** TODAY-NIFTY: where the candidate set derived from (the licensed
   * NSE list or the founder-confirmed floor) — the disclosure. */
  candidateSource: CandidateSet["source"];
  /** TODAY-NIFTY: NSE's own constituent count before the registry
   * filter, or null on the floor. */
  candidateUniverseSize: number | null;
  /** null on success; the failure disclosure otherwise. */
  error: string | null;
}

/** The injection seam for tests (the production deps are the module
 * default in produce.ts). */
export interface RefreshVerdictsOptions {
  nowMs?: number;
  force?: boolean;
  deps?: VerdictProducerDeps;
  /** Overriding read for the same-day gate (the production read is the
   * ledger's today slice — injected to keep the test hermetic). */
  alreadyProducedToday?: (candidates: readonly string[]) => Promise<string[]>;
  /** The step's wall-time budget (default VERDICTS_STEP_BUDGET_MS).
   * Injectable so tests can exercise the deadline deterministically. */
  budgetMs?: number;
  /** TODAY-NIFTY: the NSE constituent-list source (the default is the
   * real transport; consulted only when the day's cached set is
   * missing or stale — once per IST day). */
  niftySource?: () => Promise<{ symbols: string[]; observedAt: string | null } | null>;
  /** Overriding read for the refusal-backoff gate (the production read
   * is verdicts_refused's today slice). */
  refusedToday?: () => Promise<RefusedTodayRow[]>;
  /** Overriding read for the cached candidate set (the production read
   * is verdicts_meta's provenance columns). */
  candidateSetCache?: () => Promise<{
    source: "nifty50-nse" | "founder-five";
    fetchedOn: string;
    symbols: string[];
    universeSize: number | null;
  } | null>;
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** One production attempt with a no-start-after-deadline guard. */
async function withDeadline<T>(
  deadlineMs: number,
  fn: () => Promise<T>,
): Promise<T | "deadline"> {
  if (Date.now() >= deadlineMs) return "deadline";
  return fn();
}

/**
 * Resolve THIS run's candidate set: the day's cached NSE list when
 * fresh, else one fetch + derivation. The founder-confirmed five are
 * the floor every honest miss lands on.
 */
async function resolveCandidateSet(
  nowMs: number,
  opts: RefreshVerdictsOptions,
): Promise<{ set: CandidateSet; fetchedOn: string }> {
  const todayIst = istParts(nowMs).isoDate;
  const cacheRead =
    opts.candidateSetCache
      ? () => Promise.resolve(opts.candidateSetCache!())
      : readCandidateSetCache;
  const cached = await cacheRead();
  if (cached && cached.source === "nifty50-nse" && cached.fetchedOn === todayIst) {
    return {
      set: { symbols: cached.symbols, source: "nifty50-nse", universeSize: cached.universeSize },
      fetchedOn: cached.fetchedOn,
    };
  }
  const source = opts.niftySource ?? fetchNiftyConstituents;
  const nifty = await source();
  const set = candidateSetFromNifty(nifty);
  return { set, fetchedOn: todayIst };
}

/**
 * The refusal backoff gate: the symbols to SKIP this run because they
 * refused within their reason-classed window.
 */
function refusalBackoffSkips(
  refused: RefusedTodayRow[],
  nowMs: number,
): { skip: Set<string>; attemptsBase: Map<string, number> } {
  const skip = new Set<string>();
  const attemptsBase = new Map<string, number>();
  for (const row of refused) {
    attemptsBase.set(row.symbol, row.attempts);
    const triedAt = Date.parse(row.lastTriedAt);
    if (!Number.isFinite(triedAt)) continue; // an unreadable stamp cannot gate — retry
    const windowMs = refusalRetryWindowMs(row.reason);
    if (nowMs - triedAt < windowMs) skip.add(row.symbol.toUpperCase());
  }
  return { skip, attemptsBase };
}

/**
 * One verdicts step: resolve the candidate set (once-per-day NSE fetch,
 * founder-five floor), produce (same-day-gated, refusal-backed-off,
 * time-budgeted), write, disclose. Candidates not reached within the
 * budget are returned as notReached — a later tick retries them (the
 * same-day gate keeps the run incremental).
 */
export async function refreshVerdicts(
  opts: RefreshVerdictsOptions = {},
): Promise<VerdictsWarmOutcome> {
  const nowMs = opts.nowMs ?? Date.now();
  const force = opts.force ?? false;
  const deps = opts.deps;
  const budgetMs = opts.budgetMs ?? VERDICTS_STEP_BUDGET_MS;
  const deadline = Date.now() + budgetMs;

  // TODAY-NIFTY: the candidate set resolves FIRST (the once-per-day NSE
  // fetch is bounded by its own 8 s transport timeout and runs before
  // the production budget starts — the budget guards the Screener
  // fetch loop, the class it was built for).
  const { set: candidateSet, fetchedOn } = await resolveCandidateSet(nowMs, opts);
  const candidates = candidateSet.symbols;

  const base: VerdictsWarmOutcome = {
    produced: 0,
    refused: [],
    skippedAlreadyProduced: [],
    skippedRefusedBackoff: [],
    notReached: [],
    candidates,
    candidateSource: candidateSet.source,
    candidateUniverseSize: candidateSet.universeSize,
    error: null,
  };

  try {
    // The same-day gate: skip candidates that already produced today
    // (unless forced — the operator's acceptance run re-produces).
    let skip = new Set<string>();
    if (!force) {
      const gate =
        opts.alreadyProducedToday ??
        (async (toGate: readonly string[]) => {
          const today = await readVerdictsToday(nowMs);
          const producedToday = new Set((today?.today ?? []).map((r) => r.symbol));
          return toGate.filter((c) => producedToday.has(c.toUpperCase()));
        });
      skip = new Set((await gate(candidates)).map((s) => s.toUpperCase()));
    }

    // TODAY-NIFTY: the refusal backoff — refusals inside their window
    // are skipped (the coverage guard); the attempt counts ride along
    // for the ledger's increment.
    const refusedRead = opts.refusedToday
      ? () => Promise.resolve(opts.refusedToday!())
      : () => readVerdictsRefusedToday(istParts(nowMs).isoDate);
    const refusedRows = await refusedRead();
    const { skip: backoffSkip, attemptsBase } = refusalBackoffSkips(refusedRows, nowMs);

    const toProduce = candidates.filter(
      (c) => !skip.has(c.toUpperCase()) && !backoffSkip.has(c.toUpperCase()),
    );
    if (toProduce.length === 0) {
      await writeVerdictsRun(
        [],
        [],
        candidates,
        new Date(nowMs).toISOString(),
        { source: candidateSet.source, universeSize: candidateSet.universeSize, fetchedOn },
        attemptsBase,
      );
      return {
        ...base,
        skippedAlreadyProduced: [...skip],
        skippedRefusedBackoff: candidates.filter((c) => backoffSkip.has(c.toUpperCase())),
      };
    }

    // Time-budgeted sequential production: one candidate at a time
    // (gentle on the unofficial transport), no NEW candidate starts
    // after the deadline; the reached outcomes are kept.
    const produced: ProducedVerdict[] = [];
    const refused: VerdictRefusal[] = [];
    const notReached: string[] = [];
    for (const candidate of toProduce) {
      const outcome = await withDeadline(deadline, () =>
        produceVerdictFor(candidate, nowMs, deps),
      );
      if (outcome === "deadline") {
        notReached.push(candidate);
        continue;
      }
      if (outcome.verdict) produced.push(outcome.verdict);
      if (outcome.refusal) refused.push(outcome.refusal);
    }

    // ALWAYS write: the produced rows (upsert, possibly none) + the
    // refusal rows (the backoff ledger) + the meta row (the run's
    // disclosure — every run is recorded, with the candidate-set
    // provenance).
    await writeVerdictsRun(
      produced,
      refused,
      candidates,
      new Date(nowMs).toISOString(),
      { source: candidateSet.source, universeSize: candidateSet.universeSize, fetchedOn },
      attemptsBase,
    );

    return {
      produced: produced.length,
      refused: refused.map((r) => ({ symbol: r.symbol, reason: r.reason })),
      skippedAlreadyProduced: [...skip],
      skippedRefusedBackoff: candidates.filter((c) => backoffSkip.has(c.toUpperCase())),
      notReached,
      candidates,
      candidateSource: candidateSet.source,
      candidateUniverseSize: candidateSet.universeSize,
      error: null,
    };
  } catch (e) {
    // Disclosed, never thrown: the tick's critical path continues.
    return { ...base, error: msg(e) };
  }
}

/** The static floor, re-exported for the route's documentation and the
 * tests (the founder-confirmed five — VERDICT_CANDIDATES in produce.ts
 * remains the single definition, rule 14). */
export { VERDICT_CANDIDATES };
