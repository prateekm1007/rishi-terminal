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
 * FD-26 (founder default, 11 Oct 2026, recorded in ROADMAP): "licence
 * pending" is the label on EVERY price-based score while the licence is
 * unresolved — recorded as the FOUNDER'S DEFAULT, not as the coder's
 * instruction. The canonical short form every surface renders (scorer
 * refusals, the QVPS absent state, the stock-page metadata); the full
 * P0-8 disclosure text stays beneath it.
 */
export const PRICE_SCORES_LABEL = "Licence pending";

/**
 * THE publication switch: price-based scores may be rendered only when
 * the exchange's written answer is recorded. Anything other than an
 * explicit "licensed" refuses (fail-closed, rule 6).
 */
export function priceScoresPublic(): boolean {
  return PRICE_DATA_LICENSE.status === "licensed";
}
