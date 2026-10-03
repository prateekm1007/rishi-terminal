// X3 — Prices in the first byte (founder round 11, direction X3).
//
// Defect (founder audit, live): /stock/SBIN renders "PRICE ⟳ FETCHING —"
// in the first byte (the widget is client-only and the page is statically
// prerendered), the homepage renders "Connecting..." + "——" for every
// index/crypto/gold tile (the SSR snapshot only runs on hourly ISR and
// production quote_cache was cold), the hero claims "Live prices" with no
// quote rendered, and the disabled-rankings banner names the env var.
//
// The fix, per the direction: render the LAST CACHED QUOTE on every
// request from quote_cache (a cheap READ-ONLY peek — the render path never
// claims refreshes or fetches upstreams), label the honest states
// (CACHED/DELAYED/UNAVAILABLE vocabulary the price presentation layer
// already owns), drop the "Live prices" hero claim unless a quote actually
// rendered, and remove the env-var name from the banner.
//
// Rule 21: every pin below failed against the pre-X3 tree (raw RED output
// in the PR).

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
const read = (p: string): string => readFileSync(path.join(REPO, p), "utf8");

describe("X3: read-only peek over the shared quote cache", () => {
  it("exposes peekCachedQuotes — a read that never claims a refresh and never fetches upstream", () => {
    const src = read("lib/quoteCache.ts");
    expect(src).toMatch(/export async function peekCachedQuotes/);
    // The peek body must not reach the refresh machinery: no claim RPC,
    // no upstream fetcher call inside the peek function itself.
    const fn = src.slice(src.indexOf("export async function peekCachedQuotes"));
    const body = fn.slice(0, fn.indexOf("\n}", 1) + 2);
    expect(body).not.toMatch(/tryRefreshClaim/);
    expect(body).not.toMatch(/fetchUpstream/);
    // Infrastructure failure degrades to an empty read (honest omission),
    // never a throw into the render path.
    expect(body).toMatch(/catch/);
  });

  it("maps a peeked row to the wire entry with CACHED provenance and its own observation time", async () => {
    const { cachedQuoteToEntry } = await import("@/lib/dashboardSnapshot");
    const mapped = cachedQuoteToEntry({
      symbol: "SBIN",
      price: 812.4,
      change: -0.62,
      currency: "INR",
      source: "yahoo",
      observedAt: "2026-10-03T09:55:00.000Z",
      refreshedAt: "2026-10-03T09:56:10.000Z",
      volume24h: 1200000,
    });
    expect(mapped).not.toBeNull();
    expect(mapped?.price).toBe(812.4);
    expect(mapped?.changePercent24h).toBe(-0.62);
    expect(mapped?.status).toBe("CACHED");
    expect(mapped?.source).toBe("yahoo");
    expect(mapped?.lastUpdated).toBe("2026-10-03T09:55:00.000Z");
    expect(mapped?.volume24h).toBe(1200000);
  });

  it("refuses degenerate rows (rule 16): a price-0 claim placeholder maps to null, not 0", async () => {
    const { cachedQuoteToEntry } = await import("@/lib/dashboardSnapshot");
    expect(
      cachedQuoteToEntry({
        symbol: "X",
        price: 0,
        change: null,
        currency: "INR",
        source: "yahoo",
        observedAt: null,
        refreshedAt: "2026-10-03T09:56:10.000Z",
        volume24h: null,
      }),
    ).toBeNull();
  });
});

describe("X3: server pages render cached quotes on every request", () => {
  it("the homepage renders per request (no first-visitor ISR dependency)", () => {
    const src = read("app/page.tsx");
    expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(src).not.toMatch(/revalidate = 3600/);
    // The render path reads the shared cache PEEK — never the
    // claim-and-fetch snapshot.
    expect(src).toMatch(/cachedPriceSnapshot/);
    expect(src).not.toMatch(/initialPriceSnapshot/);
  });

  it("the stock detail page renders per request and hands the widget a server quote", () => {
    const src = read("app/stock/[symbol]/page.tsx");
    expect(src).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(src).toMatch(/peekCachedQuote/);
    expect(src).toMatch(/initialEntry/);
  });
});

describe("X3: the first byte never says FETCHING or Connecting", () => {
  it("LivePriceWidget boots from the server entry — no FETCHING label anywhere in the first byte", () => {
    const src = read("components/stock/LivePriceWidget.tsx");
    expect(src).toMatch(/initialEntry/);
    // The fetch placeholder is GONE from the component entirely — the
    // founder's acceptance is grep-level (live HTML contains no FETCHING).
    expect(src).not.toMatch(/FETCHING/);
    // The boot mapping uses the shared presentation layer (rule 14).
    expect(src).toMatch(/presentationState\(initialEntry\)/);
  });

  it("DashboardClient drops the Connecting… placeholder for the honest aggregate label", () => {
    const src = read("components/dashboard/DashboardClient.tsx");
    expect(src).not.toMatch(/dashboard\.connecting/);
    expect(src).toMatch(/aggregateMarketLabel/);
  });
});

describe("X3: honest hero and banner", () => {
  it("the default hero sentence claims nothing live; the live variant renders only when a quote rendered", () => {
    const en = JSON.parse(read("messages/en.json")) as {
      dashboard: Record<string, string>;
    };
    expect(en.dashboard.heroWisdomSuffix).not.toMatch(/live price/i);
    expect(en.dashboard.heroWisdomSuffixLive).toMatch(/live price/i);
    // The client component gates the live variant on rendered quotes.
    const src = read("components/dashboard/DashboardClient.tsx");
    expect(src).toMatch(/heroWisdomSuffixLive/);
  });

  it("no locale names the env var in the rankings-disabled banner", () => {
    for (const locale of ["en", "hi", "bn", "mr", "ta", "gu", "te"]) {
      const msgs = JSON.parse(read(`messages/${locale}.json`)) as {
        dashboard: Record<string, string>;
        dashboard2: Record<string, string>;
      };
      expect(msgs.dashboard2.rankingsDisabledNote, locale).not.toMatch(/RANKINGS_ENABLED/);
    }
  });

  it("phase6Battery measures the REAL dashboard population (no hand-copied drift)", () => {
    // Rule 14/15: the battery's population was a hand-copy that drifted —
    // it still requested MATIC (rebranded to POL), which the registry gate
    // rightly rejects, so scenario D measured a 400 instead of the
    // dashboard's batch. The battery must import the same lists the page
    // uses, and must never again carry a MATIC literal.
    const src = read("scripts/phase6Battery.ts");
    expect(src).toMatch(/from "@\/lib\/dashboardSymbols"/);
    expect(src).not.toMatch(/"MATIC"/);
  });
});
