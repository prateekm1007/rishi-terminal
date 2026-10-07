/**
 * G4 (founder round 23) — honest wording/data on the legal and market
 * surfaces. Fail-first: every assertion below describes the state the
 * founder's G4 directive requires; on pre-fix main each named check
 * fails (the raw RED is in docs/evidence/round23/g4-honesty.md).
 *
 * Covers the directive's bullets:
 *   1. Screener.in removed from LegalDisclaimer and /terms wherever it
 *      claims to be an upstream source (the registry marks it
 *      RESEARCH_ONLY; price routing is structurally barred from it).
 *   2. The NSE/Yahoo path described as "unofficial, delayed" — the
 *      actual behavior of the endpoints used.
 *   3. The "CACHED MARKET DATA —" badge fixed: the cached aggregate
 *      now names the data actually present (the last observed prices),
 *      and a missing observation time renders an explicit not-disclosed
 *      state, never a bare dash that reads like a glitch.
 *   4. BTC/ETH/SILVER/WTI/SOL tiles keep flowing through the canonical
 *      quote path (positive control), and surfaces never present a
 *      fetch time as an observation time.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { aggregateMarketLabel } from "../lib/pricePresentation";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");

describe("G4 — Screener.in removed from the legal surfaces", () => {
  it("LegalDisclaimer's equity line names no Screener.in and says unofficial, delayed", () => {
    const src = read("components/ui/LegalDisclaimer.tsx");
    const equityLine = src.split("\n").find((l) => l.includes("Equity data:"));
    expect(equityLine, "the equity source line must exist").toBeDefined();
    expect(equityLine!).not.toContain("Screener.in");
    expect(equityLine!).toMatch(/unofficial/i);
    expect(equityLine!).toMatch(/delayed/i);
  });

  it("/terms names no Screener.in as an upstream source and says unofficial, delayed", () => {
    const src = read("app/terms/page.tsx");
    expect(src).not.toContain("Screener.in");
    // The data-accuracy section must describe the actual behavior.
    expect(src).toMatch(/unofficial/i);
    expect(src).toMatch(/delayed/i);
    // The provenance-labelling sentence stays (the live/reference/
    // unavailable distinction is part of the same truth).
    expect(src).toMatch(/where data is unavailable we show that state/i);
  });

  it("positive control: the Screener.in-free line still names the sources actually used", () => {
    const src = read("components/ui/LegalDisclaimer.tsx");
    const equityLine = src.split("\n").find((l) => l.includes("Equity data:"));
    expect(equityLine!).toMatch(/NSE/i);
    expect(equityLine!).toMatch(/Yahoo/i);
  });
});

describe("G4 — the aggregate badge describes the data actually present", () => {
  it("a cached aggregate is LAST OBSERVED, not the mechanism word CACHED", () => {
    expect(
      aggregateMarketLabel([{ price: 100, status: "CACHED", source: "yahoo" }]),
    ).toBe("LAST OBSERVED MARKET DATA");
  });

  it("live via delayed transport still says DELAYED; pure live says LIVE (unchanged contract)", () => {
    expect(
      aggregateMarketLabel([
        { price: 100, status: "LIVE", source: "yahoo-bulk" },
        { price: 50_000, status: "LIVE", source: "coingecko" },
      ]),
    ).toBe("DELAYED MARKET DATA");
    expect(
      aggregateMarketLabel([{ price: 50_000, status: "LIVE", source: "coingecko" }]),
    ).toBe("LIVE MARKET DATA");
  });

  it("static and unavailable aggregates keep their honest words", () => {
    expect(
      aggregateMarketLabel([{ price: 100, status: "STATIC", source: "static-yields-in" }]),
    ).toBe("STATIC MARKET DATA");
    expect(aggregateMarketLabel([])).toBe("UNAVAILABLE MARKET DATA");
  });
});

describe("G4 — a missing observation time is stated, never a bare dash", () => {
  it("the dashboard time slot renders an explicit not-disclosed state (no '—' arm)", () => {
    const src = read("components/dashboard/DashboardClient.tsx");
    expect(src).toContain("observationTimeNotDisclosed");
    // The pre-fix arm rendered a bare em dash when a label existed but
    // no observation time was disclosed.
    expect(src).not.toMatch(/marketLabel \? "—"/);
  });

  it("the i18n keys exist in en and hi (hi completeness is a CI gate)", () => {
    const en = JSON.parse(read("messages/en.json"));
    const hi = JSON.parse(read("messages/hi.json"));
    expect(en.dashboard.observationTimeNotDisclosed).toBeTruthy();
    expect(hi.dashboard.observationTimeNotDisclosed).toBeTruthy();
  });
});

describe("G4 — market pages never present a fetch time as an observation", () => {
  it("the commodities header derives from the observation clock, not lastUpdated", () => {
    const src = read("app/commodities/page.tsx");
    // Pre-fix: '⚡ Live • Updated {lastUpdated.toLocaleTimeString}' keyed
    // off the fetch clock with an unconditional LIVE word.
    expect(src).not.toMatch(/Live • Updated/);
    expect(src).toMatch(/observedAt/);
  });

  it("the commodities header chip counts observations, not price-map keys", () => {
    const src = read("app/commodities/page.tsx");
    expect(src).not.toMatch(/Object\.keys\(prices\)\.length > 0 \? 'live'/);
    expect(src).toMatch(/observedCount/);
  });

  it("the commodities stat tiles carry a provenance chip (no unlabeled static price)", () => {
    const src = read("app/commodities/page.tsx");
    // The four key-stat tiles (GOLD/SILVER/WTI/BRENT) must label each
    // value live vs reference exactly like the cards below them do.
    const statTiles = src.split("Live Key Stats")[1]?.split("Category Filter")[0] ?? "";
    expect(statTiles).toMatch(/ProvenanceChip/);
    expect(statTiles).toMatch(/statIsLive/);
  });

  it("the crypto header derives from the observation clock, not the arrival effect", () => {
    const src = read("app/crypto/page.tsx");
    expect(src).not.toMatch(/● LIVE/);
    expect(src).not.toMatch(/Updated \{lastUpdated/);
    expect(src).toMatch(/observedAt/);
  });
});

describe("G4 — BTC/ETH/SILVER/WTI/SOL stay on the canonical quote path (positive control)", () => {
  it("the founder-named tiles are fetched through useLivePrices, not hard-coded values", () => {
    const dash = read("components/dashboard/DashboardClient.tsx");
    expect(dash).toContain("useLivePrices");
    expect(dash).toContain('["BTC","ETH","SOL","BNB","GOLD","SILVER","WTI"]');
    const commodities = read("app/commodities/page.tsx");
    expect(commodities).toContain("useLivePrices");
    const crypto = read("app/crypto/page.tsx");
    expect(crypto).toContain("useLivePrices");
  });

  it("the tile symbols are served by the canonical single-symbol path (serveQuote)", () => {
    const quotePath = read("lib/quotePath.ts");
    // nonEquityTileSymbols is the ONE derivation the warmer and health
    // coverage share (Rule 14) — the tiles ride it.
    expect(quotePath).toContain("export function nonEquityTileSymbols");
    const dashboardSymbols = read("lib/dashboardSymbols.ts");
    for (const sym of ["BTC", "ETH", "SOL", "GOLD", "SILVER", "WTI"]) {
      expect(dashboardSymbols).toContain(`"${sym}"`);
    }
  });
});
