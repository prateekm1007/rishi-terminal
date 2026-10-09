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
    for (const primitive of [
      "<InsightBadges",
      "<ProvenanceLine",
      "<ContradictionBanner",
      "<EvidenceList",
      "<UncertaintyBlock",
    ]) {
      expect(src).toContain(primitive);
    }
  });

  it("carries the honest unavailable state and discloses its subject (never a fake artifact, never a fallback word)", () => {
    const src = source(BRIEF);
    expect(src).toContain('data-dashboard-brief="unavailable"');
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

describe("INT-C1 the exact-surface scan (N surfaces, ONE route)", () => {
  it("the set of surfaces fetching /api/intelligence is EXACTLY the three declared product surfaces (B1 panel + C1 brief + the INT-D2 drawer)", () => {
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
