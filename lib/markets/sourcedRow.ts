// lib/markets/sourcedRow.ts — FD-15 (round 54): the dashboard ticker's
// sourced-rows contract.
//
// Founder order 2026-10-13: "Each row shows its source and as-of time, or
// '—' with 'no source yet'." The row's VALUE is gated on the SOURCE: a row
// whose entry disclosed no source renders no number at all (an unlabelled
// number supports no claim — the same fail-closed rule as
// aggregatePresentationState). A source that disclosed no observation time
// keeps its source name with an em-dash as-of (Rule 3: missing renders as
// —, never a fabricated time).
//
// WHY THIS MODULE (not lib/pricePresentation): the presentation module is
// imported by the /stocks route's shared chunk, and the first version of
// this builder lived there — the bundle-budget ratchet caught +2.1 kB on
// /stocks (C9's paired guard doing its job). The sourced-rows contract is
// a MARKETS concept consumed only by the dashboard; it lives here so its
// bytes load with the dashboard chunk alone (the same home PR #361's
// contract designated).
//
// Pure presentational derivation over the wire entry — Rule 14: this is
// the ONE owner of the sourced-rows wording (test/fd15.tickerSource.test.ts
// pins the no-source-implies-no-value gate from both directions).

import { formatIstStamp, sourceDisplayName } from "../pricePresentation";

/** A ticker row's full rendered face, derived by ONE pure function (Rule
 * 14 — the component never interprets these rules locally). */
export interface TickerRowFace {
  /** The formatted price, or "—" when no sourced observation exists. */
  value: string;
  /** The formatted change pair ("▲ 0.42%"), or "—" when absent. */
  change: string;
  /** "Source name · Mon 12 Oct, 15:15 IST" | "Source name · —" |
   *  "no source yet". */
  attribution: string;
  /** Direction for colouring; null = neutral (no observation). */
  positive: boolean | null;
}

/** The minimum a wire entry must disclose for the ticker row builder. */
export interface TickerRowEntry {
  price?: number | null;
  changePercent24h?: number | null;
  source?: string | null;
  lastUpdated?: string | null;
}

/** FD-15: the dashboard ticker row face. Pure; the one owner of the
 * sourced-rows wording (test/fd15.tickerSource.test.ts pins the
 * no-source-implies-no-value gate from both directions). */
export function tickerRowFace(
  entry: TickerRowEntry | null | undefined,
  opts: { usd: boolean },
): TickerRowFace {
  // No entry, or an entry with NO disclosed source → the honest
  // sourceless state: no number, no direction, the founder's words.
  if (!entry || typeof entry.source !== "string" || !entry.source) {
    return { value: "—", change: "—", attribution: "no source yet", positive: null };
  }
  const asOf =
    typeof entry.lastUpdated === "string" && entry.lastUpdated &&
    Number.isFinite(Date.parse(entry.lastUpdated))
      ? formatIstStamp(new Date(Date.parse(entry.lastUpdated)))
      : "—";
  const attribution = `${sourceDisplayName(entry.source)} · ${asOf}`;
  // An unusable price (missing/≤0/non-finite) renders no number — but the
  // row still carries its source attribution (the source is the gate; the
  // price is a disclosed-or-absent datum).
  if (typeof entry.price !== "number" || !Number.isFinite(entry.price) || entry.price <= 0) {
    return { value: "—", change: "—", attribution, positive: null };
  }
  const pct = entry.changePercent24h;
  const positive = typeof pct === "number" && Number.isFinite(pct) ? pct >= 0 : null;
  const value = (opts.usd ? "$" : "") + entry.price.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
  const change =
    typeof pct === "number" && Number.isFinite(pct)
      ? `${positive ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`
      : "—";
  return { value, change, attribution, positive };
}
