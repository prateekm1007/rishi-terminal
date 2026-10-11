/**
 * REF-MARKETS — the FD-15 sourced-rows acceptance gate.
 *
 * Founder order 2026-10-11 (items 2 and 7):
 *   "Set a data contract for these four pages. Each row shows value, unit,
 *    source name, as-of time and state (live, delayed, seed or missing). A
 *    value with no source and no date doesn't render. The cell shows '—'
 *    with 'no source yet'. The dashboard ticker follows the same rule."
 *   "Acceptance test: fail the build if any value on the four pages renders
 *    without a source and as-of time, or if any seed number renders as
 *    data."
 *
 * What this pin enforces (vitest runs in CI — a failure fails the build):
 *   1. THE GATE bites: renderableMarketValue / renderableTickerValue
 *      return null on every ugly path (no source, no date, seed, missing,
 *      STATIC wire entries, licence-pending classes).
 *   2. The four page files render market values ONLY through the contract:
 *      no direct .toFixed/.toLocaleString/'$'+ number formatting, no reads
 *      of the seed datasets' numeric fields (spotRate/ytm/duration/rating/
 *      high52w/seed marketCap/Fear&Greed/MARKET_DOMINANCE).
 *   3. Positive controls (B-18): each page imports the gate module and
 *      renders the contract cells; the tables/grids exist.
 *   4. The dashboard ticker renders through the ticker gate.
 *   5. The nav lists all four markets (FD-15: "Keep them") — the #348 nav
 *      removal is superseded by the founder's recorded decision.
 *   6. Every locale's forex subtitle drops the "Live currency markets"
 *      claim (founder: the heading must match the data).
 *   7. Bonds: the SOV pseudo-rating is gone; the repo row exists
 *      (RBI DBIE is its named source); MCX commodity units carry ₹ and
 *      grains/cotton keep their units.
 *
 * Fail-first: RED 2F/12P on the pre-fix tree (raw capture at
 * docs/evidence/round47/red-fd15-ref-markets.txt).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  renderableMarketValue,
  renderableTickerValue,
  renderableTickerChange,
  marketSourceText,
  type MarketRow,
} from "../lib/markets/sourcedRow";

const REPO = path.resolve(__dirname, "..");

function readRepo(rel: string): string {
  const p = path.join(REPO, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

const FOUR_PAGES = [
  "app/crypto/page.tsx",
  "app/forex/page.tsx",
  "app/commodities/page.tsx",
  "app/bonds/page.tsx",
] as const;

/**
 * The scanner (exported for its own bite proof — rule 24: a gate that
 * cannot fail is theater). Returns the forbidden patterns a source file
 * still contains.
 */
export function forbiddenMarketRenders(source: string): string[] {
  const patterns: Array<[string, RegExp]> = [
    [".toFixed(", /\.toFixed\(/],
    [".toLocaleString(", /\.toLocaleString\(/],
    ["'$' + number concat", /'\$'\s*\+|"\$"\s*\+|`\$\$\{/],
    ["seed spotRate", /\.spotRate\b/],
    ["seed bid", /\.bid\b/],
    ["seed ask", /\.ask\b/],
    ["seed ytm", /\.ytm\b/],
    ["seed duration field", /\.duration\b/],
    ["seed riskRating", /\.riskRating\b/],
    ["seed rating", /\.rating\b/],
    ["seed high52w", /\.high52w\b/],
    ["seed low52w", /\.low52w\b/],
    ["seed pppRate", /\.pppRate\b/],
    ["seed volatility", /\.volatility\b/],
    ["FEAR_GREED_INDEX seed", /FEAR_GREED_INDEX/],
    ["MARKET_DOMINANCE seed", /MARKET_DOMINANCE/],
    ["seed marketCap field", /\.marketCap\b/],
    ["seed price field", /\.price\b/],
  ];
  return patterns.filter(([, re]) => re.test(source)).map(([name]) => name);
}

describe("REF-MARKETS 1 — the FD-15 gate bites (pure)", () => {
  const base: MarketRow = { value: 1234.5, unit: "$", source: "CoinGecko", asOf: "2026-10-11T11:02:21Z", state: "live" };

  it("a full live row renders its value", () => {
    expect(renderableMarketValue(base)).toBe(1234.5);
  });
  it("a delayed row renders its value", () => {
    expect(renderableMarketValue({ ...base, state: "delayed" })).toBe(1234.5);
  });
  it("MUST FAIL PRE-FIX behaviour is refused: seed state never renders as data", () => {
    expect(renderableMarketValue({ ...base, state: "seed" })).toBeNull();
  });
  it("missing state never renders", () => {
    expect(renderableMarketValue({ ...base, state: "missing" })).toBeNull();
  });
  it("no source → null (a value with no source doesn't render)", () => {
    expect(renderableMarketValue({ ...base, source: null })).toBeNull();
  });
  it("no as-of → null (a value with no date doesn't render)", () => {
    expect(renderableMarketValue({ ...base, asOf: null })).toBeNull();
  });
  it("no value → null; non-finite → null", () => {
    expect(renderableMarketValue({ ...base, value: null })).toBeNull();
    expect(renderableMarketValue({ ...base, value: Number.NaN })).toBeNull();
  });
  it("the source cell says 'no source yet' when absent", () => {
    expect(marketSourceText({ source: null })).toBe("no source yet");
    expect(marketSourceText({ source: "RBI DBIE" })).toBe("RBI DBIE");
  });

  it("the ticker gate: full entry renders; missing time/source refuse", () => {
    const full = { price: 98500, source: "coingecko", status: "LIVE", lastUpdated: "2026-10-11T11:02:21Z" };
    expect(renderableTickerValue("BTC", full)).toBe(98500);
    expect(renderableTickerValue("BTC", { ...full, lastUpdated: null })).toBeNull();
    expect(renderableTickerValue("BTC", { ...full, source: null })).toBeNull();
    expect(renderableTickerValue("BTC", { ...full, status: "STATIC" })).toBeNull();
    expect(renderableTickerValue("BTC", null)).toBeNull();
  });
  it("licence-pending classes never render on the ticker, even with a live transport quote", () => {
    const quote = { price: 2650, source: "yahoo", status: "LIVE", lastUpdated: "2026-10-11T11:02:21Z" };
    expect(renderableTickerValue("GOLD", quote, (s) => s === "GOLD")).toBeNull();
  });
  it("change renders only beside a rendered value", () => {
    const full = { price: 98500, source: "coingecko", status: "LIVE", lastUpdated: "2026-10-11T11:02:21Z", changePercent24h: 2.45 };
    expect(renderableTickerChange("BTC", full, () => false)).toBe(2.45);
    expect(renderableTickerChange("BTC", { ...full, lastUpdated: null }, () => false)).toBeNull();
  });
});

describe("REF-MARKETS 2 — the scanner itself can fail (rule 24 bite proof)", () => {
  it("flags a direct seed-value render", () => {
    const violating = "return <td>{pair.spotRate.toFixed(2)}</td>;";
    expect(forbiddenMarketRenders(violating)).toContain(".toFixed(");
    expect(forbiddenMarketRenders(violating)).toContain("seed spotRate");
  });
  it("flags a '$' + number concat and seed field reads", () => {
    expect(forbiddenMarketRenders("{'$' + c.price}")).toContain("'$' + number concat");
    expect(forbiddenMarketRenders("{bond.ytm}%")).toContain("seed ytm");
    expect(forbiddenMarketRenders("{asset.marketCap}")).toContain("seed marketCap field");
  });
  it("passes a contract-only render", () => {
    const clean = 'import { renderableMarketValue } from "@/lib/markets/sourcedRow";\n<MarketValueCell row={row} />';
    expect(forbiddenMarketRenders(clean)).toEqual([]);
  });
});

describe("REF-MARKETS 3 — the four pages render market values only through the contract", () => {
  for (const page of FOUR_PAGES) {
    it(`${page}: no forbidden direct/seed renders, gate wired, cells present`, () => {
      const src = readRepo(page);
      // Positive control (B-18): the page exists and still renders a table/grid.
      expect(src.length, `${page} exists`).toBeGreaterThan(400);
      expect(src, `${page} renders rows`).toMatch(/<t[dh]\b|card-sacred/);
      // The contract is wired in.
      expect(src, `${page} imports the gate module`).toMatch(/markets\/sourcedRow/);
      expect(src, `${page} renders contract cells`).toMatch(/MarketValueCell|renderableMarketValue/);
      expect(src, `${page} shows the source cell`).toMatch(/MarketSourceCell|marketSourceText|licence pending/);
      expect(src, `${page} shows the as-of cell`).toMatch(/MarketAsOfCell|asOf/);
      // No value renders outside the contract.
      expect(forbiddenMarketRenders(src), `${page} forbidden renders`).toEqual([]);
    });
  }

  it("crypto: the CoinGecko attribution the provider matrix requires is displayed", () => {
    const src = readRepo("app/crypto/page.tsx");
    expect(src).toContain("CoinGecko");
    // Unresolved prices are '—', never '$...'
    expect(src).not.toContain("'$...'");
    expect(src).not.toMatch(/:\s*["'`]\$\.\.\.["'`]/);
  });

  it("dashboard ticker renders through the ticker gate", () => {
    const src = readRepo("components/dashboard/DashboardClient.tsx");
    expect(src, "ticker gate imported").toMatch(/renderableTickerValue/);
    expect(src, "no ungated d?.price ternary").not.toMatch(/d\?\.price\s*\?/);
    expect(src, "licence-pending classification wired").toMatch(/TICKER_LICENCE_PENDING|LICENCE_PENDING/);
    expect(src, "CoinGecko attributed on the ticker surface").toContain("CoinGecko");
  });
});

describe("REF-MARKETS 4 — the nav lists all four markets (FD-15: keep them)", () => {
  it("sidebar Markets group carries crypto, forex, commodities, bonds", () => {
    const src = readRepo("components/Sidebar.tsx");
    // Positive control: the Markets group itself exists.
    expect(src).toContain('title: t("nav.markets")');
    for (const href of ['"/crypto"', '"/forex"', '"/commodities"', '"/bonds"']) {
      expect(src, `sidebar lists ${href}`).toContain(`href: ${href}`);
    }
  });
});

describe("REF-MARKETS 5 — forex copy matches the data (no 'Live currency markets')", () => {
  const LIVE_WORDS = /live|लाइव|লাইভ|લાઇવ|थेट|ನೇರಟಿ|நேரடி|ప్రత్యక్ష|प्रत्यक्ष/i;
  const LICENCE_WORDS: Record<string, RegExp> = {
    en: /licence/i, pseudo: /licence/i, hi: /लाइसेंस/, bn: /লাইসেন্স/,
    gu: /લાઇસન્સ/, mr: /लायसन्स/, ta: /லைசன்ஸ்/, te: /లైసెన్స్/,
  };

  it("every locale's forex.subtitle drops the live claim and says licence-pending", () => {
    const locales = readdirSync(path.join(REPO, "messages")).filter((f) => f.endsWith(".json"));
    expect(locales.length).toBeGreaterThan(4); // positive control: locales exist
    for (const f of locales) {
      const locale = f.replace(/\.json$/, "");
      const dict = JSON.parse(readFileSync(path.join(REPO, "messages", f), "utf8"));
      const subtitle = dict?.forex?.subtitle;
      expect(typeof subtitle, `${locale} forex.subtitle exists`).toBe("string");
      expect(subtitle!.length).toBeGreaterThan(10);
      expect(subtitle, `${locale} subtitle must not claim live markets: ${subtitle}`).not.toMatch(LIVE_WORDS);
      const licenceWord = LICENCE_WORDS[locale] ?? /licence/i;
      expect(subtitle, `${locale} subtitle must say the licence is pending: ${subtitle}`).toMatch(licenceWord);
    }
  });

  it("the forex page has no live-rate loader line", () => {
    const src = readRepo("app/forex/page.tsx");
    expect(src).not.toContain("Fetching live forex rates");
    expect(src).not.toMatch(/⚡\s*Live/i);
  });
});

describe("REF-MARKETS 6 — bonds and commodities data honesty", () => {
  it("the bonds dataset marks its ratings unverified (founder: 'treat the current corporate ratings as unverified')", () => {
    const src = readRepo("data/bonds.ts");
    // Positive controls: the dataset exists with its G-Sec rows.
    expect(src).toContain("IN10YS");
    expect(src).toContain("'G-Sec'");
    expect(src).toMatch(/unverified/i);
  });
  it("the bonds page never renders a rating (the column shows '—' — no cleared rating source)", () => {
    const src = readRepo("app/bonds/page.tsx");
    expect(forbiddenMarketRenders(src)).toEqual([]);
  });

  it("the RBI DBIE rows exist: repo row added beside G-secs and T-bills", () => {
    const src = readRepo("data/bonds.ts");
    expect(src).toContain("'Repo'");
    expect(src).toContain("REPO");
    expect(src).toMatch(/RBI DBIE|source.*DBIE/i);
  });

  it("MCX commodity units are in ₹; grains and cotton keep their units", () => {
    const src = readRepo("data/markets.ts");
    // Positive control: the commodity rows exist.
    expect(src).toContain("GOLDMCX");
    expect(src).toContain("WHEAT");
    expect(src).toContain("COTTON");
    for (const sym of ["GOLDMCX", "SILVERMCX", "CRUDEOILMCX"]) {
      const row = src.split("\n").find((l) => l.includes(`symbol: '${sym}'`));
      // find the unit on the same row (single-line rows) or nearby
      const unitLine = row && row.includes("unit:") ? row : src.slice(src.indexOf(`symbol: '${sym}'`), src.indexOf(`symbol: '${sym}'`) + 600);
      expect(unitLine, `${sym} unit line`).toMatch(/unit:\s*'₹\//);
    }
    for (const sym of ["WHEAT", "CORN", "SOYBEAN", "COTTON"]) {
      const idx = src.indexOf(`symbol: '${sym}'`);
      expect(idx, `${sym} exists`).toBeGreaterThan(-1);
      const window = src.slice(idx, idx + 600);
      expect(window, `${sym} must carry a unit`).toMatch(/unit:\s*'\$/);
    }
  });
});
