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
 *   5. [RETIRED 2026-10-10] the stock-page intelligence panel pins — the
 *      panel was REMOVED from /stock/[symbol] by the founder's second
 *      product-surface removal order (round 45; see the retirement note
 *      at the bottom of this file). Rule 23: retirement on removal,
 *      never silent deletion.
 *   6. The two route deps-pass call sites (the mount positive control
 *      retired with the panel).
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

// INT-B1 the stock-page intelligence panel — RETIRED 2026-10-10. The
// founder's second product-surface removal order (round 45): after the D3
// dossier removal the stock page still rendered the section headed "Rishi
// Intelligence" (the B1 IntelligencePanel mount), and the founder ordered
// it removed ("it s still there remove it"). Rule 23 permits retirement on
// removal, never silent deletion: the five panel pins this file carried
// (component contract + the mount positive control) were retired WITH this
// justification because their subject — components/stock/
// IntelligencePanel.tsx and its /stock/[symbol] mount — no longer exists.
// The news-evidence SUBSTRATE pins (items 1-4) are untouched and stay
// green. Removal record + revert range: docs/evidence/round45/b1-removal.md.
// The rendered-page absence pins for the removal live in
// test/smoke/b1-panel-removed.spec.ts + the INT-B1 describe in
// test/intelligenceDashboardBrief.test.ts.
