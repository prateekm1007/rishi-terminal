#!/usr/bin/env node
// scripts/ci/unofficialSourcesGate.mjs — A4 (founder order, 12 Oct 2026):
// no new unofficial hostname reaches runtime without being declared in
// docs/licences/UNOFFICIAL_SOURCES.md.
//
// Why this file (and not a vitest spec): the skip-scope that keeps this
// change deploy-exempt covers docs/** and scripts/ci/** — a test/ spec
// would make the PR production-relevant. Instead the gate SELF-VALIDATES
// on every run (embedded fixtures first): a gate that cannot fail is
// theater (C5), so a broken gate exits 2 ("gate broken") and a tripped
// gate exits 1 (unknown hosts listed). Wiring into CI rides with the A2
// workflow edit; until then `node scripts/ci/unofficialSourcesGate.mjs`
// runs it by hand. No network, no dependencies.
//
// Rule 14: the .md file is the one source of truth (machine section at
// the bottom); this script parses it, never duplicates the list.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INVENTORY = join(ROOT, "docs/licences/UNOFFICIAL_SOURCES.md");

// Lines that can carry a runtime fetch target (fetch calls, url
// assignments, endpoint constants). termsUrl/docsUrl registry keys are
// documentation links, never fetch targets — excluded by pattern.
const FETCH_PATTERNS = [/fetch\s*\(\s*[`'"]/, /url\s*[:=]\s*[`'"]/i, /\bBASE\s*=\s*[`'"]/, /endpoint\s*[:=]\s*[`'"]/i];
const EXCLUDED_KEYS = /termsUrl|docsUrl/i;
// Reserved/synthetic hosts never count (fixtures, placeholders).
const SYNTHETIC = /(\.example|\.test|\.localhost|\.invalid|\.local)$/i;

function isCommentLine(line) {
  const t = line.trimStart();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("#");
}

function extractHosts(sourceText) {
  const found = new Set();
  for (const rawLine of sourceText.split("\n")) {
    if (isCommentLine(rawLine)) continue;
    if (EXCLUDED_KEYS.test(rawLine)) continue;
    if (!FETCH_PATTERNS.some((p) => p.test(rawLine))) continue;
    const m = rawLine.match(/https?:\/\/([A-Za-z0-9.-]+)/);
    if (m && !SYNTHETIC.test(m[1])) found.add(m[1].toLowerCase());
  }
  return found;
}

function declaredHosts() {
  const md = readFileSync(INVENTORY, "utf8");
  const block = md.match(/```\n([\s\S]*?)\n```/);
  if (!block) throw new Error("inventory machine section missing");
  return new Set(
    block[1].split("\n").map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#")),
  );
}

function walkTs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walkTs(p, out); continue; }
    if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

// ── Self-check (C5): the extractor must catch a new hostname and ignore
// non-targets. Runs on EVERY invocation, before the repo scan. ──
function selfCheck() {
  const cases = [
    // [source, expected hosts]
    [`const r = await fetch('https://new-vendor-9f3a.example.net/x');`, ["new-vendor-9f3a.example.net"]],
    [`const url = \`https://query1.finance.yahoo.com/v8/finance/chart/abc\`;`, ["query1.finance.yahoo.com"]],
    [`// fetch('https://commented-out.example.com/x')`, []],
    [`termsUrl: "https://finnhub.io/terms-of-service",`, []],
    [`const BASE = "https://www.screener.in/company";`, ["www.screener.in"]],
    [`endpoint: 'https://api.coingecko.com/api/v3/simple/price',`, ["api.coingecko.com"]],
  ];
  // NOTE: *.example hosts are synthetic — the extractor DOES report them
  // (case 1 expects the hit); only reserved TLDs in the repo scan's
  // synthetic filter are dropped. The gate must SEE everything, then decide.
  for (const [src, want] of cases) {
    const got = [...extractHosts(src)];
    const ok = got.length === want.length && want.every((w) => got.includes(w));
    if (!ok) {
      console.error(`gate self-check FAILED for ${JSON.stringify(src)}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
      process.exit(2);
    }
  }
  // Positive control (B-18): the inventory parses and is non-empty.
  const declared = declaredHosts();
  if (declared.size === 0) {
    console.error("gate self-check FAILED: declared host set is empty");
    process.exit(2);
  }
  console.log(`gate self-check GREEN (${cases.length} extractor fixtures + inventory parses, ${declared.size} declared hosts)`);
}

selfCheck();

const declared = declaredHosts();
const unknown = new Map(); // host -> first file
for (const file of [...walkTs(join(ROOT, "lib")), ...walkTs(join(ROOT, "app"))]) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch { continue; }
  for (const host of extractHosts(text)) {
    // Reserved/synthetic TLDs are fixtures, never vendors (today they live
    // only under test/, outside this scan — belt and suspenders).
    if (SYNTHETIC.test(host)) continue;
    if (!declared.has(host) && !unknown.has(host)) {
      unknown.set(host, file.replace(ROOT, ""));
    }
  }
}

if (unknown.size > 0) {
  console.error("unofficial-sources gate TRIPPED — undeclared runtime hostnames:");
  for (const [host, file] of unknown) console.error(`  ${host} (first seen in ${file})`);
  console.error("Declare each in docs/licences/UNOFFICIAL_SOURCES.md (founder decision pending) or remove the call.");
  process.exit(1);
}
console.log(`unofficial-sources gate GREEN — all runtime hosts declared (${declared.size} in inventory)`);
