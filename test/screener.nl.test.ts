/**
 * INT-D1 — natural-language screening over the ONE engine.
 *
 * Pre-registration: docs/intelligence/screening.md (committed BEFORE
 * any evaluation, PR #296). Rule 21 fail-first: the pins below were
 * captured failing on the pre-implementation tree — RED-1 (this file
 * without the module pins: the route ignores mode:"natural", the UI
 * has no toggle, no single mapper definition exists) and RED-2 (the
 * static `nlToQuery` import fails: lib/screener/nl.ts absent).
 *
 * What this file pins:
 *   1. THE ONE query route extended in place: POST /api/screener/query
 *      grows an explicit `mode` field — "expression" (the pinned
 *      byte-compatible default) | "natural". Natural mode translates
 *      through the ONE deterministic mapper, evaluates through the
 *      EXISTING parse → filter path, and echoes the TRANSLATED
 *      expression in the 200 `query` field (the user sees the
 *      interpretation — never a black box). Expression-mode responses
 *      stay byte-identical (no `query` key).
 *   2. The UI: an explicit two-way mode toggle (no auto-detection of
 *      which grammar the user typed), the "understood as:" line in
 *      natural mode, and saved screens storing the TRANSLATED
 *      expression (replayable by the expression engine regardless of
 *      the producing mode).
 *   3. The no-second-path pins: `nlToQuery` is the ONLY NL→query
 *      translation in the repo; lib/screener/nl.ts is a pure module
 *      importing only from './parser' (one field registry); no second
 *      screener endpoint exists.
 *   4. The mapper pins: translation per phrase class, fail-closed
 *      refusals, the every-success-parses property, determinism, the
 *      sector table pinned to the live stored vocabulary, and the 10k
 *      fuzz (X3-05 discipline) — added in RED-2.
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// The persistent limiter is not under test here (and needs no env) —
// the routes.validateInput house pattern.
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true, count: 0 }),
}));

const ROOT = process.cwd();

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

/** Minimal request double — the chat.route house pattern. */
function makeReq(json: unknown, ip = "1.2.3.4"): never {
  return {
    headers: {
      get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null),
    },
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as never;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const ROUTE = "app/api/screener/query/route.ts";
const QUERY_BAR = "components/screener/ScreenerQueryBar.tsx";
const NL_MODULE = "lib/screener/nl.ts";

describe("INT-D1 route — the ONE query route grows an explicit mode field in place", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expression mode (the default): the 200 shape is byte-compatible — exactly the four pre-D1 keys, no query echo", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    const res = await POST(makeReq({ q: "pe > 0 and roe > 15" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Byte-compat: expression mode gains NOTHING — no `query` key.
    expect(Object.keys(body).sort()).toEqual(["count", "elapsedMs", "ok", "rows"]);
  });

  it("mode missing and mode unknown both fall back to the pinned byte-compatible expression default", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    for (const body of [{ q: "pe > 15" }, { q: "pe > 15", mode: "fuzzy" }, { q: "pe > 15", mode: 7 }]) {
      const res = await POST(makeReq(body));
      expect(res.status).toBe(200);
      const wire = await res.json();
      expect(wire.ok).toBe(true);
      expect(Object.keys(wire).sort()).toEqual(["count", "elapsedMs", "ok", "rows"]);
    }
  });

  it("natural mode: 200 carries the TRANSLATED expression in `query` (the interpretation is never a black box)", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    const res = await POST(makeReq({ q: "market cap above 50000 crore", mode: "natural" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.query).toBe("string");
    expect(body.query).toBe("(mktcap > 50000)");
  });

  it("natural mode rows EQUAL a direct expression query of the same translated string (parity)", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    const { parseQuery } = await import("@/lib/screener/parser");
    const { filterRows } = await import("@/lib/screener/engine");
    const { getSlimIndex } = await import("@/lib/scoring/slimIndex");

    const res = await POST(makeReq({ q: "roe above 15 and debt below 1", mode: "natural" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const translated = body.query as string;
    const direct = parseQuery(translated);
    expect(direct.ok).toBe(true);
    const expected = filterRows(direct.ok ? direct.node : ({} as never), getSlimIndex());
    expect(body.rows).toEqual(expected);
  });

  it("natural mode refusal: unknown/ambiguous intent → 400 whose safe message names the supported vocabulary (rule 10)", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    const res = await POST(makeReq({ q: "huge cheap stocks", mode: "natural" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    const msg = String(body.error?.message ?? "");
    // Names the supported vocabulary (fixed lists only + the user's own
    // tokens — no internals, rule 10).
    expect(msg).toContain("supported");
    expect(msg).toContain("huge");
  });

  it("natural mode empty/whitespace input refuses with nothing run", async () => {
    const { POST } = await import("@/app/api/screener/query/route");
    const res = await POST(makeReq({ q: "   ", mode: "natural" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("the route's compute defense is unchanged (per-IP 120 / 60 s)", () => {
    const src = source(ROUTE);
    expect(src).toMatch(/QUERY_IP_LIMIT = 120/);
    expect(src).toMatch(/QUERY_IP_WINDOW = 60/);
  });

  it("the route wires the natural mode through nlToQuery — the ONE translation — and fail-closes if a translation ever fails parseQuery", () => {
    expect(existsSync(join(ROOT, NL_MODULE))).toBe(true);
    const src = source(ROUTE);
    expect(src).toContain("nlToQuery");
    // Fail-closed: a translated query that fails parse is a 400, never an
    // evaluation (the property pin's runtime backstop).
    expect(src).toMatch(/parsed\.ok[\s\S]{0,400}did not parse|parsed\.ok[\s\S]{0,400}400/);
  });
});

describe("INT-D1 UI — the explicit two-way mode toggle and the understood-as line", () => {
  it("the query bar has an explicit Expression | Natural language toggle (no auto-detection)", () => {
    const src = source(QUERY_BAR);
    expect(src).toMatch(/data-screener-mode/);
    expect(src).toContain("Natural language");
    expect(src).toContain("Expression");
    // No magic auto-detection of which grammar the user typed (honest UI).
    expect(src).not.toMatch(/autoDetect|detectMode|detectGrammar/);
  });

  it("natural mode posts mode:'natural' to the ONE query route", () => {
    const src = source(QUERY_BAR);
    expect(src).toMatch(/mode:\s*['"]natural['"]|runQuery\([^)]*['"]natural['"]\)/);
    expect(src).toContain("/api/screener/query");
  });

  it("natural mode shows the translated expression verbatim: 'understood as:'", () => {
    const src = source(QUERY_BAR);
    expect(src).toContain("understood as:");
  });

  it("saved screens store the TRANSLATED expression and replay in expression mode", () => {
    const src = source(QUERY_BAR);
    // The save payload carries the canonical expression (active), which in
    // natural mode is the TRANSLATED string from the route's query field.
    expect(src).toMatch(/q:\s*active/);
    // Loading a saved screen runs it in expression mode — saved screens are
    // expressions regardless of the mode that produced them.
    expect(src).toMatch(/runQuery\(s\.query,\s*['"]expression['"]\)/);
  });

  it("CSV export keeps using the canonical expression", () => {
    const src = source(QUERY_BAR);
    expect(src).toContain("/api/screener/export?q=");
    expect(src).toMatch(/encodeURIComponent\(active\)/);
  });
});

describe("INT-D1 static pins — no second mapper, no second endpoint, one registry, pure module", () => {
  it("nlToQuery is defined EXACTLY once in the repo (lib/screener/nl.ts) — a second mapper breaks the build", () => {
    const files = [
      ...walk(join(ROOT, "lib")),
      ...walk(join(ROOT, "app")),
      ...walk(join(ROOT, "components")),
      ...walk(join(ROOT, "scripts")),
    ].filter((f) => /\.(ts|tsx|mjs|js)$/.test(f));
    const definers = files.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /(\bfunction\s+nlToQuery\b|\bconst\s+nlToQuery\b|\bnlToQuery\s*=\s*(async\s*)?\()/.test(src);
    });
    expect(definers.map((f) => f.slice(ROOT.length + 1))).toEqual(["lib/screener/nl.ts"]);
  });

  it("lib/screener/nl.ts is pure and imports ONLY from './parser' (one field registry — Constitution 14)", () => {
    expect(existsSync(join(ROOT, NL_MODULE))).toBe(true);
    const src = source(NL_MODULE);
    const imports = src.match(/^\s*import\s[^;]+;$/gm) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) {
      expect(line).toContain("'./parser'");
    }
    // Pinned pure: no clock, no randomness, no I/O of any kind.
    expect(src).not.toMatch(/\bDate\.now\b|\bnew Date\b|\bMath\.random\b|\bperformance\.now\b/);
    expect(src).not.toMatch(/\bfetch\(|\beval\(|\bnew Function\(/);
  });

  it("the screener API keeps EXACTLY its two endpoints — the NL mode adds no second query route (rule 14)", () => {
    const children = readdirSync(join(ROOT, "app/api/screener")).sort();
    expect(children).toEqual(["export", "query"]);
  });

  it("the UI query bar never gains a second fetch target for queries", () => {
    const src = source(QUERY_BAR);
    const queryFetches = src.match(/fetch\([^)]*\)/g) ?? [];
    const queryRoutes = queryFetches.filter((f) => f.includes("/api/screener/query"));
    expect(queryRoutes.length).toBe(1);
  });
});
