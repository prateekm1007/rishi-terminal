// lib/pricePresentation.ts
// Phase 5.1 (T47/T48 correction): presentation state is DERIVED from the
// server's provenance status — the UI must never collapse every numeric
// value into "LIVE". A STATIC reference value, a DERIVED computation, a
// CACHED replay and a LIVE observation are semantically different things,
// and each renders with its own honest label.
//
// Freshness wording is also honest here: Yahoo-transported quotes are
// DELAYED data (docs/DATA_PROVIDER_MATRIX.md), so a freshly fetched Yahoo
// quote renders "DELAYED", not "LIVE" — delayed is not realtime.

export type PresentationState =
  | "loading"
  | "live"
  | "cached"
  | "derived"
  | "static"
  | "unavailable";

export interface PresentationEntry {
  /** Round 9: nullable-tolerant — the client hook's PriceData carries
   *  `number | null` fields and feeds the same contract (Rule 14: one
   *  presentation ownership point for wire entries AND client entries). */
  price?: number | null;
  change?: number | null;
  source?: string | null;
  status?: string | null;
}

/** Provider transports whose quotes are delayed, not realtime ticks.
 *  Evidence: docs/DATA_PROVIDER_MATRIX.md — "Yahoo chart/quote … delayed
 *  snapshot; never labelled realtime". NSE is a separate transport with its
 *  own audit profile (not listed delayed) and is intentionally absent here. */
const DELAYED_SOURCES = ["yahoo"];

export function isDelayedSource(source: string | null | undefined): boolean {
  if (!source) return false;
  const s = source.toLowerCase();
  return DELAYED_SOURCES.some(d => s === d || s.startsWith(`${d}-`) || s.startsWith(`${d}_`));
}

/**
 * Map a server price entry to the presentation state.
 *
 * Rules (fail-closed):
 * - status LIVE with a usable price  → "live"
 * - status CACHED / DERIVED / STATIC → the literal state (never relabelled live)
 * - status UNAVAILABLE, missing entry, or unusable price → "unavailable"
 * - anything unrecognised            → "unavailable" (never "live" by default)
 */
export function presentationState(
  entry: PresentationEntry | null | undefined,
): PresentationState {
  if (!entry) return "unavailable";
  const usablePrice = typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price > 0;

  switch (entry.status) {
    case "LIVE":
      return usablePrice ? "live" : "unavailable";
    case "CACHED":
      return usablePrice ? "cached" : "unavailable";
    case "DERIVED":
      return usablePrice ? "derived" : "unavailable";
    case "STATIC":
      return usablePrice ? "static" : "unavailable";
    default:
      // Missing status or UNAVAILABLE or anything unknown — no honest claim
      // of freshness can be made, so the tile shows unavailable.
      return "unavailable";
  }
}

/** Monospace status label shown under the price. */
export function statusLabel(state: PresentationState, source: string | null | undefined): string {
  const src = (source ?? "canonical").toUpperCase();
  switch (state) {
    case "live":
      // Phase 5.1: Yahoo-transported observations are delayed data — a
      // freshly fetched delayed quote is not a realtime market tick.
      return isDelayedSource(source) ? `DELAYED · ${src}` : `LIVE · ${src}`;
    case "cached":
      return `CACHED · ${src}`;
    case "derived":
      return `DERIVED · ${src}`;
    case "static":
      return `STATIC · ${src}`;
    case "unavailable":
      return "UNAVAILABLE";
    default:
      return "LOADING…";
  }
}

/** Label colour — muted for anything that is not a realtime observation. */
export function statusColor(state: PresentationState): string {
  switch (state) {
    case "live":
      return "#22C55E"; // realtime observation
    case "cached":
      return "#F59E0B"; // replayed legitimate observation
    case "derived":
      return "#60A5FA"; // computed from other observations
    case "static":
      return "#94A3B8"; // reference value
    default:
      return "#64748B";
  }
}

/**
 * Absolute price change implied by the same observation's price and PERCENT
 * change (H2, audit 2026-10-01).
 *
 * The prices API transports only a percent change — lib/livePrice.ts reads
 * `regularMarketChangePercent` / `pChange` (so an entry's `change` and
 * `changePercent24h` are the same number, in percent). The absolute move is
 * therefore derived exactly from the observation's own pair:
 * prev = price / (1 + pct/100), abs = price − prev = price·pct/(100+pct).
 *
 * Never mix a live price with a seed baseline price to compute a change —
 * that rendered "−1.63% (−1332.30)" on /stock/RELIANCE (live 1167.70 minus
 * the 2500 seed constant) while the true move was ≈ −19.30.
 *
 * Fails closed to null on degenerate pairs (pct ≤ −100, non-finite,
 * non-positive price): the UI renders "—", never a guess.
 */
export function absChangeFromPercent(price: number, pct: number): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(pct) || price <= 0) return null;
  const denom = 100 + pct;
  if (denom <= 0) return null;
  return (price * pct) / denom;
}

// ── Round 9 (Coder Directions 2026-10-02, directive 14) ─────────────────────
// UI provenance helpers: missing change → "—", observation time from the
// SERVER's upstream timestamp (never the browser fetch time), and page-level
// badge states DERIVED from the actual entry statuses. All pure; all owned
// HERE (Rule 14 — no page-local interpretation of these concepts).

/** An entry carrying an observation timestamp (the wire's observedAt or,
 *  for legacy shapes, lastUpdated). */
export interface ObservedEntry {
  observedAt?: string | null;
  lastUpdated?: string | null;
}

/**
 * The LATEST disclosed upstream observation time across a set of entries,
 * or null when no entry disclosed one. Non-string / non-parsable values are
 * ignored (never coerced, never substituted with the fetch time — a
 * fabricated observation timestamp is a Rule 3/16 violation).
 */
export function latestObservedAt(entries: ObservedEntry[]): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const e of entries) {
    const raw = typeof e.observedAt === "string" && e.observedAt ? e.observedAt : null;
    if (!raw) continue;
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = raw;
    }
  }
  return best;
}

/** Parse an entry's observation timestamp into a Date, or null when the
 *  upstream did not disclose one. This is the ONLY sanctioned source for a
 *  "Updated …" clock in the market UI — `new Date()` (browser fetch time)
 *  presented as an observation time is the Round-9 defect this replaces. */
export function observationDateFromEntry(entry: ObservedEntry): Date | null {
  const iso =
    typeof entry.observedAt === "string" && entry.observedAt
      ? entry.observedAt
      : typeof entry.lastUpdated === "string" && entry.lastUpdated
        ? entry.lastUpdated
        : null;
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Conservative aggregation precedence for a page-level badge: the badge
 *  never claims a fresher state than the STALEST usable tile carries.
 *  static < cached < derived < live; no usable entry → unavailable. */
const AGGREGATE_RANK: Record<"static" | "cached" | "derived" | "live", number> = {
  static: 0,
  cached: 1,
  derived: 2,
  live: 3,
};

/**
 * Aggregate the presentation state for a page-level badge (dashboard/alerts).
 *
 * Rules (fail-closed, conservative):
 * - entries whose price is unusable (missing/≤0/non-finite) are EXCLUDED —
 *   they cannot support any freshness claim;
 * - an entry with a usable price but NO recognised status makes the whole
 *   aggregate "unavailable" (an unlabelled number supports no claim);
 * - otherwise the WEAKEST state present wins: one STATIC tile among LIVE
 *   ones renders the badge STATIC — a mixed bar is never relabelled LIVE.
 * - no usable entries at all → "unavailable" (a fetch having happened is
 *   not a data state).
 */
export function aggregatePresentationState(
  entries: Array<PresentationEntry | null | undefined>,
): PresentationState {
  let weakest: "static" | "cached" | "derived" | "live" | null = null;
  for (const entry of entries) {
    if (!entry) continue;
    const usablePrice =
      typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price > 0;
    if (!usablePrice) continue;
    switch (entry.status) {
      case "LIVE":
        if (weakest === null) weakest = "live";
        break;
      case "CACHED":
      case "DERIVED": {
        // Conservative: the aggregate holds the MINIMUM rank seen so far.
        const st = entry.status === "CACHED" ? "cached" : "derived";
        if (weakest === null || AGGREGATE_RANK[weakest] > AGGREGATE_RANK[st]) weakest = st;
        break;
      }
      case "STATIC":
        weakest = "static";
        break;
      default:
        // A usable price with no recognised status supports no claim.
        return "unavailable";
    }
  }
  return weakest ?? "unavailable";
}

/** The rendered change pair: `▲ +1.63%` / `(+19.30)` — or em dashes when
 *  the observation did not carry a change. A GENUINE 0.00% is a real
 *  observation and renders as such; only a MISSING change is "—". */
export function formatChangePair(
  pct: number | null,
  abs: number | null,
): { pctText: string; absText: string; positive: boolean | null } {
  if (pct === null || !Number.isFinite(pct)) {
    return { pctText: "—", absText: "—", positive: null };
  }
  const positive = pct >= 0;
  const pctText = `${positive ? "▲" : "▼"} ${positive ? "+" : ""}${pct.toFixed(2)}%`;
  const absText =
    abs !== null && Number.isFinite(abs)
      ? `(${positive ? "+" : ""}${abs.toFixed(2)})`
      : "—";
  return { pctText, absText, positive };
}

/**
 * The page-level badge text for a mixed market surface (dashboard ticker,
 * alerts header). Conservative like aggregatePresentationState — and when
 * the aggregate IS live, any delayed transport among the live entries
 * downgrades the word to DELAYED (a freshly fetched Yahoo quote is not a
 * realtime tick; docs/DATA_PROVIDER_MATRIX.md). Untranslated by design:
 * state vocabulary is machine wording, like ProvenanceChip/statusLabel.
 */
export function aggregateMarketLabel(
  entries: Array<PresentationEntry | null | undefined>,
): string {
  const state = aggregatePresentationState(entries);
  if (state === "live") {
    const anyDelayed = entries.some(
      e =>
        e &&
        typeof e.price === "number" &&
        Number.isFinite(e.price) &&
        e.price > 0 &&
        e.status === "LIVE" &&
        isDelayedSource(e.source),
    );
    return anyDelayed ? "DELAYED MARKET DATA" : "LIVE MARKET DATA";
  }
  return `${state.toUpperCase()} MARKET DATA`;
}
