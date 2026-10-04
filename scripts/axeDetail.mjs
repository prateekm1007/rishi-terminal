/**
 * scripts/axeDetail.mjs — dump failing-node HTML + computed colors per route.
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const ROUTES = process.argv[2] ? [process.argv[2]] : ["/"];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  console.log(`\n########## ${route} ##########`);
  for (const v of res.violations) {
    console.log(`\n== ${v.id} [${v.impact}] x${v.nodes.length} — ${v.help}`);
    for (const n of v.nodes.slice(0, 8)) {
      const html = (n.html || "").replace(/\s+/g, " ").slice(0, 220);
      const fg = n.any.find(a => a.id === "color-contrast")?.data?.fgColor;
      const bg = n.any.find(a => a.id === "color-contrast")?.data?.bgColor;
      const ratio = n.any.find(a => a.id === "color-contrast")?.data?.contrastRatio;
      const size = n.any.find(a => a.id === "color-contrast")?.data?.fontSize;
      const weight = n.any.find(a => a.id === "color-contrast")?.data?.fontWeight;
      console.log(`  target: ${n.target.join(" ")}`);
      console.log(`  html:   ${html}`);
      if (fg) console.log(`  color:  fg=${fg} bg=${bg} ratio=${ratio} fontSize=${size} fontWeight=${weight}`);
    }
  }
}
await browser.close();
