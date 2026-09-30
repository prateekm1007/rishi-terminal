/**
 * ESLint ratchet (remediation T18).
 *
 * Fails when the total problem count (errors + warnings) rises above the
 * committed baseline in eslint-ratchet.json. When the count FALLS, the new
 * count is written back so improvements are locked in permanently.
 *
 * Run: node scripts/eslintRatchet.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = resolve(root, "eslint-ratchet.json");

let raw = "";
try {
  raw = execFileSync("npx", ["eslint", ".", "--format", "stylish"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (e) {
  // eslint exits non-zero when problems exist — the compact output is still on stdout
  raw = e.stdout ?? "";
  if (!raw) {
    console.error("eslint failed to run:", e.stderr?.toString().slice(0, 400));
    process.exit(2);
  }
}

const counts = { errors: 0, warnings: 0 };
for (const line of raw.split("\n")) {
  // stylish summary: "\u2716 N problems (E errors, W warnings)"
  const m = line.match(/problems?\s*\((\d+)\s+errors?,\s*(\d+)\s+warnings?\)/i);
  if (m) {
    counts.errors += parseInt(m[1], 10) || 0;
    counts.warnings += parseInt(m[2], 10) || 0;
  }
}
const total = counts.errors + counts.warnings;

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
} catch {
  baseline = { total: Infinity };
}

console.log(`ESLint ratchet: ${counts.errors} errors, ${counts.warnings} warnings (total ${total})`);
console.log(`Baseline: ${baseline.total}`);

if (total > baseline.total) {
  console.error(`\nRATCHET FAILED: problem count rose above the committed baseline.`);
  console.error(`Fix the new issues (or genuinely reduce existing ones) before merging.`);
  process.exit(1);
}

if (total < baseline.total) {
  writeFileSync(baselinePath, JSON.stringify({ total, errors: counts.errors, warnings: counts.warnings }, null, 2) + "\n");
  console.log(`Ratchet improved: baseline lowered to ${total} (committed).`);
} else {
  console.log(`Ratchet holds. Reduce the count to lower the bar.`);
}
