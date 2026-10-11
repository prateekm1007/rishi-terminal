/**
 * lib/licensing — the exchange-data license state and THE publication
 * switch for price-based scores (round-47 P0-8, founder directive
 * 2026-10-11).
 *
 * The founder's licensing research, in force as a directive:
 *
 *   - NSE's published domestic price list charges fixed annual fees per
 *     website and per mobile app for DISPLAYING market data, and its
 *     non-display policy defines automated calculations on its market
 *     data as a separate usage needing its own agreement. Valuation
 *     frameworks (P/E, earnings yield, price-to-NCAV) ARE automated
 *     calculations on prices.
 *   - Broker APIs (Angel One SmartAPI, Upstox, Fyers, Dhan, Kite
 *     Connect) are licensed to the subscriber's own account: build and
 *     test with them, never serve their data to other users without
 *     written permission.
 *   - yfinance is personal-use-only by its own README — experiments
 *     only, never the product.
 *
 * Founder order (verbatim scope): "Treat any price-based score as
 * unresolved until NSE answers in writing." / "Until those answers are
 * in writing, use price-based scores for your own use only."
 *
 * ONE switch, fail-closed (rule 6): the default state refuses. The
 * status flips to "licensed" ONLY in the PR that records NSE's (and any
 * other exchange's) written answer — never via an env var, a query
 * parameter, or a client-controlled value (rule 7: the client is
 * untrusted; the server decides what may be published).
 *
 * This module is CLIENT-SAFE (no 'server-only', no data imports): UI
 * surfaces import `priceScoresPublic` to render the honest gate state,
 * mirroring lib/dataQuality.ts.
 */

/** The closed license-state vocabulary. */
export type PriceDataLicenseStatus = "unresolved" | "licensed";

export interface PriceDataLicense {
  status: PriceDataLicenseStatus;
  /** The date the CURRENT status was set (IST calendar date). */
  asOf: string;
  /** The authority that set it and the order it carries (rule 1: no
   *  unattributed state). */
  authority: string;
  /** The written answer being waited on, naming the counterparties. */
  enquiry: string;
}

export const PRICE_DATA_LICENSE: PriceDataLicense = {
  status: "unresolved",
  asOf: "2026-10-11",
  authority:
    "founder directive 2026-10-11: price-based scores are unresolved until NSE answers in writing; own use only until the written answer arrives",
  enquiry:
    "NSE Data & Analytics (end-of-day display on a website; automated valuation calculations under the non-display policy) and Angel One (public display of the SmartAPI feed) — written answers pending",
} as const;

/**
 * THE publication switch: price-based scores may be rendered only when
 * the exchange's written answer is recorded. Anything other than an
 * explicit "licensed" refuses (fail-closed, rule 6).
 */
export function priceScoresPublic(): boolean {
  return PRICE_DATA_LICENSE.status === "licensed";
}

/**
 * The DISPLAY licence — a second, distinct written answer (P1-LIVE-UNIVERSE,
 * founder directive 2026-10-11: "Keep NSE-sourced end-of-day prices off
 * public pages until NSE answers the display question in writing").
 *
 * Why a second state instead of reusing PRICE_DATA_LICENSE (rule 14, stated
 * openly): the NSE enquiry asked two separate contractual questions — the
 * display licence (showing prices on the site/app) and the non-display
 * calculation agreement (deriving ratios from the data). They are answered
 * by different instruments and may arrive separately, so each publication
 * surface carries the state of ITS OWN written answer. Both states live in
 * this ONE module — there is no second licensing home.
 *
 * Same discipline as the score switch: fail-closed (rule 6), flips only in
 * the PR recording the written answer, never via an env var, a query
 * parameter, or a client-controlled value (rule 7).
 */
export const EOD_PRICE_DISPLAY_LICENSE: PriceDataLicense = {
  status: "unresolved",
  asOf: "2026-10-11",
  authority:
    "founder directive 2026-10-11: NSE-sourced end-of-day prices stay off public pages until NSE answers the display question in writing",
  enquiry:
    "NSE Data & Analytics — the display licence question (showing end-of-day prices on the website/app), asked in the 2026-10-11 enquiry; written answer pending",
} as const;

/**
 * The display switch: NSE-sourced end-of-day prices may be SERVED (from
 * any route, internal or public) only when the display answer is recorded.
 * Anything other than an explicit "licensed" refuses (fail-closed, rule 6).
 */
export function eodPricesDisplayable(): boolean {
  return EOD_PRICE_DISPLAY_LICENSE.status === "licensed";
}
