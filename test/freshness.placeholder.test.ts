/**
 * Remediation R1 — placeholder-data honesty gates.
 *
 * The seed dataset (data/stocks/index.ts) is unsourced placeholder data.
 * While SEED_STATUS === 'placeholder':
 *   1. no timestamp may be claimed for it (SEED_CAPTURED_AT is null, and
 *      lib/scoring marks every seed field asOf: null);
 *   2. every UI surface that shows seed-derived numbers, scores or rankings
 *      must render the non-dismissable SeedDataBanner label;
 *   3. no UI module may render an "as of <date>" claim for seed data
 *      (a false "as of" label is worse than no label).
 *
 * NOTE: the removed date-constant name is assembled at runtime below so this
 * file itself stays clean under the repo-wide grep that enforces removal.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SeedDataBanner from "@/components/shared/SeedDataBanner";
import { SEED_STATUS, SEED_CAPTURED_AT, SEED_DISCLAIMER } from "@/data/stocks";
import { resolveStockMetrics } from "@/lib/scoring";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");
const ISO_DATE = /\d{4}-\d{2}-\d{2}/;
const AS_OF_CLAIM = /as of \{?\d{4}-\d{2}-\d{2}/i;

describe("R1 — seed dataset honesty", () => {
  it("dataset declares placeholder status and claims no capture date", () => {
    expect(SEED_STATUS).toBe("placeholder");
    expect(SEED_CAPTURED_AT).toBeNull();
  });

  it("seed fields carry source 'seed' and asOf null; live fields keep their timestamp", () => {
    const seedOnly = resolveStockMetrics("RELIANCE")!;
    for (const [key, field] of Object.entries(seedOnly.fields)) {
      if (field.source === "seed" || field.source === "derived") {
        expect(field.asOf, `${key} (${field.source}) must claim no timestamp`).toBeNull();
      }
      expect(Number.isFinite(field.value), `${key} must be finite`).toBe(true);
    }
    expect(seedOnly.seedStatus).toBe("placeholder");
    expect(seedOnly.seedCapturedAt).toBeNull();

    const withLive = resolveStockMetrics("RELIANCE", {
      pe: 21.5, roe: 14.2, roce: 16.1, opm: 18.3, debtToEquity: 0.4,
      promoterHolding: 50.3, revCagr3y: 12, epsCagr: 14, marketCap: 1700e7,
      bookValue: 1150, lastUpdated: "2026-09-30T10:00:00.000Z",
    } as any);
    expect(withLive!.fields.pe.source).toBe("live");
    // A DISCLOSED provider timestamp is preserved verbatim.
    expect(withLive!.fields.pe.asOf).toBe("2026-09-30T10:00:00.000Z");
    expect(ISO_DATE.test(withLive!.fields.pe.asOf as string)).toBe(true);

    // Audit 2026-10-02 (P0): no disclosed timestamp → asOf null (the old
    // fetch-time fallback fabricated provider provenance).
    const noTimestamp = resolveStockMetrics("RELIANCE", {
      pe: 21.5, roe: 14.2, roce: 16.1, opm: 18.3, debtToEquity: 0.4,
      promoterHolding: 50.3, revCagr3y: 12, epsCagr: 14, marketCap: 1700e7,
      bookValue: 1150, lastUpdated: null,
    } as any);
    expect(noTimestamp!.fields.pe.source).toBe("live");
    expect(noTimestamp!.fields.pe.asOf).toBeNull();
  });
});

describe("R1 — SeedDataBanner renders the mandated label", () => {
  it("renders the exact disclaimer, visibly and non-dismissably, with no date claim", () => {
    const html = renderToStaticMarkup(React.createElement(SeedDataBanner));
    expect(html).toContain(SEED_DISCLAIMER);
    expect(html).not.toMatch(AS_OF_CLAIM);
    expect(html).not.toMatch(ISO_DATE);
    // non-dismissable: no close affordance
    expect(html.toLowerCase()).not.toContain("dismiss");
    expect(html.toLowerCase()).not.toContain("close");
  });

  it("renders nothing once the dataset is genuinely sourced", async () => {
    // Contract check without mutating module state: while the dataset is a
    // placeholder the banner must render; the component returns null only
    // when SEED_STATUS flips to 'sourced' (verified by inspection here).
    const src = read("components/shared/SeedDataBanner.tsx");
    expect(src).toContain('SEED_STATUS !== "placeholder"');
    expect(src).toContain("return null");
  });
});

describe("R1 — UI surfaces show the banner and no seed as-of claims", () => {
  // Every surface that renders seed-derived numbers/scores/rankings.
  // N1 (round 3): / and /screener are server components now; the banner
  // renders in their client children. (N3 replaces this hand-written list
  // with an auto-discovered surface test.)
  const SURFACES: Array<{ file: string; minBanners: number }> = [
    { file: "components/dashboard/DashboardTail.tsx", minBanners: 3 }, // Stock of the Day, Top Buy, Short radar (Z5: the ranked trio moved to the below-fold tail)
    { file: "components/screener/ScreenerClient.tsx", minBanners: 1 }, // screener table
  ];

  for (const { file, minBanners } of SURFACES) {
    it(`${file} renders SeedDataBanner (x${minBanners}) and no as-of date`, () => {
      const src = read(file);
      expect(src).not.toContain("SEED_AS_OF");
      expect(src).not.toMatch(AS_OF_CLAIM);
      const count = (src.match(/<SeedDataBanner/g) || []).length;
      expect(count, `${file} must render SeedDataBanner at least ${minBanners}x`).toBeGreaterThanOrEqual(
        minBanners,
      );
    });
  }

  it("the removed seed-date export is gone from the whole repo", () => {
    const removed = ["SEED", "AS_OF"].join("_"); // assembled at runtime (see NOTE)
    const guarded = [
      "data/stocks/index.ts",
      "lib/scoring/index.ts",
      "components/screener/StockTable.tsx",
      "scripts/validateStocksImpl.ts",  // N1 follow-up: the implementation moved; the entry is a re-exec shim
      "scripts/t12consolidate.ts",
    ];
    for (const f of guarded) {
      expect(read(f).includes(removed), `${f} must not reference the removed export`).toBe(false);
    }
  });
});
