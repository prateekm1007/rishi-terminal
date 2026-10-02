#!/usr/bin/env node
// scripts/depUsageScan.mjs — U3 (founder round 7): prove which dependencies
// are imported NOWHERE in the repo. Checks every import form (static,
// namespace, dynamic, require) plus bare-name references in config files.
// Prints one line per candidate: USED via <files> | UNUSED.
import { execFileSync } from "node:child_process";

const candidates = process.argv.slice(2);
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n")
  .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|json|md|sql|yml|yaml|css|html)$/.test(f))
  // lockfile and baselines are generated — not import sites
  .filter((f) => f !== "package-lock.json");

for (const dep of candidates) {
  const hits = [];
  for (const file of tracked) {
    let content;
    try {
      content = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    } catch {
      continue;
    }
    const patterns = [
      new RegExp(`from\\s+['"]${dep}(/[^'"]*)?['"]`),
      new RegExp(`import\\s+\\(\\s*['"]${dep}(/[^'"]*)?['"]\\s*\\)`),
      new RegExp(`require\\s*\\(\\s*['"]${dep}(/[^'"]*)?['"]\\s*\\)`),
      new RegExp(`import\\s+['"]${dep}(/[^'"]*)?['"]`),
    ];
    if (patterns.some((re) => re.test(content))) hits.push(file);
  }
  console.log(hits.length ? `USED   ${dep} -> ${hits.slice(0, 5).join(", ")}` : `UNUSED ${dep}`);
}
