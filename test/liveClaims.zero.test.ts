/**
 * Round-47 P0-8-LIVE-CLAIMS (founder order, 2026-10-11):
 *
 *   "Remove 'live' claims you can't back on /pricing, /forex, /crypto
 *    and /news metadata. Hide News from the nav until a real feed
 *    exists."
 *
 * What this pin enforces:
 *   1. UNBACKED "live" claims are gone:
 *      - /pricing copy ("live prices" x2) and the dashboard's
 *        rankingsDisabledNote ("live prices") — the equity price path is
 *        unofficial, delayed Yahoo-bulk (verified on production
 *        2026-10-11: /api/prices/batch serves yahoo-bulk with observedAt);
 *        "live prices" as a blanket promise is unbacked.
 *      - /news metadata title ("— live news") — the page aggregates RSS
 *        (revalidated, delayed), it is not a live wire.
 *      - the footer forex line "Verify live rates before acting" — the
 *        forex surface serves a static reference dataset with live pairs
 *        where labelled; the word "live" there reads as a claim.
 *   2. BACKED claims STAY (positive controls, B-18): the crypto
 *      CoinGecko line and the LIVE-label vocabulary remain — production
 *      /api/prices/batch serves BTC/ETH status LIVE from coingecko with
 *      fresh observedAt (2026-10-11T11:02:21Z probe), so "live quotes
 *      from CoinGecko where labelled LIVE" is backed and must survive.
 *   3. News is HIDDEN from the nav (sidebar + dashboard mobile nav) and
 *      the sitemap — the MH pattern (founder directive 10, 2026-10-06):
 *      IA-level hide, not deletion; the route stays reachable by URL.
 *      Nav still carries its other items (positive control).
 *   4. The dead fabricated-data imports on the news list page are gone
 *      (rule 17): NEWS_FEED, TICKER_ITEMS, TRENDING_TOPICS, IPL_TEAMS,
 *      CRICKET_LIVE were imported and never used.
 *   5. The patterns bite (C5): embedded pre-fix strings must match.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");

function messageFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => join("messages", f));
}

describe("P0-8 — unbacked live claims removed; News hidden from nav", () => {
  it("no 'live prices' claim remains in any locale's UI strings", () => {
    const files = messageFiles();
    expect(files.length).toBeGreaterThanOrEqual(8);
    const hits: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const [i, raw] of src.split("\n").entries()) {
        // the i18n VALUE, not the key name: "live prices" / "Live prices"
        if (/:\s*".*[Ll]ive prices/.test(raw)) {
          hits.push(`${f}:${i + 1}: ${raw.trim().slice(0, 100)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the pricing copy states the honest data story (positive control, B-18)", () => {
    const en = read("messages/en.json");
    expect(en).toContain("market data where available");
    // the feature bullet names what is actually served: delayed equities,
    // live crypto/FX where labelled (verified on production 2026-10-11)
    expect(en).toContain("Delayed equity quotes");
    expect(en).toContain("live crypto/FX where labelled");
    // the free-tier section still exists with its promise
    expect(en).toContain("No tiers, no subscriptions, no checkout");
  });

  it("the backed claims stay — crypto CoinGecko line and LIVE vocabulary", () => {
    const footer = read("components/ui/LegalDisclaimer.tsx");
    expect(footer).toContain("live quotes from CoinGecko where labelled LIVE");
    const en = read("messages/en.json");
    // the news route keeps its honest LIVE-RSS label (the feed is real:
    // production probe 2026-10-11 returned 223 fresh RSS items)
    expect(en).toContain("LIVE RSS");
  });

  it("the /news metadata no longer claims 'live news'", () => {
    const layout = read("app/news/layout.tsx");
    expect(layout).not.toMatch(/live news/i);
    // positive control: the title still names the surface
    expect(layout).toContain("Market Intelligence");
  });

  it("the footer forex line no longer says 'Verify live rates'", () => {
    // comment lines are documentation, not UI strings (the P0-7 precedent)
    const code = read("components/ui/LegalDisclaimer.tsx")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(code).not.toContain("Verify live rates");
    // positive control: the honest static-dataset disclosure stays
    expect(code).toContain("static reference dataset — illustrative, not current");
  });

  it("News is hidden from the sidebar nav and the dashboard mobile nav", () => {
    const sidebar = read("components/Sidebar.tsx");
    const dashboard = read("components/dashboard/DashboardClient.tsx");
    expect(sidebar).not.toMatch(/href:\s*"\/news"/);
    expect(dashboard).not.toMatch(/href:\s*"\/news"/);
    // positive controls (B-18): the nav keeps its other destinations
    expect(sidebar).toMatch(/href:\s*"\/stocks"/);
    expect(sidebar).toMatch(/href:\s*"\/rishis"/);
    expect(sidebar).toMatch(/href:\s*"\/pricing"/);
    expect(dashboard).toMatch(/href:\s*"\/stocks"/);
  });

  it("News is out of the sitemap (the MH pattern: nav-hidden = sitemap-hidden)", () => {
    const sitemap = read("app/sitemap.ts");
    expect(sitemap).not.toMatch(/'\/news'|\/news,/);
    // positive control: the sitemap still carries live routes
    expect(sitemap).toMatch(/\/stocks/);
  });

  it("the dead fabricated-data imports are gone from the news list page (rule 17)", () => {
    // comment lines are documentation, not code (the P0-7 precedent)
    const code = read("app/news/page.tsx")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    for (const name of ["NEWS_FEED", "TICKER_ITEMS", "TRENDING_TOPICS", "IPL_TEAMS", "CRICKET_LIVE"]) {
      expect(code).not.toContain(name);
    }
    // positive control: the page still types its card with the shared type
    expect(code).toContain("NewsItem");
  });

  it("the patterns bite (embedded pre-fix strings must match — C5)", () => {
    // pre-fix pricing subtitle (value on a JSON line) must match the scanner
    expect(
      '"subtitle": "Every feature on Rishi Terminal is free — all Rishis, AI chat, the full stock list, portfolio tools and live prices. No tiers, no subscriptions, no checkout.",'.match(
        /:\s*".*[Ll]ive prices/,
      ),
    ).not.toBeNull();
    // a key NAME containing LivePrices without a claim value must NOT match
    expect('"livePrices": "Market data where available",'.match(/:\s*".*[Ll]ive prices/)).toBeNull();
    // the nav pattern matches the pre-fix sidebar line
    expect('{ href: "/news",        label: t("nav.news"),           icon: "◈" },'.match(
      /href:\s*"\/news"/,
    )).not.toBeNull();
    // the sitemap pattern matches the pre-fix row
    expect("{ path: '/news', priority: 0.7, changeFrequency: 'daily' },".match(/'\/news'|\/news,/)).not.toBeNull();
  });

  it("the round-47 audit follow-up: no 'Everything Is Free' / 'every verdict' / 'Live currency markets' / fake progress claims in any locale", () => {
    const files = messageFiles();
    const hits: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const [i, raw] of src.split("\n").entries()) {
        if (/Everything Is Free|every verdict|Live currency markets/.test(raw)) {
          hits.push(`${f}:${i + 1}: ${raw.trim().slice(0, 100)}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the honest replacements are present (positive controls, B-18)", () => {
    const en = read("messages/en.json");
    // the pricing title describes the CURRENT access model (FD-7 + 410
    // payment routes), not a permanence promise
    expect(en).toContain('"title": "Free — No Tiers, No Checkout"');
    // "every framework" is true under the verdict gate (896/896 seed -> no verdicts)
    expect(en).toContain("every persona, every framework");
    // the forex subtitle qualifies liveness instead of claiming it wholesale
    expect(en).toContain("Currency markets with macro lenses — live rates where labelled LIVE, reference data otherwise");
    // the knowledge-graph unavailability renders honestly (nothing is 'building')
    expect(en).toContain('"unavailable": "Knowledge Graph unavailable"');
    const kgv = read("components/stock/KnowledgeGraphView.tsx");
    expect(kgv).toContain('t("kg.unavailable")');
    expect(kgv).not.toContain('t("kg.building")');
  });

  it("the dead wisdom-graph modules are gone (rule 17)", () => {
    const fileGone = (p: string) => {
      try { read(p); return false; } catch { return true; }
    };
    expect(fileGone("components/stock/WisdomGraph.tsx")).toBe(true);
    expect(fileGone("lib/wisdom/graph.ts")).toBe(true);
  });

  it("the forex macro-rishi section carries no unbacked superlative and discloses the simulated lenses", () => {
    const fx = read("components/forex/ForexDetailClient.tsx");
    expect(fx).not.toContain("Best macro track record in history");
    expect(fx).toContain("Managed the Quantum Fund alongside Soros (public record)");
    expect(fx).toContain("simulated lenses on public frameworks");
    expect(fx).toContain("NOT their views");
  });

  it("the follow-up patterns bite (embedded pre-fix strings must match — C5)", () => {
    expect('"title": "Everything Is Free",'.match(/Everything Is Free/)).not.toBeNull();
    expect('"allRishis": "All 21 Rishis — every persona, every verdict",'.match(/every verdict/)).not.toBeNull();
    expect('"subtitle": "Live currency markets with macro analysis from legendary traders",'.match(/Live currency markets/)).not.toBeNull();
    expect("bio: 'Managed Soros Quantum Fund. Best macro track record in history.'".match(/Best macro track record in history/)).not.toBeNull();
  });
});
