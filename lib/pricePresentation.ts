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
//
// Y3 (Round 12): observation labels carry the full honest stamp — IST date,
// clock, timezone, and the server-disclosed market state with a session
// qualifier ("market closed · last session quote") — and the transport chip
// names its source in plain language ("Delayed · Yahoo Finance
// (unofficial)"), never transport jargon like "YAHOO-BULK".

import { istParts } from "./marketHours";

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
      // Y3: the chip names the transport in plain language — the freshness
      // detail (when, market state) lives on the observation line.
      return isDelayedSource(source) ? `Delayed · ${sourceDisplayName(source)}` : `LIVE · ${src}`;
    case "cached":
      // Y3: "CACHED · YAHOO-BULK" was jargon; a replayed Yahoo snapshot is
      // still delayed unofficial data.
      return isDelayedSource(source) ? `Delayed · ${sourceDisplayName(source)}` : `CACHED · ${src}`;
    case "derived":
      return isDelayedSource(source) ? `Derived · ${sourceDisplayName(source)}` : `DERIVED · ${src}`;
    case "static":
      return `STATIC · ${src}`;
    case "unavailable":
      return "UNAVAILABLE";
    default:
      return "LOADING…";
  }
}

/**
 * Y3: plain-language display name for a transport source.
 *
 * Yahoo transports (bulk snapshot, chart, ETF proxy — any `yahoo*` id) are
 * unofficial scraped/delayed data and say so in words a reader understands.
 * Unknown sources keep the machine wording (uppercased), which is honest —
 * it just is not Yahoo.
 */
export function sourceDisplayName(source: string | null | undefined): string {
  const s = (source ?? "canonical").toLowerCase();
  if (s === "yahoo" || s.startsWith("yahoo-") || s.startsWith("yahoo_")) {
    return "Yahoo Finance (unofficial)";
  }
  return (source ?? "canonical").toUpperCase();
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
 * The entry's disclosed observation timestamp as the VERBATIM ISO string:
 * `observedAt` first, the legacy `lastUpdated` shape second, null when
 * neither discloses one. Shared by latestObservedAt and
 * observationDateFromEntry so the single-entry and multi-entry clocks can
 * never disagree about what counts as a disclosed observation (the G4B
 * defect: latestObservedAt read only `observedAt` while the wire's
 * normalized PriceData carries `lastUpdated` — the page-level "Observed …"
 * clock was unreachable and every surface fell back to "not disclosed").
 */
function observationIso(entry: ObservedEntry): string | null {
  const iso =
    typeof entry.observedAt === "string" && entry.observedAt
      ? entry.observedAt
      : typeof entry.lastUpdated === "string" && entry.lastUpdated
        ? entry.lastUpdated
        : null;
  if (!iso) return null;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
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
    const raw = observationIso(e);
    if (!raw) continue;
    const ms = Date.parse(raw);
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
  const iso = observationIso(entry);
  return iso ? new Date(Date.parse(iso)) : null;
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
 * realtime tick; docs/DATA_PROVIDER_MATRIX.md). G4 (founder round 23):
 * the cached aggregate is worded for the DATA actually present — the
 * last observed prices — not the serving mechanism ("CACHED" told the
 * user where the value came from, not what it is). Untranslated by
 * design: state vocabulary is machine wording, like ProvenanceChip/
 * statusLabel.
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
  if (state === "cached") {
    return "LAST OBSERVED MARKET DATA";
  }
  return `${state.toUpperCase()} MARKET DATA`;
}

// ── Y3 (Round 12): honest observation stamps ────────────────────────────────
// Founder defect 4: "Observed 9:44:59 am" carried no date and no timezone,
// and on a weekend it presented a stale mid-session quote with no market
// cue. The stamp and the session qualifier live HERE (Rule 14 — one owner
// for presentation wording), derive ONLY from the observation timestamp and
// the server-disclosed market state (Rule 18 — no client clock), and fail
// closed to null when no honest stamp can be formed.

const IST_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const IST_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Y3: the IST stamp for an observation — "Thu 1 Oct, 09:44 IST".
 *
 * Computed arithmetically from the timestamp (lib/marketHours istParts) so
 * server render and browser hydration agree byte-for-byte regardless of the
 * viewer's locale or system timezone (Rule 18).
 */
export function formatIstStamp(date: Date): string {
  const p = istParts(date.getTime());
  const hh = String(Math.floor(p.minutesFromMidnight / 60)).padStart(2, "0");
  const mm = String(p.minutesFromMidnight % 60).padStart(2, "0");
  return `${IST_WEEKDAYS[p.weekday]} ${p.day} ${IST_MONTHS[p.month - 1]}, ${hh}:${mm} IST`;
}

/** The server-disclosed market state the label needs (U2 wire shape). */
export interface ObservationMarketState {
  open: boolean;
  /** IST date (YYYY-MM-DD) of the last — or current — session. */
  sessionDate: string;
}

/**
 * Y3: the full observation line — stamp + market state + session qualifier.
 *
 *   "Thu 1 Oct, 09:44 IST · market closed · last session quote"
 *   "Thu 1 Oct, 09:44 IST · market open · intraday quote"
 *   "Thu 1 Oct, 09:44 IST · market closed · stale — not from the last session"
 *   "Thu 1 Oct, 09:44 IST"                    (no market state disclosed)
 *
 * Fail-closed (Rules 3/16): a missing or unparsable observation time
 * returns null — the UI renders no clock at all, never a fabricated one.
 * With no disclosed market state the stamp stands alone: the line makes no
 * open/closed claim it cannot ground. The session qualifier compares the
 * observation's IST calendar date with the server-disclosed sessionDate —
 * an observation older than the last session says so explicitly.
 */
export function observationLabel(
  observedIso: string | null | undefined,
  market: ObservationMarketState | null | undefined,
): string | null {
  if (typeof observedIso !== "string" || !observedIso) return null;
  const ms = Date.parse(observedIso);
  if (!Number.isFinite(ms)) return null;

  const stamp = formatIstStamp(new Date(ms));
  if (!market) return stamp;

  const obsDate = istParts(ms).isoDate;
  if (market.open) {
    return obsDate === market.sessionDate
      ? `${stamp} · market open · intraday quote`
      : `${stamp} · market open · stale — not from today's session`;
  }
  return obsDate === market.sessionDate
    ? `${stamp} · market closed · last session quote`
    : `${stamp} · market closed · stale — not from the last session`;
}
