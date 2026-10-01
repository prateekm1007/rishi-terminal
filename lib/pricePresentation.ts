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
  price?: number;
  change?: number;
  source?: string;
  status?: string;
}

/** Provider transports whose quotes are delayed, not realtime ticks.
 *  Evidence: docs/DATA_PROVIDER_MATRIX.md — "Yahoo chart/quote … delayed
 *  snapshot; never labelled realtime". NSE is a separate transport with its
 *  own audit profile (not listed delayed) and is intentionally absent here. */
const DELAYED_SOURCES = ["yahoo"];

export function isDelayedSource(source: string | undefined): boolean {
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
export function statusLabel(state: PresentationState, source: string | undefined): string {
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
