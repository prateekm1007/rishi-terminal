// A2 measurement: solve times of the SHIPPED worker (/pow.worker.js) in a
// real Chromium page under CPU throttling (CDP), difficulty from the
// challenge default. Prints median and p95 per throttling rate.
// Run: node scripts/measurePowBrowser.mjs  (expects next start on :3000)
import { chromium } from "playwright";
import { createHash } from "node:crypto";

const DIFFICULTY = 15;
const RUNS = 9;

async function measurePage(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  if (rate > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const token = createHash("sha256").update(`a2-browser-${rate}-${i}`).digest("hex");
    const ms = await page.evaluate(async ({ token, difficulty }) => {
      return await new Promise((resolve, reject) => {
        const worker = new Worker("/pow.worker.js");
        const startedAt = performance.now();
        const timer = setTimeout(() => { worker.terminate(); reject(new Error("timeout")); }, 60_000);
        worker.onmessage = (e) => {
          if (e.data?.type === "done") {
            clearTimeout(timer);
            worker.terminate();
            resolve(performance.now() - startedAt);
          }
        };
        worker.onerror = (e) => { clearTimeout(timer); reject(new Error("worker error: " + e.message)); };
        worker.postMessage({ type: "solve", token, difficulty });
      });
    }, { token, difficulty: DIFFICULTY });
    times.push(ms);
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return times;
}

const stats = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  return { median, p95 };
};

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

for (const rate of [1, 4, 6]) {
  const times = await measurePage(page, rate);
  const { median, p95 } = stats(times);
  console.log(`rate=${rate}x  runs=[${times.map(t => t.toFixed(1)).join(", ")}] ms  median=${median.toFixed(1)} ms  p95=${p95.toFixed(1)} ms  (difficulty ${DIFFICULTY})`);
}

await browser.close();
