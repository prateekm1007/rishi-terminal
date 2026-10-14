// lib/verdicts/produce.ts — TODAY-VERDICTS: the verdict PRODUCER.
//
// One candidate at a time, through the SAME pipeline a stock page runs:
//   fetchFullFundamentals (Screener.in primary — with this round's D/E
//   derivation — Yahoo+NSE fallback)
//     → resolveStockMetrics(symbol, live, peekedQuote.price)
//     → getStockScore(resolved) — the P0-1 gate decides.
//
// A verdict is PRODUCED only when:
//   - the symbol is in the registry (rule 9 — the tracked universe);
//   - a fundamentals transport returned admissible inputs;
//   - the resolved record's data quality is 'live' or 'delayed'
//     (verdictsAllowed — seed/missing/mixed records REFUSE, exactly as
//     on the stock page);
//   - the consensus engine returned a number (a null consensus is the
//     honest "Insufficient Data" refusal, never a row).
//
// Every refusal carries a reason and is returned to the caller for
// DISCLOSURE (the warmer's response, the ledger's meta) — a candidate
// that refuses today is retried on a later tick; nothing is estimated
// in the meantime.
//
// The baseline (the forward-return track's day-0 mark) is the quote
// cache's CURRENT observation for the symbol — the same cache the
// stock-page header renders from. A missing cache row is a null
// baseline, disclosed; never a second price source (rule 14).
//
// DEPENDENCY INJECTION: transports are injectable for the test seam
// (the production wiring is the module default); the clock is
// injectable (rule 18 — no hidden Date.now in pure paths).

import { STOCKS } from "@/data/stocks";
import { getStockScore, resolveStockMetrics } from "@/lib/scoring";
import { verdictsAllowed, QUALITY_FIELDS } from "@/lib/dataQuality";
import { fetchFullFundamentals, type FullFundamentals } from "@/lib/liveFundamentals";
import { peekCachedQuote } from "@/lib/quoteCache";
import { istParts } from "@/lib/marketHours";
import type {
  ProducedVerdict,
  VerdictBaseline,
  VerdictRefusal,
  VerdictsRunOutcome,
} from "./types";

/**
 * The disclosed candidate set v1 — the founder-confirmed demo companies
 * (#418: "RELIANCE, TCS, INFOSYS, ITC, HDFC Bank — large caps with
 * current English annual reports"). Five symbols per run, one Screener
 * page each: gentle on the unofficial transport, deterministic in
 * output order. The set is recorded in verdicts_meta on every run and
 * rendered on the Today row — expansion (e.g. the licensed Nifty 50
 * universe) is a candidate-set change, not a pipeline change.
 */
export const VERDICT_CANDIDATES: readonly string[] = [
  "RELIANCE",
  "TCS",
  "INFY",
  "ITC",
  "HDFCBANK",
] as const;

/** The transport seams (injected in tests; the module defaults are the
 * production paths). */
export interface VerdictProducerDeps {
  fetchFundamentals: (symbol: string) => Promise<FullFundamentals | null>;
  peekQuote: (symbol: string) => Promise<{ price: number; source: string | null; observedAt: string | null } | null>;
}

export const defaultProducerDeps: VerdictProducerDeps = {
  fetchFundamentals: (symbol) => fetchFullFundamentals(symbol),
  peekQuote: async (symbol) => {
    const peeked = await peekCachedQuote(symbol);
    if (!peeked) return null;
    return {
      price: peeked.quote.price,
      source: peeked.quote.source,
      observedAt: peeked.quote.observedAt,
    };
  },
};

/** The IST calendar date of a millisecond clock reading. */
export function istDateOfMs(nowMs: number): string {
  return istParts(nowMs).isoDate;
}

/**
 * Produce ONE candidate's verdict (or its disclosed refusal). PURE with
 * respect to the clock: `nowMs` is injected; the transports come from
 * `deps`.
 */
export async function produceVerdictFor(
  symbol: string,
  nowMs: number,
  deps: VerdictProducerDeps = defaultProducerDeps,
): Promise<{ verdict: ProducedVerdict | null; refusal: VerdictRefusal | null }> {
  const sym = symbol.trim().toUpperCase();
  const seed = STOCKS[sym];
  if (!seed) {
    return { verdict: null, refusal: { symbol: sym, reason: "not-in-registry" } };
  }

  const live = await deps.fetchFundamentals(sym);
  if (!live) {
    return {
      verdict: null,
      refusal: { symbol: sym, reason: "no-live-fundamentals" },
    };
  }

  const quote = await deps.peekQuote(sym);
  // The resolver's live param is the hooks-facing FullFundamentals shape
  // (isLive: boolean) — the lib transport's shape plus the same adapter
  // field hooks/useFundamentals adds (isLive: source !== 'static').
  const resolved = resolveStockMetrics(
    sym,
    live ? { ...live, isLive: live.source !== "static" } : null,
    quote ? quote.price : null,
  );
  if (!resolved) {
    // Defensive: the registry gate above already refused unknowns; a
    // null here is an infrastructure lie, refused loudly not swallowed.
    return { verdict: null, refusal: { symbol: sym, reason: "not-in-registry" } };
  }

  const score = getStockScore(resolved);
  if (!verdictsAllowed(score.dataQuality)) {
    // The P0-1 gate refused: the record still carries seed-contaminated
    // fields. Disclose WHICH class refused (seed | missing) — the mix
    // detail lives in fieldSources for the audit trail.
    return {
      verdict: null,
      refusal: {
        symbol: sym,
        reason: `data-quality:${score.dataQuality}`,
      },
    };
  }

  if (score.consensus === null || !Number.isFinite(score.consensus)) {
    // The engine's honest "Insufficient Data" — a verdict needs a
    // number; null consensus is a refusal, never a row (T11).
    return {
      verdict: null,
      refusal: { symbol: sym, reason: `no-consensus:${score.category}` },
    };
  }

  const baseline: VerdictBaseline | null =
    quote && Number.isFinite(quote.price) && quote.price > 0
      ? { price: quote.price, source: quote.source, observedAt: quote.observedAt }
      : null;

  return {
    verdict: {
      symbol: sym,
      name: seed.name,
      consensus: score.consensus,
      category: score.category,
      dataQuality: score.dataQuality,
      fieldSources: Object.fromEntries(
        QUALITY_FIELDS.map((f) => [f, resolved.fields[f]?.source ?? "unknown"]),
      ),
      fundamentalsSource: live.source,
      baseline,
      producedAt: new Date(nowMs).toISOString(),
      istDate: istDateOfMs(nowMs),
    },
    refusal: null,
  };
}

/**
 * One production run over the candidate set (deterministic order).
 * Every candidate's outcome — produced or refused-with-reason — is
 * returned; the caller (the warmer) writes the produced rows and
 * discloses the full outcome.
 */
export async function produceVerdicts(
  candidates: readonly string[] = VERDICT_CANDIDATES,
  nowMs: number = Date.now(),
  deps: VerdictProducerDeps = defaultProducerDeps,
): Promise<VerdictsRunOutcome> {
  const produced: ProducedVerdict[] = [];
  const refused: VerdictRefusal[] = [];
  for (const candidate of candidates) {
    const { verdict, refusal } = await produceVerdictFor(candidate, nowMs, deps);
    if (verdict) produced.push(verdict);
    if (refusal) refused.push(refusal);
  }
  return {
    produced,
    refused,
    candidates: [...candidates],
    ranAt: new Date(nowMs).toISOString(),
  };
}
