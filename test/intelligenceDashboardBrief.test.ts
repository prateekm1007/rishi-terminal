/**
 * INT-C1 — the Dashboard Brief: the dashboard mounts the ONE
 * intelligence surface for the deterministic Stock-of-the-Day subject
 * (roadmap item C1).
 *
 * Pre-registration: docs/intelligence/dashboardBrief.md (committed
 * BEFORE any evaluation). Rule 21 fail-first: the pins below fail on
 * the pre-implementation tree (the component does not exist, the mount
 * is absent, the exact-surface scan count mismatches) — the B1
 * precedent.
 *
 * What this file pins:
 *   1. The brief component: 'use client', fetches ONLY
 *      /api/intelligence with capability=thesis (the ONE surface, the
 *      ONE deterministic capability), the 12 s timeout, honest
 *      unavailable state, the A8 composition over the route's
 *      A1-validated artifact (NO second parser, no zod on the client,
 *      no chain import), no advice strings.
 *   2. The mount (positive control — B-18: a missing panel passes any
 *      absence check) passes the SERVER-resolved Stock-of-the-Day
 *      symbol; the mount imports no intelligence module.
 *   3. The exact-surface scan: the set of surfaces fetching
 *      /api/intelligence across app/lib/components is EXACTLY the
 *      declared product surfaces. Originally the two (B1 panel + C1
 *      brief); INT-D2 GROWS the declared set in its own PR to the
 *      three {B1 panel, C1 brief, D2 drawer} (declared, never silent
 *      — the D2 pre-registration names this exact growth) — a fourth
 *      undeclared consumer breaks the build.
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

const BRIEF = "components/dashboard/DashboardBrief.tsx";
const TAIL = "components/dashboard/DashboardTail.tsx";

describe("INT-C1 the dashboard brief component (the second real product surface)", () => {
  it("exists as a client component that fetches ONLY /api/intelligence with capability=thesis", () => {
    expect(existsSync(join(ROOT, BRIEF))).toBe(true);
    const src = source(BRIEF);
    expect(src.startsWith("'use client'")).toBe(true);
    const fetchCalls = src.match(/fetch\(\s*`[^`]*`/g) ?? [];
    expect(fetchCalls.length).toBeGreaterThan(0);
    for (const call of fetchCalls) {
      expect(call).toContain("/api/intelligence?capability=thesis");
    }
    // The bounded wait is part of the pinned state machine.
    expect(src).toMatch(/AbortSignal\.timeout\(/);
    // No second surface, no page-side chain consumption.
    expect(src).not.toMatch(/runIntelligenceChain/);
    expect(src).not.toMatch(/lib\/intelligence\/chain/);
  });

  it("renders through the A8 primitives over the route's A1-validated artifact (NO second parser, no zod on the client)", () => {
    const src = source(BRIEF);
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

  it("carries the honest unavailable state and discloses its subject (never a fake artifact, never a fallback word)", () => {
    const src = source(BRIEF);
    expect(src).toContain('data-brief-unavailable');
    expect(src).toContain("data-dashboard-brief-subject");
  });

  it("adds no investment advice strings (the A8 absence pin, display-side)", () => {
    const src = source(BRIEF);
    expect(src).not.toMatch(/\b(BUY|SELL|HOLD)\b/);
  });
});

describe("INT-C1 the mount (positive control — B-18)", () => {
  it("the dashboard tail mounts the brief with the SERVER-resolved Stock-of-the-Day symbol", () => {
    const src = source(TAIL);
    expect(src).toContain("<DashboardBrief");
    // The client invents no subject: the symbol is the deterministic
    // IST-date pick resolved on the server (U4-gated) and passed down.
    expect(src).toContain("subject={stockOfDay.symbol}");
  });

  it("the mount imports no intelligence module (no chain, no registry, no parser)", () => {
    const src = source(TAIL);
    expect(src).not.toMatch(/@\/lib\/intelligence\//);
    expect(src).not.toMatch(/runIntelligenceChain/);
    expect(src).not.toMatch(/parseRishiInsight/);
  });
});

// INT-D3 REMOVED — the founder's product-surface removal order (round 45,
// 2026-10-10): the stock-page "Rishi Intelligence — <SYMBOL>" dossier
// section (the D3 mount) is REMOVED from /stock/[symbol]. Product surface
// only — the substrate stays untouched and green: the chain, the ONE
// /api/intelligence (capability=insight included), the cache, the A8
// primitives, the fixture route, and the B1 panel / C1 brief / D2 drawer.
//
// Fail-first in reverse (rule 21): these absence pins were written FIRST
// and watched FAIL on the mounted tree (the component file existed, the
// page mounted it, the exact-surface scan saw four consumers); then the
// removal landed; then they passed. Raw RED + GREEN: docs/evidence/round45/.
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
    // neighbors — the removal removed one mount, not the page
    expect(s).toContain("<IntelligencePanel");
    expect(s).toContain("<RishiCouncil");
  });
});

describe("INT-C1 the exact-surface scan (N surfaces, ONE route)", () => {
  it("the set of surfaces fetching /api/intelligence is EXACTLY the three declared product surfaces (B1 panel + C1 brief + the INT-D2 drawer) — the declared set SHRANK from four in the founder-ordered D3 removal (declared, never silent)", () => {
    const files = [
      ...walk(join(ROOT, "app")),
      ...walk(join(ROOT, "lib")),
      ...walk(join(ROOT, "components")),
    ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const consumers = files.filter((f) =>
      /fetch\([^)]*\/api\/intelligence/.test(readFileSync(f, "utf8")),
    );
    expect(consumers.map(rel).sort()).toEqual([
      "components/dashboard/DashboardBrief.tsx",
      "components/screener/IntelligenceDrawer.tsx",
      "components/stock/IntelligencePanel.tsx",
    ]);
  });
});

describe("Ask Rishi (the affordance component contract — the stock-page mount is REMOVED per founder order, 2026-10-10; the component and its contract SURVIVE with the fixture route as the mounted consumer)", () => {
  // Moved verbatim from the retired test/intelligenceStockDossier.test.ts
  // (the D3 mount test file retired by the founder-ordered removal — rule 23
  // permits retirement on removal, never silent deletion; these four pins
  // target the SURVIVING component, not the removed section, so they move
  // rather than die). The mount contract on /evidence-fixtures is pinned by
  // the fixture suite; these pins keep the component honest at the source.
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
