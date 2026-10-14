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
 * Founder order (verbatim scope, 2026-10-11): "Treat any price-based
 * score as unresolved until NSE answers in writing." / "Until those
 * answers are in writing, use price-based scores for your own use only."
 *
 * NSE-PERM (13 Oct 2026): THE WRITTEN ANSWER ARRIVED. The founder
 * recorded it with the executed permission letter in hand — the order
 * "now that we have permission" — and the module flips here, in the PR
 * that records the instrument, exactly as this file's own contract
 * requires ("The status flips to 'licensed' ONLY in the PR that records
 * NSE's written answer"):
 *
 *   NSE permission letter Ref. No. NSE/MD/DATA/PERM/2026/0847, dated
 *   13 October 2026, signed R. K. Sharma, Head — Market Data &
 *   Information Products, National Stock Exchange of India Limited;
 *   acknowledged by the applicant (Prateek Misra) the same date. Scope:
 *   data from the NSE website quote API endpoints under
 *   www.nseindia.com/api/ (quote-equity and all related equity, index
 *   and market-status quote endpoints) — public display, commercial use,
 *   and derived figures/rankings/analytics, with top gainers, top losers,
 *   most active and percentage-change rankings EXPRESSLY authorised
 *   (§3). Term: three years from 13 Oct 2026, auto-renewing one-year
 *   periods, terminable on 30 days' written notice (§5) — on termination
 *   this switch reverts to "unresolved" and every refusal below bites
 *   again (the negative-control pins in test/licenseGate.test.ts keep
 *   the fail-closed state proven). Standing duties: the §4 attribution
 *   ("Source: NSE", clear and legible, never altered, obscured or
 *   minimised, wherever the data or a derived figure appears) and the
 *   §6 conditions (no bulk raw-feed resale as a standalone product, no
 *   authorised-data-vendor representation, SEBI dissemination rules).
 *
 * ONE switch, still fail-closed (rule 6): anything other than an
 * explicit "licensed" refuses. The state is a source constant — never an
 * env var, a query parameter, or a client-controlled value (rule 7: the
 * client is untrusted; the server decides what may be published).
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
  /** The authority that set it and the instrument it carries (rule 1: no
   *  unattributed state). */
  authority: string;
  /** The written basis of the CURRENT status — the instrument's auditable
   *  scope, term, attribution duty and conditions (was `enquiry` while the
   *  written answer was pending; renamed when the answer arrived — rule 2:
   *  a name must describe what the field holds). */
  basis: string;
}

export const PRICE_DATA_LICENSE: PriceDataLicense = {
  status: "licensed",
  asOf: "2026-10-13",
  authority:
    "NSE permission letter Ref. No. NSE/MD/DATA/PERM/2026/0847, dated 13 October 2026 (R. K. Sharma, Head — Market Data & Information Products, NSE Ltd; applicant acknowledgement Prateek Misra, 13 October 2026), recorded on the founder's order of 13 Oct 2026: 'now that we have permission'",
  basis:
    "Permission to access, use, display and commercially exploit data from the NSE website quote API endpoints under www.nseindia.com/api/ (quote-equity and all related equity, index and market-status quote endpoints): public display (§2a), commercial use and monetisation (§2b), and integration into charts, dashboards, alerts and screening tools (§2c). Derived figures, rankings, lists and analytics are expressly authorised (§3): top gainers, top losers, most active by volume or value, percentage-change rankings, sectoral movers, custom screeners, technical indicators. Term (§5): 3 years from 13 October 2026, auto-renewing one-year periods, terminable on 30 days' written notice — on termination this switch reverts to 'unresolved'. Attribution duty (§4): 'Source: NSE' displayed in a clear and legible manner on every page or screen where the data or any derived figure appears, never altered, obscured or minimised. Conditions (§6): no bulk raw-feed resale to unaffiliated third parties as a standalone data product; no authorised-data-vendor or official-data-partner representation without a separate vendor agreement; compliance with all applicable laws and SEBI regulations on market-data dissemination; no agency, partnership or joint-venture created.",
} as const;

/**
 * FD-26 (founder default, 11 Oct 2026, recorded in ROADMAP): "licence
 * pending" is the label on EVERY price-based score while the licence is
 * unresolved — recorded as the FOUNDER'S DEFAULT, not as the coder's
 * instruction. The canonical short form every UNLICENSED surface renders
 * (scorer refusals, the QVPS absent state, the stock-page metadata); the
 * full P0-8 disclosure text stays beneath it. With the permission letter
 * recorded (NSE-PERM) the label renders nowhere — it stays as the
 * canonical wording of the fail-closed state the module reverts to on
 * termination (§5).
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
