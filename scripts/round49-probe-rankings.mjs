// Round-49 DELIV-1/FD-22 probe: the ranked-widgets state in a REAL browser
// (DashboardTail is ssr:false — curl is blind to it; this is the honest probe).
// Usage: node scripts/round49-probe-rankings.mjs <baseURL> <outFile>
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const [base = 'http://localhost:3000', out = '/tmp/rankings-probe.json'] = process.argv.slice(2);
const { existsSync } = await import('node:fs');
const candidates = [
  '/home/z/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/z/.cache/ms-playwright/chromium-1248/chrome-linux/chrome',
];
const exe = candidates.find(c => existsSync(c));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000); // hydration + client render

const state = await page.evaluate(() => {
  const text = document.body.innerText;
  const has = (s) => text.includes(s);
  // The ranked trio markers (client-rendered):
  const stockOfTheDaySection = has('Stock of the Day') && !!document.querySelector('a[href^="/stock/"]');
  const topRankedSection = has('Top Ranked');
  const shortRadarSection = has('Deterioration Radar');
  const disabledPanel = has('switched off');
  // consensus badges / seed ranking markers inside ranked cards:
  const consensusBadge = /\d{1,3}%/.exec(text)?.[0] ?? null;
  const seedBannerRanked = has('ranked by Rishi consensus');
  const sodDeterministic = has('deterministic daily pick');
  return { stockOfTheDaySection, topRankedSection, shortRadarSection, disabledPanel, consensusBadge, seedBannerRanked, sodDeterministic };
});
// capture the note text verbatim if the panel renders
state.noteText = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div,section,p')].find(e => e.textContent?.includes('switched off') && e.children.length <= 3);
  return el ? el.textContent.slice(0, 300) : null;
});
state.url = base;
state.at = new Date().toISOString();
writeFileSync(out, JSON.stringify(state, null, 2));
console.log(JSON.stringify(state, null, 2));
await browser.close();
