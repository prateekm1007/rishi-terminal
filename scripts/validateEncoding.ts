/**
 * Rishi Terminal — Encoding Validator
 * Scans source files for mojibake markers.
 * Exits with code 1 if corruption found (blocks build).
 * Run: npx tsx scripts/validateEncoding.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

const EXTENSIONS = [".tsx", ".ts", ".css"];

const EXCLUDE_DIRS = ["node_modules", ".next", ".git", "scripts"];

// Files that intentionally contain mojibake patterns
const EXCLUDE_FILES = ["app/api/news/route.ts"];

const BOM = "\uFEFF";

// Strong markers
const MARKER_RE = /[\u00c2\u00c3\u00e2\u00f0\u00ef]/;

// Suspicious runs (length >= 3 to reduce false positives)
const RUN_RE = /[\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u2018-\u201d\u2020\u2021\u2030\u2039\u203a\u20ac]{3,}/g;

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        results.push(...walk(full));
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.includes(ext)) {
        const rel = path.relative(ROOT, full).replace(/\\/g, "/");
        if (!EXCLUDE_FILES.includes(rel)) {
          results.push(full);
        }
      }
    }
  }
  return results;
}

const files = walk(ROOT);
const issues: { file: string; line: number; text: string }[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");

  // Check BOM
  if (content.startsWith(BOM)) {
    const rel = path.relative(ROOT, file);
    issues.push({ file: rel, line: 0, text: "File has UTF-8 BOM" });
  }

  // Check for mojibake runs
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(RUN_RE);
    if (matches) {
      for (const m of matches) {
        if (MARKER_RE.test(m)) {
          const rel = path.relative(ROOT, file);
          issues.push({
            file: rel,
            line: i + 1,
            text: lines[i].trim().substring(0, 120),
          });
        }
      }
    }
  }
}

if (issues.length > 0) {
  console.error("\n❌ ENCODING VALIDATION FAILED\n");
  console.error(`Found ${issues.length} encoding issue(s):\n`);

  const grouped: Record<string, typeof issues> = {};
  for (const issue of issues) {
    if (!grouped[issue.file]) grouped[issue.file] = [];
    grouped[issue.file].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(grouped)) {
    console.error(`  📄 ${file}`);
    for (const issue of fileIssues) {
      if (issue.line === 0) {
        console.error(`     ⚠️  ${issue.text}`);
      } else {
        console.error(`     Line ${issue.line}: ${issue.text}`);
      }
    }
    console.error("");
  }

  console.error("Run: npx tsx scripts/fixEncoding.ts\n");
  process.exit(1);
} else {
  console.log("✅ Encoding validation passed — no mojibake detected");
}