/**
 * INT-B1 — the ONE deps-pass evidence wiring, the feed-impact label
 * carry, and the no-second-path pins for the stock-page intelligence
 * panel (roadmap item B1).
 *
 * Pre-registration: docs/intelligence/newsEvidence.md (committed BEFORE
 * any evaluation). Rule 21 fail-first: the behavior pins below fail on
 * the pre-implementation tree (the impact label is not carried yet; the
 * match/wiring/panel modules and the mount do not exist yet) — the
 * A3..A10 precedent.
 *
 * What this file pins:
 *   1. buildNewsItems keeps its contract — the unavailable note stays
 *      BYTE-IDENTICAL, the matched-item id class stays news:<stable-id>,
 *      and the feed's own impact label is carried VERBATIM as
 *      FEED-provided (never recomputed) when the deps entry provides it.
 *   2. lib/intelligence/newsMatch.ts purity (no fetcher, no clock, no
 *      randomness, no provider/router imports — the pre-registration's
 *      static pin).
 *   3. lib/intelligence/newsEvidence.ts fetches ONLY /api/news (the ONE
 *      fetcher) and resolves company names from the ONE registry.
 *   4. buildNewsItems remains the ONE news→evidence mapping (no parallel
 *      mapping exists anywhere in app/lib/components).
 *   5. The stock-page intelligence panel: 'use client', fetches ONLY
 *      /api/intelligence with capability=thesis, renders through the A8
 *      primitives after the A1 parse, honest unavailable state, no
 *      advice strings, no chain import (the A10 single-consumer pin).
 *   6. The mount (positive control, B-18 lesson: a missing panel passes
 *      any absence check) and the two route deps-pass call sites.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { buildNewsItems } from "@/lib/ai/evidence";

const ROOT = process.cwd();

const DEPS_ITEM = (over: Record<string, unknown> = {}) => ({
  id: "a".repeat(64),
  headline: "Markets rally as banks gain",
  summary: "Broad market strength across the session.",
  source: "RSS Feed",
  pubDate: "2026-10-09T05:30:00.000Z",
  ...over,
});

/** The A10 single-caller scan's traversal, reused verbatim. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function rel(f: string): string {
  return f.slice(ROOT.length + 1).split(sep).join("/");
}

describe("INT-B1 buildNewsItems contract (the ONE news→evidence mapping)", () => {
  it("a deps entry without impact renders the legacy text byte-identically", () => {
    const out = buildNewsItems("TCS", [DEPS_ITEM()]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(`news:${"a".repeat(64)}`);
    expect(out[0]?.text).toBe(
      'News: "Markets rally as banks gain" — Broad market strength across the session. ' +
        "(source: RSS Feed, published: 2026-10-09T05:30:00.000Z).",
    );
  });

  it("the feed's own impact label is carried VERBATIM as FEED-provided, never recomputed", () => {
    const out = buildNewsItems("TCS", [DEPS_ITEM({ impact: "POSITIVE" })]);
    expect(out[0]?.text).toContain("feed impact: POSITIVE");
    // The label is attributed to the feed inside the provenance parens —
    // never presented as a Rishi-derived judgment.
    expect(out[0]?.text).toContain("(source: RSS Feed, published: 2026-10-09T05:30:00.000Z, feed impact: POSITIVE)");
  });

  it("zero/absent deps keep the honest unavailable note byte-identical", () => {
    const expected = {
      id: "news:TCS:unavailable",
      text: "Per-symbol news: not available in the evidence pipeline (market-level feeds are not yet mapped to symbols). Do not cite specific news.",
    };
    expect(buildNewsItems("TCS", undefined)[0]).toEqual(expected);
    expect(buildNewsItems("TCS", [])[0]).toEqual(expected);
  });
});

describe("INT-B1 no-second-path pins (static source scans)", () => {
  it("lib/intelligence/newsMatch.ts is pure: no fetcher, no clock, no randomness, no provider/router imports", () => {
    const p = "lib/intelligence/newsMatch.ts";
    expect(existsSync(join(ROOT, p))).toBe(true);
    const src = source(p);
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/Date\.now/);
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/@\/lib\/ai/);
    expect(src).not.toMatch(/generateEvidenceGroundedAnswer/);
  });

  it("lib/intelligence/newsEvidence.ts fetches ONLY /api/news (the ONE fetcher) and names from the ONE registry", () => {
    const p = "lib/intelligence/newsEvidence.ts";
    expect(existsSync(join(ROOT, p))).toBe(true);
    const src = source(p);
    const fetchCalls = src.match(/fetch\([^;]*/g) ?? [];
    expect(fetchCalls.length).toBeGreaterThan(0);
    for (const call of fetchCalls) {
      expect(call).toContain("/api/news");
    }
    // The ONE canonical stock registry — no second name list.
    expect(src).toContain('@/data/stocks');
    // The match layer consumes the ONE deterministic matcher.
    expect(src).toContain("matchNewsForSymbol");
    expect(src).toContain("stableNewsIdOf");
  });

  it("buildNewsItems remains the ONE news→evidence mapping (no parallel news: id construction)", () => {
    const files = [
      ...walk(join(ROOT, "app")),
      ...walk(join(ROOT, "lib")),
      ...walk(join(ROOT, "components")),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const constructors = files.filter((f) => /id: `news:/.test(readFileSync(f, "utf8")));
    expect(constructors.map(rel).sort()).toEqual(["lib/ai/evidence.ts"]);
  });

  it("EvidenceDeps.news declares the optional FEED-provided impact label", () => {
    const src = source("lib/ai/evidence.ts");
    expect(src).toMatch(/impact\?:\s*"POSITIVE" \| "NEGATIVE" \| "NEUTRAL"/);
  });

  it("the chat route feeds the news deps pass into the ONE evidence assembler", () => {
    const src = source("app/api/chat/route.ts");
    expect(src).toContain("buildNewsEvidenceDeps(");
    expect(src).toMatch(/news:\s*newsDeps/);
  });

  it("the intelligence route feeds the news deps pass into the ONE evidence assembler", () => {
    const src = source("app/api/intelligence/route.ts");
    expect(src).toContain("buildNewsEvidenceDeps(");
    expect(src).toMatch(/news:\s*newsDeps/);
  });
});

describe("INT-B1 the stock-page intelligence panel (the first real product surface)", () => {
  const PANEL = "components/stock/IntelligencePanel.tsx";

  it("exists as a client component that fetches ONLY /api/intelligence with capability=thesis", () => {
    expect(existsSync(join(ROOT, PANEL))).toBe(true);
    const src = source(PANEL);
    expect(src.startsWith("'use client'")).toBe(true);
    const fetchCalls = src.match(/fetch\(\s*`[^`]*`/g) ?? [];
    expect(fetchCalls.length).toBeGreaterThan(0);
    for (const call of fetchCalls) {
      expect(call).toContain("/api/intelligence?capability=thesis");
    }
    // No second surface, no page-side chain consumption.
    expect(src).not.toMatch(/runIntelligenceChain/);
    expect(src).not.toMatch(/lib\/intelligence\/chain/);
  });

  it("renders through the A8 primitives over the route's A1-validated artifact (NO second parser, no zod on the client)", () => {
    const src = source(PANEL);
    // The A1 parse is the SERVER boundary's job (the A10 pinned
    // parse-or-refuse contract); a client-side re-parse would ship the
    // full zod graph (~90 kB gzip) against the fatal 200 kB page budget.
    expect(src).not.toContain("parseRishiInsight");
    expect(src).not.toContain('from "zod"');
    expect(src).toContain("import type { RishiInsight }");
    expect(src).toContain('buildEvidenceView');
    expect(src).toContain("@/components/intelligence");
    expect(src).toContain("<ReadyComposition");
    expect(src).toContain('import("@/components/intelligence/ReadyComposition")');
  });

  it("carries the honest unavailable state (never a fake artifact, never a fallback word)", () => {
    const src = source(PANEL);
    expect(src).toContain('data-intelligence-unavailable');
  });

  it("adds no investment advice strings (the A8 absence pin, display-side)", () => {
    const src = source(PANEL);
    expect(src).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
  });

  it("is actually mounted on the stock page (positive control — B-18)", () => {
    const src = source("app/stock/[symbol]/page.tsx");
    expect(src).toContain("<IntelligencePanel");
  });
});
