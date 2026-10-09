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

// ---------------------------------------------------------------------------
// The mapper pins (RED-2): the static import below fails while
// lib/screener/nl.ts is absent — the A10/B1 import-fail precedent — and
// every pin in this section becomes live once the module exists.
// ---------------------------------------------------------------------------

import { nlToQuery, SECTOR_SYNONYMS } from "@/lib/screener/nl";
import { parseQuery } from "@/lib/screener/parser";
import { STOCKS } from "@/data/stocks";

/** Byte-exact translation pin. */
function translates(input: string, expected: string) {
  const res = nlToQuery(input);
  expect(res.ok, JSON.stringify(res)).toBe(true);
  if (res.ok) expect(res.query).toBe(expected);
}

function refuses(input: string, messageIncludes: string[]) {
  const res = nlToQuery(input);
  expect(res.ok, `expected a refusal for ${JSON.stringify(input)}`).toBe(false);
  if (!res.ok) {
    const msg = res.error.message;
    for (const frag of messageIncludes) {
      expect(msg).toContain(frag);
    }
  }
}

const FIXTURE_CORPUS: string[] = [
  "return on equity above 15",
  "roe at least 15",
  "pe below 12",
  "price to earnings below 12",
  "valuation below 12",
  "pe at most 12",
  "market cap above 50,000 crore",
  "market capitalization above 50000",
  "size above 50000",
  "debt below 1",
  "leverage at most 0.5",
  "debt to equity below 1",
  "revenue growth above 10%",
  "growth above 10 percent",
  "free cash flow above 1000 crore",
  "rishi score at least 75",
  "consensus is null",
  "consensus has no data",
  "consensus has no value",
  "consensus is not null",
  "consensus has data",
  "council tension above 20",
  "tension spread below 10",
  "sector banking",
  "banks",
  "pharma",
  "software",
  "information technology",
  "sector oil & gas",
  "defence",
  "real estate",
  "sector it",
  "capital goods",
  "auto ancillaries",
  "roe above 15 and debt below 1",
  "roe above 15 or rishi score at least 75",
  "roe above 15, debt below 1",
  "roe above 15 also debt below 1",
  "market cap between 10000 and 50000",
  "roe above 15 and sector banking or pharma",
  "excluding banks",
  "banks and pharma",
  "either roe above 15 or debt below 1",
  "pe above 0 and roe above 15, sector banking",
  "consensus is null and roe above 15",
  "not consensus is null",
  "market cap above 10000 crore and revenue growth above 10% and debt below 1",
];

describe("INT-D1 nlToQuery — translation pins per phrase class (byte-exact)", () => {
  it("numeric fields with every comparator phrase (fully parenthesized comparisons)", () => {
    translates("return on equity above 15", "(roe > 15)");
    translates("roe at least 15", "(roe >= 15)");
    translates("pe below 12", "(pe < 12)");
    translates("price to earnings below 12", "(pe < 12)");
    translates("valuation below 12", "(pe < 12)");
    translates("pe at most 12", "(pe <= 12)");
    translates("market cap above 50,000 crore", "(mktcap > 50000)");
    translates("market capitalization above 50000", "(mktcap > 50000)");
    translates("size above 50000", "(mktcap > 50000)");
    translates("debt below 1", "(de < 1)");
    translates("leverage at most 0.5", "(de <= 0.5)");
    translates("debt to equity below 1", "(de < 1)");
    translates("revenue growth above 10%", "(revcagr > 10)");
    translates("growth above 10 percent", "(revcagr > 10)");
    translates("free cash flow above 1000 crore", "(fcf > 1000)");
    translates("rishi score at least 75", "(consensus >= 75)");
    translates("council tension above 20", "(tensionSpread > 20)");
    translates("tension spread below 10", "(tensionSpread < 10)");
  });

  it("null phrases compile to the parser's is-null forms — consensus only", () => {
    translates("consensus is null", "(consensus is null)");
    translates("consensus has no data", "(consensus is null)");
    translates("consensus has no value", "(consensus is null)");
    translates("consensus is not null", "(consensus is not null)");
    translates("consensus has data", "(consensus is not null)");
  });

  it("sector phrases emit the EXACT stored strings", () => {
    translates("sector banking", '(sector = "Banking")');
    translates("banks", '(sector = "Banking")');
    translates("pharma", '(sector = "Pharma")');
    translates("software", '(sector = "IT")');
    translates("information technology", '(sector = "IT")');
    translates("sector oil & gas", '(sector = "Oil & Gas")');
    translates("defence", '(sector = "Defence")');
    translates("real estate", '(sector = "RealEstate")');
    translates("sector it", '(sector = "IT")');
    translates("capital goods", '(sector = "Capital Goods")');
    translates("auto ancillaries", '(sector = "Auto Ancillaries")');
  });

  it("connectives, between-ranges and negation compose with explicit precedence", () => {
    translates("roe above 15 and debt below 1", "((roe > 15) and (de < 1))");
    translates("roe above 15 or rishi score at least 75", "((roe > 15) or (consensus >= 75))");
    translates("roe above 15, debt below 1", "((roe > 15) and (de < 1))");
    translates("roe above 15 also debt below 1", "((roe > 15) and (de < 1))");
    translates("market cap between 10000 and 50000", "((mktcap >= 10000) and (mktcap <= 50000))");
    // the range is normalized (min..max) — ordering, never a guessed value
    translates("market cap between 50000 and 10000", "((mktcap >= 10000) and (mktcap <= 50000))");
    translates("roe above 15 and sector banking or pharma", '(((roe > 15) and (sector = "Banking")) or (sector = "Pharma"))');
    translates("excluding banks", 'not (sector = "Banking")');
    translates("banks and pharma", '((sector = "Banking") and (sector = "Pharma"))');
    translates("either roe above 15 or debt below 1", "((roe > 15) or (de < 1))");
    translates("pe above 0 and roe above 15, sector banking", '((pe > 0) and (roe > 15) and (sector = "Banking"))');
    translates("consensus is null and roe above 15", "((consensus is null) and (roe > 15))");
    translates("not consensus is null", "not (consensus is null)");
  });
});

describe("INT-D1 nlToQuery — fail-closed refusals", () => {
  it("empty / whitespace-only input refuses with nothing run", () => {
    refuses("", ["empty"]);
    refuses("   ", ["empty"]);
  });

  it("ambiguous magnitudes refuse — never a guessed number", () => {
    refuses("huge stocks", ["huge", "supported"]);
    refuses("cheap banks", ["cheap"]);
    refuses("pe above huge", ["huge"]);
    refuses("roe above 15 and big market cap", ["big"]);
  });

  it("unknown tokens refuse naming the supported vocabulary (rule 10: own tokens + fixed lists)", () => {
    refuses("show stocks with roe above 15", ["show", "supported"]);
    refuses("symbol RELIANCE", ["symbol", "supported"]);
    refuses("blorp", ["blorp", "supported"]);
  });

  it("expression-mode syntax in natural mode refuses with the mode pointer", () => {
    refuses("pe > 15", [">"]);
    refuses("banks & pharma", ["&"]);
  });

  it("numbers out of the parser's bounds refuse", () => {
    refuses("roe above -5", ["negative"]);
    refuses("roe above 99999999999999999999", ["range"]);
    refuses("market cap above 1e15", ["e15"]);
  });

  it("null phrases on non-nullable fields refuse (the parser admits is-null for consensus only)", () => {
    refuses("roe is null", ["consensus"]);
    refuses("pe has no data", ["consensus"]);
  });

  it("dangling and incomplete clauses refuse", () => {
    refuses("roe above", ["number"]);
    refuses("roe above 15 and", ["comparison"]);
    refuses("roe above 15 or", ["comparison"]);
    refuses("between 10 and 20", ["supported"]);
    refuses("market cap between 10", ["between"]);
    refuses("roe", ["comparison"]);
    refuses("consensus is", ["null"]);
  });

  it("injection payloads refuse — no uncaught throw, no interpretation", () => {
    for (const p of [
      "'; DROP TABLE users; --",
      "<script>alert(1)</script>",
      "${jndi:ldap://x}",
      "eval(pe)",
      "new Function('return 1')",
      "pe; --",
      "banks`or`pharma",
    ]) {
      refuses(p, ["supported"]);
    }
  });
});

describe("INT-D1 property + determinism — every success parses, same input → byte-identical query", () => {
  it("every nlToQuery success in the fixture corpus parses through the ONE parser (the unshippable-defect pin)", () => {
    for (const input of FIXTURE_CORPUS) {
      const res = nlToQuery(input);
      expect(res.ok, input).toBe(true);
      if (res.ok) {
        const parsed = parseQuery(res.query);
        expect(parsed.ok, `${input} -> ${res.query}`).toBe(true);
      }
    }
  });

  it("deterministic: same input → byte-identical output, twice, always", () => {
    for (const input of FIXTURE_CORPUS) {
      const a = nlToQuery(input);
      const b = nlToQuery(input);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});

describe("INT-D1 sector vocabulary — exact stored strings, pinned to the live data", () => {
  it("every sector synonym VALUE is an exact stored sector string (typos break the build)", () => {
    const live = new Set(Object.values(STOCKS as Record<string, { sector: string }>).map((s) => s.sector));
    for (const [, value] of Object.entries(SECTOR_SYNONYMS)) {
      expect(live.has(value), `sector synonym value ${value} is not a stored sector`).toBe(true);
    }
  });

  it("every stored sector is reachable: 'sector <name>' translates to the byte-exact stored string", () => {
    const live = new Set(Object.values(STOCKS as Record<string, { sector: string }>).map((s) => s.sector));
    for (const stored of live) {
      const res = nlToQuery(`sector ${stored.toLowerCase()}`);
      expect(res.ok, `sector ${stored}`).toBe(true);
      if (res.ok) expect(res.query).toBe(`(sector = "${stored}")`);
    }
  });
});

describe("INT-D1 fuzz — 10k random natural-language strings (X3-05 discipline)", () => {
  function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("never throws, always returns a shaped result, and every success parses", () => {
    const rand = mulberry32(20261010);
    const FRAGMENTS = [
      "roe", "pe", "market cap", "debt", "growth", "free cash flow", "rishi score",
      "council tension", "banks", "pharma", "sector", "software", "energy",
      "above", "below", "at least", "at most", "between", "and", "or", "excluding",
      "is null", "has no data", ",", "15", "50000", "crore", "%", "0.5",
      "huge", "cheap", "show", ">", "&", "'", '"', ";", "--", "()", "it", "stocks",
    ];
    const CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789 ,.()<>!=&%'\"-;:\t\né中";
    let succeeded = 0;
    let refused = 0;
    for (let i = 0; i < 10_000; i++) {
      let s: string;
      if (i % 2 === 0) {
        const n = 1 + Math.floor(rand() * 6);
        s = Array.from({ length: n }, () => FRAGMENTS[Math.floor(rand() * FRAGMENTS.length)]).join(" ");
      } else {
        const n = 1 + Math.floor(rand() * 24);
        s = Array.from({ length: n }, () => CHARSET[Math.floor(rand() * CHARSET.length)]).join("");
      }
      let res: ReturnType<typeof nlToQuery>;
      expect(() => {
        res = nlToQuery(s);
      }).not.toThrow();
      expect(res!).toBeTruthy();
      if (res!.ok) {
        succeeded++;
        const parsed = parseQuery(res!.query);
        expect(parsed.ok, `input ${JSON.stringify(s)} -> ${res!.query}`).toBe(true);
      } else {
        refused++;
        expect(typeof res!.error.message).toBe("string");
        expect(res!.error.message.length).toBeLessThan(600);
      }
    }
    // The corpus must exercise BOTH paths — a 100%-refusing corpus proves
    // nothing about the translation (the X3-05 semi-valid-fragment rule).
    expect(succeeded).toBeGreaterThan(50);
    expect(refused).toBeGreaterThan(50);
  });
});
