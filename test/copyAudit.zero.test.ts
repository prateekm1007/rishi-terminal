/**
 * DELIV-4 — the copy audit (founder order, 2026-10-12):
 *
 *   "Still present: 'every verdict' (6 files), 'live prices' (9),
 *    'knowledge graph' (16), 'WISDOM TIERS' (2). Remove each claim the
 *    build can't support, or build and test it."
 *
 * The audit's disposition, per claim family:
 *
 *   1. "every verdict" — code comments describing the free-access
 *      payload. The mechanism is real (the full computed consensus
 *      crosses; nothing is tier-locked) but the phrase reads as a data
 *      claim while most verdicts are absent on seed data (P0-1). REWORDED
 *      to "the full verdict set" everywhere; grep-zero here.
 *   2. "live prices" — one user-facing string (the Lab holdings fetch)
 *      and eleven comments. The blanket equity reading is unbacked (the
 *      equity path is delayed Yahoo-bulk; the LIVE word is earned only
 *      where labelled — G4). REWORDED to mechanism-precise wording;
 *      grep-zero here.
 *   3. "knowledge graph" — the views EXIST (the stock page mounts the
 *      server-computed graph; the forex modal renders the macro graph),
 *      so the labels stay — this is the "build and test it" leg: the
 *      positive controls below pin the mounting of both views. What the
 *      build cannot support is GONE: the dead "Elite Knowledge Graph"
 *      locale key (no renderer anywhere — a tier promise with no view)
 *      and the pricing blurb's overclaim, now worded to the two views
 *      that actually render.
 *   4. "WISDOM TIERS" — the /pricing breadcrumb promised tiers the page
 *      itself disclaims ("No Tiers, No Checkout"). REPLACED with each
 *      locale's own nav.pricing term (no invented translations); the
 *      breadcrumb now matches the nav. grep-zero here.
 *
 * Fail-first: the pre-fix tree fails every zero-grep below (the phrases
 * existed — founder's count 6/9/16/2 files; this session measured
 * 7/11/18/7 on the same scope). C5 embedded-violation strings prove the
 * detectors bite.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");

function messageFiles(): string[] {
  return readdirSync("messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => join("messages", f));
}

const PRODUCT_SCOPE = ["app", "components", "lib", "messages"] as const;

function grepProduct(needle: string): string[] {
  const hits: string[] = [];
  // git grep over the product scope (the founder's audit surface).
  for (const dir of PRODUCT_SCOPE) {
    let out = "";
    try {
      out = execFileSync("git", ["grep", "-il", needle, "--", dir], {
        encoding: "utf8",
      });
    } catch {
      continue; // git grep exits 1 on no match
    }
    for (const line of out.split("\n")) {
      if (line.trim()) hits.push(line.trim());
    }
  }
  return hits;
}

describe("DELIV-4 — the copy audit zero-greps", () => {
  it("the detectors bite (C5 — embedded pre-fix strings must match)", () => {
    const offenders = [
      "every visitor receives every verdict in the RSC payload",
      "Fetching live prices...",
      "WISDOM TIERS",
      "Elite Knowledge Graph",
      "Derived from live prices x reference market caps",
    ];
    for (const s of offenders) {
      expect(
        /every verdict|live prices|WISDOM TIERS|Elite Knowledge Graph/i.test(s),
      ).toBe(true);
    }
    // the survivors' wording must NOT match (the rewrites are clean)
    const survivors = [
      "every visitor receives it whole in the RSC payload",
      "Fetching prices…",
      "the full verdict set",
      "LIVE-where-labelled prices",
      "Derived from LIVE price inputs x reference market caps",
    ];
    for (const s of survivors) {
      expect(
        /every verdict|live prices|WISDOM TIERS|Elite Knowledge Graph/i.test(s),
      ).toBe(false);
    }
  });

  it("'every verdict' appears nowhere in the product scope", () => {
    expect(grepProduct("every verdict")).toEqual([]);
  });

  it("'live prices' appears nowhere in the product scope", () => {
    expect(grepProduct("live prices")).toEqual([]);
  });

  it("'WISDOM TIERS' appears nowhere in the product scope", () => {
    expect(grepProduct("WISDOM TIERS")).toEqual([]);
  });

  it("the dead 'Elite Knowledge Graph' claim is gone from every locale", () => {
    expect(grepProduct("Elite Knowledge Graph")).toEqual([]);
    for (const f of messageFiles()) {
      const d = JSON.parse(read(f)) as { kg?: Record<string, unknown> };
      if (d.kg) expect(d.kg).not.toHaveProperty("elite");
    }
  });
});

describe("DELIV-4 — positive controls (B-18): the audit cannot pass on a missing surface", () => {
  it("the reworded copy actually exists (the rewrite, not a deleted file)", () => {
    // 1 — the free-access payload wording survived, reworded
    expect(read("lib/consensus/sanitize.ts")).toContain(
      "every caller receives the full verdict set",
    );
    // 2 — the Lab holdings fetch is still there, reworded
    expect(read("components/lab/HoldingsTab.tsx")).toContain("Fetching prices…");
    // 4 — the /pricing breadcrumb now reads as the nav term
    const en = JSON.parse(read("messages/en.json")) as {
      pricing: { breadcrumb: string; free: Record<string, string> };
      nav: { pricing: string };
    };
    expect(en.pricing.breadcrumb).toBe(en.nav.pricing);
    // 3 — the pricing KG blurb is worded to what renders
    expect(en.pricing.free.knowledgeGraph).toBe(
      "Stock and macro knowledge graphs (bulls-vs-bears views)",
    );
  });

  it("the knowledge-graph labels are BACKED: both views are mounted and pinned", () => {
    // the stock page dynamically imports the server-computed graph view
    const stockClient = read("components/stock/StockPageClient.tsx");
    expect(stockClient).toContain("KnowledgeGraphView");
    expect(stockClient).toContain("eliteGraph");
    // the view itself renders the graph record or the honest unavailable state
    const kgView = read("components/stock/KnowledgeGraphView.tsx");
    expect(kgView).toContain("Bulls vs Bears");
    expect(kgView).toContain("kg.unavailable");
    // the forex modal renders the macro graph header
    expect(read("components/forex/ForexDetailClient.tsx")).toContain(
      't("kg.macroKnowledgeGraph")',
    );
    // the locale keys the mounted views read still exist
    const en = JSON.parse(read("messages/en.json")) as {
      kg: Record<string, string>;
      asset: Record<string, string>;
    };
    for (const key of ["knowledgeGraph", "macroKnowledgeGraph", "unavailable"]) {
      expect(typeof en.kg[key]).toBe("string");
    }
    expect(typeof en.asset.knowledgeGraph).toBe("string");
  });

  it("every locale parses and carries the corrected breadcrumb + blurb", () => {
    const files = messageFiles();
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const f of files) {
      const d = JSON.parse(read(f)) as {
        nav: { pricing: string };
        pricing: { breadcrumb: string; free: { knowledgeGraph: string } };
      };
      expect(d.pricing.breadcrumb).toBe(d.nav.pricing);
      expect(d.pricing.free.knowledgeGraph).not.toMatch(/council tension/i);
    }
  });
});
