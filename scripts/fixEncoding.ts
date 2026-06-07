/**
 * Rishi Terminal — Encoding Auto-Fixer
 * Scans source files for mojibake and repairs them.
 * Run: npx tsx scripts/fixEncoding.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

const EXTENSIONS = [".tsx", ".ts", ".css", ".json", ".md"];

const EXCLUDE_DIRS = ["node_modules", ".next", ".git", "scripts"];

// Files whose content intentionally contains mojibake patterns (repair engines)
const EXCLUDE_FILES = ["app/api/news/route.ts"];

const BOM = "\uFEFF";

// cp1252 byte table (indices 0x80–0x9F map to specific Unicode chars)
const CP1252_MAP: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

function charToCp1252Byte(ch: string): number {
  const code = ch.charCodeAt(0);
  // Direct Latin-1 range
  if (code >= 0x00 && code <= 0xff) return code;
  // cp1252 special range
  for (const [byte, unicode] of Object.entries(CP1252_MAP)) {
    if (unicode === code) return Number(byte);
  }
  return -1; // not a cp1252 character
}

function tryDecodeMojibake(run: string): string | null {
  const bytes: number[] = [];
  for (const ch of run) {
    const b = charToCp1252Byte(ch);
    if (b < 0) return null; // not all chars are cp1252
    bytes.push(b);
  }

  // Attempt UTF-8 decode
  try {
    const buf = Buffer.from(bytes);
    const decoded = buf.toString("utf8");

    // Reject if it contains replacement character
    if (decoded.includes("\ufffd")) return null;

    // Reject if identical (no improvement)
    if (decoded === run) return null;

    return decoded;
  } catch {
    return null;
  }
}

// Strong markers that indicate mojibake
const STRONG_MARKERS = /[\u00c2\u00c3\u00e2\u00f0\u00ef]/;

// Suspicious character runs
const RUN_RE = /[\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u2018-\u201d\u2020\u2021\u2030\u2039\u203a\u20ac]{2,}/g;

function fixContent(content: string): { fixed: string; changes: number } {
  let changes = 0;

  // Remove BOM
  let s = content;
  if (s.startsWith(BOM)) {
    s = s.slice(1);
    changes++;
  }

  // Fix mojibake runs
  s = s.replace(RUN_RE, (match) => {
    if (!STRONG_MARKERS.test(match)) return match;

    const decoded = tryDecodeMojibake(match);
    if (decoded) {
      changes++;
      return decoded;
    }
    return match;
  });

  return { fixed: s, changes };
}

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

// Main
const files = walk(ROOT);
let totalFixed = 0;
let totalChanges = 0;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const { fixed, changes } = fixContent(content);

  if (changes > 0) {
    fs.writeFileSync(file, fixed, "utf8");
    const rel = path.relative(ROOT, file);
    console.log(`✅ ${rel} (${changes} fixes)`);
    totalFixed++;
    totalChanges += changes;
  }
}

console.log(`\nDone. Fixed ${totalFixed} files with ${totalChanges} total changes.`);
if (totalFixed === 0) {
  console.log("🎉 No encoding issues found!");
}