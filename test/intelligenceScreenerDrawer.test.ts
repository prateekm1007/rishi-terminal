/**
 * INT-D2 — the per-row intelligence drawer on the screener table
 * (roadmap item D2).
 *
 * Pre-registration: docs/intelligence/stockIntelligence.md (committed
 * BEFORE any evaluation). Rule 21 fail-first: the pins below fail on
 * the pre-implementation tree (the badge and the drawer do not exist,
 * the exact-surface scan count mismatches, the mount is absent) — the
 * B1/C1 precedent.
 *
 * What this file pins:
 *   1. The badge (components/screener/IntelligenceBadge.tsx): a
 *      presentational OPENER — no fetch, no intelligence imports, no
 *      computed intelligence value, no advice; clicking it opens the
 *      drawer for that row's symbol.
 *   2. The drawer (components/screener/IntelligenceDrawer.tsx): the B1
 *      panel pattern verbatim — fetches ONLY the ONE
 *      /api/intelligence?capability=thesis route for the ONE opened
 *      subject, the 12 s bounded wait, abort-on-close/switch through
 *      the AbortController (no setState after abort — no state bleed),
 *      the A8 composition over the route's A1-validated artifact (NO
 *      second parser, no zod on the client, no chain import, no
 *      router), honest loading/unavailable states, no advice strings.
 *   3. The wiring: the badge renders inside StockTable's row (the
 *      table imports no intelligence module and never the drawer); the
 *      drawer is mounted ONCE in ScreenerClient via next/dynamic with
 *      ssr:false (the C1 bundle pattern — zero first-load JS on
 *      /stocks); the subject is the SERVER-rendered row symbol.
 *
 * The exact-surface scan itself lives in
 * test/intelligenceDashboardBrief.test.ts and GROWS to the three
 * declared surfaces in the same PR (declared, never silent).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function source(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const BADGE = "components/screener/IntelligenceBadge.tsx";
const DRAWER = "components/screener/IntelligenceDrawer.tsx";
const TABLE = "components/screener/StockTable.tsx";
const CLIENT = "components/screener/ScreenerClient.tsx";

describe("INT-D2 the per-row intelligence badge (the opener)", () => {
  it("exists as a presentational opener: NO fetch, no intelligence imports, no chain", () => {
    expect(existsSync(join(ROOT, BADGE))).toBe(true);
    const src = source(BADGE);
    // An OPENER, not a signal: the badge fetches NOTHING — the page
    // computes nothing per row (the A8 absence discipline at breadth:
    // zero chain reads, zero intelligence requests for the 896-row
    // universe).
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/@\/lib\/intelligence\//);
    expect(src).not.toMatch(/@\/components\/intelligence/);
    expect(src).not.toMatch(/runIntelligenceChain/);
    expect(src).not.toMatch(/lib\/intelligence\/chain/);
  });

  it("carries no computed intelligence value and no advice (static label only)", () => {
    const src = source(BADGE);
    expect(src).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
    // The opener contract: it takes the row's symbol and opens the
    // drawer — nothing else flows through it.
    expect(src).toContain("symbol: string");
    expect(src).toContain("onOpen");
    // The DOM contract the production legs click against.
    expect(src).toContain("data-intelligence-badge");
    expect(src).toContain("IntelligenceBadge");
  });
});

describe("INT-D2 the intelligence drawer (the B1 pattern, one subject at a time)", () => {
  it("exists as a client component that fetches ONLY /api/intelligence with capability=thesis", () => {
    expect(existsSync(join(ROOT, DRAWER))).toBe(true);
    const src = source(DRAWER);
    expect(src.startsWith("'use client'")).toBe(true);
    const fetchCalls = src.match(/fetch\(\s*`[^`]*`/g) ?? [];
    expect(fetchCalls.length).toBeGreaterThan(0);
    for (const call of fetchCalls) {
      expect(call).toContain("/api/intelligence?capability=thesis");
    }
    // The subject travels bounded (the server-rendered row symbol,
    // never a client-invented subject).
    expect(src).toContain("encodeURIComponent(subject)");
    // No second surface, no page-side chain consumption, no router.
    expect(src).not.toMatch(/runIntelligenceChain/);
    expect(src).not.toMatch(/lib\/intelligence\/chain/);
    expect(src).not.toMatch(/useRouter/);
    expect(src).not.toMatch(/next\/navigation/);
  });

  it("aborts the in-flight fetch on close/switch (AbortController) with the 12 s bounded wait", () => {
    const src = source(DRAWER);
    expect(src).toContain("new AbortController(");
    // The SAME controller carries the bounded wait and the close/switch
    // abort; the cleanup aborts — no setState after abort, no state
    // bleed across subjects.
    expect(src).toContain("12_000");
    expect(src).toContain("controller.abort()");
    expect(src).toContain("clearTimeout(");
  });

  it("renders through the A8 primitives over the route's A1-validated artifact (NO second parser, no zod on the client)", () => {
    const src = source(DRAWER);
    // The A1 parse is the SERVER boundary's job (the A10 pinned
    // parse-or-refuse contract); a client-side re-parse would ship the
    // full zod graph against the page budget (C9) for zero security
    // value — the B1 finding, held.
    expect(src).not.toContain("parseRishiInsight");
    expect(src).not.toContain('from "zod"');
    expect(src).toContain("import type { RishiInsight }");
    expect(src).toContain("buildEvidenceView");
    expect(src).toContain("@/components/intelligence");
    // The canonical composition: the surface mounts ReadyComposition
    // (the pre-registered six steps, defined once) — not its own inline
    // copy of the sequence (rule 14; no independent redesigns).
    expect(src).toContain("<ReadyComposition");
  });

  it("carries the honest states and discloses its subject (never a fake artifact, never a fallback word)", () => {
    const src = source(DRAWER);
    expect(src).toContain('data-intelligence-drawer-state="unavailable"');
    expect(src).toContain("data-intelligence-drawer-subject");
    expect(src).toContain("data-intelligence-drawer-state=\"ready\"");
  });

  it("adds no investment advice strings (the A8 absence pin, display-side)", () => {
    const src = source(DRAWER);
    expect(src).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
  });
});

describe("INT-D2 the wiring (badge in the row, drawer mounted once)", () => {
  it("StockTable renders the badge per row and imports NO intelligence module (never the drawer)", () => {
    const src = source(TABLE);
    expect(src).toContain("<IntelligenceBadge");
    expect(src).toContain("symbol={stock.symbol}");
    // The badge is a presentational affordance; the drawer is NOT
    // imported by the table.
    expect(src).not.toContain("IntelligenceDrawer");
    expect(src).not.toMatch(/@\/lib\/intelligence\//);
    expect(src).not.toMatch(/@\/components\/intelligence/);
    // The breadth contract at the table level: the rows fetch nothing.
    expect(src).not.toMatch(/api\/intelligence/);
    // Defensive honesty: a row without a resolvable symbol renders no
    // badge (the symbol guard precedes the opener).
    expect(src).toContain("onOpenIntelligence && stock.symbol");
  });

  it("ScreenerClient mounts the drawer ONCE via next/dynamic (ssr:false) and imports no intelligence module", () => {
    const src = source(CLIENT);
    expect(src).toContain("next/dynamic");
    expect(src).toContain("ssr: false");
    expect((src.match(/<IntelligenceDrawer/g) ?? []).length).toBe(1);
    expect(src).not.toMatch(/@\/lib\/intelligence\//);
    // The subject is the row symbol the table forwarded — the client
    // invents no subject; the drawer is re-keyed per subject (no state
    // bleed across subjects).
    expect(src).toContain("key={intelligenceSubject}");
    expect(src).toContain("subject={intelligenceSubject}");
    expect(src).toContain("onClose=");
  });
});
