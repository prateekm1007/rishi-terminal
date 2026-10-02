#!/usr/bin/env node
/**
 * Commit O (Coder Directions #18, #19) — ROUTE / INTERNAL-LINK INTEGRITY GATE.
 *
 * Provenance: /fno/page.tsx linked to /fno/builder, a route that does not
 * exist — a real production 404 (proved 2026-10-02, local build AND live
 * https://rishi-terminal.vercel.app/fno/builder -> 404) that no prior gate
 * could see. This gate makes the class of defect un-reintroducible:
 *
 *   1. Enumerate the routes the filesystem ACTUALLY defines (App Router
 *      conventions per node_modules/next/dist/docs — page.tsx / route.ts;
 *      (groups) excluded from URLs; [param] = dynamic segment; _-prefixed
 *      folders private; @slots are not URL segments).
 *   2. Extract every INTERNAL link from the source (href="/..." and
 *      href: "/..." literals in app/ + components/ + lib/).
 *   3. Every internal link must resolve to a real route (dynamic segments
 *      match any single non-empty segment) or an explicit allow-list entry
 *      (framework-generated URLs we do not manufacture).
 *
 * Exit 0 = every internal link resolves · 1 = broken link(s) listed.
 * Wired as `npm run routeAudit` (CI-blocking).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");

// ── 1. enumerate filesystem routes ────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const appDir = join(ROOT, "app");
const routeFiles = existsSync(appDir) ? walk(appDir).filter((f) => {
  const base = f.replace(/\\/g, "/").split("/").pop();
  return base === "page.tsx" || base === "page.jsx" || base === "page.ts" || base === "page.js" || base === "route.ts" || base === "route.js";
}) : [];

function routePathFromFile(file) {
  let rel = relative(appDir, file).split(sep).join("/");
  // Root-level page.tsx / route.ts → "/" (the suffix regex below needs a
  // leading segment to strip).
  if (!rel.includes("/")) return "/";
  rel = rel.replace(/\/(page|route)\.(tsx|jsx|ts|js)$/, "");
  const segments = rel.split("/").filter(Boolean).filter((s) => !s.startsWith("_") && !s.startsWith("@"));
  const url = segments
    .map((s) => {
      if (/^\[\[?\.\.\.[^\]]+\]?\]$/.test(s)) return "**"; // catch-all
      if (/^\[[^\]]+\]$/.test(s)) return "*"; // dynamic
      if (/^\(\w+\)$/.test(s)) return ""; // route group — excluded from URL
      return s;
    })
    .filter(Boolean)
    .join("/");
  return "/" + url;
}

const routes = new Set(routeFiles.map(routePathFromFile));
// Next.js serves redirects/404 and files in public/ as top-level paths.
const publicDir = join(ROOT, "public");
const publicAssets = new Set(existsSync(publicDir) ? walk(publicDir).map((f) => "/" + relative(publicDir, f).split(sep).join("/")) : []);

function linkResolves(href) {
  if (routes.has(href)) return true;
  if (publicAssets.has(href) || [...publicAssets].some((a) => href.startsWith(a + "/"))) return true;
  // Dynamic matching: segment by segment — a literal segment must match
  // exactly; '*' matches any single segment; '**' matches the rest.
  const parts = href.split("?")[0].split("#")[0].split("/").filter(Boolean);
  for (const route of routes) {
    const rParts = route.split("/").filter(Boolean);
    let i = 0;
    let ok = true;
    for (; i < rParts.length; i++) {
      if (rParts[i] === "**") { ok = true; break; }
      if (i >= parts.length) { ok = false; break; }
      if (rParts[i] === "*") continue;
      if (rParts[i] !== parts[i]) { ok = false; break; }
    }
    if (ok && i === rParts.length && parts.length === rParts.length) return true;
  }
  return false;
}

// ── 2. extract internal links from source ─────────────────────────────────
const SCAN_DIRS = ["app", "components", "lib"].map((d) => join(ROOT, d)).filter((d) => existsSync(d));
const sourceFiles = SCAN_DIRS.flatMap((d) => walk(d)).filter((f) => /\.(tsx|ts|jsx|js)$/.test(f));
const HREF_RE = /href\s*[:=]\s*["'`](\/[^"'`]*)["'`]/g;

const broken = [];
let checked = 0;
for (const file of sourceFiles) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(HREF_RE)) {
    const href = m[1];
    checked += 1;
    if (href === "/_next" || href.startsWith("/_next/")) continue;
    // Allow-list: framework/static paths this gate does not manufacture.
    if (href.startsWith("/api/")) continue; // covered by runtime probes
    if (!linkResolves(href)) {
      broken.push({ href, file: relative(ROOT, file).split(sep).join("/") });
    }
  }
}

// ── 3. report ─────────────────────────────────────────────────────────────
console.log(`routeIntegrity: ${routes.size} filesystem routes · ${checked} internal hrefs scanned`);
if (broken.length > 0) {
  const seen = new Set();
  console.error("\nBROKEN internal links (route does not exist):");
  for (const b of broken) {
    const key = b.href;
    const dup = seen.has(key);
    seen.add(key);
    if (!dup) console.error(`  ✗ ${key}`);
    console.error(`      at ${b.file}`);
  }
  process.exit(1);
}
console.log("routeIntegrity: PASS — every internal link resolves to a real route");
