/**
 * R5 (round 2): symbol input is validated on every route.
 *
 * - lib/registry/validateInput is the single gate: registry/alias-resolved
 *   stock symbols or the app's own index/forex/crypto/commodity/bond
 *   tickers (derived from data/ + livePrice maps, never hand-listed).
 * - Batch cap: 50.
 * - Route-level 400s (no upstream call happens for rejected input).
 * - Source-scan: every route that reads `symbol`/`symbols` (query, body or
 *   dynamic segment) imports the gate — a new route cannot omit it.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  isValidSymbolInput,
  normalizeSymbolInput,
  parseSymbolsList,
  parseSymbolsBody,
  MAX_SYMBOLS_BATCH,
  PRICE_REGISTRY_TOKENS,
  SLASHED,
} from "@/lib/registry/validateInput";
import { STOCKS } from "@/data/stocks";

// R6: the persistent limiter is not under test here (and needs no env).
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true, count: 0 }),
}));

describe("R5 — validateInput: the allow-list", () => {
  it("accepts registry stock symbols and T12 aliases", () => {
    expect(isValidSymbolInput("RELIANCE")).toBe(true);
    expect(isValidSymbolInput(" tcs ")).toBe(true);
    // a legacy alias from the T12 alias map resolves
    const aliasKey = Object.keys(STOCKS)[0];
    expect(normalizeSymbolInput(aliasKey)).toBeTruthy();
  });

  it("accepts the app's own index/commodity/crypto/bond tickers", () => {
    for (const s of ["NIFTY50", "SENSEX", "SPX", "VIX", "GOLD", "WTI", "BTC", "ETH", "IN10YS"]) {
      expect(isValidSymbolInput(s), s).toBe(true);
    }
  });

  it("canonicalises every accepted forex spelling to BASE/QUOTE", () => {
    expect(normalizeSymbolInput("USD/INR")).toBe("USD/INR");
    expect(normalizeSymbolInput("USDINR")).toBe("USD/INR");
    expect(normalizeSymbolInput("usdinr=x")).toBe("USD/INR");
    expect(normalizeSymbolInput("EURUSD")).toBe("EUR/USD");
  });

  it("rejects path traversal, injection vectors and junk", () => {
    for (const bad of ["../../etc/passwd", "..\\..\\windows", "<script>", "'; DROP TABLE users; --", "A".repeat(21), ""]) {
      expect(isValidSymbolInput(bad), JSON.stringify(bad)).toBe(false);
    }
    expect(normalizeSymbolInput(null)).toBeNull();
  });

  it("caps symbol batches at 50 and rejects unknown members", () => {
    expect(MAX_SYMBOLS_BATCH).toBe(50);

    const ok = parseSymbolsList("RELIANCE,TCS,INFY");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.symbols).toEqual(["RELIANCE", "TCS", "INFY"]);

    const tooMany = parseSymbolsList(Array.from({ length: 51 }, () => "TCS").join(","));
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.error).toMatch(/max 50/i);

    const unknown = parseSymbolsList("RELIANCE,NOT_A_TICKER");
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error).toMatch(/Unknown symbol/i);

    const body = parseSymbolsBody({ symbols: ["RELIANCE", "BTC"] });
    expect(body.ok).toBe(true);

    const badBody = parseSymbolsBody({ symbols: "RELIANCE" });
    expect(badBody.ok).toBe(false);
    const mixedBody = parseSymbolsBody({ symbols: ["RELIANCE", 42] });
    expect(mixedBody.ok).toBe(false);
  });
});

describe("R5 — routes reject invalid symbols with 400 before any upstream call", () => {
  const req = (url: string) =>
    ({ url, headers: { get: () => null } }) as never; // eslint-disable-line @typescript-eslint/no-explicit-any

  it("GET /api/prices?symbol=../../etc/passwd -> 400", async () => {
    const { GET } = await import("@/app/api/prices/route");
    const res = await GET(req("http://localhost:3000/api/prices?symbol=../../etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("GET /api/prices?symbols=<500 junk> -> 400", async () => {
    const { GET } = await import("@/app/api/prices/route");
    const list = Array.from({ length: 500 }, (_, i) => `JUNK${i}`).join(",");
    const res = await GET(req(`http://localhost:3000/api/prices?symbols=${list}`));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Unknown symbol|max 50/);
  });

  it("GET /api/technical?symbol=../../etc/passwd -> 400", async () => {
    const { GET } = await import("@/app/api/technical/route");
    const res = await GET(req("http://localhost:3000/api/technical?symbol=../../etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("GET /api/history?symbol=<script> -> 400", async () => {
    const { GET } = await import("@/app/api/history/route");
    const res = await GET(req("http://localhost:3000/api/history?symbol=<script>"));
    expect(res.status).toBe(400);
  });

  it("POST /api/prices/batch with junk body -> 400", async () => {
    const { POST } = await import("@/app/api/prices/batch/route");
    const res = await POST({
      url: "http://localhost:3000/api/prices/batch",
      headers: { get: () => null },
      json: async () => ({ symbols: Array.from({ length: 60 }, () => "JUNK") }),
    } as never);
    expect(res.status).toBe(400);
  });

  it("GET /api/gurus?kind=commodity&symbol=JUNK -> 400", async () => {
    const { GET } = await import("@/app/api/gurus/route");
    const res = await GET(req("http://localhost:3000/api/gurus?kind=commodity&symbol=JUNK"));
    expect(res.status).toBe(400);
  });
});

describe("R5 — source scan: every symbol-reading route imports the gate", () => {
  const ROOT = process.cwd();

  function routeFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...routeFiles(full));
      else if (entry.name === "route.ts") out.push(full);
    }
    return out;
  }

  it("no route reads symbol/symbols without importing validateInput", () => {
    const offenders: string[] = [];
    for (const file of routeFiles(path.join(ROOT, "app", "api"))) {
      const src = readFileSync(file, "utf8");
      const readsSymbol =
        /searchParams\.get\(["']symbols?["']\)/.test(src) ||
        /\bfrom\s*\{[^}]*symbol[^}]*\}/.test(src) && file.includes("[symbol]") ||
        /\{ symbols \}/.test(src);
      if (readsSymbol && !src.includes("validateInput")) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the old split gate (lib/security isKnownSymbol) is gone — routes use validateInput", () => {
    // R5 unified the gates onto lib/registry/validateInput. R11-06 deleted
    // lib/security.ts outright (rule 17: zero importers anywhere — it was
    // the last second-symbol-gate artifact). app/api must never grow a
    // private symbol gate again.
    const offenders: string[] = [];
    for (const file of routeFiles(path.join(ROOT, "app", "api"))) {
      const src = readFileSync(file, "utf8");
      if (/isKnownSymbol|isSafeSymbolToken/.test(src) && file.includes("route.ts")) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── R9-9: registry exports for the AI intent backstop (Rule 14) ─────────
// The intent detector must read the SAME price registry the price layer
// serves — exported here so there is exactly one registry, not a second
// hand-maintained list inside lib/ai.
describe("R9-9 — validateInput registry exports", () => {
  it("PRICE_REGISTRY_TOKENS covers the app-served price universe", () => {
    expect(PRICE_REGISTRY_TOKENS.has("WTI")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("BRENT")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("GOLD")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("BTC")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("NIFTY50")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("SENSEX")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("USDINR")).toBe(true);
    expect(PRICE_REGISTRY_TOKENS.has("IN10YS")).toBe(true);
  });

  it("SLASHED carries the BASE/QUOTE spellings the price layer uses", () => {
    expect(SLASHED.has("USD/INR")).toBe(true);
    expect(SLASHED.has("EUR/USD")).toBe(true);
  });

  it("stock master stays OUT of the price-registry token set (one registry per concept)", () => {
    expect(PRICE_REGISTRY_TOKENS.has("RELIANCE")).toBe(false);
    expect(PRICE_REGISTRY_TOKENS.has("TCS")).toBe(false);
  });
});

// ── R11-05 (founder directive 15): the bare tenor spelling "10Y" is how
// users say the home-market sovereign benchmark ("10Y yield"), but the
// registry symbol is IN10YS. The alias must be DERIVED from the bond
// registry (never hand-listed) and must fail closed on ambiguity: a tenor
// maps only when EXACTLY ONE Indian G-Sec carries it. SDLs and corporate
// bonds at the same tenor must never capture the alias (they are not the
// sovereign benchmark).
describe("R11-05 — derived bond-tenor aliases (directive 15)", () => {
  it("the bare tenor '10Y' canonicalises to the home sovereign bond", () => {
    expect(normalizeSymbolInput("10Y")).toBe("IN10YS");
    expect(isValidSymbolInput("10Y")).toBe(true);
  });

  it("the alias token is a price-registry token (intent layer sees it)", () => {
    expect(PRICE_REGISTRY_TOKENS.has("10Y")).toBe(true);
  });

  it("the canonical bond symbol keeps working unchanged", () => {
    expect(normalizeSymbolInput("IN10YS")).toBe("IN10YS");
    expect(normalizeSymbolInput("US10Y")).toBe("US10Y");
  });

  it("tenor aliases never collide with the stock master or other instruments", () => {
    expect(isValidSymbolInput("RELIANCE")).toBe(true);
    expect(normalizeSymbolInput("RELIANCE")).toBe("RELIANCE");
    expect(isValidSymbolInput("11Y")).toBe(false); // no Indian G-Sec at 11Y -> no alias
  });
});
