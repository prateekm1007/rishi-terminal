/**
 * G11 — DEAD-CODE IMPORTER INVENTORY (audit 2026-10-02, Coder Directions).
 * Rule 17 requires dead code removal; G11 requires the INVENTORY FIRST and
 * focused deletions afterwards. Resolves @/ alias AND relative specifiers
 * (so "./providers/gemini" correctly credits lib/ai/providers/gemini.ts),
 * counts repo-internal importers, checks component route reachability by
 * name, and flags fabrication-hinted zero-importer modules as DELETE
 * CANDIDATES. The inventory is committed; deletions happen in a separate
 * focused commit (Rule 26).
 * Usage: node scripts/deadCodeInventory.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, dirname, resolve, normalize } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["lib", "components", "hooks", "app", "test", "scripts"];
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".json"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.some(x => e.endsWith(x))) out.push(full);
  }
  return out;
}

const allFiles = SCAN_DIRS.flatMap(d => walk(join(ROOT, d)));
const moduleFiles = allFiles.filter(f => {
  const rel = relative(ROOT, f);
  return /^(lib|components|hooks)\//.test(rel) && !/\.test\.|\.d\.ts$/.test(rel) && !rel.endsWith(".json");
});
const fileSet = new Set(allFiles);

// resolve a module specifier to an absolute file path (with extension probing)
function resolveSpec(spec, importerAbs) {
  let base;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(importerAbs), spec);
  else return null; // bare package import — not first-party
  const candidates = [base, ...EXTS.map(x => base + x), ...EXTS.map(x => join(base, `index${x}`))];
  for (const c of candidates) if (fileSet.has(normalize(c))) return normalize(c);
  return null;
}

// extract every quoted import-ish specifier from a source file
const SPEC_RE = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g;
const importersOf = new Map(); // abs module path -> Set(abs importer)
for (const f of allFiles) {
  const src = srcCache(f);
  let m;
  while ((m = SPEC_RE.exec(src))) {
    const target = resolveSpec(m[1], f);
    if (target && target !== f) {
      if (!importersOf.has(target)) importersOf.set(target, new Set());
      importersOf.get(target).add(f);
    }
  }
}
function srcCache(f) {
  if (!srcCache.map) srcCache.map = new Map();
  if (!srcCache.map.has(f)) srcCache.map.set(f, readFileSync(f, "utf8"));
  return srcCache.map.get(f);
}

const inventory = [];
for (const f of moduleFiles) {
  const rel = relative(ROOT, f);
  const importerSet = importersOf.get(normalize(f)) ?? new Set();
  // route reachability for components: bare name referenced inside app/**
  let routeRefs = 0;
  if (rel.startsWith("components/")) {
    const bare = rel.split("/").pop().replace(/\.(ts|tsx)$/, "");
    for (const other of allFiles) {
      if (relative(ROOT, other).startsWith("app/") && srcCache(other).includes(bare)) routeRefs += 1;
    }
  }
  const src = srcCache(f);
  const fabricationHint =
    /fallback|staticResponses|synthetic|legacy|placeholder|hardcoded/i.test(rel) ||
    /RISHI_STATIC_RESPONSES|getStaticResponse/.test(src);
  inventory.push({
    file: rel,
    importers: importerSet.size,
    importerFiles: [...importerSet].slice(0, 4).map(x => relative(ROOT, x)),
    routeRefs,
    fabricationHint,
  });
}

const noImporters = inventory.filter(i => i.importers === 0 && i.routeRefs === 0);
const deleteCandidates = noImporters.filter(i => i.fabricationHint);

const report = {
  generatedAt: new Date().toISOString(),
  scannedModules: inventory.length,
  zeroImporterCount: noImporters.length,
  zeroImporterModules: noImporters.map(i => ({ file: i.file, fabricationHint: i.fabricationHint })),
  deleteCandidates,
};
writeFileSync("dead-code-inventory.json", JSON.stringify(report, null, 2));
console.log(`scanned ${inventory.length} first-party modules`);
console.log(`\nZERO-IMPORTER modules (${noImporters.length}):`);
for (const i of noImporters) {
  console.log(`  ${i.fabricationHint ? "⚠ DELETE CANDIDATE" : "              "}  ${i.file}`);
}
