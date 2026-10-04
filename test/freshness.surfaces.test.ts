/**
 * N3 (round 3) — freshness labels cover the WHOLE surface, derived from
 * the code.
 *
 * The round-2 test (test/freshness.placeholder.test.ts) hard-coded two
 * files while the defect lived on ten-plus surfaces — a hand-written
 * list cannot catch a new surface. This test DERIVES the surface list:
 * every file under app/ or components/ that imports the seed/scoring
 * modules (lib/scoring, data/stocks, or the slim index) is a surface
 * that renders seed-derived data, and must either render
 * <SeedDataBanner> itself or carry a documented exemption with a reason.
 *
 * app/api/** is excluded by rule, not by hand: API responses render no
 * UI (their seed-labeling contract is pinned by
 * test/chat.prompt.seed.test.ts instead).
 *
 * While SEED_STATUS === 'placeholder' this gate is active; when the
 * dataset becomes genuinely sourced the gate self-disables (the banner
 * renders nothing and the requirement disappears with it).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { SEED_STATUS } from "@/data/stocks/seedMeta";

const REPO = path.resolve(__dirname, "..");

/**
 * Surfaces that do not render <SeedDataBanner> THEMSELVES, with the
 * reason. Every entry must stay true or the test owner must fix the
 * surface — an exemption is a documented claim, not a mute button.
 */
const EXEMPTED_SURFACES: Record<string, string> = {
  "app/page.tsx":
    "server component; the three banners render in the dynamically loaded components/dashboard/DashboardTail.tsx",
  "components/dashboard/DashboardClient.tsx":
    "Z5 split: the ranked trio and their three banners moved to the dynamically loaded components/dashboard/DashboardTail.tsx; the client shell that remains renders no seed-derived numbers of its own (prices render through the honest unavailable/em-dash states)",
  "app/screener/page.tsx":
    "server component; the banner renders in its client child components/screener/ScreenerClient.tsx",
  "app/chat/page.tsx":
    "server component; the banner renders in its client child components/chat/ChatClient.tsx",
  "app/lab/page.tsx":
    "server component; the banner renders in its client child components/lab/LabContent.tsx (above all five tabs)",
  "app/stock/[symbol]/page.tsx":
    "server component; the banner renders in its client child components/stock/StockPageClient.tsx (covers hero, QVPS, metrics, verdicts, graph)",
  "components/screener/StockTable.tsx":
    "rendered inside ScreenerClient, which shows the banner directly above the table",
  "components/lab/OverviewTab.tsx":
    "rendered inside LabContent, which shows the banner above the tab content",
  "components/lab/HoldingsTab.tsx":
    "rendered inside LabContent, which shows the banner above the tab content",
  "components/lab/WatchlistTab.tsx":
    "rendered inside LabContent, which shows the banner above the tab content",
  "components/lab/CompareTab.tsx":
    "rendered inside LabContent, which shows the banner above the tab content",
  "components/lab/IntelligenceTab.tsx":
    "rendered inside LabContent, which shows the banner above the tab content",
  "components/stock/MetricsPanel.tsx":
    "rendered on /stock/[symbol] under the StockPageClient page-level banner; every value additionally renders through <DataValue> with per-field provenance",
  "components/score/RishiScoreDual.tsx":
    "renders the QVPS panel on /stock/[symbol] under the StockPageClient page-level banner",
  "components/stock/KnowledgeGraphView.tsx":
    "renders the graph modal on /stock/[symbol] under the StockPageClient page-level banner",
  "components/stock/BullBearBar.tsx":
    "renders on /stock/[symbol] under the StockPageClient page-level banner (imports only the TrimmedVerdict type)",
  "components/stock/ConsensusHero.tsx":
    "renders on /stock/[symbol] under the StockPageClient page-level banner (imports only the SanitizedConsensus type)",
  "components/shared/SeedDataBanner.tsx":
    "this IS the banner component (imports only the public seedMeta constants)",
  "app/sitemap.ts":
    "crawler infrastructure, not a user-facing data surface: emits URL locs (symbols only, no seed values) at build time; every /stock/<symbol> page it lists carries the banner via StockPageClient",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(path.join(REPO, dir))) {
    const abs = path.join(REPO, dir, entry);
    const rel = path.join(dir, entry).split(path.sep).join("/");
    if (statSync(abs).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(rel);
    }
  }
  return out;
}

/** Files importing the seed/scoring surface (value OR type imports). */
function discoverSeedSurfaces(): string[] {
  const files = [...walk("app"), ...walk("components")];
  const IMPORT_RE =
    /from\s+['"][^'"]*(?:lib\/scoring|lib\/scorers|data\/stocks|lib\/consensus)[^'"]*['"]/;
  return files.filter((f) => {
    if (f.startsWith("app/api/")) return false; // API responses render no UI
    const src = readFileSync(path.join(REPO, f), "utf8");
    return IMPORT_RE.test(src);
  });
}

describe("N3 — every seed-derived surface carries the illustrative-data label", () => {
  it("the discovery is not vacuous (finds the known surfaces)", () => {
    const surfaces = discoverSeedSurfaces();
    expect(surfaces.length).toBeGreaterThan(10);
    for (const expected of [
      "app/page.tsx",
      "app/stock/[symbol]/page.tsx",
      "components/dashboard/DashboardClient.tsx",
      "components/dashboard/DashboardTail.tsx", // Z5: the ranked trio + banners render here
      "components/screener/ScreenerClient.tsx",
      "components/chat/ChatClient.tsx",
      "components/lab/LabContent.tsx",
      "components/stock/StockPageClient.tsx",
    ]) {
      expect(surfaces, `discovery must find ${expected}`).toContain(expected);
    }
  });

  it.skipIf(SEED_STATUS !== "placeholder")(
    "every discovered surface renders <SeedDataBanner> or has a documented exemption",
    () => {
      const failures: string[] = [];
      for (const surface of discoverSeedSurfaces()) {
        const src = readFileSync(path.join(REPO, surface), "utf8");
        const hasBanner = /<SeedDataBanner/.test(src);
        const exemption = EXEMPTED_SURFACES[surface];
        if (!hasBanner && !exemption) {
          failures.push(
            `${surface} renders seed-derived data with no <SeedDataBanner> and no exemption — add the banner or document why the surface is exempt (N3)`,
          );
        }
        if (exemption && hasBanner) {
          failures.push(
            `${surface} renders its own banner — remove the now-false exemption entry`,
          );
        }
      }
      expect(failures.join("\n")).toBe("");
    },
  );

  it.skipIf(SEED_STATUS !== "placeholder")(
    "every exemption entry refers to a real discovered surface (no stale entries)",
    () => {
      const surfaces = new Set(discoverSeedSurfaces());
      const stale = Object.keys(EXEMPTED_SURFACES).filter((k) => !surfaces.has(k));
      expect(
        stale.map((k) => `${k} is exempted but no longer imports the seed surface — delete the entry`),
        "stale exemptions",
      ).toEqual([]);
    },
  );
});
