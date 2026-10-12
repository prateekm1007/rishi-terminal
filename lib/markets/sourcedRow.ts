// lib/markets/sourcedRow.ts — the FD-15 sourced-rows contract.
//
// Founder decision, recorded 2026-10-11 (ROADMAP FD-15, resolved):
//   "Keep them, with each row showing its source and as-of time."
//
// Crypto, forex, commodities and bonds stay in the nav and the demo, and
// EVERY market-value row on those four pages (and the dashboard ticker)
// follows this contract:
//
//   - a row carries: value, unit, source name, as-of time, and state
//     (live, delayed, seed or missing);
//   - a value with NO source and NO date does not render — the cell shows
//     "—" with "no source yet" (forex/commodities under the pending
//     licence: the source cell reads "licence pending");
//   - seed numbers never render as data (Constitution rules 3/4: missing
//     data renders "—", never a plausible guess; the founder's preamble:
//     "The constitution doesn't allow seed numbers to be shown as data").
//
// The gate is one function (Rule 14: one source of truth, enforced
// mechanically — test/refMarkets.sourced.test.ts pins that the four pages
// render market values only through it).

import { isDelayedSource, sourceDisplayName } from "@/lib/pricePresentation";

/** The four render states the founder's contract names. */
export type MarketRowState = "live" | "delayed" | "seed" | "missing";

/**
 * One market value with its provenance, as shown on the reference-market
 * surfaces. `value`/`source`/`asOf` are null when that facet does not
 * exist — null is a real value (Rule 16), never coerced.
 */
export interface MarketRow {
  value: number | null;
  /** Shown beside the value even when the value is "—" (e.g. "₹/10g"). */
  unit: string;
  /** Display name of the source ("CoinGecko", "RBI DBIE"); null → no source. */
  source: string | null;
  /** The provider's own observation time (ISO); null → no date. */
  asOf: string | null;
  state: MarketRowState;
}

/** Source-cell text for a row: the name, or the honest absence. */
export function marketSourceText(row: Pick<MarketRow, "source">): string {
  return row.source ?? "no source yet";
}

/**
 * THE GATE (FD-15): the value a reference-market row may render.
 *
 * Returns the value only when ALL hold:
 *   - the state is a real observation (live or delayed) — "seed" and
 *     "missing" never render as data on the four pages;
 *   - value, source AND asOf are all present — "a value with no source
 *     and no date doesn't render".
 * Otherwise null → the cell renders "—".
 */
export function renderableMarketValue(row: MarketRow): number | null {
  if (row.state === "seed" || row.state === "missing") return null;
  if (row.value === null || row.source === null || row.asOf === null) return null;
  if (!Number.isFinite(row.value)) return null;
  return row.value;
}

/**
 * The wire-entry gate for the dashboard ticker (FD-15: "The dashboard
 * ticker follows the same rule"). A PriceData-shaped entry renders its
 * value only when the entry carries a price, a source AND an observation
 * time — and only when the symbol's asset class is CLEARED for display:
 *
 *   - crypto symbols (CoinGecko, attribution per the provider matrix)
 *     render when observed;
 *   - commodity symbols are licence-pending (founder order 2026-10-11:
 *     forex/commodity values wait for the founder's source decision) —
 *     they render "—" even when a transport quote exists;
 *   - index/equity symbols keep the established labelled-delayed display
 *     (P0-8 wording) but must still carry source + observation time.
 *
 * STATIC entries (the static-commodities reference table) never render —
 * that is a seed number on the wire and the FD-15 gate refuses it.
 */
export interface TickerEntryLike {
  price?: number | null;
  source?: string | null;
  status?: string | null;
  /** The upstream's own observation time (never the fetch time). */
  lastUpdated?: string | null;
}

export function renderableTickerValue(
  symbol: string,
  entry: TickerEntryLike | null | undefined,
  licencePending: (sym: string) => boolean = () => false,
): number | null {
  if (!entry) return null;
  if (licencePending(symbol)) return null;
  if (entry.status === "STATIC" || entry.status === "UNAVAILABLE") return null;
  const price = entry.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  if (!entry.source) return null;
  if (typeof entry.lastUpdated !== "string" || !entry.lastUpdated) return null;
  return price;
}

/** True when the change column may render: only beside a rendered value. */
export function renderableTickerChange(
  symbol: string,
  entry: (TickerEntryLike & { changePercent24h?: number | null }) | null | undefined,
  licencePending: (sym: string) => boolean,
): number | null {
  if (renderableTickerValue(symbol, entry, licencePending) === null) return null;
  const change = entry?.changePercent24h;
  if (typeof change !== "number" || !Number.isFinite(change)) return null;
  return change;
}

// ── Wire-entry → MarketRow mappers ─────────────────────────────────────────
//
// Pages never read wire fields directly (the acceptance test's source scan
// forbids bare `.price`/`.marketCap` reads on the four pages): these
// mappers are the one place a /api/prices entry becomes a contract row.

/** Everything a wire entry may carry that a market row can use. */
export interface WireMarketEntry {
  price?: number | null;
  changePercent24h?: number | null;
  volume24h?: number | null;
  /** FD-15: the same-payload CoinGecko market cap. */
  marketCap?: number | null;
  status?: string | null;
  source?: string | null;
  /** The upstream's own observation time (never the fetch time). */
  lastUpdated?: string | null;
}

export interface WireRowOptions {
  unit: string;
  /** Display name override (e.g. "CoinGecko" for the coingecko source id);
   *  null means "no display name" (the source cell's honest absence). */
  sourceName?: string | null;
  /** Founder order 2026-10-11 item 5: forex/commodity values are "—" and
   *  the source cell reads "licence pending" until a source is cleared. */
  licencePending?: boolean;
}

/** A wire entry (or its absence) → the FD-15 contract row. Pure. */
export function wireEntryToRow(
  entry: WireMarketEntry | null | undefined,
  opts: WireRowOptions,
): MarketRow {
  if (opts.licencePending) {
    return { value: null, unit: opts.unit, source: "licence pending", asOf: null, state: "missing" };
  }
  if (!entry) {
    return { value: null, unit: opts.unit, source: null, asOf: null, state: "missing" };
  }
  const source =
    opts.sourceName ?? (entry.source ? sourceDisplayName(entry.source) : null);
  if (entry.status === "STATIC") {
    // The static reference table on the wire — a seed number, never data.
    return { value: null, unit: opts.unit, source: null, asOf: null, state: "seed" };
  }
  const hasObservation =
    typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price > 0
    && !!entry.source
    && typeof entry.lastUpdated === "string" && !!entry.lastUpdated;
  if (!hasObservation) {
    return { value: null, unit: opts.unit, source, asOf: null, state: "missing" };
  }
  return {
    value: entry.price as number,
    unit: opts.unit,
    source,
    asOf: entry.lastUpdated as string,
    state: isDelayedSource(entry.source) ? "delayed" : "live",
  };
}

/**
 * FD-15 item 4 (founder order 2026-10-11): "Show BTC dominance only from
 * the same snapshot as the market cap." Totals and dominance derive from
 * the CoinGecko payload's OWN market caps — never a live price times a
 * seed cap (that mixes snapshots). Returns null unless EVERY tracked
 * symbol disclosed a cap in the snapshot (an incomplete denominator is
 * not a dominance claim).
 */
export function cryptoSnapshotTotals(
  entries: Record<string, WireMarketEntry>,
  symbols: string[],
): { totalMarketCap: number; btcShare: number; snapshotAt: string } | null {
  let total = 0;
  let btc = 0;
  let snapshotAt: string | null = null;
  for (const sym of symbols) {
    const cap = entries[sym]?.marketCap;
    if (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0) return null;
    total += cap;
    if (sym === "BTC") btc = cap;
    const at = entries[sym]?.lastUpdated;
    if (typeof at === "string" && at && (snapshotAt === null || at > snapshotAt)) snapshotAt = at;
  }
  if (total <= 0 || snapshotAt === null) return null;
  return { totalMarketCap: total, btcShare: (btc / total) * 100, snapshotAt };
}

/** True when the entry is a complete observation (price + source + time). */
function isFullObservation(entry: WireMarketEntry): boolean {
  return typeof entry.price === "number" && Number.isFinite(entry.price) && entry.price > 0
    && !!entry.source
    && typeof entry.lastUpdated === "string" && !!entry.lastUpdated
    && entry.status !== "STATIC" && entry.status !== "UNAVAILABLE";
}

/** The market cap as a contract row (same entry, same snapshot rules). */
export function wireCapToRow(entry: WireMarketEntry | null | undefined, opts: WireRowOptions): MarketRow {
  if (opts.licencePending || !entry || !isFullObservation(entry)) {
    return { value: null, unit: opts.unit, source: opts.sourceName ?? entry?.source ?? null, asOf: null, state: "missing" };
  }
  const cap = entry.marketCap;
  if (typeof cap !== "number" || !Number.isFinite(cap) || cap <= 0) {
    return { value: null, unit: opts.unit, source: opts.sourceName ?? entry.source ?? null, asOf: null, state: "missing" };
  }
  return {
    value: cap,
    unit: opts.unit,
    source: opts.sourceName ?? sourceDisplayName(entry.source),
    asOf: entry.lastUpdated as string,
    state: isDelayedSource(entry.source) ? "delayed" : "live",
  };
}

/** The 24h volume as a contract row. */
export function wireVolumeToRow(entry: WireMarketEntry | null | undefined, opts: WireRowOptions): MarketRow {
  if (opts.licencePending || !entry || !isFullObservation(entry)) {
    return { value: null, unit: opts.unit, source: opts.sourceName ?? entry?.source ?? null, asOf: null, state: "missing" };
  }
  const vol = entry.volume24h;
  if (typeof vol !== "number" || !Number.isFinite(vol) || vol <= 0) {
    return { value: null, unit: opts.unit, source: opts.sourceName ?? entry.source ?? null, asOf: null, state: "missing" };
  }
  return {
    value: vol,
    unit: opts.unit,
    source: opts.sourceName ?? sourceDisplayName(entry.source),
    asOf: entry.lastUpdated as string,
    state: isDelayedSource(entry.source) ? "delayed" : "live",
  };
}

/** The 24h % change — renders only beside a complete observation. */
export function wireChangeValue(entry: WireMarketEntry | null | undefined): number | null {
  if (!entry || !isFullObservation(entry)) return null;
  const change = entry.changePercent24h;
  return typeof change === "number" && Number.isFinite(change) ? change : null;
}

/** How many of `symbols` have a complete observation (header counts). */
export function observedCountOf(entries: Record<string, WireMarketEntry>, symbols: string[]): number {
  return symbols.reduce((n, sym) => (isFullObservation(entries[sym] ?? {}) ? n + 1 : n), 0);
}

/** Sum of live 24h volumes across `symbols`; null when none disclosed. */
export function wireVolumeSum(entries: Record<string, WireMarketEntry>, symbols: string[]): number | null {
  let total: number | null = null;
  for (const sym of symbols) {
    const e = entries[sym];
    if (!e || !isFullObservation(e)) continue;
    const vol = e.volume24h;
    if (typeof vol === "number" && Number.isFinite(vol) && vol > 0) total = (total ?? 0) + vol;
  }
  return total;
}
