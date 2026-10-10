// WP1 (founder round 2026-10-10): one shell, nav and metadata for all
// routes, with a per-route canonical and og tags. Acceptance twin of
// scripts/wp1RouteCrawl.mjs at unit level: every public route's metadata
// must be route-specific (title, canonical, og:title, og:url) — never the
// site-root defaults the root layout inherits downward.
//
// Rule 21: the helper import and the per-route pins FAIL on the pre-fix
// tree (no helper existed; section pages exported no metadata at all, so
// og:title/og:url inherited the root defaults and canonicals pointed at
// the root or the parent section).
import { describe, expect, it } from "vitest";
import type { Metadata } from "next";

import { routeMetadata } from "@/lib/seo/routeMetadata";
import { SITE_URL } from "@/lib/seo/site";

// Server-component pages carry their metadata in page.tsx.
import { metadata as stocksMeta } from "@/app/stocks/page";
import { metadata as labMeta } from "@/app/lab/page";
import { metadata as methodologyMeta } from "@/app/methodology/page";
import { metadata as privacyMeta } from "@/app/privacy/page";
import { metadata as termsMeta } from "@/app/terms/page";
import { metadata as forexPairsMeta } from "@/app/forex/pairs/page";
import { metadata as forexRishisMeta } from "@/app/forex/rishis/page";
import { metadata as bondsRishisMeta } from "@/app/bonds/rishis/page";
import { metadata as bondsScreenerMeta } from "@/app/bonds/screener/page";
import { metadata as chatMeta } from "@/app/chat/page";

// Client-rooted pages carry their metadata in the segment layout.
import { metadata as newsMeta } from "@/app/news/layout";
import { metadata as rishisMeta } from "@/app/rishis/layout";
import { metadata as pulseMeta } from "@/app/pulse/layout";
import { metadata as pulseMarketsMeta } from "@/app/pulse/markets/layout";
import { metadata as forexMeta } from "@/app/forex/layout";
import { metadata as commoditiesMeta } from "@/app/commodities/layout";
import { metadata as bondsMeta } from "@/app/bonds/layout";
import { metadata as cryptoMeta } from "@/app/crypto/layout";
import { metadata as pricingMeta } from "@/app/pricing/layout";
import { metadata as alertsMeta } from "@/app/alerts/layout";
import { metadata as fnoMeta } from "@/app/fno/layout";
import { metadata as fnoBacktesterMeta } from "@/app/fno/backtester/layout";
import { metadata as fnoOptionsMeta } from "@/app/fno/options/layout";
import { metadata as signinMeta } from "@/app/auth/signin/layout";

const STATIC_ROUTES: Array<[string, Metadata]> = [
  ["/stocks", stocksMeta],
  ["/news", newsMeta],
  ["/rishis", rishisMeta],
  ["/pulse", pulseMeta],
  ["/pulse/markets", pulseMarketsMeta],
  ["/forex", forexMeta],
  ["/forex/pairs", forexPairsMeta],
  ["/forex/rishis", forexRishisMeta],
  ["/commodities", commoditiesMeta],
  ["/bonds", bondsMeta],
  ["/bonds/rishis", bondsRishisMeta],
  ["/bonds/screener", bondsScreenerMeta],
  ["/crypto", cryptoMeta],
  ["/lab", labMeta],
  ["/pricing", pricingMeta],
  ["/methodology", methodologyMeta],
  ["/privacy", privacyMeta],
  ["/terms", termsMeta],
  ["/alerts", alertsMeta],
  ["/chat", chatMeta],
  ["/fno", fnoMeta],
  ["/fno/backtester", fnoBacktesterMeta],
  ["/fno/options", fnoOptionsMeta],
  ["/auth/signin", signinMeta],
];

const GENERIC_TITLES = new Set(["Rishi Terminal - Sacred Investment Intelligence"]);

describe("WP1: routeMetadata helper", () => {
  it("builds route-specific title, canonical, og and twitter from one input", () => {
    const m = routeMetadata({
      path: "/pulse",
      title: "Market Pulse — India macro dashboard | Rishi Terminal",
      description: "CPI, WPI, repo rate, G-Sec yields.",
    });
    expect(m.title).toBe("Market Pulse — India macro dashboard | Rishi Terminal");
    expect(m.alternates?.canonical).toBe("/pulse");
    expect(m.openGraph?.title).toBe(m.title);
    expect(m.openGraph?.url).toBe("/pulse");
    expect(m.twitter?.title).toBe(m.title);
  });

  it("never emits the site-root generic title from the helper", () => {
    const m = routeMetadata({
      path: "/x",
      title: "X | Rishi Terminal",
      description: "d",
    });
    expect(GENERIC_TITLES.has(String(m.title))).toBe(false);
  });
});

describe("WP1: every public section route names itself (title/canonical/og)", () => {
  for (const [path, m] of STATIC_ROUTES) {
    it(`${path}: route-specific title, canonical, og:title, og:url`, () => {
      const title = String(m.title ?? "");
      expect(title.length, `${path}: no title`).toBeGreaterThan(0);
      expect(
        GENERIC_TITLES.has(title),
        `${path}: title is the site-root generic`,
      ).toBe(false);
      expect(
        m.alternates?.canonical,
        `${path}: canonical must be ${path}`,
      ).toBe(path);
      expect(String(m.openGraph?.title ?? ""), `${path}: og:title`).toBe(title);
      expect(m.openGraph?.url, `${path}: og:url`).toBe(path);
      expect(String(m.twitter?.title ?? ""), `${path}: twitter:title`).toBe(title);
    });
  }
});

describe("WP1: detail routes carry their own canonical + og", () => {
  it("bonds/IN10YS canonical is the bond, not the parent section", async () => {
    const { generateMetadata } = await import("@/app/bonds/[symbol]/page");
    const m = await generateMetadata({ params: Promise.resolve({ symbol: "IN10YS" }) } as never);
    expect(String(m.title)).toContain("India 10Y G-Sec");
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/bonds/IN10YS`);
    expect(m.openGraph?.url).toBe(`${SITE_URL}/bonds/IN10YS`);
  });

  it("methodology/graham canonical is the scorer doc, not the root", async () => {
    const { generateMetadata } = await import("@/app/methodology/[scorer]/page");
    const m = await generateMetadata({ params: Promise.resolve({ scorer: "graham" }) } as never);
    expect(String(m.title)).toContain("Graham");
    expect(m.alternates?.canonical).toBe(`${SITE_URL}/methodology/graham`);
    expect(m.openGraph?.url).toBe(`${SITE_URL}/methodology/graham`);
  });
});

describe("WP1: public methodology labels carry no slugs or S2 IDs", () => {
  it("doc H1 titles have no (S2-NN) roadmap IDs", async () => {
    const { listMethodologyDocs } = await import("@/lib/methodology");
    const docs = await listMethodologyDocs();
    expect(docs.length).toBeGreaterThan(10);
    for (const d of docs) {
      expect(d.title, `${d.slug}: H1 leaks an S2 ID`).not.toMatch(/S2-\d+/);
    }
  });
});
