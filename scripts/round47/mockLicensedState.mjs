#!/usr/bin/env node
/**
 * scripts/round47/mockLicensedState.mjs — round-47 P0-8 test helper.
 *
 * The 8 arithmetic-world test files exercise scorer arithmetic on
 * observed fixtures. Round-47 P0-8 (founder directive 2026-10-11)
 * holds price-based verdicts while the exchange-data license is
 * unresolved; the hold is a PUBLICATION policy, not arithmetic. These
 * files therefore pin the licensed state via a hoisted vi.mock, and the
 * hold itself is pinned by test/licenseGate.test.ts. Every seed-world
 * refusal-reason pin (sector text, placeholder text) keeps its exact
 * wording — those refusals precede the license gate inside each scorer.
 *
 * Idempotent; run from the repo root:
 *   node scripts/round47/mockLicensedState.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "test/scorerBoundaries.test.ts",
  "test/scorerHealth.test.ts",
  "test/scoring.finite.test.ts",
  "test/x6.nemishPlaceholders.test.ts",
  "test/x6.consensusGates.test.ts",
  "test/placeholderRanking.round5.test.ts",
  "test/p02.nullNeverZero.test.ts",
  "test/p03.sectorGate.test.ts",
];

const HEADER = (hasVi) => `// Round-47 P0-8: this file pins the LICENSED state \u2014 the scorer
// arithmetic beneath the price-license gate. The publication hold while
// the exchange-data license is unresolved is pinned by
// test/licenseGate.test.ts; the seed-world refusal-reason pins below
// are unaffected (the sector and placeholder guards precede the license
// gate inside every scorer).${hasVi ? "" : "\n// (vi added to the vitest import for the mock.)"}
`;

const MOCK = `vi.mock("@/lib/licensing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/licensing")>();
  // The arithmetic world: the exchange-data license is satisfied.
  return { ...actual, priceScoresPublic: () => true };
});
`;

let patched = 0;
for (const rel of FILES) {
  const path = join(process.cwd(), rel);
  let src = readFileSync(path, "utf8");
  if (src.includes('vi.mock("@/lib/licensing"')) {
    console.log(`SKIP  ${rel}`);
    continue;
  }
  // 1. ensure `vi` is imported from vitest
  const viRe = /import \{([^}]*)\} from (["'])vitest\2;/;
  const m = src.match(viRe);
  if (!m) {
    console.error(`FAIL  ${rel}: no vitest import`);
    process.exit(1);
  }
  const hasVi = /\bvi\b/.test(m[1]);
  if (!hasVi) {
    src = src.replace(viRe, (mm, members, q) => `import { vi,${members}} from ${q}vitest${q};`);
  }
  // 2. insert header comment + mock right after the LAST import statement
  const lines = src.split("\n");
  let lastImport = -1;
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("/*") || t.startsWith("*") || t.endsWith("*/")) inBlock = t.startsWith("/*") && !t.endsWith("*/");
    if (t.startsWith("import ") || (t.startsWith("} from ") && !inBlock)) lastImport = i;
    if (t.startsWith("import ") && t.endsWith(";")) inBlock = false;
  }
  if (lastImport === -1) {
    console.error(`FAIL  ${rel}: no import statements found`);
    process.exit(1);
  }
  const mockBlock = "\n" + HEADER(hasVi) + MOCK;
  lines.splice(lastImport + 1, 0, mockBlock);
  src = lines.join("\n");
  writeFileSync(path, src, "utf8");
  patched++;
  console.log(`PATCH ${rel}`);
}
console.log(`done: ${patched} patched, ${FILES.length - patched} skipped`);
