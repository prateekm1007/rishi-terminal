/**
 * X4 (Round 11): the dictionary boundary — static coverage gate.
 *
 * lib/language.tsx used to statically import the FULL messages/en.json, so
 * every route's first-load JS carried every other route's strings (~11 kB
 * gzip of dictionary in each of the app's blocking chunks). The client
 * bundle now carries only the SHELL subset (lib/languageShell.ts — one
 * declaration, received as an RSC prop from the root layout); each page's
 * own namespaces arrive via <NamespaceProvider> from the server page or a
 * server layout and ride the streamed flight payload instead.
 *
 * This gate pins the boundary so it cannot silently regress:
 *
 *  1. the client provider must not re-import the full dictionary;
 *  2. the root layout must pass the shell (and must keep the global search
 *     bar lazy — its chunk left every route's first-load set in X4);
 *  3. every route whose render tree uses non-shell namespaces must be
 *     COVERED: the namespaces must actually be provided (page provider or
 *     a layout in the chain) — otherwise those strings render through the
 *     humanize fallback (a silent visual regression this gate exists to
 *     catch);
 *  4. t() prefixes that do not exist in en.json are recorded in a baseline
 *     list — they render humanized TODAY (pre-existing), and new ones fail
 *     here instead of shipping silently.
 *
 * The walk is deliberately the same approximation the compiler enforces:
 * static imports (+ literal dynamic imports). Template-literal dynamic
 * imports (the locale JSON loader) are intentionally not resolved.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");
const p = (...seg: string[]) => path.join(REPO, ...seg);
const read = (f: string) => readFileSync(p(f), "utf8");

// Rule 14 (one source of truth): import the shell declaration itself.
import { SHELL_NAMESPACES } from "../lib/languageShell";

const en = JSON.parse(read(path.join("messages", "en.json"))) as Record<
  string,
  unknown
>;
const EN_NAMESPACES = new Set(Object.keys(en));
const SHELL = new Set<string>(SHELL_NAMESPACES);

/** t('ns.key') prefixes used by a file (only ones that exist in en.json). */
const T_CALL = /\bt\(\s*['"]([a-zA-Z0-9_]+)\./g;
/** static `from '…'` + literal `import('…')`. */
const IMPORT =
  /(?:from\s+|import\(\s*)['"]([^'"]+)['"]/g;

function fileNamespaces(src: string): { known: Set<string>; unknown: Set<string> } {
  const known = new Set<string>();
  const unknown = new Set<string>();
  for (const m of src.matchAll(T_CALL)) {
    const ns = m[1]!;
    if (EN_NAMESPACES.has(ns)) known.add(ns);
    else if (ns[0] === ns[0].toLowerCase()) unknown.add(ns);
  }
  return { known, unknown };
}

function resolveImport(spec: string, fromFile: string): string | null {
  let base: string | null = null;
  if (spec.startsWith("@/")) base = path.join(REPO, spec.slice(2));
  else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(p(fromFile)), spec);
  } else return null; // package / next/* / react — not repo files
  for (const cand of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    const rel = path.relative(REPO, cand);
    if (existsSync(p(rel)) && statSync(p(rel)).isFile()) return rel;
  }
  return null;
}

/** Namespaces provided by `ns={{ a, b }}` / `ns={{ a: alias }}` calls in a file. */
function providedNamespaces(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/ns=\{\{\s*([^}]+?)\s*\}\}/g)) {
    for (const ident of m[1]!.split(",")) {
      // `a` or `a: alias` (aliasing is used where a page-local binding
      // shadows the namespace identifier — see app/stock/[symbol]/page.tsx)
      const key = ident.split(":")[0]!.trim();
      if (key) out.add(key);
    }
  }
  return out;
}

describe("X4 — the client provider keeps the dictionary boundary", () => {
  const provider = read(path.join("lib", "language.tsx"));

  it("does NOT statically import the full en.json (the shell arrives as a prop)", () => {
    expect(provider).not.toMatch(
      /import\s+[^;]*from\s+['"][^'"]*messages\/en\.json['"]/,
    );
  });

  it("derives its baseline from the shell module (one source of truth)", () => {
    expect(provider).toMatch(/from\s+['"]\.\/languageShell['"]/);
  });
});

describe("X4 — the root layout ships the shell and the lazy search bar", () => {
  const layout = read(path.join("app", "layout.tsx"));

  it("imports the full dictionary SERVER-side and passes only the shell", () => {
    expect(layout).toMatch(/import\s+enDictionary\s+from\s+['"]@\/messages\/en\.json['"]/);
    expect(layout).toMatch(/shell=\{pickShell\(enDictionary/);
  });

  it("does not statically import GlobalSearchBar (lazy wrapper only)", () => {
    expect(layout).not.toMatch(
      /import\s+[^;]*GlobalSearchBar[^;]*from\s+['"]@\/components\/ui\/GlobalSearchBar['"]/,
    );
    expect(layout).toMatch(/LazyGlobalSearchBar/);
  });
});

describe("X4 — the global search bar stays out of the first-load set", () => {
  const lazy = read(path.join("components", "ui", "LazyGlobalSearchBar.tsx"));

  it("is dynamic with ssr:false", () => {
    expect(lazy).toMatch(/dynamic\(/);
    expect(lazy).toMatch(/ssr:\s*false/);
  });

  it("loads the real bar only via dynamic import", () => {
    expect(lazy).not.toMatch(
      /import\s+\{[^}]*\}\s+from\s+['"]\.\/GlobalSearchBar['"]/,
    );
    expect(lazy).toMatch(/import\(['"]\.\/GlobalSearchBar['"]\)/);
  });
});

describe("X4 — every namespace-using route is covered by a provider", () => {
  // Walk app/**/page.tsx. For each: (a) collect the non-shell namespaces
  // its static import tree uses; (b) collect what the page itself and the
  // layout chain up to app/ provide; (c) required must be covered.
  const pages = listPages();

  it("found the route pages (the walk is not silently empty)", () => {
    expect(pages.length).toBeGreaterThanOrEqual(20);
  });

  for (const page of pages) {
    it(`${page} renders its tree's namespaces (no humanize fallback)`, () => {
      const required = new Set<string>();
      const unknown = new Set<string>();
      const seen = new Set<string>();
      const stack = [page];
      while (stack.length) {
        const f = stack.pop()!;
        if (seen.has(f)) continue;
        seen.add(f);
        const src = read(f);
        const { known, unknown: unk } = fileNamespaces(src);
        known.forEach(n => required.add(n));
        unk.forEach(n => unknown.add(n));
        for (const m of src.matchAll(IMPORT)) {
          const r = resolveImport(m[1]!, f);
          if (r) stack.push(r);
        }
      }
      for (const ns of required) {
        if (SHELL.has(ns)) continue; // always available from the root provider
        expect(providedFor(page), `${page} must provide "${ns}"`).toContain(ns);
      }

      // Provided-but-nonexistent namespaces are typos that silently
      // humanize EVERYTHING in that namespace.
      for (const ns of providedFor(page)) {
        expect(
          EN_NAMESPACES.has(ns),
          `${page} provides "${ns}" which does not exist in en.json`,
        ).toBe(true);
      }
    });
  }

  /** ns={{ … }} provided by the page itself + layouts up the chain. */
  function providedFor(page: string): Set<string> {
    const out = new Set<string>();
    const dir = path.dirname(page);
    const segments = dir.split(path.sep);
    for (let i = 0; i < segments.length; i++) {
      const layoutPath = path.join(...segments.slice(0, i + 1), "layout.tsx");
      if (!existsSync(p(layoutPath))) continue;
      providedNamespaces(read(layoutPath)).forEach(n => out.add(n));
    }
    if (existsSync(p(page))) providedNamespaces(read(page)).forEach(n => out.add(n));
    return out;
  }
});

describe("X4 — unknown t() prefixes stay at the recorded baseline", () => {
  // Pre-existing (recorded, not fixed by X4): WatchlistTab uses lab.*
  // keys that have never existed in en.json — they render through the
  // humanize fallback today. New unknown prefixes must fail here instead
  // of silently shipping humanized strings.
  const KNOWN_MISSING = new Set(["lab"]);

  it("no NEW unknown prefixes appear anywhere in the render tree", () => {
    const found = new Set<string>();
    for (const f of listSourceFiles()) {
      const { unknown } = fileNamespaces(read(f));
      unknown.forEach(n => found.add(n));
    }
    const novel = [...found].filter(n => !KNOWN_MISSING.has(n));
    expect(
      novel,
      `these t() prefixes do not exist in en.json: ${novel.join(", ")}`,
    ).toEqual([]);
  });

  it("the recorded baseline is still accurate (lab is still missing)", () => {
    expect(EN_NAMESPACES.has("lab")).toBe(false);
  });
});

/* ── helpers: repo file walking (sync, test-time) ── */

import { readdirSync, statSync } from "node:fs";

function listPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(p(dir))) {
      const full = path.join(dir, e);
      const rel = path.relative(REPO, p(full));
      if (statSync(p(full)).isDirectory()) {
        if (full.includes(path.join("app"))) walk(full);
      } else if (e === "page.tsx" && rel.startsWith(`app${path.sep}`)) {
        out.push(rel);
      }
    }
  };
  walk("app");
  return out;
}

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(p(dir))) {
      const full = path.join(dir, e);
      if (statSync(p(full)).isDirectory()) {
        if (["node_modules", ".next", ".git", "docs", "test", "scripts"].includes(e))
          continue;
        walk(full);
      } else if (/\.(tsx?|mjs)$/.test(e)) {
        out.push(path.relative(REPO, p(full)));
      }
    }
  };
  walk("app");
  walk("components");
  walk("lib");
  return out;
}
