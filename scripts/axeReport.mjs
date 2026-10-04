/**
 * scripts/axeReport.mjs — compact axe violation report per route.
 * Usage: SMOKE_BASE_URL=http://localhost:3000 node scripts/axeReport.mjs
 * (start `npm run start` first, or use the Playwright webServer).
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const ROUTES = ["/", "/screener", "/stock/RELIANCE", "/methodology", "/lab", "/rishis"];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

for (const route of ROUTES) {
  // networkidle never settles on routes with long-polling price hooks —
  // wait for load, then a settle beat for hydration.
  await page.goto(BASE + route, { waitUntil: "load", timeout: 45_000 }).catch(() => {});
  await page.waitForTimeout(1_200);
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  console.log(`\n=== ${route}: ${res.violations.length} violation kinds ===`);
  for (const v of res.violations) {
    console.log(
      `  ${v.id} [${v.impact}] x${v.nodes.length} — ${v.help}` +
        `\n      first target: ${(v.nodes[0]?.target ?? []).join(" ")}`,
    );
  }
}
await browser.close();
