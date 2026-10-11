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
 * The exact-surface scan itself LIVES IN THIS FILE since the C1 brief's
 * removal (round 45, 2026-10-11 — the founder's third removal order took
 * the dashboard brief off the dashboard): this file pins the ONE remaining
 * declared product surface. The scan's history: grew to the four declared
 * surfaces across B1/C1/D2/D3; then SHRANK across the founder-ordered
 * removals, each in its own recorded removal — the D3 dossier (→ three),
 * the B1 stock-page panel (→ two), the C1 dashboard brief (→ ONE, this
 * file). The pin updates; the gate never dies.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.cwd();

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

// INT-C1 dashboard brief REMOVED — the founder's third removal order
// (round 45, 2026-10-11): after the D3 dossier removal and the B1
// stock-page panel removal, the dashboard STILL rendered a standing
// section headed "Rishi Intelligence — <SYMBOL>" (the C1 DashboardBrief
// mount inside the DashboardTail), and the founder ordered it removed
// ("remove the whole Rishi Intelligence segment"). Product surface only —
// the substrate stays untouched and green: the chain, the ONE
// /api/intelligence (capability=thesis included), the cache, the A8
// primitives, the fixture route, and the D2 badge/drawer (the last
// declared product surface).
//
// Fail-first in reverse (rule 21): these absence pins were written FIRST
// and watched FAIL on the mounted tree (the component file existed, the
// tail mounted it, the exact-surface scan saw two consumers); then the
// removal landed; then they passed. Raw RED + GREEN: docs/evidence/round45/.
describe("INT-C1 dashboard brief REMOVED per founder order (2026-10-11) — the absence pins", () => {
  const TAIL = "components/dashboard/DashboardTail.tsx";

  it("the brief component file is DELETED (dead code after the mount removal — rule 17)", () => {
    expect(existsSync(join(ROOT, "components/dashboard/DashboardBrief.tsx"))).toBe(false);
  });

  it("the dashboard tail no longer imports, mounts, or wires the intelligence brief", () => {
    const s = source(TAIL);
    expect(s).not.toContain("DashboardBrief");
    // the mount's own comment block went with it
    expect(s).not.toContain("INT-C1");
    // the tail consumes NO intelligence surface anymore — the remaining
    // product surface is the D2 drawer (screener), pinned by the
    // exact-surface scan below
    expect(s).not.toContain("/api/intelligence");
    // positive control (B-18): the tail still carries the SURVIVING
    // sections — the removal removed one mount, not the tail
    expect(s).toContain("TOP BUY SIGNALS");
    expect(s).toContain("<SectionHeader");
  });
});

// INT-D3 REMOVED — the founder's product-surface removal order (round 45,
// 2026-10-10): the stock-page "Rishi Intelligence — <SYMBOL>" dossier
// section (the D3 mount) is REMOVED from /stock/[symbol]. Product surface
// only — the substrate stays untouched and green: the chain, the ONE
// /api/intelligence (capability=insight included), the cache, the A8
// primitives, the fixture route, and the surviving declared surfaces.
// [Amended same round: the founder then ordered the B1 stock-page surface
// removed too — see the INT-B1 describe below; and the C1 dashboard brief
// removed the next day (2026-10-11) — see the INT-C1 describe above.]
//
// Fail-first in reverse (rule 21): these absence pins were written FIRST
// and watched FAIL on the mounted tree (the component file existed, the
// page mounted it, the exact-surface scan saw four consumers); then the
// removal landed; then they passed. Raw RED + GREEN: docs/evidence/round45/.
// [Moved verbatim from the retired test/intelligenceDashboardBrief.test.ts
// when the C1 removal retired that file — rule 23: the pins target
// SURVIVING surfaces (the stock page), so they move rather than die.]
describe("INT-D3 REMOVED per founder order (2026-10-10) — the absence pins", () => {
  const PAGE = "app/stock/[symbol]/page.tsx";

  it("the dossier component file is DELETED (dead code after the mount removal — rule 17)", () => {
    expect(existsSync(join(ROOT, "components/stock/IntelligenceDossier.tsx"))).toBe(false);
  });

  it("the stock page no longer imports, mounts, or wires the dossier section", () => {
    const s = source(PAGE);
    expect(s).not.toContain("IntelligenceDossier");
    // the mount's own comment block went with it
    expect(s).not.toContain("INT-D3");
    // positive control (B-18): the page source still carries the SURVIVING
    // neighbors — the removal removed one mount, not the page (the B1 panel
    // was a positive control here until the founder's second removal order
    // took it off the page the same round; the surviving shell + council
    // carry the control now)
    expect(s).toContain("<StockPageClient");
    expect(s).toContain("<RishiCouncil");
  });
});

// INT-B1 stock-page surface REMOVED — the founder's second removal order
// (round 45, 2026-10-10): after the D3 dossier removal the stock page STILL
// rendered a section headed "Rishi Intelligence" (the B1 IntelligencePanel
// mount), and the founder ordered it removed ("it s still there remove it").
// Product surface only — the substrate stays untouched and green: the news-
// evidence substrate (newsMatch + the deps pass feeding the chain), the
// chain, the ONE /api/intelligence (capability=thesis included), the cache,
// the A8 primitives, the fixture route, and the D2 badge/drawer.
//
// Fail-first in reverse (rule 21): these absence pins were written FIRST
// and watched FAIL on the mounted tree (the component file existed, the
// page mounted it, the exact-surface scan saw three consumers); then the
// removal landed; then they passed. Raw RED + GREEN: docs/evidence/round45/.
// [Moved verbatim from the retired test/intelligenceDashboardBrief.test.ts
// when the C1 removal retired that file — rule 23: the pins target
// SURVIVING surfaces (the stock page), so they move rather than die.]
describe("INT-B1 stock-page surface REMOVED per founder order (2026-10-10) — the absence pins", () => {
  const PAGE = "app/stock/[symbol]/page.tsx";

  it("the panel component file is DELETED (dead code after the mount removal — rule 17)", () => {
    expect(existsSync(join(ROOT, "components/stock/IntelligencePanel.tsx"))).toBe(false);
  });

  it("the stock page no longer imports, mounts, or wires the intelligence panel", () => {
    const s = source(PAGE);
    expect(s).not.toContain("IntelligencePanel");
    // the mount's own comment block went with it
    expect(s).not.toContain("INT-B1");
    // the page consumes NO intelligence surface client-side anymore — the
    // remaining consumer is the D2 drawer (screener), pinned by the
    // exact-surface scan below
    expect(s).not.toContain("/api/intelligence");
    // positive control (B-18): the page source still carries the SURVIVING
    // sections — the removal removed one mount, not the page
    expect(s).toContain("<StockPageClient");
    expect(s).toContain("<RishiCouncil");
  });
});

describe("INT-C1 the exact-surface scan (N surfaces, ONE route)", () => {
  it("the set of surfaces fetching /api/intelligence is EXACTLY the one remaining declared product surface (the INT-D2 drawer) — the declared set SHRANK from four across the founder-ordered removals (the D3 dossier, then the B1 stock-page panel — both round 45, 2026-10-10; now the C1 dashboard brief, round 45, 2026-10-11: 'remove the whole Rishi Intelligence segment'; declared, never silent)", () => {
    const files = [
      ...walk(join(ROOT, "app")),
      ...walk(join(ROOT, "lib")),
      ...walk(join(ROOT, "components")),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const consumers = files.filter((f) =>
      /fetch\([^)]*\/api\/intelligence/.test(readFileSync(f, "utf8")),
    );
    expect(consumers.map(rel).sort()).toEqual([
      "components/screener/IntelligenceDrawer.tsx",
    ]);
  });
});

describe("Ask Rishi (the affordance component contract — the stock-page mount is REMOVED per founder order, 2026-10-10; the component and its contract SURVIVE with the fixture route as the mounted consumer)", () => {
  // Moved verbatim from the retired test/intelligenceStockDossier.test.ts
  // (the D3 mount test file retired by the founder-ordered removal — rule 23
  // permits retirement on removal, never silent deletion; these four pins
  // target the SURVIVING component, not the removed section, so they move
  // rather than die). Moved again verbatim from the retired
  // test/intelligenceDashboardBrief.test.ts when the founder's third
  // removal order (2026-10-11) retired that file. The mount contract on
  // /evidence-fixtures is pinned by the fixture suite; these pins keep the
  // component honest at the source.
  const ASKRISHI = "components/stock/AskRishi.tsx";

  it("exists as a client component that fetches ONLY /api/chat", () => {
    expect(existsSync(join(ROOT, ASKRISHI))).toBe(true);
    const s = source(ASKRISHI);
    expect(s).toContain("'use client'");
    expect(s).toContain("/api/chat");
    expect(s).not.toContain("/api/intelligence");
  });

  it("sends the bounded payload: personaId + message + insightRef + symbol — nothing else", () => {
    const s = source(ASKRISHI);
    expect(s).toContain("insightRef");
    expect(s).toContain("symbol");
    expect(s).toContain("personaId");
    expect(s).toContain("message");
    // no history replay, no challenge field, no system prompt construction
    expect(s).not.toMatch(/history\s*:/);
    expect(s).not.toContain("challenge");
    expect(s).not.toMatch(/systemPrompt|system_prompt/);
  });

  it("renders refusals AS the refusal they are (the error text verbatim) and disables the empty submit", () => {
    const s = source(ASKRISHI);
    // the response's error text is rendered verbatim — never reworded
    expect(s).toMatch(/error/);
    // the empty-input gate
    expect(s).toMatch(/disabled/);
    // one-shot: no conversation state machine (no message array state)
    expect(s).not.toMatch(/useState<.*\[\].*>/);
  });

  it("imports no intelligence module beyond types", () => {
    const s = source(ASKRISHI);
    const imports = s.match(/from ["'][^"']+["']/g) ?? [];
    for (const imp of imports) {
      if (imp.includes("lib/intelligence")) {
        expect(imp).toContain("types");
      }
    }
  });
});
