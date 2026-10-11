#!/usr/bin/env node
/**
 * scripts/round47/wireLicenseGate.mjs — round-47 P0-8 wiring helper.
 *
 * Inserts the P0-8 price-license guard into all 20 scorers, AFTER the
 * P0-2 placeholder guard (the license is the LAST refusal before the
 * arithmetic), and adds `licenseRefusal` to each file's verdictGuards
 * import. Nemish computes its own unknown set, so it gets the gated
 * variant (consult only when the record would otherwise score).
 *
 * Idempotent: a file already carrying `licenseRefusal(` is skipped.
 * Run from the repo root: node scripts/round47/wireLicenseGate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIR = join(ROOT, "lib", "scorers");

const SCORERS = [
  ["graham.ts", "Graham"],
  ["buffett.ts", "Buffett"],
  ["damani.ts", "Damani"],
  ["howardmarks.ts", "Howard Marks"],
  ["jhunjhunwala.ts", "Jhunjhunwala"],
  ["basant.ts", "Basant"],
  ["kacholia.ts", "Kacholia"],
  ["kedia.ts", "Kedia"],
  ["lynch.ts", "Lynch"],
  ["munger.ts", "Munger"],
  ["nemish.ts", "Nemish"],
  ["pabrai.ts", "Pabrai"],
  ["philipfisher.ts", "Philip Fisher"],
  ["porinju.ts", "Porinju"],
  ["raamdeo.ts", "Raamdeo"],
  ["schloss.ts", "Walter Schloss"],
  ["sethklarman.ts", "Seth Klarman"],
  ["soros.ts", "Soros"],
  ["templeton.ts", "John Templeton"],
  ["greenblatt.ts", "Greenblatt"],
];

const GUARD_COMMENT = `  // P0-8 (founder directive 2026-10-11): the price-license gate \u2014 the
  // LAST refusal before the arithmetic. While the exchange-data license
  // is pending, a price-based framework does not publish verdicts.
`;

let wired = 0;
for (const [file, name] of SCORERS) {
  const path = join(DIR, file);
  let src = readFileSync(path, "utf8");
  if (src.includes("licenseRefusal(")) {
    console.log(`SKIP  ${file} (already wired)`);
    continue;
  }
  // 1. extend the verdictGuards import with licenseRefusal
  const importRe = /(import\s*\{)([^}]*)(\}\s*from\s*['"]\.\/verdictGuards['"];)/;
  if (!importRe.test(src)) {
    console.error(`FAIL  ${file}: no ./verdictGuards import found`);
    process.exit(1);
  }
  src = src.replace(importRe, (_m, a, members, c) => {
    if (members.includes("licenseRefusal")) return _m;
    return `${a} licenseRefusal,${members}${c}`;
  });

  if (file === "nemish.ts") {
    // 2a. Nemish: consult only when the record would otherwise score
    // (its unknown set is computed inline; the placeholder refusal keeps
    // precedence).
    const anchor = /const insufficient =\n    epsUnknown \|\| deUnknown \|\| promoUnknown \|\| peUnknown;\n/;
    if (!anchor.test(src)) {
      console.error(`FAIL  ${file}: nemish insufficient anchor not found`);
      process.exit(1);
    }
    const block = `${GUARD_COMMENT}  if (!insufficient) {\n    const p08Refusal = licenseRefusal("${name}");\n    if (p08Refusal) return p08Refusal;\n  }\n`;
    src = src.replace(anchor, (m) => m + block);
  } else {
    // 2b. uniform files: insert after the P0-2 placeholder return.
    const p02Re = /(const p02Missing = unknownAmong\([^;]+;\n  if \(p02Missing\.length\) return noVerdictScore\([^;]+;\n)/;
    if (!p02Re.test(src)) {
      console.error(`FAIL  ${file}: P0-2 guard block not found`);
      process.exit(1);
    }
    const block = `${GUARD_COMMENT}  const p08Refusal = licenseRefusal("${name}");\n  if (p08Refusal) return p08Refusal;\n`;
    src = src.replace(p02Re, (m) => m + block);
  }

  writeFileSync(path, src, "utf8");
  wired++;
  console.log(`WIRED ${file} -> ${name}`);
}
console.log(`done: ${wired} wired, ${SCORERS.length - wired} skipped`);
