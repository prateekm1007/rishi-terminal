/**
 * /investors (founder round-55 order, 13 Oct 2026) — the truthful
 * investor route, DEV AND TEST ONLY. Founder's words verbatim:
 * "Start the truthful investor route (/investors), dev and test only.
 * Fundamentals come from a reviewed data file, with source, page, date,
 * checked-by and checked-on for every figure. No prices and no valuation
 * readings. Banner on every screen. Tests fail on any price, any
 * unsourced figure, or any missing banner. Use a test fixture until the
 * company list is confirmed. Nothing on the public site changes."
 *
 * This suite pins the contract, fail-first (C5):
 *
 *   1. GATE (fail-closed, C2): without INVESTORS_ROUTE_DEV=1 the route
 *      404s — production (no flag) sees nothing new; "nothing on the
 *      public site changes" is structural, not a promise.
 *   2. BANNER on every screen: every data-investor-screen element
 *      carries the dev/fixture banner. A missing banner fails.
 *   3. PROVENANCE: every figure renders source, page, date, checked-by
 *      and checked-on. The loader REFUSES an unsourced figure (a figure
 *      missing any of the six provenance fields) — refused, not
 *      rendered, not defaulted (rule 16 + C2).
 *   4. NO PRICES, NO VALUATION READINGS: the loader refuses any figure
 *      key from the price/valuation vocabulary (price, market cap, P/E,
 *      P/B, EV/EBITDA, upside, target, fair value); the rendered output
 *      carries none of that vocabulary. Positive control: the
 *      fundamentals vocabulary (revenue, ROCE, debt) IS present — an
 *      empty page would pass any absence check (B-18).
 *   5. FIXTURE HONESTY: the shipped dataset is a TEST FIXTURE — the
 *      fixture's provenance strings say so, and the banner discloses it
 *      on every screen. No fabricated filing citation (C1/C4).
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import {
  parseReviewedFundamentals,
  investorsRouteEnabled,
  INVESTOR_BANNER_MARKER,
  type ReviewedCompany,
} from "@/lib/investors/reviewedFundamentals";
import { INVESTOR_FIXTURE_DATASET } from "@/data/investorFundamentals.fixture";

const FLAG = "INVESTORS_ROUTE_DEV";

let savedFlag: string | undefined;

beforeEach(() => {
  savedFlag = process.env[FLAG];
});

afterEach(() => {
  if (savedFlag === undefined) delete process.env[FLAG];
  else process.env[FLAG] = savedFlag;
});

/** A minimal well-formed company record for the schema-bite legs. */
function wellFormedCompany(overrides: Partial<ReviewedCompany> = {}): unknown {
  return {
    symbol: "TEST",
    name: "Test Industries",
    sector: "Testing",
    fiscalYear: "FY26",
    figures: {
      revenue: {
        value: 100000,
        unit: "₹ crore",
        source: "TEST FIXTURE — placeholder, not a filing",
        sourcePage: "pending — no filing cited yet",
        sourceDate: "2026-10-13",
        checkedBy: "round-55 dev build",
        checkedOn: "2026-10-13",
      },
    },
    ...overrides,
  };
}

describe("investors route — the gate (fail-closed)", () => {
  it("no flag -> notFound (the page throws the 404 fallback; production sees a 404)", async () => {
    delete process.env[FLAG];
    expect(investorsRouteEnabled()).toBe(false);
    const mod = await import("@/app/investors/page");
    let notFoundDigest: string | null = null;
    try {
      renderToString(createElement(mod.default));
    } catch (err) {
      const digest = (err as { digest?: string }).digest;
      if (typeof digest === "string" && digest.includes("NEXT_HTTP_ERROR_FALLBACK;404")) notFoundDigest = digest;
      else throw err;
    }
    expect(notFoundDigest).toBeTruthy();
  });

  it("flag on -> the page renders (dev and test only)", async () => {
    process.env[FLAG] = "1";
    expect(investorsRouteEnabled()).toBe(true);
    const mod = await import("@/app/investors/page");
    const html = renderToString(createElement(mod.default));
    expect(html.length).toBeGreaterThan(500);
  });
});

describe("investors route — banner on every screen", () => {
  it("every data-investor-screen element carries the banner marker", async () => {
    process.env[FLAG] = "1";
    const mod = await import("@/app/investors/page");
    const html = renderToString(createElement(mod.default));
    const screens = html.match(/data-investor-screen="[^"]*"/g) ?? [];
    // Positive control (B-18): screens exist to carry banners.
    expect(screens.length).toBeGreaterThanOrEqual(2);
    // The banner must appear at least once per screen: the banner marker's
    // occurrence count must be >= the screen count (each screen renders
    // its own banner element).
    const banners = html.match(new RegExp(INVESTOR_BANNER_MARKER, "g")) ?? [];
    expect(banners.length).toBeGreaterThanOrEqual(screens.length);
  });

  it("the banner discloses the dev/test + fixture status honestly", async () => {
    process.env[FLAG] = "1";
    const mod = await import("@/app/investors/page");
    const html = renderToString(createElement(mod.default));
    expect(html).toContain("DEV AND TEST ONLY");
    expect(html).toContain("test fixture");
    expect(html).toContain("not filings");
  });
});

describe("investors route — provenance on every figure", () => {
  it("the shipped fixture parses and every figure carries all six provenance fields", () => {
    const r = parseReviewedFundamentals(INVESTOR_FIXTURE_DATASET);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.companies.length).toBeGreaterThanOrEqual(1);
    for (const company of r.companies) {
      const figureEntries = Object.entries(company.figures);
      expect(figureEntries.length).toBeGreaterThanOrEqual(1);
      for (const [key, fig] of figureEntries) {
        expect(fig.source.length, `${company.symbol}.${key}.source`).toBeGreaterThan(0);
        expect(fig.sourcePage.length, `${company.symbol}.${key}.sourcePage`).toBeGreaterThan(0);
        expect(fig.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fig.checkedBy.length, `${company.symbol}.${key}.checkedBy`).toBeGreaterThan(0);
        expect(fig.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fig.unit.length).toBeGreaterThan(0);
      }
    }
  });

  it("BITES: a figure missing checked-by is REFUSED (never defaulted, never rendered)", () => {
    const bad = wellFormedCompany({
      figures: {
        revenue: {
          value: 1,
          unit: "₹ crore",
          source: "TEST FIXTURE — placeholder, not a filing",
          sourcePage: "p. 120",
          sourceDate: "2026-10-13",
          checkedOn: "2026-10-13",
        } as never,
      },
    });
    const r = parseReviewedFundamentals([bad]);
    expect(r.ok).toBe(false);
  });

  it("BITES: a figure with an empty source string is REFUSED", () => {
    const bad = wellFormedCompany({
      figures: {
        revenue: {
          value: 1,
          unit: "₹ crore",
          source: "",
          sourcePage: "p. 120",
          sourceDate: "2026-10-13",
          checkedBy: "someone",
          checkedOn: "2026-10-13",
        },
      },
    });
    const r = parseReviewedFundamentals([bad]);
    expect(r.ok).toBe(false);
  });
});

describe("investors route — no prices, no valuation readings", () => {
  it("BITES: a price figure key is REFUSED by the loader", () => {
    const bad = wellFormedCompany({
      figures: {
        price: {
          value: 1170.9,
          unit: "₹ / share",
          source: "TEST FIXTURE — placeholder, not a filing",
          sourcePage: "p. 1",
          sourceDate: "2026-10-13",
          checkedBy: "someone",
          checkedOn: "2026-10-13",
        },
      },
    });
    const r = parseReviewedFundamentals([bad]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("price");
  });

  it("BITES: valuation vocabulary keys are REFUSED (peRatio, marketCap, targetPrice, upside)", () => {
    for (const key of ["peRatio", "marketCap", "targetPrice", "upside", "fairValue", "evEbitda", "priceToBook"]) {
      const bad = wellFormedCompany({
        figures: {
          [key]: {
            value: 1,
            unit: "x",
            source: "TEST FIXTURE — placeholder, not a filing",
            sourcePage: "p. 1",
            sourceDate: "2026-10-13",
            checkedBy: "someone",
            checkedOn: "2026-10-13",
          },
        },
      });
      const r = parseReviewedFundamentals([bad]);
      expect(r.ok, `the key "${key}" must be refused`).toBe(false);
    }
  });

  it("the rendered page carries no price/valuation vocabulary (positive control: fundamentals ARE present)", async () => {
    process.env[FLAG] = "1";
    const mod = await import("@/app/investors/page");
    const html = renderToString(createElement(mod.default));
    for (const banned of [
      "Price unavailable",
      "LIVE",
      "intraday",
      "P/E",
      "P/B",
      "EV/EBITDA",
      "Market Cap",
      "Upside",
      "Target Price",
      "Fair Value",
      "Verdict",
      "Buy Signal",
    ]) {
      expect(html.includes(banned), `the investors page must not render "${banned}"`).toBe(false);
    }
    // Positive controls (B-18): the page is not empty of content.
    expect(html).toContain("Revenue");
    expect(html).toContain("ROCE");
  });
});

describe("investors route — fixture honesty (C1/C4)", () => {
  it("the fixture's provenance strings disclose the fixture status (no fabricated filing citations)", () => {
    const r = parseReviewedFundamentals(INVESTOR_FIXTURE_DATASET);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const company of r.companies) {
      for (const fig of Object.values(company.figures)) {
        expect(
          fig.source.toLowerCase().includes("fixture"),
          `${company.symbol}: every fixture figure's source must say it is a fixture`,
        ).toBe(true);
      }
    }
  });

  it("the dataset is shaped as the round-56 filings build will be (symbol + name + sector + FY + figures)", () => {
    const r = parseReviewedFundamentals(INVESTOR_FIXTURE_DATASET);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const company of r.companies) {
      expect(company.symbol).toMatch(/^[A-Z0-9&-]+$/);
      expect(company.name.length).toBeGreaterThan(2);
      expect(company.sector.length).toBeGreaterThan(2);
      expect(company.fiscalYear).toMatch(/^FY\d{2}$/);
    }
  });
});
