/**
 * provenanceAudit.ts (P0-05) — classify every page's data provenance and
 * gate seed pages on the illustrative-data label.
 *
 * Walks every app/<segment>/page.tsx (and the root page) plus their transitive
 * imports, and classifies each page:
 *
 *   seed             renders seed-derived numbers (imports the seed /
 *                    scoring surface: data/stocks, lib/scoring,
 *                    lib/scorers, lib/consensus)
 *   sourced          renders live/sourced data (live-price hooks, price
 *                    history, live API routes) and no seed surface
 *   static-editorial renders curated editorial metadata only (personas,
 *                    glossary, guru metadata)
 *   none             renders no market data (auth, legal, shell pages)
 *
 * Writes docs/PROVENANCE.md. With --fail-on-unlabelled-seed the exit
 * code is 1 when a seed-classified page does not render <SeedDataBanner>
 * anywhere in its import tree.
 *
 * FD-3 scope (crypto/forex/commodities/bonds/F&O "hidden from nav, not
 * available yet") is a FOUNDER decision and is NOT implemented here —
 * the audit reports those routes' classification instead, so the
 * decision can be made with the facts in hand. BLOCKED: FD-3.
 *
 * Usage:
 *   npx tsx scripts/provenanceAudit.ts
 *   npx tsx scripts/provenanceAudit.ts --fail-on-unlabelled-seed
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
const APP_DIR = path.join(REPO, "app");
const DOC_PATH = path.join(REPO, "docs", "PROVENANCE.md");

const SEED_IMPORT_RE =
  /from\s+['"][^'"]*(?:lib\/scoring|lib\/scorers|data\/stocks|lib\/consensus)[^'"]*['"]/;
const SOURCED_IMPORT_RE =
  /from\s+['"][^'"]*(?:hooks\/useLivePrices|hooks\/usePriceHistory|hooks\/useFundamentals|lib\/livePrice|lib\/pricePresentation)[^'"]*['"]|fetch\(\s*['"`][^'"`]*\/api\/(prices|news|history|technical|pulse)/;
const EDITORIAL_IMPORT_RE =
  /from\s+['"][^'"]*(?:lib\/chat\/personas|data\/glossary|lib\/gurus)[^'"]*['"]/;

const FD3_PREFIXES = ["/crypto", "/forex", "/commodities", "/bonds", "/fno"];

type Classification = "seed" | "sourced" | "static-editorial" | "none";

interface PageAudit {
  route: string;
  file: string;
  classification: Classification;
  evidence: string[];
  labelled: boolean;
  bannerFiles: string[];
  inFd3Scope: boolean;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    if (statSync(abs).isDirectory()) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      walk(abs, out);
    } else if (entry === "page.tsx" || entry === "page.ts") {
      out.push(abs);
    }
  }
  return out;
}

function resolveSpec(fromAbs: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(REPO, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../"))
    base = path.resolve(path.dirname(fromAbs), spec);
  else return null;
  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function importsOf(abs: string): string[] {
  const src = readFileSync(abs, "utf8");
  const specs: string[] = [];
  // Static imports AND dynamic import() edges — a next/dynamic component is
  // part of the render tree (Z5: the dashboard tail and the stock page's
  // deferred panels load this way), so the closure follows both or the
  // banner audit false-negatives on real surfaces.
  const re = /(?:from\s+|import\(\s*)['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) specs.push(m[1]);
  return specs;
}

/** Transitive import closure within the repo (self included). */
function importTree(entry: string): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const spec of importsOf(file)) {
      const resolved = resolveSpec(file, spec);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return [...seen];
}

function routeOf(pageFile: string): string {
  const rel = path.relative(APP_DIR, pageFile);
  const withoutPage = rel.replace(/(^|\/)page\.tsx?$/, "");
  if (withoutPage === "") return "/";
  const cleaned = withoutPage.replace(/\((.*?)\)\//g, ""); // route groups
  const dynamic = cleaned.replace(/\[\w+\]/g, "*");
  return "/" + dynamic.split(path.sep).join("/");
}

export function audit(): PageAudit[] {
  const pages = walk(APP_DIR).sort();
  return pages.map((pageFile) => {
    const tree = importTree(pageFile);
    const evidence: string[] = [];
    let seed = false;
    let sourced = false;
    let editorial = false;

    for (const file of tree) {
      const rel = path.relative(REPO, file).split(path.sep).join("/");
      const src = readFileSync(file, "utf8");
      if (SEED_IMPORT_RE.test(src)) {
        seed = true;
        evidence.push(`seed surface: ${rel}`);
      } else if (SOURCED_IMPORT_RE.test(src)) {
        sourced = true;
        evidence.push(`sourced surface: ${rel}`);
      } else if (EDITORIAL_IMPORT_RE.test(src)) {
        editorial = true;
        evidence.push(`editorial surface: ${rel}`);
      }
    }

    // Strip comments before matching: the seed dataset's header COMMENT
    // mentions "<SeedDataBanner" (the UI contract), which is not a render.
    const stripComments = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
    const bannerFiles = tree
      .filter((f) => /<SeedDataBanner/.test(stripComments(readFileSync(f, "utf8"))))
      .map((f) => path.relative(REPO, f).split(path.sep).join("/"));

    const route = routeOf(pageFile);
    const classification: Classification = seed
      ? "seed"
      : sourced
        ? "sourced"
        : editorial
          ? "static-editorial"
          : "none";

    return {
      route,
      file: path.relative(REPO, pageFile).split(path.sep).join("/"),
      classification,
      evidence: [...new Set(evidence)].slice(0, 6),
      labelled: bannerFiles.length > 0,
      bannerFiles,
      inFd3Scope: FD3_PREFIXES.some((p) => route === p || route.startsWith(p + "/")),
    };
  });
}

export function writeDoc(audits: PageAudit[]): void {
  const order: Classification[] = ["seed", "sourced", "static-editorial", "none"];
  const rows = audits
    .sort((a, b) => order.indexOf(a.classification) - order.indexOf(b.classification) || a.route.localeCompare(b.route))
    .map((a) => {
      const label = a.classification === "seed" ? (a.labelled ? "SeedDataBanner present" : "**UNLABELLED**") : "—";
      const fd3 = a.inFd3Scope ? "FD-3 scope" : "";
      return `| ${a.route} | ${a.classification} | ${label} | ${fd3} |`;
    })
    .join("\n");

  const counts = order.map((c) => `${c}: ${audits.filter((a) => a.classification === c).length}`).join(" · ");

  const doc = `# PROVENANCE — per-page data classification (P0-05)

Generated by \`npx tsx scripts/provenanceAudit.ts\` — do not hand-edit; the
table is derived from each page's transitive imports, never hand-picked
(round-3 N3 lesson).

**Classifications:** \`seed\` renders seed-derived numbers (illustrative
placeholder dataset, labelled with <SeedDataBanner>); \`sourced\` renders
live/sourced data (live-price hooks, live API routes); \`static-editorial\`
renders curated editorial metadata; \`none\` renders no market data.

**Open founder decision (FD-3):** routes marked "FD-3 scope" (crypto,
forex, commodities, bonds, F&O) are pending the founder's in/out
decision on "India equities only until G-C". Hiding them from nav and
returning a "not available yet" state is BLOCKED: FD-3 — not the
coder's call (Constitution art. 31).

Snapshot: ${new Date().toISOString().slice(0, 10)} · ${counts}

| Route | Classification | Seed label | Notes |
|---|---|---|---|
${rows}
`;

  // The hand-maintained appendix (toFixed inventory) survives
  // regeneration: writeDoc only rewrites the derived table above it.
  const appendixPath = path.join(REPO, "docs", "PROVENANCE.appendix.md");
  const appendix = existsSync(appendixPath) ? readFileSync(appendixPath, "utf8") : "";
  writeFileSync(DOC_PATH, doc + (appendix ? "\n" + appendix : ""));
}

export function main(): void {
  const failOnUnlabelled = process.argv.includes("--fail-on-unlabelled-seed");
  const audits = audit();
  writeDoc(audits);

  const counts = {
    seed: audits.filter((a) => a.classification === "seed").length,
    sourced: audits.filter((a) => a.classification === "sourced").length,
    editorial: audits.filter((a) => a.classification === "static-editorial").length,
    none: audits.filter((a) => a.classification === "none").length,
  };
  console.log(`provenanceAudit (P0-05): ${audits.length} pages`);
  console.log(
    `  seed: ${counts.seed} · sourced: ${counts.sourced} · static-editorial: ${counts.editorial} · none: ${counts.none}`,
  );
  console.log(`  docs/PROVENANCE.md written`);

  const unlabelled = audits.filter((a) => a.classification === "seed" && !a.labelled);
  if (unlabelled.length > 0) {
    console.error(`\nUNLABELLED seed pages (${unlabelled.length}):`);
    for (const u of unlabelled) console.error(`  ${u.route} (${u.file}) — no <SeedDataBanner> in its import tree`);
  }

  if (failOnUnlabelled && unlabelled.length > 0) {
    console.error("\n--fail-on-unlabelled-seed: FAILED (see above)");
    process.exit(1);
  }
  if (failOnUnlabelled) console.log("\n--fail-on-unlabelled-seed: OK (every seed page is labelled)");
}

// Run only when executed directly (tests import the functions above).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
