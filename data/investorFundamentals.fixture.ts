/**
 * data/investorFundamentals.fixture.ts — the TEST FIXTURE dataset for the
 * /investors route (founder round-55 order, 13 Oct, words verbatim:
 * "Use a test fixture until the company list is confirmed.").
 *
 * HONESTY CONTRACT (C1/C4 — read before editing):
 *  - This is a PLACEHOLDER dataset demonstrating the reviewed-data-file
 *    SHAPE (source, page, date, checked-by, checked-on on every figure).
 *    The VALUES are illustrative placeholders, NOT extracted from any
 *    filing — every source string says so, and the route's banner
 *    discloses it on every screen.
 *  - The company list is founder-pending (#418's checkboxes: RELIANCE,
 *    TCS, INFOSYS, ITC, HDFC Bank proposed). Two of the proposed names
 *    are used here as SHAPE placeholders; the round-56 filings-citation
 *    build replaces this file wholesale when the list is confirmed.
 *  - No prices, no valuation readings — enforced at the loader
 *    (lib/investors/reviewedFundamentals) and pinned by
 *    test/investors.route.test.ts.
 */

export const INVESTOR_FIXTURE_DATASET: unknown[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    sector: "Energy & Retail",
    fiscalYear: "FY26",
    figures: {
      revenue: {
        value: null,
        unit: "₹ crore",
        source: "TEST FIXTURE — placeholder shape, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
      roce: {
        value: null,
        unit: "%",
        source: "TEST FIXTURE — placeholder shape, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
      debtToEquity: {
        value: null,
        unit: "x",
        source: "TEST FIXTURE — placeholder shape, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
    },
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    sector: "IT Services",
    fiscalYear: "FY26",
    figures: {
      revenue: {
        value: null,
        unit: "₹ crore",
        source: "TEST FIXTURE — placeholder shape, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
      roce: {
        value: null,
        unit: "%",
        source: "TEST FIXTURE — placeholder shape, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
    },
  },
];
