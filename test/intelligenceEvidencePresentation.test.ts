import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { buildEvidenceView, type EvidenceView } from "@/lib/intelligence/evidence";
import { parseRishiInsight, type RishiInsight } from "@/lib/intelligence/types";
import { EVIDENCE_FIXTURES } from "@/lib/intelligence/evidenceFixtures";
import { EvidenceList } from "@/components/intelligence";

/**
 * INT-A8-PRES — the shared intelligence presentation repair (the
 * founder-audit corrective record). Pre-registration:
 * docs/intelligence/evidencePresentation.md (PR #301, committed BEFORE
 * any evaluation). This file pins:
 *
 *   1. the A8 mapping exposes the A1 prose fields `summary` and
 *      `whyItMatters` VERBATIM (the deterministic layer's own strings —
 *      no interpretation, no advice), with the em-dash degradation at
 *      the display boundary;
 *   2. `<EvidenceList>`'s empty state states the truth the view can
 *      prove by construction: no observed transition QUALIFIED as
 *      material evidence in this window (the ledger holds only
 *      material events) — never "no observations occurred", never a
 *      fabricated count;
 *   3. `app/globals.css` — the repo's ONE stylesheet — carries the
 *      shared selectors for the EXISTING semantic A8 classes and the
 *      intelligence-surface-scoped `:focus-visible` rule (the
 *      canonical owner; a per-surface patch or a dead utility class
 *      never returns silently).
 *
 * Rule 21 fail-first: on the pre-implementation tree the mapping has
 * no prose fields, the wording is the old conflated one, and
 * globals.css carries ZERO insight-surface selectors — every pin
 * below is captured failing first.
 */

const DETERMINISTIC = parseRishiInsight(EVIDENCE_FIXTURES.deterministicProvenance) as RishiInsight;

describe("INT-A8-PRES — the A8 mapping exposes the A1 prose fields verbatim", () => {
  it("summary and whyItMatters ride the view model as the artifact's own strings", () => {
    const view = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    expect(view.summary).toBe(DETERMINISTIC.summary);
    expect(view.whyItMatters).toBe(DETERMINISTIC.whyItMatters);
  });

  it("whatChanged rides verbatim (field + change — the deterministic layer composed them, the mapping never arithmetics)", () => {
    const view = buildEvidenceView(DETERMINISTIC) as EvidenceView;
    expect(view.whatChanged).toEqual([{ field: "price", change: "3100.0 inr -> 3105.5 inr" }]);
  });

  it("defense: a prose field missing at the display boundary degrades to the em dash, never a fallback word", () => {
    const broken = { ...DETERMINISTIC, summary: undefined, whyItMatters: undefined } as unknown as RishiInsight;
    const view = buildEvidenceView(broken);
    expect(view.summary).toBe("—");
    expect(view.whyItMatters).toBe("—");
  });

  it("never advises: the prose fields carry no BUY/SELL/HOLD and the mapping grows no model surface", () => {
    const view = buildEvidenceView(DETERMINISTIC);
    const prose = `${view.summary} ${view.whyItMatters} ${view.whatChanged.map((w) => w.change).join(" ")}`;
    for (const banned of ["BUY", "SELL", "HOLD"]) expect(prose).not.toContain(banned);
  });
});

describe("INT-A8-PRES — the EvidenceList empty state explains the exclusion, never absence", () => {
  it("an empty ledger renders the by-construction truth (excluded by verdict, not absent)", async () => {
    const view = buildEvidenceView({ ...DETERMINISTIC, evidence: [] } as unknown as RishiInsight);
    const html = renderToString(createElement(EvidenceList, { view }));
    expect(html).toContain(
      "No observed transition qualified as material evidence in this window — the ledger records only material events.",
    );
    // the old conflated wording never returns
    expect(html).not.toContain("No evidence recorded.");
  });

  it("the empty state never fabricates a count and never claims observations did not occur", async () => {
    const view = buildEvidenceView({ ...DETERMINISTIC, evidence: [] } as unknown as RishiInsight);
    const html = renderToString(createElement(EvidenceList, { view }));
    expect(html).not.toContain("No observations");
    expect(html).not.toMatch(/0 (observed|transitions?)/);
  });
});

describe("INT-A8-PRES — globals.css is the canonical owner of the shared A8 selectors", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("the semantic A8 classes the five primitives render are ALL defined (the zero-selector defect never returns)", () => {
    for (const selector of [
      ".insight-surface {",
      ".insight-surface__badges",
      ".insight-badge",
      ".insight-surface__title",
      ".insight-surface__list",
      ".insight-surface__item",
      ".insight-surface__text",
      ".insight-surface__facts",
      ".insight-fact",
      ".insight-fact__value",
      ".insight-fact__provenance",
      ".insight-surface__empty",
      ".insight-surface__provenance",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("the summary block is styled through the EXISTING class vocabulary (no dead utility classes)", () => {
    expect(css).toContain(".insight-surface--summary");
  });

  it("the :focus-visible rule is scoped to the mounted intelligence surfaces (never a global restyle)", () => {
    expect(css).toMatch(/\.insight-surface :focus-visible/);
    expect(css).toMatch(/\[data-intelligence-drawer\] :focus-visible/);
    // the D2 per-row opener is an intelligence affordance too — the
    // founder pin (2026-10-10) caught it falling to the browser default;
    // ported from the concurrently-closed #316 (credit: their pin)
    expect(css).toMatch(/\[data-intelligence-badge\]:focus-visible/);
  });
});

describe("INT-A8-PRES follow-up — the ONE canonical composition (rule 14)", () => {
  it("ReadyComposition renders the pre-registered six steps in order; the surfaces mount it, not their own copies", () => {
    const src = readFileSync("components/intelligence/ReadyComposition.tsx", "utf8");
    const order = [
      "<InsightBadges",
      "<InsightSummary",
      "<ProvenanceLine",
      "<ContradictionBanner",
      "<EvidenceList",
      "<UncertaintyBlock",
    ];
    let last = -1;
    for (const primitive of order) {
      const at = src.indexOf(primitive);
      expect(at, `${primitive} must be present in ReadyComposition`).toBeGreaterThan(-1);
      expect(at, `${primitive} must come after the previous step (the declared order)`).toBeGreaterThan(last);
      last = at;
    }
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/parseRishiInsight/);
    expect(src).not.toContain('from "zod"');
    for (const surface of [
      "components/dashboard/DashboardBrief.tsx",
      "components/stock/IntelligencePanel.tsx",
      "components/screener/IntelligenceDrawer.tsx",
    ]) {
      const s = readFileSync(surface, "utf8");
      expect(s, `${surface} mounts the canonical composition`).toContain("<ReadyComposition");
      expect(s, `${surface} carries no inline copy of the six-step sequence`).not.toContain("<InsightBadges badges=");
    }
    // The fixture route renders the same composition (direct import —
    // its SSR assertions require server rendering).
    expect(readFileSync("app/evidence-fixtures/page.tsx", "utf8")).toContain("<ReadyComposition");
  });

  it("the inner state markers no longer collide with the surface phase attributes (the two-element ambiguity)", () => {
    // The surface-level phase attribute is unambiguous everywhere: the
    // nested state markers carry their own names.
    expect(readFileSync("components/stock/IntelligencePanel.tsx", "utf8")).not.toContain('data-intelligence-panel="unavailable"');
    expect(readFileSync("components/dashboard/DashboardBrief.tsx", "utf8")).not.toContain('data-dashboard-brief="unavailable"');
    expect(readFileSync("components/screener/IntelligenceDrawer.tsx", "utf8")).not.toMatch(/data-intelligence-drawer="(unavailable|ready)"/);
    expect(readFileSync("components/stock/IntelligencePanel.tsx", "utf8")).toContain("data-intelligence-unavailable");
    expect(readFileSync("components/screener/IntelligenceDrawer.tsx", "utf8")).toContain('data-intelligence-drawer-state="ready"');
  });
});
