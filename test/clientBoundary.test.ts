/**
 * N1 (round 3) — client bundle boundary.
 *
 * The seed dataset (data/stocks/index.ts) and the scoring engine
 * (lib/consensus/**, lib/scorers/**, lib/scoring/**) are server-only:
 * any browser that receives them can recompute every paid per-Rishi
 * verdict (docs/PAID_CONTENT.md — verdicts 6..20 are paid).
 *
 * This test walks the RUNTIME import graph starting from EVERY 'use
 * client' file (the modules Next.js would bundle for the browser) and
 * fails if a banned module is reachable. `import type` is erased at
 * compile time and therefore allowed. The surface is derived from the
 * code — every file with the directive, not a hand-picked list.
 *
 * Complementary layers: `import 'server-only'` in the banned modules
 * makes the real build fail (test that separately below), and the ESLint
 * rule no-server-only-imports-in-client flags it at lint time.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");

/** Directories scanned for client entry files. */
const CLIENT_DIRS = ["app", "components", "hooks"];

/**
 * Modules that must never be reachable from client code.
 * - everything under lib/consensus, lib/scorers, lib/scoring
 *   EXCEPT the pure-type modules (lib/<tree>/types.ts) — type-only imports
 *   are erased and carry zero runtime bytes;
 * - the numeric seed dataset (data/stocks/index.ts). seedMeta.ts and
 *   master-list.ts are public on purpose (banner constants / symbol list).
 */
function isBanned(resolvedAbs: string): boolean {
  const rel = path.relative(REPO, resolvedAbs).split(path.sep).join("/");
  if (rel.startsWith("lib/consensus/") || rel.startsWith("lib/scorers/") || rel.startsWith("lib/scoring/")) {
    return rel !== "lib/consensus/types.ts" && rel !== "lib/scorers/types.ts";
  }
  return rel === "data/stocks/index.ts" || rel === "data/stocks/index.tsx";
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(path.join(REPO, dir))) {
    const abs = path.join(REPO, dir, entry);
    const rel = path.join(dir, entry);
    if (statSync(abs).isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
      walk(rel, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(abs);
    }
  }
  return out;
}

function isClientFile(abs: string): boolean {
  const src = readFileSync(abs, "utf8");
  return /^\s*['"]use client['"]/m.test(src.split("\n").slice(0, 5).join("\n"));
}

/** Runtime (value) imports of a module — `import type` is excluded. */
function runtimeImports(abs: string): string[] {
  const src = readFileSync(abs, "utf8");
  const specs: string[] = [];
  // strip comments so commented-out imports are not parsed
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
  const patterns = [
    /(?:^|\n)\s*import\s+(?!type\b)[^;'"]*?from\s*['"]([^'"]+)['"]/g,
    /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g, // side-effect imports (e.g. 'server-only')
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, // dynamic imports
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) specs.push(m[1]);
  }
  return specs;
}

function resolveSpec(fromAbs: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(REPO, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromAbs), spec);
  else return null; // external package (or 'server-only' — handled separately)
  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function findClientFiles(): string[] {
  const all: string[] = [];
  for (const dir of CLIENT_DIRS) all.push(...walk(dir));
  return all.filter(isClientFile);
}

describe("N1 — client bundle boundary (server-only modules never reachable from 'use client')", () => {
  it("the scan finds client entry files (the gate is not vacuous)", () => {
    const files = findClientFiles();
    expect(files.length).toBeGreaterThan(15);
    // Known client surfaces must be in the list.
    const rels = files.map((f) => path.relative(REPO, f));
    for (const expected of [
      "components/dashboard/DashboardClient.tsx",
      "components/screener/ScreenerClient.tsx",
      "components/screener/StockTable.tsx",
      "components/stock/StockPageClient.tsx",
    ]) {
      expect(rels, `expected client file ${expected}`).toContain(expected);
    }
  });

  it("no banned module is reachable from any 'use client' file (transitive, runtime imports only)", () => {
    const clientFiles = findClientFiles();
    const failures: string[] = [];

    for (const entry of clientFiles) {
      // BFS over runtime imports; remember the import chain for the message.
      const queue: Array<{ file: string; chain: string[] }> = [{ file: entry, chain: [entry] }];
      const seen = new Set<string>([entry]);
      while (queue.length > 0) {
        const { file, chain } = queue.shift()!;
        for (const spec of runtimeImports(file)) {
          if (spec === "server-only") {
            failures.push(
              `${path.relative(REPO, entry)} -> ${chain.map((c) => path.relative(REPO, c)).join(" -> ")} imports 'server-only' directly`,
            );
            continue;
          }
          const resolved = resolveSpec(file, spec);
          if (!resolved || seen.has(resolved)) continue;
          seen.add(resolved);
          const nextChain = [...chain, resolved];
          if (isBanned(resolved)) {
            failures.push(
              `${path.relative(REPO, entry)} imports banned module ${path.relative(REPO, resolved)} (chain: ${nextChain.map((c) => path.relative(REPO, c)).join(" -> ")})`,
            );
            continue; // don't walk into the banned module
          }
          queue.push({ file: resolved, chain: nextChain });
        }
      }
    }

    expect(
      failures,
      `client-reachable banned modules (N1 violation):\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  it("type-only imports remain legal (the boundary is about runtime bytes)", () => {
    // A representative client file uses `import type` from a banned tree's
    // types module — the walker must not flag it.
    const src = readFileSync(path.join(REPO, "components/stock/StockPageClient.tsx"), "utf8");
    expect(src).toMatch(/import type \{ SanitizedConsensus \}/);
    expect(src).not.toMatch(/^\s*import\s+\{[^}]*SanitizedConsensus[^}]*\}\s*from/m);
  });
});
