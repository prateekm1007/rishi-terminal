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
// A verdicts failure NEVER fails the warm tick (the same class as the
// movers step): the tick's equity coverage is the critical path, and
// the panel keeps serving the previous ledger state (the rows carry
// their own production stamps) until a later tick succeeds.

import { produceVerdictFor, VERDICT_CANDIDATES, type VerdictProducerDeps } from "./produce";
import { writeVerdictsRun, readVerdictsToday } from "./store";
import type { ProducedVerdict, VerdictRefusal } from "./types";

/** The step's wall-time budget (ms). The warm route's maxDuration is
 * 60s and the equity slice + movers + ISR pings run first — a stalled
 * Screener fetch must never blow the tick. Candidates not reached
 * within the budget are retried on a LATER tick (the same-day gate
 * skips the ones already produced, so the run resumes where it
 * stopped — incremental by design, disclosed as not-reached). */
export const VERDICTS_STEP_BUDGET_MS = 25_000;

export interface VerdictsWarmOutcome {
  /** Produced this run (after the same-day gate). */
  produced: number;
  /** Refused this run, reasons disclosed. */
  refused: Array<{ symbol: string; reason: string }>;
  /** Candidates skipped because they already produced today. */
  skippedAlreadyProduced: string[];
  /** Candidates not reached within the step's time budget (retried on
   * a later tick — the honest incremental continuation). */
  notReached: string[];
  candidates: string[];
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
 * One verdicts step: produce (same-day-gated, time-budgeted), write,
 * disclose. Candidates not reached within the budget are returned as
 * notReached — a later tick retries them (the same-day gate keeps the
 * run incremental).
 */
export async function refreshVerdicts(
  opts: RefreshVerdictsOptions = {},
): Promise<VerdictsWarmOutcome> {
  const nowMs = opts.nowMs ?? Date.now();
  const force = opts.force ?? false;
  const deps = opts.deps;
  const budgetMs = opts.budgetMs ?? VERDICTS_STEP_BUDGET_MS;
  const deadline = Date.now() + budgetMs;

  const base: VerdictsWarmOutcome = {
    produced: 0,
    refused: [],
    skippedAlreadyProduced: [],
    notReached: [],
    candidates: [...VERDICT_CANDIDATES],
    error: null,
  };

  try {
    // The same-day gate: skip candidates that already produced today
    // (unless forced — the operator's acceptance run re-produces).
    let skip = new Set<string>();
    if (!force) {
      const gate =
        opts.alreadyProducedToday ??
        (async (candidates: readonly string[]) => {
          const today = await readVerdictsToday(nowMs);
          const producedToday = new Set((today?.today ?? []).map((r) => r.symbol));
          return candidates.filter((c) => producedToday.has(c.toUpperCase()));
        });
      skip = new Set((await gate(VERDICT_CANDIDATES)).map((s) => s.toUpperCase()));
    }

    const toProduce = VERDICT_CANDIDATES.filter((c) => !skip.has(c.toUpperCase()));
    if (toProduce.length === 0) {
      return { ...base, skippedAlreadyProduced: [...skip] };
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
    // meta row (the run's disclosure — every run is recorded).
    await writeVerdictsRun(
      produced,
      refused,
      VERDICT_CANDIDATES,
      new Date(nowMs).toISOString(),
    );

    return {
      produced: produced.length,
      refused: refused.map((r) => ({ symbol: r.symbol, reason: r.reason })),
      skippedAlreadyProduced: [...skip],
      notReached,
      candidates: [...VERDICT_CANDIDATES],
      error: null,
    };
  } catch (e) {
    // Disclosed, never thrown: the tick's critical path continues.
    return { ...base, error: msg(e) };
  }
}
